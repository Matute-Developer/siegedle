/* Autocompletado del buscador. Solo filtra datos locales, no evalúa victoria. */
(function () {
  let seleccionado = null;
  let indice = -1;

  function ops() { return window.SIEGE_DLE.operators || []; }
  function normalizar(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

  function filtrar(q) {
    const nq = normalizar(q.trim());
    if (!nq) return [];
    return ops().filter(o => normalizar(o.nombre).includes(nq)).slice(0, 7);
  }

  function pintar(lista) {
    const ul = document.getElementById("lista-sugerencias");
    const input = document.getElementById("buscador");
    ul.innerHTML = "";
    indice = -1;
    if (!lista.length) { ul.hidden = true; input.setAttribute("aria-expanded", "false"); return; }
    lista.forEach(op => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = `${window.SIEGE_DLE.retrato.retratoHTML(op)}
        <span class="op-meta"><strong>${op.nombre}</strong><small>${op.bando === "atacante" ? "Atacante" : "Defensor"} · ${op.rol} · ${op.unidad}</small></span>`;
      b.addEventListener("click", () => elegir(op));
      li.appendChild(b);
      ul.appendChild(li);
    });
    ul.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function elegir(op) {
    seleccionado = op;
    document.getElementById("buscador").value = op.nombre;
    document.getElementById("lista-sugerencias").hidden = true;
    document.getElementById("mensaje-buscador").textContent = `${op.nombre} listo. Pulsa Analizar.`;
  }

  function init() {
    const input = document.getElementById("buscador");
    const btn = document.getElementById("btn-analizar");
    if (!input || !btn) return;
    input.addEventListener("input", () => { seleccionado = null; pintar(filtrar(input.value)); });
    input.addEventListener("keydown", e => {
      const items = [...document.querySelectorAll("#lista-sugerencias button")];
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!items.length) return;
        indice = e.key === "ArrowDown" ? Math.min(indice + 1, items.length - 1) : Math.max(indice - 1, 0);
        items.forEach((b, i) => b.classList.toggle("is-selected", i === indice));
      }
      if (e.key === "Enter" && indice >= 0 && items[indice]) { e.preventDefault(); items[indice].click(); }
      if (e.key === "Escape") document.getElementById("lista-sugerencias").hidden = true;
    });
    document.addEventListener("click", e => {
      if (!e.target.closest(".search-block")) document.getElementById("lista-sugerencias").hidden = true;
    });
    btn.addEventListener("click", () => window.SIEGE_DLE.board.registrar(input.value));
    input.addEventListener("keydown", e => { if (e.key === "Enter" && indice < 0) window.SIEGE_DLE.board.registrar(input.value); });
  }

  window.SIEGE_DLE = window.SIEGE_DLE || {};
  window.SIEGE_DLE.search = { init, filtrar, elegir, get seleccionado() { return seleccionado; } };
})();
