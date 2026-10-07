/* Interfaz del modo Partida: mapa, bans por ronda, draft por lado, simulación y final. */
(function () {
  let pasoBan = 0; // 0: baneo yo, 1: banea el rival, 2: resumen
  let ultimoBanRival = null;
  let seleccionBan = null;
  let temporizadores = [];
  let alimentando = false;
  let enPausa = false;
  let fasePausada = null;
  let indiceFeed = 0;
  const TIEMPO_BAN = 30;
  const TIEMPO_DRAFT = 90; // un solo reloj para los 5 picks

  function P() { return window.SIEGE_DLE.partida; }
  function ST() { return P().state; }
  function retrato(op, anillo) { return window.SIEGE_DLE.retrato.retratoHTML(op, anillo || ""); }
  function bandoLabel(b) { return b === "atacante" ? "Atacante" : "Defensor"; }
  function porId(id) { return window.SIEGE_DLE.operators.find((o) => o.id === id); }

  function limpiarTimers() {
    temporizadores.forEach((t) => { clearTimeout(t); clearInterval(t); });
    temporizadores = [];
    alimentando = false;
    indiceFeed = 0;
  }

  // ---------- Reloj global por fase ----------
  // Un único tiempo compartido por todo el baneo / todo el draft (no se reinicia por pick).
  const reloj = { clave: null, total: 0, quedan: 0, id: null, alVencer: null, pausado: false, etiqueta: "" };

  function pintarReloj() {
    const el = document.getElementById("reloj");
    if (!el) return;
    if (reloj.clave === null) {
      el.classList.remove("urgente", "pausado");
      el.innerHTML = `<span class="reloj-label">SIN RELOJ EN ESTE PASO</span>`;
      return;
    }
    const p = Math.max(0, Math.min(100, Math.round(reloj.quedan / Math.max(1, reloj.total) * 100)));
    el.classList.toggle("urgente", reloj.quedan <= 10 && !reloj.pausado);
    el.classList.toggle("pausado", reloj.pausado || enPausa);
    el.innerHTML = `<span class="reloj-label">${(reloj.pausado || enPausa) ? "PAUSADO" : reloj.etiqueta}</span>
      <span class="reloj-num">${Math.max(0, reloj.quedan)}</span>
      <span class="reloj-barra"><span style="width:${p}%"></span></span>
      <button class="btn btn-ghost btn-mini" id="btn-pausa-reloj" type="button" aria-label="Pausar tiempo">${(reloj.pausado || enPausa) ? "▶" : "⏸"}</button>`;
    const b = document.getElementById("btn-pausa-reloj");
    if (b) b.addEventListener("click", alternarPausa);
  }

  function pintarBotonPausa() {
    const b = document.getElementById("btn-pausa");
    if (b) b.innerHTML = enPausa ? "▶ Continuar" : "⏸ Pausar";
  }

  function detenerIntervalo() {
    if (reloj.id) { clearInterval(reloj.id); reloj.id = null; }
  }

  function arrancarReloj() {
    detenerIntervalo();
    if (reloj.clave === null || reloj.pausado || enPausa) return;
    reloj.id = setInterval(ticReloj, 1000);
  }

  function detenerReloj() {
    detenerIntervalo();
    reloj.clave = null;
    reloj.alVencer = null;
    reloj.pausado = false;
    pintarReloj();
  }

  // Arranca el reloj de una fase. Si ya estaba corriendo para esa misma fase, conserva el tiempo.
  function asegurarReloj(clave, segundos, etiqueta, alVencer) {
    if (reloj.clave !== clave) {
      detenerIntervalo();
      reloj.clave = clave;
      reloj.total = segundos;
      reloj.quedan = segundos;
      reloj.etiqueta = etiqueta;
      reloj.pausado = false;
      arrancarReloj();
    } else {
      reloj.alVencer = alVencer;
      if (reloj.id === null && !reloj.pausado && !enPausa && !document.getElementById("vista-partida").hidden) arrancarReloj();
    }
    reloj.alVencer = alVencer;
    pintarReloj();
  }

  function ticReloj() {
    if (document.getElementById("vista-partida").hidden) { detenerIntervalo(); return; }
    reloj.quedan -= 1;
    if (reloj.quedan <= 0) {
      const cb = reloj.alVencer;
      detenerIntervalo();
      reloj.clave = null;
      reloj.alVencer = null;
      pintarReloj();
      if (cb) cb();
      return;
    }
    pintarReloj();
  }

  // Pausa global: congela el reloj y la narración en el mismo instante.
  function alternarPausa() {
    const st = ST();
    enPausa = !enPausa;
    if (enPausa) {
      fasePausada = st.fase;
      temporizadores.forEach((t) => { clearTimeout(t); clearInterval(t); });
      temporizadores = [];
      detenerIntervalo();
      window.SIEGE_DLE.toast.mostrar("Pausa: todo congelado.", "warning");
    } else {
      fasePausada = null;
      arrancarReloj();
      if (st.fase === "ronda" && st.ronda && !st.ronda.resultado) reanudarFeed();
      else pintarReloj();
    }
    pintarBotonPausa();
    pintarReloj();
  }

  function reanudarFeed() {
    const zona = document.getElementById("zona-decision");
    if (zona && zona.innerHTML.trim()) return; // hay una decisión esperando: no se adelanta nada
    avanzar();
  }

  function entrar() {
    const st = ST();
    if (st.fase === "fin" || !st.mapa) { P().nuevoPartido(); pasoBan = 0; }
    render();
  }

  function render() {
    limpiarTimers();
    const st = ST();
    // La pausa no sobrevive a un cambio de fase.
    if (enPausa && fasePausada !== st.fase) { enPausa = false; fasePausada = null; }
    const cont = document.getElementById("partida-contenido");
    if (!cont) return;
    if (st.fase === "mapa") cont.innerHTML = vistaMapa();
    else if (st.fase === "bans") cont.innerHTML = vistaBans();
    else if (st.fase === "draft") cont.innerHTML = vistaDraft();
    else if (st.fase === "previa") cont.innerHTML = vistaPrevia();
    else if (st.fase === "ronda") { cont.innerHTML = vistaRonda(); alimentar(); }
    else if (st.fase === "fin") cont.innerHTML = vistaFin();
    conectar();
    if (st.fase === "bans" && pasoBan === 0) asegurarReloj("bans", TIEMPO_BAN, "TIEMPO GLOBAL DE BANEO", banAleatorio);
    else if (st.fase === "draft") asegurarReloj("draft", TIEMPO_DRAFT, "TIEMPO GLOBAL DEL DRAFT", draftSeAcabo);
    else detenerReloj();
    pintarBotonPausa();
  }

  function cabecera() {
    const st = ST();
    if (!st.mapa) return "";
    return `<div class="match-head">
      <div><span class="tag">🗺️ ${st.mapa.nombre}</span> <span class="muted">· ${st.sitio.nombre}</span></div>
      <div class="match-score"><strong>TÚ ${st.puntosJ}</strong><span>—</span><strong>${st.puntosIA} RIVAL</strong></div>
    </div>`;
  }

  function chipsVetados() {
    const st = ST();
    if (!st.vetados.length) return "";
    return `<p class="muted">Baneados en la partida: <strong>${st.vetados.map((id) => porId(id).nombre).join(" · ")}</strong></p>`;
  }

  function vistaMapa() {
    const st = ST();
    return `${cabecera()}
      <div class="briefing">
        <div class="briefing__head"><span class="tag">MAPA SELECCIONADO</span></div>
        <h2>🗺️ ${st.mapa.nombre}</h2>
        <p class="muted">${st.mapa.descripcion}</p>
        <div class="briefing__meta">
          <div class="meta"><span>SITIO</span><strong>💣 ${st.sitio.nombre}</strong></div>
          <div class="meta"><span>PARTIDA</span><strong>Primero en 4 rondas</strong></div>
        </div>
        <p class="muted" style="margin-top:.8rem">Esta partida se empieza <strong>${st.empieza === "ataque" ? "atacando" : "defendiendo"}</strong> (se alterna entre partidas). El rival ya tiene su plan.</p>
        <button class="btn btn-primary btn-block" data-acc="a-bans" type="button">Comenzar ronda 1</button>
      </div>`;
  }

  // ---------- BANS POR RONDA ----------
  function tarjetaBan(op, marcado) {
    return `<button class="ban-card${marcado ? " baneado" : ""}" data-ban="${op.id}" type="button" ${marcado ? "disabled" : ""}>
      ${retrato(op)}<strong>${op.nombre}</strong>
      <span class="ban-sello">${marcado ? "OPERADOR BANEADO" : "BANEAR"}</span>
    </button>`;
  }

  function vistaBans() {
    const st = ST();
    const lado = P().ladoProximo();
    const ataco = lado === "ataque";
    const bandoRival = ataco ? "defensor" : "atacante";
    const lista = window.SIEGE_DLE.operators.filter((o) => o.bando === bandoRival);
    if (pasoBan === 2) {
      return `${cabecera()}
        <div class="briefing"><div class="briefing__head"><span class="tag">RONDA ${st.rondaNum + 1} · ${lado.toUpperCase()}</span></div>
          <h2>Baneos de la ronda</h2>
          <p class="muted">Vos baneaste a <strong>${P().nombre(st.vetados[st.vetados.length - 2])}</strong>. El rival baneó a <strong>${P().nombre(ultimoBanRival)}</strong>.</p>
          ${chipsVetados()}
          <button class="btn btn-primary btn-block" data-acc="a-draft" type="button">Comenzar draft (solo ${ataco ? "atacantes" : "defensores"})</button>
        </div>`;
    }
    return `${cabecera()}
      <div class="briefing"><div class="briefing__head"><span class="tag">RONDA ${st.rondaNum + 1} · ${lado.toUpperCase()} · BAN</span></div>
        <h2>${pasoBan === 0
          ? (ataco ? "Baneá un defensor (vas a atacar)" : "Baneá un atacante (vas a defender)")
          : "El rival está baneando…"}</h2>
        <p class="muted">${pasoBan === 0
          ? "Tocá un operador para marcarlo y después confirmá. Tu baneo vale para esta ronda y las siguientes."
          : `El rival responde baneando un ${ataco ? "atacante" : "defensor"}.`}</p>
        <div class="reloj" id="reloj" aria-label="Tiempo restante"></div>
        <div class="ban-grid">
          ${lista.map((op) => tarjetaBan(op, st.vetados.includes(op.id))).join("")}
        </div>
        ${pasoBan === 0 ? `<button class="btn btn-primary btn-block" id="btn-confirmar-ban" data-acc="a-confirmar-ban" type="button" disabled>Confirmar baneo</button>` : ""}
        ${pasoBan === 1 ? `<button class="btn btn-primary btn-block" data-acc="a-ban-ia" type="button">Ver baneo del rival</button>` : ""}
        ${chipsVetados()}
      </div>`;
  }

  // ---------- DRAFT POR LADO ----------
  function vistaDraft() {
    const st = ST();
    const lado = P().ladoProximo();
    const n = st.equipoJ.length + 1;
    const equipo = st.equipoJ.map((id) => {
      const op = porId(id);
      return `<span class="draft-pick" title="${op.rol}">${retrato(op)}<small>${op.nombre}</small></span>`;
    }).join("");
    const opciones = st.opciones.map((id) => {
      const op = porId(id);
      return `<button class="draft-card" data-draft="${op.id}" type="button">
        ${retrato(op)}<strong>${op.nombre}</strong>
        <span class="bando ${op.bando}">${bandoLabel(op.bando)}</span>
        <small class="draft-rol">${op.rol}</small>
        <small class="muted">${op.unidad}</small>
      </button>`;
    }).join("");
    return `${cabecera()}
      <div class="briefing"><div class="briefing__head"><span class="tag">RONDA ${st.rondaNum + 1} · DRAFT ${st.equipoJ.length}/5 · SOLO ${lado === "ataque" ? "ATACANTES" : "DEFENSORES"}</span></div>
        <h2>Seleccioná tu operador ${n > 5 ? "" : "n.º " + n}</h2>
        <div class="reloj" id="reloj" aria-label="Tiempo restante"></div>
        <div class="draft-opciones">${opciones}</div>
        <h3>Tu equipo de la ronda</h3>
        <div class="draft-equipo">${equipo || '<span class="muted">Todavía vacío.</span>'}</div>
        ${chipsVetados()}
      </div>`;
  }

  // ---------- PREVIA ----------
  function fichaEquipo(ids) {
    return ids.map((id) => {
      const op = porId(id);
      return `<span class="team-chip">${retrato(op)}<small>${op.nombre}</small></span>`;
    }).join("");
  }

  function pct(n) { return Math.round(n * 100); }

  function panelProb(pr, compacto) {
    const tu = pct(pr.prob); const rival = 100 - tu;
    const ventajaTxt = pr.ventaja > 1 ? `ventaja +${pr.ventaja}` : pr.ventaja < -1 ? `ventaja ${pr.ventaja}` : "parejo";
    const fMax = Math.max(pr.fJ, pr.fI, 1);
    return `<div class="prob-panel${compacto ? " compacto" : ""}">
      <div class="prob-head"><span class="live-dot"></span>PRONÓSTICO EN VIVO</div>
      <div class="prob-barra"><div class="prob-tu" style="width:${tu}%"></div></div>
      <div class="prob-nums"><strong>TÚ ${tu}%</strong><span class="muted">${ventajaTxt}</span><strong>${rival}% RIVAL</strong></div>
      <div class="fuerza-grid">
        <div><span>FUERZA TÚ</span><div class="fuerza-barra"><div style="width:${Math.round(pr.fJ / fMax * 100)}%"></div></div></div>
        <div><span>FUERZA RIVAL</span><div class="fuerza-barra rival"><div style="width:${Math.round(pr.fI / fMax * 100)}%"></div></div></div>
      </div>
      <div class="prob-partida">Prob. de ganar la partida: <strong>${pct(pr.partido)}%</strong></div>
    </div>`;
  }

  function vistaPrevia() {
    const st = ST();
    const lado = P().ladoDeRonda(st.rondaNum + 1);
    const pr = P().pronostico();
    return `${cabecera()}
      <div class="briefing"><div class="briefing__head"><span class="tag">RONDA ${st.rondaNum + 1} · ${lado.toUpperCase()}</span></div>
        <h2>${lado === "ataque" ? "Atacás el sitio" : "Defendés el sitio"}</h2>
        <p class="muted">${st.mapa.nombre} — 💣 ${st.sitio.nombre}. Primero en 4 rondas gana.</p>
        ${panelProb(pr)}
        <h3>Tu equipo</h3><div class="team-row">${fichaEquipo(st.equipoJ)}</div>
        <h3>Rival</h3><div class="team-row">${fichaEquipo(st.equipoIA)}</div>
        <button class="btn btn-primary btn-block" data-acc="a-jugar-ronda" type="button">Jugar ronda</button>
      </div>`;
  }

  // ---------- RONDA ----------
  function vistaRonda() {
    const st = ST();
    const prob0 = P().probActual();
    const pr = { prob: prob0, fJ: st.ronda ? st.ronda.fuerzaJ : 0, fI: st.ronda ? st.ronda.fuerzaIA : 0, ventaja: Math.round((prob0 - 0.5) * 100), partido: P().probPartido(st.puntosJ, st.puntosIA, prob0) };
    return `${cabecera()}
      <div class="briefing"><div class="briefing__head"><span class="tag">RONDA ${st.rondaNum} · ${st.ronda.lado.toUpperCase()}</span></div>
        <div class="ronda-versus">
          <div class="strip">${st.equipoJ.map(miniFicha).join("")}</div>
          <div class="vs">VS</div>
          <div class="strip">${st.equipoIA.map(miniFicha).join("")}</div>
        </div>
        <div id="zona-live">${panelProb(pr, true)}</div>
        <div class="controles">
          <button class="btn btn-ghost btn-mini" id="btn-pausa" type="button">⏸ Pausar</button>
          <button class="btn btn-ghost btn-mini" id="btn-saltar" type="button">⏩ Saltar</button>
        </div>
        <div class="feed" id="feed"></div>
        <div id="zona-decision"></div>
        <div id="zona-resultado"></div>
      </div>`;
  }

  function miniFicha(id) {
    const op = porId(id);
    return `<span class="strip-mini" title="${op.nombre}">${retrato(op)}</span>`;
  }

  function refrescarLive() {
    const st = ST();
    const zona = document.getElementById("zona-live");
    if (!zona || !st.ronda) return;
    const prob = P().probActual();
    const pr = {
      prob, fJ: st.ronda.fuerzaJ, fI: st.ronda.fuerzaIA,
      ventaja: Math.round((prob - 0.5) * 100),
      partido: P().probPartido(st.puntosJ, st.puntosIA, prob)
    };
    zona.innerHTML = panelProb(pr, true);
  }

  const ICONOS_FEED = { mapa: "🗺️", prep: "◈", intel: "⌖", rival: "⚠", clash: "✖", duelo: "⚔", exec: "▶" };

  function agregarLinea(texto, tipo) {
    const feed = document.getElementById("feed");
    if (!feed) return;
    const p = document.createElement("p");
    p.className = "feed-linea" + (tipo ? " ev-" + tipo : "");
    const icono = document.createElement("span");
    icono.className = "feed-ico";
    icono.textContent = ICONOS_FEED[tipo] || "▸";
    const cuerpo = document.createElement("span");
    cuerpo.textContent = texto;
    p.appendChild(icono);
    p.appendChild(cuerpo);
    feed.appendChild(p);
    feed.scrollTop = feed.scrollHeight;
  }

  function avanzar() {
    const st = ST();
    if (enPausa) return;
    if (!document.getElementById("feed") || !st.ronda || st.ronda.resultado) return;
    if (indiceFeed >= st.ronda.eventos.length) { finalizarFeed(); return; }
    const ev = st.ronda.eventos[indiceFeed++];
    if (ev.decision !== undefined) { mostrarDecision(ev.decision); return; }
    agregarLinea(ev.texto, ev.tipo);
    programar();
  }

  function programar() {
    if (enPausa) return;
    temporizadores.push(setTimeout(avanzar, 850));
  }

  function alimentar() {
    if (alimentando) return;
    alimentando = true;
    avanzar();
  }

  function saltar() {
    const st = ST();
    if (!st.ronda || st.ronda.resultado) return;
    enPausa = false;
    fasePausada = null;
    temporizadores.forEach((t) => { clearTimeout(t); clearInterval(t); });
    temporizadores = [];
    pintarBotonPausa();
    document.getElementById("zona-decision").innerHTML = "";
    while (indiceFeed < st.ronda.eventos.length) {
      const ev = st.ronda.eventos[indiceFeed++];
      if (ev.decision !== undefined) {
        const todas = [...P().DECISIONES[st.ronda.lado]].filter((d) => !st.ronda.usadas.includes(d.clave));
        if (todas.length) {
          const d = todas[Math.floor(Math.random() * todas.length)];
          agregarLinea(P().aplicarDecision(d.clave) + " (auto)", "prep");
        }
        continue;
      }
      agregarLinea(ev.texto, ev.tipo);
    }
    finalizarFeed();
  }

  function mostrarDecision(cual) {
    const st = ST();
    const todas = [...P().DECISIONES[st.ronda.lado]]
      .filter((d) => !st.ronda.usadas.includes(d.clave));
    for (let i = todas.length - 1; i > 0; i--) {
      const k = Math.floor(Math.random() * (i + 1));
      [todas[i], todas[k]] = [todas[k], todas[i]];
    }
    const opciones = todas.slice(0, 3);
    const zona = document.getElementById("zona-decision");
    zona.innerHTML = `<div class="decision-box"><h3>¿Qué querés hacer?</h3>
      ${opciones.map((d) => `<button class="btn btn-ghost decision-btn" data-dec="${d.clave}" type="button"><strong>${d.clave} — ${d.titulo}</strong><small>${d.desc}</small></button>`).join("")}
    </div>`;
    zona.querySelectorAll("[data-dec]").forEach((b) => b.addEventListener("click", () => {
      const linea = P().aplicarDecision(b.dataset.dec);
      zona.innerHTML = "";
      agregarLinea(linea, "prep");
      refrescarLive();
      avanzar();
    }));
  }

  function finalizarFeed() {
    const st = ST();
    if (!st.ronda || st.ronda.resultado) return;
    const res = P().resolverRonda();
    refrescarLive();
    const zona = document.getElementById("zona-resultado");
    const matchTxt = Math.round(P().probPartido(st.puntosJ, st.puntosIA, st.ronda.prob) * 100);
    zona.innerHTML = `<div class="veredicto ${res.ganada ? "ok" : "bad"}">
        <strong>${res.ganada ? "✓ RONDA GANADA" : "✕ RONDA PERDIDA"}</strong>
        <span>${st.puntosJ} — ${st.puntosIA} · Partida: ${matchTxt}%</span>
      </div>
      ${res.fin
        ? `<button class="btn btn-primary btn-block" data-acc="a-ver-fin" type="button">Ver resultado final</button>`
        : `<button class="btn btn-primary btn-block" data-acc="a-bans" type="button">Ronda ${st.rondaNum + 1}: bans y draft</button>`}`;
    conectarZona(zona);
  }

  // ---------- FIN ----------
  function vistaFin() {
    const st = ST();
    const victoria = st.puntosJ >= 4;
    return `<div class="briefing fin-${victoria ? "ok" : "bad"}">
        <div class="briefing__head"><span class="tag">PARTIDA TERMINADA</span></div>
        <h2>${victoria ? "🏆 VICTORIA" : "DERROTA"}</h2>
        <p class="stat-grande">${st.puntosJ} — ${st.puntosIA}</p>
        <p class="muted">${st.mapa.nombre} · 💣 ${st.sitio.nombre} · ${st.rondas.length} rondas.</p>
        <div class="historial">${st.rondas.map((r) => `<span class="pill ${r.resultado === "victoria" ? "ok" : "bad"}" title="Ronda ${r.num} (${r.lado})">R${r.num}</span>`).join("")}</div>
        <button class="btn btn-primary btn-block" data-acc="a-otra" type="button">Jugar otra partida</button>
      </div>`;
  }

  // ---------- EVENTOS ----------
  function conectarZona(raiz) {
    (raiz || document).querySelectorAll("[data-acc]").forEach((b) => b.addEventListener("click", () => accion(b.dataset.acc)));
    (raiz || document).querySelectorAll("[data-ban]").forEach((b) => b.addEventListener("click", () => {
      if (pasoBan !== 0 || b.disabled) return;
      seleccionBan = b.dataset.ban;
      (raiz || document).querySelectorAll("[data-ban]").forEach((x) => x.classList.toggle("seleccionado", x.dataset.ban === seleccionBan));
      const btn = document.getElementById("btn-confirmar-ban");
      if (btn) btn.disabled = false;
    }));
    (raiz || document).querySelectorAll("[data-draft]").forEach((b) => b.addEventListener("click", () => {
      elegirDraft(b.dataset.draft);
    }));
  }

  function elegirDraft(id) {
    const st = ST();
    if (st.fase !== "draft" || !st.opciones.includes(id)) return;
    st.equipoJ.push(id);
    if (st.equipoJ.length >= 5) {
      P().generarEquipoIA();
      st.fase = "previa";
    } else {
      st.opciones = P().opcionesDraft();
    }
    render();
  }

  function banAleatorio() {
    const st = ST();
    if (st.fase !== "bans" || pasoBan !== 0) return;
    const lado = P().ladoProximo();
    const bandoRival = lado === "ataque" ? "defensor" : "atacante";
    const bolsa = window.SIEGE_DLE.operators.filter((o) => o.bando === bandoRival && !st.vetados.includes(o.id));
    if (!bolsa.length) return;
    const elegido = bolsa[Math.floor(Math.random() * bolsa.length)].id;
    st.vetados.push(elegido);
    pasoBan = 1;
    seleccionBan = null;
    window.SIEGE_DLE.toast.mostrar(`Se acabó el tiempo: baneo automático a ${P().nombre(elegido)}.`, "warning");
    render();
  }

  // Se agotó el tiempo global del draft: se completan los picks que falten solos.
  function draftSeAcabo() {
    const st = ST();
    if (st.fase !== "draft") return;
    let faltan = 5 - st.equipoJ.length;
    let guard = 0;
    while (st.equipoJ.length < 5 && guard < 20) {
      guard += 1;
      st.opciones = P().opcionesDraft();
      if (!st.opciones.length) break;
      st.equipoJ.push(st.opciones[Math.floor(Math.random() * st.opciones.length)]);
    }
    if (st.equipoJ.length < 5) return;
    P().generarEquipoIA();
    st.fase = "previa";
    window.SIEGE_DLE.toast.mostrar(`Se acabó el tiempo: faltaban ${faltan} picks y se completaron solos.`, "warning");
    render();
  }

  function conectar() {
    const raiz = document.getElementById("partida-contenido");
    conectarZona(raiz);
    const pausa = document.getElementById("btn-pausa");
    if (pausa) pausa.addEventListener("click", alternarPausa);
    const salto = document.getElementById("btn-saltar");
    if (salto) salto.addEventListener("click", saltar);
  }

  function accion(cual) {
    const st = ST();
    if (cual === "a-bans") { P().prepararRonda(); st.fase = "bans"; pasoBan = 0; seleccionBan = null; }
    else if (cual === "a-confirmar-ban") {
      if (pasoBan !== 0 || !seleccionBan) return;
      st.vetados.push(seleccionBan);
      pasoBan = 1;
      seleccionBan = null;
    }
    else if (cual === "a-ban-ia") {
      if (pasoBan !== 1) return;
      ultimoBanRival = P().banRival();
      st.vetados.push(ultimoBanRival);
      pasoBan = 2;
      window.SIEGE_DLE.toast.mostrar(`El rival banea a ${P().nombre(ultimoBanRival)}: ${P().motivoBan(ultimoBanRival)}.`, "warning");
    }
    else if (cual === "a-draft") { st.fase = "draft"; st.opciones = P().opcionesDraft(); }
    else if (cual === "a-jugar-ronda") { P().iniciarRonda(); }
    else if (cual === "a-ver-fin") { st.fase = "fin"; }
    else if (cual === "a-otra") { P().nuevoPartido(); pasoBan = 0; }
    render();
  }

  window.SIEGE_DLE = window.SIEGE_DLE || {};
  window.SIEGE_DLE.partidaUI = { entrar, render };
})();
