// Repositorio de operadores: única puerta de acceso a datos.
// Si mañana cambias SQLite por otra BD, solo tocas db.js, no las rutas.

import { todosOperadores, operadorPorId } from "./db.js";

const BANDOS = new Set(["atacante", "defensor"]);

export function repositorioOperadores() {
  return {
    listar(bando = null) {
      if (bando && !BANDOS.has(bando)) {
        const error = new Error("Bando no válido. Usa atacante o defensor.");
        error.codigo = 400;
        throw error;
      }
      return todosOperadores(bando);
    },
    obtener(id) {
      const op = operadorPorId(id);
      if (!op) {
        const error = new Error("Operador no encontrado.");
        error.codigo = 404;
        throw error;
      }
      return op;
    }
  };
}
