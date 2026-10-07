/* Servicio de API. Única pieza del frontal que habla con el backend.
   Con reserva automática: si el backend no responde, usa los datos locales.
   Uso: await SIEGE_DLE.api.cargarOperadores() */
(function () {
  const BASE = ""; // misma origen: http://localhost:3000/api/...

  async function desdeBackend() {
    const res = await fetch(`${BASE}/api/operadores`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.datos)) throw new Error("Formato inesperado");
    return { datos: json.datos, origen: json.origen || "api" };
  }

  // Campos mínimos que el frontal necesita. Si el backend tiene datos viejos
  // (p. ej. siege.db de una versión anterior), se usa la reserva local.
  function esquemaValido(lista) {
    return lista.length > 0 && lista.every((o) => o && o.id && o.nombre && o.bando && o.rol && o.gadget && o.anio !== undefined);
  }

  async function cargarOperadores() {
    try {
      const r = await desdeBackend();
      if (!esquemaValido(r.datos)) throw new Error("Esquema desactualizado");
      window.SIEGE_DLE.operators = r.datos;
      return { origen: "api:" + r.origen, total: r.datos.length };
    } catch {
      // Reserva local: js/data/operators.js ya cargado.
      const total = (window.SIEGE_DLE.operators || []).length;
      return { origen: "local", total };
    }
  }

  async function registrarIntento(operadorId) {
    try {
      await fetch(`${BASE}/api/intentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operador_id: operadorId })
      });
    } catch {
      // Silencioso: el juego sigue funcionando sin backend.
    }
  }

  window.SIEGE_DLE = window.SIEGE_DLE || {};
  window.SIEGE_DLE.api = { cargarOperadores, registrarIntento };
})();
