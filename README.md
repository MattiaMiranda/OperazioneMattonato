# Operazione Mattonato 🎂

Cruciverba interattivo di compleanno: 10 parole da indovinare per scoprire il regalo.

Costruito solo con **HTML, CSS e JavaScript vanilla** — nessuna dipendenza, nessun build.

## Gioca

Apri `index.html` con qualsiasi browser, oppure visita il sito pubblicato su GitHub Pages.

## Struttura

| File | Ruolo |
| --- | --- |
| `index.html` | struttura della pagina (intro, cruciverba, voucher finale) |
| `style.css` | stile moderno, responsive e ottimizzato per il telefono |
| `script.js` | griglia, selezione, controllo delle risposte, vittoria |
| `images/` | logo tondo, favicon e icone (generate da `faccia.png` con `make-images.js`) |

## Sviluppo

- `node make-images.js` → rigenera logo e icone da `faccia.png` (serve `npm i sharp`)
- `npm i jsdom --no-save && node smoke-test.js` → verifica griglia, definizioni, selezione e che nessuna definizione contenga una risposta
- `node verifica-finale.js` → verifica numerazione, copertura delle caselle, che il regalo resti nascosto fino a 10 parole su 10 e la vittoria finale

## Regole

- Clicca una casella e scrivi (tastiera fisica o tastiera a schermo)
- Doppio clic / `Invio` cambia direzione (orizzontale ↔ verticale)
- `CONTROLLA` segnala gli errori senza svelare la soluzione
- La schermata finale appare **solo** con tutte le 10 parole corrette

Organizzato da Tia, Mario, Aldo e Trova.
