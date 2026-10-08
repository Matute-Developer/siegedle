// Servidor único: sirve el frontend estático (..) + API /api/*.
// Sin dependencias. Puerto por defecto 3000: node server.js --port 3000

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { iniciarBD } from "./src/db.js";
import { crearRouter } from "./src/router.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTAL = path.join(__dirname, ".."); // raíz del proyecto (index.html)
const PUERTO = Number(process.argv.find((a) => a.startsWith("--port="))?.split("=")[1] || process.env.PORT || 3000);

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

function servirEstatico(req, res) {
  const url = new URL(req.url, "http://local");
  let relativo = decodeURIComponent(url.pathname);
  if (relativo === "/") relativo = "/index.html";
  // Bloquea rutas internas del backend.
  if (relativo.startsWith("/backend/")) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Acceso denegado." }));
    return true;
  }
  const ruta = path.normalize(path.join(FRONTAL, relativo));
  if (!ruta.startsWith(FRONTAL) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) return false;
  res.writeHead(200, { "Content-Type": TIPOS[path.extname(ruta)] || "application/octet-stream" });
  fs.createReadStream(ruta).pipe(res);
  return true;
}

const router = crearRouter();
await iniciarBD();

http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (req.url.startsWith("/api/")) {
    router.atender(req, res);
    return;
  }
  if (req.method === "GET" && servirEstatico(req, res)) return;

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "No encontrado." }));
}).listen(PUERTO, () => {
  console.log(`SIEGE DLE backend en http://localhost:${PUERTO}`);
  console.log(`Frontal: ${FRONTAL}`);
});
