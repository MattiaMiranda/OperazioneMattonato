// Verifica approfondita: numerazione, copertura celle, no-leak, vittoria a 10.
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const js = fs.readFileSync(path.join(__dirname, "script.js"), "utf8");

const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true });
const { window } = dom;
window.HTMLElement.prototype.scrollIntoView = function () {};
window.matchMedia = (q) => ({
  media: q, matches: false,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
});
const errors = [];
window.addEventListener("error", (e) => errors.push(String(e.error || e.message)));
const consoleErr = [];
const origError = console.error;
console.error = (...a) => { consoleErr.push(a.join(" ")); origError(...a); };

// bridge: espone gli interni (const/let non sono accessibili da eval successivi)
const BRIDGE = `
;window.__t = {
  state, WORDS, ROWS, COLS, NUMBERS,
  checkAnswers, renderLetters, updateProgress, isWhite, wordsAt
};`;
window.eval(js + BRIDGE);
const T = window.__t;

const doc = window.document;
let ko = 0;
const check = (ok, msg) => { console.log((ok ? "  ✓ " : "  ✗ ") + msg); if (!ok) ko++; };

// 1) Ogni parola ha un numero e un id definiti
const parsed = T.WORDS.map((w) => ({ a: w.answer, num: w.num, id: w.id }));
console.log("1) Numerazione delle parole:");
check(parsed.every((w) => w.num != null && !isNaN(w.num)), "tutte le parole hanno un numero");
check(parsed.every((w) => w.id && !w.id.includes("undefined")), "id parole senza 'undefined'");
// numeri univoci per casella di inizio (BAGNO e BUDAPEST condividono la stessa casella)
const startNums = new Map();
let sharedOk = true;
T.WORDS.forEach((w) => {
  const k = `${w.row},${w.col}`;
  if (startNums.has(k)) { if (startNums.get(k) !== w.num) sharedOk = false; }
  else startNums.set(k, w.num);
});
const numsList = [...startNums.values()].sort((a, b) => a - b);
check(sharedOk && numsList.every((n, i) => n === i + 1), `numeri consecutivi 1-${numsList.length} sulle caselle di inizio`);
check(startNums.size === 9, `9 caselle numerate per 10 parole (condivisa BAGNO/BUDAPEST)`);
console.log("   " + parsed.map((w) => `${w.num}:${w.a}`).join("  "));

// 2) Ogni casella bianca appartiene ad almeno una parola (niente orfane)
const orphans = [];
for (let r = 0; r < T.ROWS; r++)
  for (let c = 0; c < T.COLS; c++)
    if (T.isWhite(r, c) && T.wordsAt(r, c).length === 0) orphans.push(r + "," + c);
console.log("2) Copertura caselle:");
check(orphans.length === 0, "nessuna casella bianca orfana" + (orphans.length ? " → " + orphans.join(" ") : ""));

// 3) Numeri visualizzati in griglia = inizi parola distinti (BAGNO/BUDAPEST condividono)
const numsShown = doc.querySelectorAll(".cell__num").length;
console.log("3) Numeri in griglia:");
check(numsShown === 9, `9 numeri visualizzati (attesi 9, trovati ${numsShown})`);

// 4) Definizione di PUTTANA presente e senza risposta nel testo
const allClues = [...doc.querySelectorAll("#cluesAcross .clue, #cluesDown .clue")];
const puttana = allClues.find((li) => /verginit/i.test(li.textContent));
console.log("4) Definizione PUTTANA:");
check(!!puttana, "definizione presente nell'elenco");
check(puttana && !/PUTTANA/i.test(puttana.textContent), "non contiene la risposta");
check(!!T.WORDS.find((w) => w.answer === "PUTTANA"), "parola PUTTANA in WORDS");

// 5) Riempimento parziale (9 parole su 10): il regalo NON deve apparire
const giftOutsideOverlay = (() => {
  const tmp = doc.createElement("div");
  tmp.innerHTML = doc.body.innerHTML;
  // rimuovi l'overlay dal clone: il testo del regalo non deve restare altrove
  const ov = tmp.querySelector("#overlay");
  if (ov) ov.remove();
  return /TERME/i.test(tmp.textContent) && /BUDAPEST/i.test(tmp.textContent);
})();
T.state.letters.clear();
T.WORDS.filter((w) => w.answer !== "PUTTANA").forEach((w) =>
  [...w.answer].forEach((ch, i) => {
    const r = w.dir === "across" ? w.row : w.row + i;
    const c = w.dir === "across" ? w.col + i : w.col;
    T.state.letters.set(r + "," + c, ch);
  }));
T.renderLetters();
T.updateProgress();
T.checkAnswers();
const overlay1 = doc.getElementById("overlay");
console.log("5) Nove parole su dieci (PUTTANA mancante):");
check(overlay1.hidden === true, "overlay del regalo ancora nascosto");
check(!giftOutsideOverlay, "testo del regalo presente SOLO dentro l'overlay");
const prog1 = doc.getElementById("progress").textContent;
check(prog1.startsWith("9 / 10"), `progresso = "${prog1}"`);
const fb1 = doc.getElementById("feedback").textContent;
check(/manca 1 parola|ne mancano/i.test(fb1), `feedback: "${fb1}"`);

// 6) Completamento con PUTTANA: vittoria
const puttanaWord = T.WORDS.find((x) => x.answer === "PUTTANA");
[...puttanaWord.answer].forEach((ch, i) =>
  T.state.letters.set(puttanaWord.row + i + "," + puttanaWord.col, ch));
T.renderLetters();
T.updateProgress();
T.checkAnswers();
console.log("6) Dieci parole completate:");
check(overlay1.hidden === false, "overlay del regalo visibile");
check(/BUDAPEST/i.test(overlay1.textContent), "regalo rivelato solo ora");
check(doc.getElementById("progress").textContent.startsWith("10 / 10"), "progresso 10 / 10");
check(doc.getElementById("feedback").classList.contains("feedback--ok"), "feedback di vittoria");

console.log("\nerrori JS:", errors.length ? errors : "nessuno");
console.log("console.error incroci:", consoleErr.length ? consoleErr : "nessuno");
if (errors.length || consoleErr.length) ko++;

console.log(ko === 0 ? "\n>>> VERIFICA COMPLETA: TUTTO OK" : `\n>>> ${ko} PROBLEMI`);
// i confetti usano setInterval: usciamo esplicitamente
process.exit(ko ? 1 : 0);
