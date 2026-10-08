// Enrutador de la API v1. Sin dependencias: solo http nativo.
// Para añadir un recurso nuevo: crea su repo y añade una entrada aquí.

import { repositorioOperadores } from "./operators.repo.js";
import { guardarIntento, listarIntentos, infoMotor } from "./db.js";

function cuerpoJson(req) {
  return new Promise((resolve, reject) => {
    let datos = "";
    req.on("data", (t) => { datos += t; });
    req.on("end", () => {
      if (!datos) return resolve({});
      try { resolve(JSON.parse(datos)); }
      catch { reject(Object.assign(new Error("Cuerpo JSON no válido."), { codigo: 400 })); }
    });
  });
}

export function crearRouter() {
  const ops = repositorioOperadores();

  return {
    async atender(req, res) {
      const url = new URL(req.url, "http://local");
      const metodo = req.method.toUpperCase();
      const ruta = url.pathname.replace(/\/$/, "") || "/";

      const enviar = (codigo, objeto) => {
        res.writeHead(codigo, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(objeto));
      };

      try {
        // Salud del servicio
        if (ruta === "/api/salud" && metodo === "GET") {
          return enviar(200, { ok: true, servicio: "siege-dle", version: "0.6.0", ...infoMotor() });
        }

        // Lista con filtro opcional ?bando=atacante|defensor
        if (ruta === "/api/operadores" && metodo === "GET") {
          const lista = ops.listar(url.searchParams.get("bando"));
          return enviar(200, { datos: lista, total: lista.length, origen: infoMotor().motor });
        }

        // Detalle /api/operadores/:id
        if (ruta.startsWith("/api/operadores/") && metodo === "GET") {
          const id = decodeURIComponent(ruta.slice("/api/operadores/".length));
          return enviar(200, { datos: ops.obtener(id) });
        }

        // Registro de intentos (preparado para estadísticas futuras)
        if (ruta === "/api/intentos" && metodo === "POST") {
          const cuerpo = await cuerpoJson(req);
          if (!cuerpo.operador_id) {
            return enviar(400, { error: "Falta operador_id." });
          }
          ops.obtener(cuerpo.operador_id); // valida que exista
          const fila = guardarIntento(cuerpo.operador_id);
          return enviar(201, { datos: fila });
        }

        if (ruta === "/api/intentos" && metodo === "GET") {
          return enviar(200, { datos: listarIntentos(50) });
        }

        return enviar(404, { error: "Ruta no encontrada." });
      } catch (e) {
        return enviar(e.codigo || 500, { error: e.message || "Error interno." });
      }
    }
  };
}
