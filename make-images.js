// Genera le versioni ottimizzate del logo (avatar, icone)
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "faccia.png");
const OUT = path.join(__dirname, "images");
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  // 1) ritaglia i bordi trasparenti
  const trimmed = await sharp(SRC).trim().toBuffer({ resolveWithObject: true });
  console.log("ritagliato:", trimmed.info.width + "x" + trimmed.info.height);

  const square = () =>
    sharp(trimmed.data).resize(512, 512, { fit: "cover", position: "attention" });

  // 2) logo per il sito: l'intero viso ritagliato, sfondo trasparente (nessun cerchio)
  const logo = await sharp(trimmed.data)
    .resize({ width: 640 })
    .webp({ quality: 86, alphaQuality: 90 })
    .toBuffer({ resolveWithObject: true });
  await fs.promises.writeFile(path.join(OUT, "faccia.webp"), logo.data);

  const raw = await sharp(logo.data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let trasparenti = 0;
  for (let i = 3; i < raw.data.length; i += raw.info.channels) if (raw.data[i] < 128) trasparenti++;
  const tot = raw.info.width * raw.info.height;
  console.log(
    "faccia.webp:", logo.data.length, "byte,",
    logo.info.width + "x" + logo.info.height + ",",
    "trasparente " + ((100 * trasparenti) / tot).toFixed(1) + "%"
  );

  // 3) icona per la barra del browser (sfondo blu notte, niente trasparenze)
  await sharp(trimmed.data)
    .resize(64, 64, { fit: "cover", position: "attention" })
    .flatten({ background: "#0f1830" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, "favicon.png"));
  console.log("favicon.png:", fs.statSync(path.join(OUT, "favicon.png")).size, "byte");

  // 4) icona per la schermata home (iPhone/Android)
  await sharp(trimmed.data)
    .resize(180, 180, { fit: "cover", position: "attention" })
    .flatten({ background: "#0f1830" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, "apple-touch-icon.png"));
  console.log("apple-touch-icon.png:", fs.statSync(path.join(OUT, "apple-touch-icon.png")).size, "byte");
})().catch((e) => {
  console.error("ERRORE:", e.message);
  process.exit(1);
});
