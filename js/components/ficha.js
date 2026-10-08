/* Ficha breve del operador: se abre al pulsar una tarjeta de la galería
   (vista Operadores). Muestra el retrato completo del operador y los datos
   de la base; los rasgos internos de composición nunca se muestran. */
(function () {
  let ultimoFoco = null;
  let actual = null;

  function ops() { return window.SIEGE_DLE.operators || []; }
  function porId(id) { return ops().find((o) => o.id === id); }

  function esc(v) {
    return String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  // Retrato completo dentro de la ficha; si no hay (o falla la descarga) se
  // devuelve al avatar circular del operador.
  function retratoFicha(op) {
    if (!op.retrato) return window.SIEGE_DLE.retrato.retratoHTML(op);
    return `<img class="ficha__retrato-img" src="${esc(op.retrato)}" alt="Retrato de ${esc(op.nombre)}" onerror="SIEGE_DLE.ficha.falloRetrato()" />`;
  }

  function falloRetrato() {
    const cont = document.getElementById("ficha-retrato");
    if (cont && actual) cont.innerHTML = window.SIEGE_DLE.retrato.retratoHTML(actual);
  }

  function fila(etiqueta, valor) {
    if (valor === undefined || valor === null || valor === "") return "";
    return `<div class="ficha__fila"><dt>${etiqueta}</dt><dd>${valor}</dd></div>`;
  }

  function chips(gadget) {
    const lista = String(gadget || "").split(",").map((g) => esc(g.trim())).filter(Boolean);
    if (!lista.length) return "";
    return `<span class="ficha__chips">${lista.map((g) => `<span class="ficha__chip">${g}</span>`).join("")}</span>`;
  }

  function rellenar(op) {
    const T = window.SIEGE_DLE.textos.etiquetasFicha;
    actual = op;
    const bando = document.getElementById("ficha-bando");
    bando.className = `bando ${op.bando}`;
    bando.textContent = op.bando === "atacante" ? T.atacante : T.defensor;
    document.getElementById("ficha-retrato").innerHTML = retratoFicha(op);
    // Se fuerza la carga: con loading="lazy" dentro de un modal puede no dispararse.
    const imgFicha = document.querySelector("#ficha-retrato img");
    if (imgFicha) imgFicha.loading = "eager";
    document.getElementById("ficha-titulo").textContent = op.nombre;
    document.getElementById("ficha-unidad").textContent = op.unidad || "";
    const puntos = "●".repeat(op.velocidad) + "○".repeat(Math.max(0, 3 - op.velocidad));
    document.getElementById("ficha-datos").innerHTML = [
      fila(T.rol, esc(op.rol)),
      fila(T.gadgets, chips(op.gadget)),
      fila(T.velocidad, `<span class="ficha__vel">${puntos}</span>`),
      fila(T.anio, esc(op.anio)),
      fila(T.sexo, esc(op.sexo)),
      fila(T.region, esc(op.continente))
    ].join("");
  }

  function abrir(op) {
    const modal = document.getElementById("modal-ficha");
    if (!modal || !op) return;
    ultimoFoco = document.activeElement;
    // Se muestra primero: si el modal sigue oculto, la imagen con loading="lazy"
    // no tiene caja y nunca empieza a descargar.
    modal.hidden = false;
    rellenar(op);
    const btn = document.getElementById("btn-cerrar-ficha");
    if (btn) btn.focus();
  }

  function cerrar() {
    const modal = document.getElementById("modal-ficha");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    const actual = document.activeElement;
    const volverA = ultimoFoco && ultimoFoco !== document.body && document.contains(ultimoFoco) ? ultimoFoco : null;
    if (volverA) volverA.focus();
    else if (actual && actual !== document.body && typeof actual.blur === "function") actual.blur();
    ultimoFoco = null;
  }

  function init() {
    const grid = document.getElementById("ops-grid");
    if (grid) {
      grid.addEventListener("click", (e) => {
        const tarjeta = e.target.closest("[data-op]");
        if (!tarjeta) return;
        const op = porId(tarjeta.dataset.op);
        if (op) abrir(op);
      });
    }
    const btnCerrar = document.getElementById("btn-cerrar-ficha");
    if (btnCerrar) btnCerrar.addEventListener("click", cerrar);
    const fondo = document.getElementById("modal-ficha");
    if (fondo) fondo.addEventListener("click", (e) => { if (e.target.id === "modal-ficha") cerrar(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrar(); });
  }

  window.SIEGE_DLE = window.SIEGE_DLE || {};
  window.SIEGE_DLE.ficha = { init, abrir, cerrar, falloRetrato };
})();
