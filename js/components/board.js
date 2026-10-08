/* Tabla de análisis con veredicto: verde = coincide, rojo = no coincide.
   Sin límite de análisis. La columna Año indica con flecha hacia dónde está el objetivo. */
(function () {
  function bandoLabel(b) { return b === "atacante" ? "Atacante" : "Defensor"; }

  function celda(html, ok) {
    return `<td><span class="celda ${ok ? "ok" : "bad"}">${html}</span></td>`;
  }

  function celdaAnio(op, objetivo) {
    if (!objetivo || op.anio === objetivo.anio) {
      return celda(String(op.anio), Boolean(objetivo) && op.anio === objetivo.anio);
    }
    const mayor = objetivo.anio > op.anio; // el objetivo es posterior
    const flecha = mayor ? "▲" : "▼";
    const pista = mayor ? "posterior" : "anterior";
    return `<td><span class="celda bad anio"><strong>${op.anio}</strong><span class="anio__flecha" title="El objetivo es de un año ${pista}">${flecha}</span></span></td>`;
  }

  function retrato(op, esEl) {
    return window.SIEGE_DLE.retrato.retratoHTML(op, esEl ? "ok" : "bad");
  }

  // La BD guarda la región con país ("Europa (Reino Unido)"): la celda se queda con el
  // continente y el país viaja en el tooltip. El verde/rojo es a nivel de continente.
  function continenteDe(v) {
    return String(v || "").split(" (")[0].trim();
  }

  function celdaContinente(op) {
    const c = continenteDe(op.continente);
    const pais = op.continente && op.continente !== c ? ` title="${String(op.continente).replace(/"/g, "&quot;")}"` : "";
    return `<span${pais}>${c}</span>`;
  }

  function mostrarBanner(tipo, texto) {
    const el = document.getElementById("resultado-ronda");
    if (!el) return;
    el.hidden = false;
    el.className = `veredicto ${tipo}`;
    el.textContent = texto;
  }

  function ocultarBanner() {
    const el = document.getElementById("resultado-ronda");
    if (!el) return;
    el.hidden = true;
    el.textContent = "";
  }

  function pintar() {
    const cuerpo = document.getElementById("cuerpo-tabla");
    const st = window.SIEGE_DLE.state;
    const objetivo = st.objetivo();
    cuerpo.innerHTML = "";
    if (!st.intentos.length) {
      cuerpo.innerHTML = `<tr class="empty-row"><td colspan="9"><div class="empty"><div class="empty__icon">◈</div><p><strong>Sin análisis todavía.</strong></p><p class="muted">Analiza un operador: verde = coincide, rojo = no coincide.</p></div></td></tr>`;
    } else {
      // El último análisis siempre arriba.
      [...st.intentos].reverse().forEach((op) => {
        const esEl = Boolean(objetivo) && op.id === objetivo.id;
        const coincide = (campo) => {
          if (!objetivo) return false;
          if (campo === "continente") return continenteDe(op.continente) === continenteDe(objetivo.continente);
          return op[campo] === objetivo[campo];
        };
        const marca = (campo, html) => celda(html === undefined ? op[campo] : html, esEl || coincide(campo));
        const tr = document.createElement("tr");
        tr.className = "attempt" + (esEl ? " es-confirmado" : "");
        tr.innerHTML = `
          <td class="col-retrato">${retrato(op, esEl)}</td>
          <td><span class="op-nombre">${op.nombre}</span><span class="op-unidad">${op.unidad}</span></td>
          ${marca("bando", `<span class="bando ${op.bando}">${bandoLabel(op.bando)}</span>`)}
          ${marca("rol")}
          ${marca("sexo")}
          ${marca("continente", celdaContinente(op))}
          ${celdaAnio(op, objetivo)}
          ${marca("velocidad", `<span class="vel">${"●".repeat(op.velocidad)}${"○".repeat(3 - op.velocidad)}</span>`)}
          ${marca("gadget")}`;
        cuerpo.appendChild(tr);
      });
    }
    const contador = document.getElementById("intentos-realizados");
    if (contador) contador.textContent = String(st.realizados());
  }

  function buscarPorNombre(nombre) {
    const n = (nombre || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return (window.SIEGE_DLE.operators || []).find((o) =>
      o.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === n);
  }

  function registrar(nombreTexto) {
    const T = window.SIEGE_DLE.textos;
    const st = window.SIEGE_DLE.state;
    const toast = window.SIEGE_DLE.toast;
    const op = buscarPorNombre(nombreTexto);
    if (!nombreTexto || !nombreTexto.trim()) { toast.mostrar(T.eligeOperador, "warning"); return; }
    if (!op) { toast.mostrar(T.operadorNoValido, "error"); return; }
    if (!st.puedeJugar()) { toast.mostrar("La ronda ya terminó. Pulsa Nueva ronda.", "warning"); return; }
    if (st.intentos.some((i) => i.id === op.id)) { toast.mostrar(T.yaRegistrado, "warning"); return; }
    st.intentos.push(op);
    document.getElementById("buscador").value = "";
    document.getElementById("lista-sugerencias").hidden = true;
    const esEl = Boolean(st.objetivo()) && op.id === st.objetivo().id;
    pintar();
    if (esEl) {
      st.terminada = true;
      mostrarBanner("ok", `✓ ${op.nombre} confirmado.`);
      toast.mostrar(`✓ ${op.nombre} confirmado.`, "success");
      if (window.SIEGE_DLE.modal) window.SIEGE_DLE.modal.victoria(op);
    } else {
      mostrarBanner("bad", `✕ No es ${op.nombre}.`);
      toast.mostrar(`✕ No es ${op.nombre}.`, "error");
    }
    if (window.SIEGE_DLE.api) window.SIEGE_DLE.api.registrarIntento(op.id);
  }

  function pintarResumen() {
    const total = document.getElementById("stat-total");
    if (total) total.textContent = String((window.SIEGE_DLE.operators || []).length);
  }

  function pintarGaleria(filtro = "todos") {
    const grid = document.getElementById("ops-grid");
    if (!grid) return;
    const ops = (window.SIEGE_DLE.operators || []).filter((o) => filtro === "todos" || o.bando === filtro);
    grid.innerHTML = "";
    const total = document.getElementById("total-operadores");
    if (total) total.textContent = String(ops.length);
    ops.forEach((op) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "op-card";
      el.dataset.op = op.id;
      el.innerHTML = `${window.SIEGE_DLE.retrato.retratoHTML(op)}
        <span class="op-card__text">
          <span class="op-card__nombre">${op.nombre}</span>
          <span class="op-card__meta">${bandoLabel(op.bando)} · ${op.rol} · Vel. ${op.velocidad}</span>
        </span>`;
      grid.appendChild(el);
    });
  }

  window.SIEGE_DLE = window.SIEGE_DLE || {};
  window.SIEGE_DLE.board = { pintar, registrar, pintarResumen, pintarGaleria, mostrarBanner, ocultarBanner };
})();
