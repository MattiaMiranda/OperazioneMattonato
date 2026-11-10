// Test rapido: apre index.html in jsdom e verifica che il gioco funzioni
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const js = fs.readFileSync(path.join(__dirname, "script.js"), "utf8");

const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true });
const { window } = dom;
// jsdom non implementa scrollIntoView: lo neutralizziamo (esiste solo nei browser)
window.HTMLElement.prototype.scrollIntoView = function () {};
// matchMedia simulato: di default desktop, poi nel test passiamo a "telefono"
let isMobile = false;
window.matchMedia = (q) => ({
  media: q,
  matches: /max-width/.test(q) ? isMobile : false,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
});
const errors = [];
window.addEventListener("error", (e) => errors.push(String(e.error || e.message)));

try {
  window.eval(js);
} catch (e) {
  errors.push("ECCEZIONE: " + e.message);
}

const doc = window.document;
const fail = (msg) => { console.error("FALLITO: " + msg); process.exitCode = 1; };

if (errors.length) fail(errors.join("\n"));

const cells = doc.querySelectorAll(".cell");
const white = doc.querySelectorAll(".cell:not(.cell--black)");
const black = doc.querySelectorAll(".cell--black");
console.log("caselle totali:", cells.length, "| bianche:", white.length, "| nere:", black.length);
if (cells.length !== 121) fail("la griglia non è 11x11");

const cluesAcross = doc.querySelectorAll("#cluesAcross .clue");
const cluesDown = doc.querySelectorAll("#cluesDown .clue");
console.log("definizioni:", cluesAcross.length + cluesDown.length, "(" + cluesAcross.length + " oriz + " + cluesDown.length + " vert)");
if (cluesAcross.length + cluesDown.length !== 9) fail("attese 9 definizioni");

const kb = doc.querySelectorAll(".kb-key");
console.log("tasti tastiera:", kb.length);
if (kb.length < 26) fail("tastiera incompleta");

const box = doc.getElementById("cluesBox");
if (!box || !box.tagName || box.tagName.toLowerCase() !== "details") fail("cluesBox non è <details>");
console.log("cluesBox open (desktop):", box && box.open);

// nessuna definizione contiene una risposta come testo
const soluzioni = ["NEVE", "BAGNO", "BUDAPEST", "RELAX", "AMICI", "CENA", "PISCINA", "TERME", "REGALO"];
const defs = [...cluesAcross, ...cluesDown].map((li) => li.textContent.toUpperCase());
for (const def of defs) {
  for (const s of soluzioni) {
    if (def.includes(s)) fail(`definizione "${def}" contiene la risposta ${s}`);
  }
}

// selezione: clic su una casella
const first = [...white][0];
first.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
const active = doc.querySelectorAll(".cell--active, .cell--selected");
console.log("caselle evidenziate dopo click:", active.length);
if (!active.length) fail("nessuna selezione dopo il click");

const ac = doc.getElementById("activeClue");
if (ac.hasAttribute("hidden")) fail("definizione attiva nascosta dopo il click");
console.log("definizione attiva:", ac.textContent.trim().slice(0, 60));

console.log(process.exitCode ? "\n>>> CI SONO ERRORI" : "\n>>> TUTTO OK");

/* ---- scenario 2: apertura come se fosse un telefono (max-width 640) ---- */
{
  isMobile = true;
  const dom2 = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true });
  dom2.window.HTMLElement.prototype.scrollIntoView = function () {};
  dom2.window.matchMedia = window.matchMedia;
  try {
    dom2.window.eval(js);
  } catch (e) {
    fail("ECCEZIONE in modalità telefono: " + e.message);
  }
  const box2 = dom2.window.document.getElementById("cluesBox");
  console.log("[telefono] cluesBox open:", box2.open);
  if (box2.open) fail("su telefono l'elenco definizioni dovrebbe partire chiuso");
}
