/* Interfaz de la ronda táctica: línea temporal, reloj, intel, equipos con HP y
   recursos, killfeed, decisiones con riesgo visible, QTE, quiz y resumen con stats.
   La lógica vive en js/logic/ronda-tactica.js; acá solo se pinta y se conectan botones. */
(function () {
  let qte = { id: null, quedan: 0, total: 0 };
  let pausaTac = false;
  let pantalla = "momento"; // momento | resultado | resumen
  let ultimoResultado = null;
  let ultimoQuiz = null;
  let resumen = null;

  function P() { return window.SIEGE_DLE.partida; }
  function ST() { return P().state; }
  function Tch() { return window.SIEGE_DLE.tactica; }
  function porId(id) { return window.SIEGE_DLE.operators.find((o) => o.id === id); }
  function retrato(op) { return window.SIEGE_DLE.retrato.retratoHTML(op, ""); }

  function detenerQTE() {
    if (qte.id) { clearInterval(qte.id); qte.id = null; }
  }

  // ---------- esqueleto ----------
  function vista() {
    const st = ST();
    return `${cabeceraHTML()}
      <div class="tac">
        <div class="tac-top" id="tac-top"></div>
        <div id="tac-clutch"></div>
        <div class="tac-grid">
          <div class="tac-main">
            <div class="tac-timeline" id="tac-timeline"></div>
            <div id="tac-zona"></div>
          </div>
          <div class="tac-side">
            <div class="tac-panel" id="tac-intel"></div>
            <div class="tac-panel" id="tac-equipos"></div>
            <div class="tac-panel" id="tac-killfeed"></div>
          </div>
        </div>
        <div class="controles">
          <button class="btn btn-ghost btn-mini" id="btn-pausa-tac" type="button">⏸ Pausar</button>
          <button class="btn btn-ghost btn-mini" id="btn-saltar-tac" type="button">⏩ Saltar</button>
        </div>
      </div>`;
  }

  function cabeceraHTML() {
    const st = ST();
    return `<div class="match-head">
      <div class="match-head__map">
        ${st.mapa && st.mapa.imagen ? `<img src="${st.mapa.imagen}" alt="${st.mapa.nombre}" class="match-head__map-img" />` : ""}
        <div><span class="tag">🗺️ ${st.mapa ? st.mapa.nombre : ""}</span> <span class="muted">· ${st.sitio ? "💣 " + st.sitio : ""}</span></div>
      </div>
      <div class="match-score"><strong>TÚ ${st.puntosJ}</strong><span>—</span><strong>${st.puntosIA} RIVAL</strong></div>
    </div>`;
  }

  function comenzar() {
    detenerQTE();
    detenerDuelo();
    dueloModo = null; dueloQuizQ = null;
    pausaTac = false;
    pantalla = "momento";
    ultimoResultado = null;
    ultimoQuiz = null;
    resumen = null;
    Tch().siguiente();
    pintar();
    conectarControles();
  }

  function conectarControles() {
    const p = document.getElementById("btn-pausa-tac");
    if (p) p.addEventListener("click", () => {
      pausaTac = !pausaTac;
      p.textContent = pausaTac ? "▶ Continuar" : "⏸ Pausar";
      window.SIEGE_DLE.toast.mostrar(pausaTac ? "Pausa: todo congelado." : "A seguir jugando.", "warning");
    });
    const s = document.getElementById("btn-saltar-tac");
    if (s) s.addEventListener("click", () => {
      detenerQTE();
      detenerDuelo();
      Tch().auto();
      cerrarYResumir();
    });
  }

  // ---------- pintado ----------
  function pintar() {
    const t = Tch().estado();
    if (!t) return;
    pintarTop(t);
    pintarClutch(t);
    pintarTimeline(t);
    pintarIntel(t);
    pintarEquipos(t);
    pintarKillfeed(t);
    pintarZona(t);
  }

  function pintarTop(t) {
    const st = ST();
    const el = document.getElementById("tac-top");
    if (!el) return;
    el.innerHTML = `<span class="tag">RONDA ${st.rondaNum} · ${t.lado.toUpperCase()}</span>
      <span class="tac-reloj${t.tiempo <= 30 ? " urgente" : ""}" title="Tiempo de ronda">⏱ ${Tch().formatoReloj(t.tiempo)}</span>
      ${t.plantado ? `<span class="tac-plant">💣 DEFUSER ACTIVO</span>` : ""}`;
  }

  function pintarClutch(t) {
    const el = document.getElementById("tac-clutch");
    if (!el) return;
    const vJ = t.equipoJ.filter((u) => u.hp > 0).length;
    const vR = t.equipoIA.filter((u) => u.hp > 0).length;
    el.innerHTML = (vJ === 1 && vR >= 2 && !t.terminado)
      ? `<div class="tac-clutch">⚠ CLUTCH · 1 VS ${vR} · ${Tch().formatoReloj(t.tiempo)}</div>` : "";
  }

  function pintarTimeline(t) {
    const el = document.getElementById("tac-timeline");
    if (!el) return;
    el.innerHTML = t.timeline.map((e) =>
      `<p class="tac-linea${e.tipo ? " ev-" + e.tipo : ""}"><span class="tac-t">${e.t}</span><span>${e.texto}</span></p>`
    ).join("");
    el.scrollTop = el.scrollHeight;
  }

  function pintarIntel(t) {
    const el = document.getElementById("tac-intel");
    if (!el) return;
    const conf = t.intelLista.length ? t.intelLista.map((x) => `<li>✓ ${x}</li>`).join("") : "<li class='vacio'>Sin datos confirmados.</li>";
    el.innerHTML = `<h4>⌖ INFORMACIÓN</h4><ul class="tac-intel-lista">${conf}</ul>
      <p class="tac-nivel">Nivel: <strong>${["NULA", "BAJA", "MEDIA", "ALTA"][Math.min(3, t.intel)]}</strong> · Alerta rival: <strong>${["NULA", "BAJA", "MEDIA", "ALTA"][Math.min(3, t.alerta)]}</strong></p>`;
  }

  function hpColor(hp, max) {
    const p = hp / max;
    return p > 0.55 ? "ok" : p > 0.25 ? "mid" : "bad";
  }

  function fichaUnidad(u, propia) {
    const max = u.hp > 100 ? 125 : 100;
    const recs = Object.entries(u.rec || {}).filter(([, n]) => n > 0)
      .map(([k, n]) => `<span class="tac-rec" title="${Tch().NOMBRES_REC[k] || k}">${k.toUpperCase()}×${n}</span>`).join("");
    const op = porId(u.id);
    const vivo = u.hp > 0;
    return `<div class="tac-u${vivo ? "" : " muerto"}">
      <span class="tac-u-ico${vivo ? "" : " tac-muerto"}">${op ? retrato(op) : "?"}</span>
      <span class="tac-u-datos"><strong>${vivo ? u.nombre : "☠ " + u.nombre}</strong>
        <span class="tac-hp"><span class="tac-hp-bar ${hpColor(u.hp, max)}" style="width:${Math.max(0, Math.round(u.hp / max * 100))}%"></span></span>
        ${propia && vivo ? `<span class="tac-recs">${recs || "<span class='vacio'>sin utilidad</span>"}</span>` : ""}
      </span>
    </div>`;
  }

  function pintarEquipos(t) {
    const el = document.getElementById("tac-equipos");
    if (!el) return;
    const vR = t.equipoIA.filter((u) => u.hp > 0).length;
    el.innerHTML = `<h4>TU EQUIPO</h4>${t.equipoJ.map((u) => fichaUnidad(u, true)).join("")}
      <h4>RIVAL · ${vR} EN PIE</h4><p class="muted tac-rival-hint">Posiciones y HP del rival ocultos: deducilos con sonido, cámaras e intel.</p>`;
  }

  function pintarKillfeed(t) {
    const el = document.getElementById("tac-killfeed");
    if (!el) return;
    el.innerHTML = `<h4>KILL FEED</h4>` + (t.feed.length
      ? t.feed.map((f) => {
        const op = porId(f.id);
        return `<p class="tac-kill${f.rival ? " rival" : ""}">
          <span class="tac-kill-lado">${f.rival ? "RIVAL" : "TU EQUIPO"}</span>
          <span class="tac-muerto">${op ? retrato(op) : "?"}</span>
          <strong>☠ ${f.nombre}</strong></p>`;
      }).join("")
      : `<p class="vacio">Sin bajas todavía.</p>`);
  }

  // ---------- zona de decisión ----------
  function motivoFalta(acc, t) {
    if (acc.reqOp && !acc.reqOp.some((id) => t.equipoJ.some((u) => u.id === id && u.hp > 0)))
      return "Falta: " + acc.reqOp.map((id) => (porId(id) || {}).nombre || id).join(" o ");
    if (acc.reqRec) {
      const n = t.equipoJ.filter((u) => u.hp > 0).reduce((s, u) => s + (u.rec[acc.reqRec] || 0), 0);
      if (n <= 0) return "Sin " + (Tch().NOMBRES_REC[acc.reqRec] || acc.reqRec);
    }
    if (acc.reqT && t.tiempo < acc.reqT) return "Sin tiempo";
    return null;
  }

  function pintarZona(t) {
    const zona = document.getElementById("tac-zona");
    if (!zona) return;
    detenerQTE();
    detenerDuelo();
    if (pantalla === "resumen" && resumen) { zona.innerHTML = htmlResumen(t); conectarZona(zona); return; }
    if (pantalla === "resultado" && ultimoResultado) {
      zona.innerHTML = htmlResultado(); conectarZona(zona); mostrarBannerMuertes(); return;
    }
    if (t.actual && t.actual.duelo && pantalla === "momento") {
      zona.innerHTML = htmlDuelo(t); conectarZona(zona);
      if (dueloModo === "aim") arrancarDuelo();
      return;
    }
    if (t.quiz && pantalla === "momento") { zona.innerHTML = htmlQuiz(t.quiz); conectarZona(zona); return; }
    if (ultimoQuiz && pantalla === "momento") { zona.innerHTML = htmlQuizRes(); conectarZona(zona); return; }
    if (!t.actual) { cerrarYResumir(); return; }
    zona.innerHTML = htmlMomento(t);
    conectarZona(zona);
    arrancarQTE(t);
  }

  function htmlMomento(t) {
    const sit = t.actual.sit;
    const c = Tch().ctx();
    const cTiempo = Tch().formatoReloj(t.tiempo);
    const btns = t.actual.accs.map((a) => {
      const falta = motivoFalta(a, t);
      const calc = Tch().calcular(a);
      const reqTxt = [
        a.reqOp ? "Requiere: " + a.reqOp.map((id) => (porId(id) || {}).nombre || id).join(" / ") : "",
        a.reqRec ? "Gasta: " + (Tch().NOMBRES_REC[a.reqRec] || a.reqRec) : "",
        a.qte ? `⏱ ${a.qte}s` : ""
      ].filter(Boolean).join(" · ");
      const prob = a.verProb
        ? `<span class="tac-nivel">Oportunidad: ${calc.nivel} (${Math.round(calc.p * 100)}%)</span>
           <span class="tac-mods">${calc.desglose.map(([txt, pts]) => `<span class="${pts >= 0 ? "pos" : "neg"}">${pts >= 0 ? "+" : ""}${pts} ${txt}</span>`).join("")}</span>`
        : `<span class="tac-nivel">Oportunidad: ${calc.nivel}</span>`;
      return `<button class="btn btn-ghost tac-acc" data-tac="${a.id}" type="button" ${falta ? "disabled" : ""}>
        <strong>${a.etiqueta}</strong>
        <small>${a.sub}</small>
        <span class="tac-riesgo riesgo-${a.riesgo}">RIESGO ${a.riesgo.toUpperCase()}</span>
        ${prob}
        ${reqTxt ? `<span class="tac-req">${reqTxt}</span>` : ""}
        ${falta ? `<span class="tac-falta">${falta}</span>` : ""}
      </button>`;
    }).join("");
    const qteMax = Math.max(0, ...t.actual.accs.map((a) => a.qte || 0));
    return `<div class="decision-box tac-momento${t.actual.asalto ? " tac-asalto" : ""}">
      ${t.actual.asalto ? `<div class="tac-asalto-banner">⚠ ¡ASALTO FINAL! MATAR O PLANTAR · SIN VICTORIA PASIVA</div>` : ""}
      <div class="tac-momento-head"><span class="tac-t">${cTiempo}</span><h3>${t.actual.tituloTxt}</h3></div>
      ${htmlVsRestan(t)}
      <p class="tac-texto">${t.actual.textoTxt}</p>
      ${qteMax ? `<div class="tac-qte" id="tac-qte"><span></span></div>` : ""}
      <div class="tac-acciones">${btns}</div>
    </div>`;
  }

  function arrancarQTE(t) {
    if (!t.actual) return;
    const segs = Math.max(0, ...t.actual.accs.map((a) => a.qte || 0));
    if (!segs) return;
    const bar = document.querySelector("#tac-qte span");
    qte = { id: null, quedan: segs * 10, total: segs * 10 };
    qte.id = setInterval(() => {
      if (!document.getElementById("tac-qte")) { detenerQTE(); return; }
      if (pausaTac) return;
      qte.quedan -= 1;
      if (bar) bar.style.width = Math.max(0, qte.quedan / qte.total * 100) + "%";
      if (qte.quedan <= 0) {
        detenerQTE();
        const def = document.querySelector(`[data-tac="${t.actual.defectoId}"]`);
        if (def && !def.disabled) def.click();
      }
    }, 100);
  }

  function htmlQuiz(q) {
    const letras = ["A", "B", "C", "D"];
    return `<div class="decision-box tac-quiz">
      <h3>⌖ DESAFÍO DE CONOCIMIENTO <span class="tac-dif">(${q.dif.toUpperCase()})</span></h3>
      <p class="tac-texto"><strong>${q.q}</strong></p>
      <div class="tac-acciones">${q.op.map((op, i) =>
        `<button class="btn btn-ghost tac-acc" data-quiz="${i}" type="button"><strong>${letras[i]}</strong><small>${op}</small></button>`
      ).join("")}</div>
      <p class="muted">Acertar: +info y +5% en tu próxima acción. Fallar: −12s y el rival se alerta.</p>
    </div>`;
  }

  function htmlQuizRes() {
    return `<div class="decision-box tac-quiz-res ${ultimoQuiz.bien ? "ok" : "bad"}">
      <p class="tac-texto">${ultimoQuiz.texto}</p>
      <button class="btn btn-primary btn-block" data-tac-cont="1" type="button">Continuar</button>
    </div>`;
  }

  // Careo: cuando quedan 3 o menos en total, se muestran las fotos de los que se enfrentan.
  function htmlVsRestan(t) {
    const vJ = t.equipoJ.filter((u) => u.hp > 0);
    const vR = t.equipoIA.filter((u) => u.hp > 0);
    if (vJ.length + vR.length > 3 || vJ.length + vR.length === 0) return "";
    const foto = (u) => {
      const op = porId(u.id);
      return `<span class="tac-vs-mini" title="${u.nombre}">${op ? retrato(op) : "?"}</span>`;
    };
    return `<div class="tac-vs-restan" title="Quedan ${vJ.length} vs ${vR.length}">
      <span class="tac-vs-equipo">${vJ.map(foto).join("")}</span>
      <span class="tac-vs-mid">VS</span>
      <span class="tac-vs-equipo">${vR.map(foto).join("")}</span></div>`;
  }
  // Las fotos de los dos que quedan + dos caminos: minijuego de reflejos o desafío.
  let dueloTimer = null;
  let dueloModo = null; // null: elegir | "aim" | "quiz"
  let dueloQuizQ = null;
  let bannerTimer = null;

  // Cartel de muerte en el medio de la pantalla: foto en B/N con cruz + nombre.
  function mostrarBannerMuertes() {
    const t = Tch().estado();
    if (!t || !t.nuevasMuertes || !t.nuevasMuertes.length) return;
    document.querySelectorAll(".tac-banner-muerte").forEach((e) => e.remove());
    if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null; }
    const capa = document.createElement("div");
    capa.className = "tac-banner-muerte";
    capa.innerHTML = t.nuevasMuertes.slice(0, 3).map((m) => {
      const op = porId(m.id);
      return `<div class="tac-banner-carta${m.rival ? " rival" : ""}">
        <span class="tac-muerto">${op ? retrato(op) : "?"}</span>
        <span class="tac-banner-lado">${m.rival ? "RIVAL ELIMINADO" : "ALIADO CAÍDO"}</span>
        <strong>☠ ${m.nombre}</strong></div>`;
    }).join("");
    (document.getElementById("partida-contenido") || document.body).appendChild(capa);
    bannerTimer = setTimeout(() => {
      capa.classList.add("fuera");
      setTimeout(() => capa.remove(), 500);
      bannerTimer = null;
    }, 2300);
  }
  let dueloQuizRes = null;

  function detenerDuelo() {
    if (dueloTimer) { clearInterval(dueloTimer); dueloTimer = null; }
    if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null; }
    document.querySelectorAll(".tac-banner-muerte").forEach((e) => e.remove());
  }

  function htmlDuelo(t) {
    const yo = t.equipoJ.find((u) => u.hp > 0);
    const el = t.equipoIA.find((u) => u.hp > 0);
    const opYo = yo ? porId(yo.id) : null;
    const opEl = el ? porId(el.id) : null;
    const vs = `<div class="tac-vs">
        <div class="tac-vs-lado"><span class="tac-vs-foto">${opYo ? retrato(opYo) : "?"}</span>
          <strong>${yo ? yo.nombre : "—"}</strong><small>${yo ? Math.max(0, Math.round(yo.hp)) : 0} HP</small></div>
        <span class="tac-vs-mid">VS</span>
        <div class="tac-vs-lado"><span class="tac-vs-foto">${opEl ? retrato(opEl) : "?"}</span>
          <strong>${el ? el.nombre : "—"}</strong><small>HP oculta</small></div>
      </div>`;
    if (dueloModo === "quiz" && dueloQuizQ) {
      const letras = ["A", "B", "C", "D"];
      return `<div class="decision-box tac-duelo">
        <h3>⚔ DUELO 1 VS 1 · DESAFÍO</h3>${vs}
        <p class="tac-texto"><strong>${dueloQuizQ.q}</strong></p>
        <div class="tac-acciones">${dueloQuizQ.op.map((op, i) =>
          `<button class="btn btn-ghost tac-acc" data-duelo-quiz="${i}" type="button"><strong>${letras[i]}</strong><small>${op}</small></button>`
        ).join("")}</div>
        <p class="muted">Acertar elimina al rival. Fallar: −35 HP y el duelo sigue.</p>
      </div>`;
    }
    if (dueloModo === "aim") {
      const zona = 12 + Math.floor(Math.random() * 60);
      const ancho = 15;
      return `<div class="decision-box tac-duelo">
        <h3>⚔ DUELO 1 VS 1 · REFLEJOS</h3>${vs}
        <p class="tac-texto">Dispará cuando el marcador pase por la <strong>zona verde</strong>. Tenés 8 segundos.</p>
        <div class="tac-aim" id="tac-aim" data-zona="${zona}" data-ancho="${ancho}">
          <div class="tac-aim-zona" style="left:${zona}%;width:${ancho}%"></div>
          <div class="tac-aim-cursor" style="left:0%"></div>
        </div>
        <button class="btn btn-primary btn-block" data-duelo="fuego" type="button">🔫 DISPARAR</button>
        <div class="tac-qte" id="tac-duelo-tiempo"><span></span></div>
      </div>`;
    }
    return `<div class="decision-box tac-duelo">
      <h3>⚔ DUELO 1 VS 1</h3>${vs}
      <p class="tac-texto">Quedan ustedes dos. Elegí cómo ganarlo:</p>
      <div class="tac-acciones">
        <button class="btn btn-ghost tac-acc" data-duelo-modo="aim" type="button"><strong>🔫 DISPARAR</strong><small>Minijuego de reflejos: zona verde, 8 segundos. Fallar duele (55 HP).</small></button>
        <button class="btn btn-ghost tac-acc" data-duelo-modo="quiz" type="button"><strong>⌖ DESAFÍO</strong><small>Pregunta Siege: acertar elimina, fallar duele (35 HP).</small></button>
      </div>
    </div>`;
  }

  function arrancarDuelo() {
    detenerDuelo();
    const aim = document.getElementById("tac-aim");
    if (!aim) return;
    const cursor = aim.querySelector(".tac-aim-cursor");
    const zona = Number(aim.dataset.zona), ancho = Number(aim.dataset.ancho);
    const bar = document.querySelector("#tac-duelo-tiempo span");
    let pos = 0, dir = 1, ticks = 0;
    const total = 200; // 8 segundos a 40ms: si no disparás, dispara él
    dueloTimer = setInterval(() => {
      if (!document.getElementById("tac-aim")) { detenerDuelo(); return; }
      if (pausaTac) return;
      pos += dir * 2.2;
      if (pos >= 100) { pos = 100; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      if (cursor) cursor.style.left = pos + "%";
      ticks += 1;
      if (bar) bar.style.width = Math.max(0, 100 - ticks / total * 100) + "%";
      if (ticks >= total) { detenerDuelo(); finDuelo(false); }
    }, 40);
    aim._disparo = () => {
      const enZona = pos >= zona && pos <= zona + ancho;
      detenerDuelo();
      finDuelo(enZona);
    };
  }

  function finDuelo(gano) {
    const res = Tch().resolverDuelo(gano);
    if (!res) return;
    ultimoResultado = { tier: res.tier, texto: res.texto, desglose: [] };
    pantalla = "resultado";
    pintar();
  }

  const TIER_TXT = { crit: "¡PERFECTO!", ok: "SALE BIEN", parcial: "A MEDIAS", fallo: "FALLA", contra: "SE VUELVE EN CONTRA" };

  function htmlResultado() {
    const r = ultimoResultado;
    return `<div class="decision-box tac-res tier-${r.tier}">
      <h3>${TIER_TXT[r.tier] || ""}</h3>
      <p class="tac-texto">${r.texto}</p>
      ${r.desglose && r.desglose.length ? `<p class="tac-mods">${r.desglose.map(([txt, pts]) => `<span class="${pts >= 0 ? "pos" : "neg"}">${pts >= 0 ? "+" : ""}${pts} ${txt}</span>`).join("")}</p>` : ""}
      <button class="btn btn-primary btn-block" data-tac-cont="1" type="button">Continuar</button>
    </div>`;
  }

  const MOTIVO_TXT = {
    eliminacion: "Definida por eliminación total.",
    duelo: "Duelo final en el sitio.",
    plant: "El defuser activo definió la ronda."
  };

  function motivoTexto(t, ganada) {
    if (t.motivo === "plant") {
      return ganada
        ? "El defuser explotó a tu favor: el plant definió la ronda."
        : "El defuser explotó: el plant rival definió la ronda.";
    }
    return MOTIVO_TXT[t.motivo] || "";
  }

  function htmlResumen(t) {
    const s = t.stats;
    const r = resumen;
    const st = ST();
    return `<div class="decision-box tac-resumen ${r.ganada ? "ok" : "bad"}">
      <h3>${r.ganada ? "✓ RONDA GANADA" : "✕ RONDA PERDIDA"}</h3>
      <p class="tac-motivo">${motivoTexto(t, r.ganada)}</p>
      <p class="stat-grande">${st.puntosJ} — ${st.puntosIA}</p>
      <div class="tac-stats">
        <div><span>BAJAS</span><strong>${s.bajasJ} – ${s.bajasR}</strong></div>
        <div><span>DAÑO</span><strong>${s.danio}</strong></div>
        <div><span>UTILIDAD</span><strong>${s.util} usadas · ${s.utilMal} malgastadas</strong></div>
        <div><span>PLANT</span><strong>${s.plant ? (t.lado === "ataque" ? "Plantamos" : "Hubo plant") : "Sin plant"}</strong></div>
        <div><span>TIEMPO</span><strong>${s.tiempoRestante} rest.</strong></div>
        <div><span>CLUTCH</span><strong>${s.clutch ? "Sí" : "No"}</strong></div>
      </div>
      <p class="tac-mejor">Mejor decisión: <strong>${s.mejor}</strong></p>
      <p class="tac-mejor">Peor decisión: <strong>${s.peor}</strong></p>
      ${r.fin
        ? `<button class="btn btn-primary btn-block" data-acc="a-ver-fin" type="button">Ver resultado final</button>`
        : `<button class="btn btn-primary btn-block" data-acc="a-sitio" type="button">Ronda ${st.rondaNum + 1}: punto y arranque</button>`}
    </div>`;
  }

  function cerrarYResumir() {
    const t = Tch().estado();
    if (!t || !t.terminado) return;
    detenerQTE();
    resumen = Tch().cerrar();
    pantalla = "resumen";
    pintar();
    if (resumen.puntoBloqueado) {
      window.SIEGE_DLE.toast.mostrar(`Punto "${resumen.sitio}" ganado: queda bloqueado y no se vuelve a jugar en esta partida.`, "success");
    }
  }

  function conectarZona(zona) {
    zona.querySelectorAll("[data-acc]").forEach((b) => b.addEventListener("click", () => {
      detenerQTE();
      detenerDuelo();
      window.SIEGE_DLE.partidaUI.accion(b.dataset.acc);
    }));
    zona.querySelectorAll("[data-quiz]").forEach((b) => b.addEventListener("click", () => {
      ultimoQuiz = Tch().responderQuiz(Number(b.dataset.quiz));
      pintar();
    }));
    zona.querySelectorAll("[data-tac]").forEach((b) => b.addEventListener("click", () => {
      const res = Tch().resolverAccion(b.dataset.tac);
      if (!res) return;
      if (res.error) { window.SIEGE_DLE.toast.mostrar(res.error, "warning"); return; }
      ultimoResultado = res;
      pantalla = "resultado";
      pintar();
    }));
    zona.querySelectorAll("[data-duelo]").forEach((b) => b.addEventListener("click", () => {
      const aim = document.getElementById("tac-aim");
      if (aim && aim._disparo) aim._disparo();
    }));
    zona.querySelectorAll("[data-duelo-modo]").forEach((b) => b.addEventListener("click", () => {
      dueloModo = b.dataset.dueloModo;
      dueloQuizQ = dueloModo === "quiz" ? Tch().dueloPregunta() : null;
      pintar();
    }));
    zona.querySelectorAll("[data-duelo-quiz]").forEach((b) => b.addEventListener("click", () => {
      const r = Tch().responderDueloQuiz(Number(b.dataset.dueloQuiz));
      if (!r) return;
      dueloModo = null; dueloQuizQ = null;
      ultimoResultado = { tier: r.bien ? "ok" : "fallo", texto: r.texto + (r.res && !r.bien ? " " + r.res.texto : ""), desglose: [] };
      pantalla = "resultado";
      pintar();
    }));
    zona.querySelectorAll("[data-tac-cont]").forEach((b) => b.addEventListener("click", () => {
      ultimoResultado = null;
      ultimoQuiz = null;
      dueloModo = null; dueloQuizQ = null;
      const t = Tch().estado();
      if (t.terminado) { cerrarYResumir(); return; }
      pantalla = "momento";
      Tch().siguiente();
      if (t.terminado) { cerrarYResumir(); return; }
      pintar();
    }));
  }

  window.SIEGE_DLE = window.SIEGE_DLE || {};
  window.SIEGE_DLE.rondaTacticaUI = { vista, comenzar, pintar, detenerQTE };
})();
