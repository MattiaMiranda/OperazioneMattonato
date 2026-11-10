/* =====================================================================
   Operazione Mattonato · script.js
   Cruciverba vanilla ES6+: griglia, selezione, controllo, vittoria.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1. DATI DEL GIOCO
   --------------------------------------------------------------------- */

// '.' = casella bianca, '#' = casella nera
const PATTERN = [
  "##.#.....##", // 0
  "##.#.#####.", // 1
  "##.#.###.#.", // 2
  "#....###.#.", // 3
  "####.......", // 4
  ".....###.#.", // 5
  "##.#.###.##", // 6
  "##.#.######", // 7
  "##.########", // 8
  "##.########", // 9
  "##.########", // 10
];

const ROWS = PATTERN.length;
const COLS = PATTERN[0].length;

// Ogni parola: risposta, direzione, casella di partenza e definizione.
const WORDS = [
  { answer: "NEVE",     dir: "down",   row: 0, col: 2,
    clue: "Quello che speriamo di trovare in città a gennaio, ma che non possiamo garantirti." },
  { answer: "BAGNO",    dir: "across", row: 0, col: 4,
    clue: "Quello che troverai in abbondanza laggiù, anche se nessuno te l'ha chiesto." },
  { answer: "BUDAPEST", dir: "down",   row: 0, col: 4,
    clue: "La capitale europea dove ci porterà il premio della serata." },
  { answer: "RELAX",    dir: "down",   row: 1, col: 10,
    clue: "Quello che Mattonato probabilmente non conosce dopo una serata con noi." },
  { answer: "AMICI",    dir: "down",   row: 2, col: 8,
    clue: "Le persone che pagheranno questa bella esperienza (poveri loro)." },
  { answer: "CENA",     dir: "across", row: 3, col: 1,
    clue: "Quello che faremo dopo esserci rilassati e aver speso tutte le energie." },
  { answer: "PISCINA",  dir: "across", row: 4, col: 4,
    clue: "Il posto dove si nuota, ma questa volta con acqua più calda del solito." },
  { answer: "TERME",    dir: "across", row: 5, col: 0,
    clue: "Il posto dove passeremo qualche ora a mollo invece di fare qualcosa di produttivo." },
  { answer: "REGALO",   dir: "down",   row: 5, col: 2,
    clue: "Quello che ricevi quando compi gli anni e chi ti sta attorno è abbastanza generoso." },
];

const TOTAL = WORDS.length;

const MESSAGES = [
  "Dai Mattonato, anche un cruciverba ogni tanto!",
  "Si comincia a muovere qualcosa, continua.",
  "Non male, forse c'è speranza.",
  "Stai quasi dimostrando di meritarti il regalo.",
  "A metà strada: metà regalo, metà fiducia.",
  "Quasi tutto! Non commettere errori ora.",
  "Ultima spinta, il voucher è lì dietro l'angolo.",
];

/* ---------------------------------------------------------------------
   2. COSTRUZIONE GRIGLIA E NUMERAZIONE
   --------------------------------------------------------------------- */

// Mappa soluzione: "riga,col" -> lettera giusta (verificata agli incroci)
const solution = new Map();
WORDS.forEach((w) => {
  [...w.answer].forEach((ch, i) => {
    const r = w.dir === "across" ? w.row : w.row + i;
    const c = w.dir === "across" ? w.col + i : w.col;
    const key = `${r},${c}`;
    const prev = solution.get(key);
    if (prev && prev !== ch) {
      console.error(`Errore incrocio su ${key}: ${prev} vs ${ch}`);
    }
    solution.set(key, ch);
  });
});

const isWhite = (r, c) =>
  r >= 0 && r < ROWS && c >= 0 && c < COLS && PATTERN[r][c] === ".";

// Parole che contengono la casella, con la lettera corrispondente
function wordsAt(r, c) {
  return WORDS.filter((w) => {
    for (let i = 0; i < w.answer.length; i++) {
      const wr = w.dir === "across" ? w.row : w.row + i;
      const wc = w.dir === "across" ? w.col + i : w.col;
      if (wr === r && wc === c) return true;
    }
    return false;
  });
}

// Numerazione standard: una casella prende il numero se apre una parola
function buildNumbers() {
  const numbers = new Map();
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!isWhite(r, c)) continue;
      const startsAcross = isWhite(r, c - 1) === false && isWhite(r, c + 1);
      const startsDown = isWhite(r - 1, c) === false && isWhite(r + 1, c);
      if (startsAcross || startsDown) {
        n++;
        numbers.set(`${r},${c}`, n);
      }
    }
  }
  return numbers;
}

const NUMBERS = buildNumbers();

// Assegna un numero a ogni parola (la sua casella iniziale)
WORDS.forEach((w) => {
  w.num = NUMBERS.get(`${w.row},${w.col}`);
  w.id = `${w.dir}-${w.num}`;
});

/* ---------------------------------------------------------------------
   3. STATO DEL GIOCO
   --------------------------------------------------------------------- */

const state = {
  letters: new Map(),          // "r,c" -> lettera digitata (unico stato, incroci sincronizzati)
  selected: null,              // { r, c }
  dir: "across",               // direzione attiva
  solved: new Set(),           // id parole corrette
  finished: false,
};

const $ = (id) => document.getElementById(id);
const gridEl = $("grid");
const feedbackEl = $("feedback");
const progressEl = $("progress");
const statusMsgEl = $("statusMsg");
const overlayEl = $("overlay");

const cellEls = new Map();     // "r,c" -> elemento cella
const clueEls = new Map();     // id parola -> elemento li

/* ---------------------------------------------------------------------
   4. RENDER DELLA GRIGLIA
   --------------------------------------------------------------------- */

function renderGrid() {
  gridEl.style.gridTemplateColumns = `repeat(${COLS}, var(--cell, 44px))`;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = `${r},${c}`;
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");

      if (!isWhite(r, c)) {
        cell.classList.add("cell--black");
        cell.setAttribute("aria-hidden", "true");
        cell.tabIndex = -1;
      } else {
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.tabIndex = -1;
        cell.setAttribute("aria-label", `Casella riga ${r + 1}, colonna ${c + 1}`);

        const num = NUMBERS.get(key);
        if (num) {
          const span = document.createElement("span");
          span.className = "cell__num";
          span.textContent = num;
          cell.appendChild(span);
        }
        cell.addEventListener("click", () => onCellClick(r, c));
      }

      gridEl.appendChild(cell);
      cellEls.set(key, cell);
    }
  }
}

/* ---------------------------------------------------------------------
   5. RENDER DELLE DEFINIZIONI
   --------------------------------------------------------------------- */

function renderClues() {
  const acrossList = $("cluesAcross");
  const downList = $("cluesDown");

  WORDS.slice()
    .sort((a, b) => a.num - b.num)
    .forEach((w) => {
      const li = document.createElement("li");
      li.className = "clue";
      li.tabIndex = 0;
      li.dataset.id = w.id;

      const num = document.createElement("span");
      num.className = "clue__num";
      num.textContent = w.num + ".";

      const text = document.createElement("span");
      text.className = "clue__text";
      text.textContent = w.clue;

      li.append(num, text);
      li.addEventListener("click", () => selectWord(w, true));
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectWord(w, true);
        }
      });

      (w.dir === "across" ? acrossList : downList).appendChild(li);
      clueEls.set(w.id, li);
    });
}

/* ---------------------------------------------------------------------
   6. SELEZIONE E EVIDENZIAZIONE
   --------------------------------------------------------------------- */

function currentWord() {
  if (!state.selected) return null;
  const { r, c } = state.selected;
  return wordsAt(r, c).find((w) => w.dir === state.dir) || wordsAt(r, c)[0] || null;
}

function wordCells(w) {
  const cells = [];
  for (let i = 0; i < w.answer.length; i++) {
    const r = w.dir === "across" ? w.row : w.row + i;
    const c = w.dir === "across" ? w.col + i : w.col;
    cells.push({ r, c, key: `${r},${c}`, letter: w.answer[i] });
  }
  return cells;
}

function updateHighlights() {
  const word = currentWord();
  const wordKeys = new Set(word ? wordCells(word).map((x) => x.key) : []);

  cellEls.forEach((el, key) => {
    if (el.classList.contains("cell--black")) return;
    el.classList.remove("cell--active", "cell--selected");
    if (wordKeys.has(key)) el.classList.add("cell--active");
    if (state.selected && key === `${state.selected.r},${state.selected.c}`) {
      el.classList.add("cell--selected");
    }
    el.tabIndex = -1;
  });

  // cella selezionata raggiungibile da tastiera
  if (state.selected) {
    const sel = cellEls.get(`${state.selected.r},${state.selected.c}`);
    if (sel) sel.tabIndex = 0;
  }

  clueEls.forEach((el, id) => {
    el.classList.toggle("clue--selected", !!word && word.id === id);
  });

  updateActiveClue(word);
}

// barra "definizione attiva": utile sul telefono, dove l'elenco è più in basso
function updateActiveClue(word) {
  const box = $("activeClue");
  if (!box) return;
  if (!word) {
    box.hidden = true;
    box.textContent = "";
    return;
  }
  box.hidden = false;
  box.textContent = "";

  const chip = document.createElement("span");
  chip.className = "active-clue__chip";
  chip.textContent = `${word.num} ${word.dir === "across" ? "ORI" : "VER"}`;

  const text = document.createElement("span");
  text.className = "active-clue__text";
  text.textContent = word.clue;

  box.append(chip, text);
  box.classList.toggle("is-done", state.solved.has(word.id));
}

function selectCell(r, c, opts = {}) {
  if (!isWhite(r, c)) return;
  state.selected = { r, c };

  // se la casella non appartiene alla direzione attiva, cambia direzione
  const inDir = wordsAt(r, c).some((w) => w.dir === state.dir);
  if (!inDir) {
    const other = wordsAt(r, c)[0];
    if (other) state.dir = other.dir;
  }

  updateHighlights();
  scrollClueIntoView();

  if (opts.focus !== false) {
    const el = cellEls.get(`${r},${c}`);
    if (el) el.focus({ preventScroll: true });
  }
}

function selectWord(w, focusCell) {
  state.dir = w.dir;
  selectCell(w.row, w.col, { focus: !!focusCell });
  scrollClueIntoView();
}

function scrollClueIntoView() {
  const w = currentWord();
  if (!w) return;
  const li = clueEls.get(w.id);
  if (li) li.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function onCellClick(r, c) {
  const same = state.selected && state.selected.r === r && state.selected.c === c;
  if (same) {
    // secondo click: alterna la direzione se la casella ha entrambe le parole
    const dirs = wordsAt(r, c).map((w) => w.dir);
    if (dirs.length > 1) {
      state.dir = dirs.find((d) => d !== state.dir) || state.dir;
    }
  }
  selectCell(r, c);
}

// tastiera on-screen: comoda su touch, utile anche col mouse
function renderKeyboard() {
  const kb = $("keyboard");
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  letters.forEach((ch) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "kb-key";
    b.textContent = ch;
    b.setAttribute("aria-label", "Lettera " + ch);
    b.addEventListener("click", () => writeLetter(ch));
    kb.appendChild(b);
  });

  const del = document.createElement("button");
  del.type = "button";
  del.className = "kb-key kb-key--del";
  del.textContent = "⌫";
  del.setAttribute("aria-label", "Cancella lettera");
  del.addEventListener("click", () => deleteBackward());
  kb.appendChild(del);
}

/* ---------------------------------------------------------------------
   7. SCRITTURA E NAVIGAZIONE
   --------------------------------------------------------------------- */

function writeLetter(ch) {
  if (!state.selected || state.finished) return;
  const { r, c } = state.selected;
  if (!isWhite(r, c)) return;

  state.letters.set(`${r},${c}`, ch.toUpperCase());
  clearMarks();
  renderLetters();
  updateProgress();

  // avanza alla casella successiva della parola
  const w = currentWord();
  if (w) {
    const cells = wordCells(w);
    const idx = cells.findIndex((x) => x.r === r && x.c === c);
    if (idx > -1 && idx < cells.length - 1) {
      selectCell(cells[idx + 1].r, cells[idx + 1].c);
      return;
    }
  }
  // altrimenti prossima cella nella stessa direzione
  const dr = state.dir === "down" ? 1 : 0;
  const dc = state.dir === "across" ? 1 : 0;
  if (isWhite(r + dr, c + dc)) selectCell(r + dr, c + dc);
}

function deleteBackward() {
  if (!state.selected || state.finished) return;
  const { r, c } = state.selected;
  const key = `${r},${c}`;

  if (state.letters.has(key)) {
    state.letters.delete(key);
    clearMarks();
    renderLetters();
    updateProgress();
    return;
  }

  // torna indietro di una casella e cancella
  const w = currentWord();
  if (w) {
    const cells = wordCells(w);
    const idx = cells.findIndex((x) => x.r === r && x.c === c);
    if (idx > 0) {
      const prev = cells[idx - 1];
      state.letters.delete(prev.key);
      clearMarks();
      renderLetters();
      updateProgress();
      selectCell(prev.r, prev.c);
      return;
    }
  }
  const dr = state.dir === "down" ? -1 : 0;
  const dc = state.dir === "across" ? -1 : 0;
  if (isWhite(r + dr, c + dc)) {
    state.letters.delete(`${r + dr},${c + dc}`);
    clearMarks();
    renderLetters();
    updateProgress();
    selectCell(r + dr, c + dc);
  }
}

function moveSelection(dr, dc) {
  if (!state.selected) {
    selectCell(firstWhite().r, firstWhite().c);
    return;
  }
  let { r, c } = state.selected;
  let guard = 0;
  do {
    r += dr;
    c += dc;
    guard++;
  } while (guard < 60 && !(r < 0 || r >= ROWS || c < 0 || c >= COLS || isWhite(r, c)));

  if (r >= 0 && r < ROWS && c >= 0 && c < COLS && isWhite(r, c)) {
    // muovendo in verticale/horiz. cambia pure direzione
    if (dr !== 0) state.dir = "down";
    if (dc !== 0) state.dir = "across";
    selectCell(r, c);
  }
}

function firstWhite() {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) if (isWhite(r, c)) return { r, c };
  return { r: 0, c: 0 };
}

function renderLetters() {
  cellEls.forEach((el, key) => {
    if (el.classList.contains("cell--black")) return;
    const num = NUMBERS.get(key);
    // teniamo il numero e sovrascriviamo la lettera
    let span = el.querySelector(".cell__letter");
    if (!span) {
      span = document.createElement("span");
      span.className = "cell__letter";
      el.appendChild(span);
    }
    span.textContent = state.letters.get(key) || "";
    if (num && !el.querySelector(".cell__num")) {
      const n = document.createElement("span");
      n.className = "cell__num";
      n.textContent = num;
      el.appendChild(n);
    }
  });
}

// rimuove le classi di verifica (✓ / ✗)
function clearMarks() {
  cellEls.forEach((el) => el.classList.remove("cell--ok", "cell--bad", "cell--done"));
  clueEls.forEach((el) => el.classList.remove("clue--done"));
}

/* ---------------------------------------------------------------------
   8. COMANDI: CONTROLLA / CANCELLA / RIGIOCA
   --------------------------------------------------------------------- */

function setFeedback(text, kind) {
  feedbackEl.textContent = text;
  feedbackEl.className = "feedback" + (kind ? ` feedback--${kind}` : "");
}

function wordValue(w) {
  return wordCells(w)
    .map((x) => (state.letters.get(x.key) || "").toUpperCase())
    .join("");
}

function isWordFilled(w) {
  return wordCells(w).every((x) => (state.letters.get(x.key) || "").trim() !== "");
}

function isWordCorrect(w) {
  return wordValue(w) === w.answer;
}

function updateProgress() {
  const done = WORDS.filter(isWordCorrect).length;
  progressEl.textContent = `${done} / ${TOTAL} parole completate`;

  // barra di avanzamento moderna
  const fill = $("progressFill");
  if (fill) fill.style.width = `${Math.round((done / TOTAL) * 100)}%`;

  WORDS.forEach((w) => {
    const ok = isWordCorrect(w);
    if (ok) state.solved.add(w.id);
    else state.solved.delete(w.id);
    const li = clueEls.get(w.id);
    if (li) li.classList.toggle("clue--done", ok);
  });

  // messaggio ironico in base all'avanzamento
  const idx = Math.min(Math.floor((done / TOTAL) * MESSAGES.length), MESSAGES.length - 1);
  if (!state.finished) statusMsgEl.textContent = MESSAGES[idx];

  return done;
}

function checkAnswers() {
  if (state.finished) return;

  const filled = WORDS.filter(isWordFilled);
  if (filled.length === 0) {
    setFeedback("Prima scrivi qualcosa: la sfera di cristallo non funziona.", "info");
    return;
  }

  let errors = 0;
  let complete = 0;

  clearMarks();

  WORDS.forEach((w) => {
    const cells = wordCells(w);
    if (!isWordFilled(w)) return; // parole incomplete: nessun giudizio

    cells.forEach((x) => {
      const typed = (state.letters.get(x.key) || "").toUpperCase();
      const el = cellEls.get(x.key);
      if (!el) return;
      if (typed === x.letter) {
        el.classList.add("cell--ok");
      } else {
        el.classList.add("cell--bad");
        errors++;
      }
    });

    if (isWordCorrect(w)) complete++;
  });

  // evidenzia anche le parole già corrette anche se non "riempite" ora
  WORDS.forEach((w) => {
    if (isWordCorrect(w)) {
      wordCells(w).forEach((x) => {
        const el = cellEls.get(x.key);
        if (el) {
          el.classList.remove("cell--bad");
          el.classList.add("cell--ok", "cell--done");
        }
      });
    }
  });

  const done = updateProgress();

  if (errors === 0 && complete === TOTAL && done === TOTAL) {
    setFeedback("Tutto corretto. Apri il pacco!", "ok");
    win();
  } else if (errors > 0) {
    setFeedback(
      errors === 1 ? "C'è 1 errore (le caselle segnate con ✗)." : `Ci sono ${errors} errori (caselle ✗).`,
      "bad"
    );
  } else if (complete < TOTAL) {
    const missing = TOTAL - complete;
    setFeedback(
      missing === 1
        ? "Corretto finora, ma manca 1 parola: completala per vincere."
        : `Corretto finora, ma ne mancano ${missing}: completale tutte per vincere.`,
      "info"
    );
  } else {
    setFeedback("Tutto corretto!", "ok");
    win();
  }
}

function clearActiveWord() {
  const w = currentWord();
  if (!w || state.finished) {
    setFeedback("Seleziona prima una parola da cancellare.", "info");
    return;
  }
  wordCells(w).forEach((x) => state.letters.delete(x.key));
  clearMarks();
  renderLetters();
  updateProgress();
  setFeedback(`Parola ${w.num} ${w.dir === "across" ? "orizzontale" : "verticale"} cancellata.`, "info");
}

function resetGame() {
  state.letters.clear();
  state.solved.clear();
  state.finished = false;
  state.selected = null;
  state.dir = "across";
  clearMarks();
  renderLetters();
  updateProgress();
  setFeedback("Griglia azzerata. In bocca al lupo!", "info");
  overlayEl.hidden = true;
  stopConfetti();
  document.getElementById("gioco").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------------------------------------------------------------------
   9. VITTORIA E CORIANDOLI
   --------------------------------------------------------------------- */

let confettiTimer = null;

function spawnConfetti() {
  const box = $("confetti");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  const colors = ["#d4a537", "#f7f1e3", "#2e7d4f", "#b3413a", "#2c3a63", "#f0d9a0"];
  box.innerHTML = "";

  const burst = () => {
    for (let i = 0; i < 40; i++) {
      const s = document.createElement("span");
      s.style.left = Math.random() * 100 + "vw";
      s.style.background = colors[Math.floor(Math.random() * colors.length)];
      s.style.animationDuration = 2.6 + Math.random() * 2.4 + "s";
      s.style.animationDelay = Math.random() * 0.6 + "s";
      s.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(s);
    }
  };

  burst();
  confettiTimer = setInterval(burst, 3500);
}

function stopConfetti() {
  if (confettiTimer) clearInterval(confettiTimer);
  confettiTimer = null;
  const box = $("confetti");
  if (box) box.innerHTML = "";
}

function win() {
  if (state.finished) return;
  state.finished = true;
  WORDS.forEach((w) => {
    state.solved.add(w.id);
    wordCells(w).forEach((x) => {
      const el = cellEls.get(x.key);
      if (el) {
        el.classList.remove("cell--bad", "cell--active", "cell--selected");
        el.classList.add("cell--done", "cell--ok");
      }
    });
    const li = clueEls.get(w.id);
    if (li) li.classList.add("clue--done");
  });

  statusMsgEl.textContent = "Missione completata: il regalo è tuo!";
  setFeedback("Cruciverba risolto. Sorpresa!", "ok");

  overlayEl.hidden = false;
  spawnConfetti();
  document.getElementById("btnReplay").focus({ preventScroll: true });
}

/* ---------------------------------------------------------------------
   10. EVENTI
   --------------------------------------------------------------------- */

document.addEventListener("keydown", (e) => {
  // il tasto è per l'overlay aperto?
  if (!overlayEl.hidden) {
    if (e.key === "Escape") closeOverlay();
    return;
  }

  const target = e.target;
  const inGrid = target && target.classList && target.classList.contains("cell");

  if (e.key === "Enter" || e.key === " ") {
    if (inGrid) {
      e.preventDefault();
      if (state.selected) {
        const dirs = wordsAt(state.selected.r, state.selected.c).map((w) => w.dir);
        if (dirs.length > 1) {
          state.dir = dirs.find((d) => d !== state.dir) || state.dir;
          updateHighlights();
        }
      }
      return;
    }
    // sui pulsanti/definizioni lasciamo comportamento standard
    return;
  }

  if (e.key === "Backspace") {
    if (inGrid || state.selected) {
      e.preventDefault();
      deleteBackward();
    }
    return;
  }

  if (e.key === "Delete") {
    if (inGrid || state.selected) {
      e.preventDefault();
      clearActiveWord();
    }
    return;
  }

  const arrows = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  };
  if (arrows[e.key]) {
    if (inGrid || state.selected) {
      e.preventDefault();
      moveSelection(arrows[e.key][0], arrows[e.key][1]);
    }
    return;
  }

  if (/^[a-zA-ZàèéìòùÀÈÉÌÒÙ]$/.test(e.key)) {
    if (inGrid || state.selected) {
      e.preventDefault();
      writeLetter(e.key);
    }
  }
});

// niente menu contestuale di copia sulle caselle: le lettere si digitano in griglia
gridEl.addEventListener("contextmenu", (e) => {
  if (e.target.classList.contains("cell")) e.preventDefault();
});

$("btnCheck").addEventListener("click", checkAnswers);
$("btnClear").addEventListener("click", clearActiveWord);
$("btnReset").addEventListener("click", resetGame);
$("btnReplay").addEventListener("click", resetGame);
$("btnClose").addEventListener("click", () => {
  overlayEl.hidden = true;
  stopConfetti();
  document.getElementById("gioco").scrollIntoView({ behavior: "smooth" });
});

function closeOverlay() {
  overlayEl.hidden = true;
  stopConfetti();
  $("btnCheck").focus({ preventScroll: true });
}

// focus sull'overlay: trappola base per tastiera
overlayEl.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const focusables = overlayEl.querySelectorAll("button");
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

/* ---------------------------------------------------------------------
   11. AVVIO
   --------------------------------------------------------------------- */

renderGrid();
renderClues();
renderKeyboard();
renderLetters();
updateProgress();

// selezione iniziale sulla prima parola (senza scrivere)
selectCell(firstWhite().r, firstWhite().c, { focus: false });
setFeedback("Seleziona una casella e inizia a scrivere.", "info");

// elenco definizioni: su telefono è chiuso di default (lo spazio serve alla
// griglia), su schermi grandi resta aperto. Si sincronizza al cambio layout.
const cluesBox = document.getElementById("cluesBox");
if (cluesBox && typeof window.matchMedia === "function") {
  const mqMobile = window.matchMedia("(max-width: 640px)");
  const syncCluesBox = () => { cluesBox.open = !mqMobile.matches; };
  syncCluesBox();
  if (typeof mqMobile.addEventListener === "function") {
    mqMobile.addEventListener("change", syncCluesBox);
  } else if (typeof mqMobile.addListener === "function") {
    mqMobile.addListener(syncCluesBox); // Safari ≤13
  }
}

// verifica di sviluppo: incroci coerenti
WORDS.forEach((w) => {
  wordCells(w).forEach((x) => {
    if (solution.get(x.key) !== x.letter) {
      console.error(`Incoerenza alla casella ${x.key} per la parola ${w.answer}`);
    }
  });
});
