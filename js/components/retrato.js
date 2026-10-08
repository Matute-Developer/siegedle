/* Retrato del operador: primero la imagen local (campo iconoLocal, p. ej. carpeta imagenes/),
   si no hay usa la remota de config.iconosBase, y si tampoco hay muestra iniciales. */
(function () {
  function urlLocal(op) {
    return op && op.iconoLocal ? op.iconoLocal : null;
  }

  function urlRemota(op) {
    if (!op || !op.icono) return null;
    return (window.SIEGE_DLE.config.iconosBase || "") + op.icono;
  }

  function iniciales(nombre) {
    return (nombre || "?").slice(0, 2).toUpperCase();
  }

  // anillo: "ok" | "bad" | "" — pinta el borde según veredicto.
  function retratoHTML(op, anillo = "") {
    const clase = `retrato${op.bando === "defensor" ? " def" : ""}${anillo ? " " + anillo : ""}`;
    const local = urlLocal(op);
    const remota = urlRemota(op);
    const primera = local || remota;
    if (!primera) {
      return `<span class="${clase} sin-img"><span class="retrato__ini">${iniciales(op.nombre)}</span></span>`;
    }
    const planB = local && remota ? ` data-remota="${remota}"` : "";
    return `<span class="${clase}"><img src="${primera}" alt="Retrato de ${op.nombre}" loading="lazy"${planB} onerror="SIEGE_DLE.retrato.fallo(this)" /><span class="retrato__ini">${iniciales(op.nombre)}</span></span>`;
  }

  function fallo(img) {
    const remota = img.getAttribute("data-remota");
    if (remota && !img.dataset.probada) {
      img.dataset.probada = "1";
      img.src = remota;
      return;
    }
    const caja = img.parentElement;
    if (caja) caja.classList.add("sin-img");
    img.remove();
  }

  window.SIEGE_DLE = window.SIEGE_DLE || {};
  window.SIEGE_DLE.retrato = { retratoHTML, urlRemota, fallo };
})();
