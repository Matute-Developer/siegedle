// Capa de base de datos ligera.
// Intenta SQLite nativo (node:sqlite, Node 22+). Si no está disponible, usa JSON local.
// Interfaz única para el resto del backend: da igual qué motor esté activo.

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DB_PATH = path.join(ROOT, "siege.db");
const JSON_PATH = path.join(ROOT, "data", "db.json");
const SCHEMA_PATH = path.join(ROOT, "data", "schema.sql");
const SEED_PATH = path.join(ROOT, "data", "seed.json");

let motor = "json";
let sqlite = null;
let memoria = { operadores: [], intentos: [], semilla: null };

// Huella de seed.json: si cambian los datos, la base se actualiza sola al arrancar.
function huellaSeed() {
  return createHash("sha1").update(fs.readFileSync(SEED_PATH)).digest("hex").slice(0, 12);
}

function leerSeed() {
  return JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));
}

function sembrarSqlite(semilla) {
  const insert = sqlite.prepare(
    "INSERT INTO operadores (id, nombre, bando, rol, sexo, continente, anio, velocidad, gadget, unidad, icono, icono_local) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const op of semilla) {
    insert.run(op.id, op.nombre, op.bando, op.rol, op.sexo, op.continente, op.anio, op.velocidad, op.gadget, op.unidad, op.icono || null, op.iconoLocal || null);
  }
}

function guardarJson() {
  fs.writeFileSync(JSON_PATH, JSON.stringify(memoria, null, 2), "utf8");
}

function cargarJson() {
  const huella = huellaSeed();
  if (fs.existsSync(JSON_PATH)) {
    memoria = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
    if (!Array.isArray(memoria.intentos)) memoria.intentos = [];
  } else {
    memoria = { operadores: [], intentos: [], semilla: null };
  }
  // Datos nuevos o desactualizados: se recargan solos, los intentos se conservan.
  if (memoria.semilla !== huella) {
    memoria.operadores = leerSeed();
    memoria.semilla = huella;
    guardarJson();
  }
}

async function iniciarSqlite() {
  const mod = await import("node:sqlite");
  const { DatabaseSync } = mod;
  sqlite = new DatabaseSync(DB_PATH);
  const esquema = fs.readFileSync(SCHEMA_PATH, "utf8");
  sqlite.exec(esquema);
  sqlite.exec("CREATE TABLE IF NOT EXISTS meta (clave TEXT PRIMARY KEY, valor TEXT)");
  // Migración tolerante para bases creadas con esquemas anteriores.
  try { sqlite.exec("ALTER TABLE operadores ADD COLUMN icono_local TEXT"); } catch { /* ya existe */ }
  const huella = huellaSeed();
  const fila = sqlite.prepare("SELECT valor FROM meta WHERE clave = 'semilla'").get();
  // Primera vez o datos nuevos: se recargan solos, los intentos se conservan.
  if (!fila || fila.valor !== huella) {
    sqlite.exec("DELETE FROM operadores");
    sembrarSqlite(leerSeed());
    sqlite.prepare("INSERT INTO meta (clave, valor) VALUES ('semilla', ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor").run(huella);
  }
  motor = "sqlite";
}

export async function iniciarBD() {
  try {
    await iniciarSqlite();
  } catch {
    // Node <22 o sin SQLite: reserva en JSON, misma interfaz.
    cargarJson();
    motor = "json";
  }
  return { motor, ruta: motor === "sqlite" ? DB_PATH : JSON_PATH };
}

export function infoMotor() {
  return { motor };
}

const COLUMNAS = "id, nombre, bando, rol, sexo, continente, anio, velocidad, gadget, unidad, icono, icono_local AS iconoLocal";

export function todosOperadores(bando = null) {
  if (motor === "sqlite") {
    if (bando) return sqlite.prepare(`SELECT ${COLUMNAS} FROM operadores WHERE bando = ? ORDER BY nombre`).all(bando);
    return sqlite.prepare(`SELECT ${COLUMNAS} FROM operadores ORDER BY nombre`).all();
  }
  const ops = memoria.operadores;
  const lista = bando ? ops.filter((o) => o.bando === bando) : [...ops];
  return lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export function operadorPorId(id) {
  if (motor === "sqlite") {
    return sqlite.prepare(`SELECT ${COLUMNAS} FROM operadores WHERE id = ?`).get(id) || null;
  }
  return memoria.operadores.find((o) => o.id === id) || null;
}

export function guardarIntento(operadorId) {
  const fecha = new Date().toISOString();
  if (motor === "sqlite") {
    const r = sqlite.prepare("INSERT INTO intentos (operador_id, fecha) VALUES (?, ?)").run(operadorId, fecha);
    return { id: Number(r.lastInsertRowid), operador_id: operadorId, fecha };
  }
  const id = memoria.intentos.length + 1;
  const fila = { id, operador_id: operadorId, fecha };
  memoria.intentos.push(fila);
  guardarJson();
  return fila;
}

export function listarIntentos(limite = 50) {
  if (motor === "sqlite") {
    return sqlite.prepare("SELECT * FROM intentos ORDER BY id DESC LIMIT ?").all(limite);
  }
  return [...memoria.intentos].reverse().slice(0, limite);
}
