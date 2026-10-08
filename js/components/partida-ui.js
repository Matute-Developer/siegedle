/* Interfaz del modo Partida: pantalla de inicio, veto y sorteo de mapa, punto de bomba /
   punto de arranque, bans, draft, simulación y final. */
(function () {
  let pasoBan = 0; // 0: baneo yo, 1: banea el rival, 2: resumen
  let ultimoBanRival = null;
  let seleccionBan = null;
  let seleccionSitio = null; // índice del punto de bomba marcado antes de confirmarlo
  let seleccionSpawn = null; // índice del punto de arranque marcado antes de confirmarlo
  let seleccionMapa = null;  // id del mapa marcado en el veto
  let panelInicio = null;    // null: botones | "mapas": ver mapas | "reglas": cómo se juega
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
    // Una partida terminada vuelve a la pantalla de inicio; una en curso se retoma donde estaba.
    if (st.fase === "fin") { st.fase = "inicio"; panelInicio = null; }
    render();
  }

  function render() {
    limpiarTimers();
    const st = ST();
    // La pausa no sobrevive a un cambio de fase.
    if (enPausa && fasePausada !== st.fase) { enPausa = false; fasePausada = null; }
    const cont = document.getElementById("partida-contenido");
    if (!cont) return;
    if (st.fase === "inicio") cont.innerHTML = vistaInicio();
    else if (st.fase === "vetoMapa") cont.innerHTML = vistaVetoMapa();
    else if (st.fase === "sorteo") cont.innerHTML = vistaSorteo();
    else if (st.fase === "mapa") cont.innerHTML = vistaMapa();
    else if (st.fase === "sitio") cont.innerHTML = vistaSitio();
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
    const mini = st.mapa.imagen
      ? `<img src="${st.mapa.imagen}" alt="${st.mapa.nombre}" class="match-head__map-img" />`
      : "";
    return `<div class="match-head">
      <div class="match-head__map">
        ${mini}
        <div><span class="tag">🗺️ ${st.mapa.nombre}</span> <span class="muted">· ${st.sitio ? "💣 " + st.sitio : "punto por elegir"}</span></div>
      </div>
      <div class="match-score"><strong>TÚ ${st.puntosJ}</strong><span>—</span><strong>${st.puntosIA} RIVAL</strong></div>
    </div>`;
  }

  function chipsVetados() {
    const st = ST();
    if (!st.vetados.length) return "";
    return `<p class="muted">Baneados en la partida: <strong>${st.vetados.map((id) => porId(id).nombre).join(" · ")}</strong></p>`;
  }

  // ---------- PANTALLA DE INICIO (antes de arrancar la partida) ----------
  function vistaInicio() {
    if (panelInicio === "mapas") return vistaListaMapas();
    if (panelInicio === "reglas") return vistaReglas();
    return `<div class="inicio">
      <div class="inicio-botones">
        <button class="btn btn-primary inicio-jugar" data-acc="a-jugar" type="button">JUGAR</button>
        <button class="btn btn-ghost" data-acc="a-ver-mapas" type="button">Ver mapas</button>
        <button class="btn btn-ghost" data-acc="a-como-se-juega" type="button">Cómo se juega</button>
      </div>
    </div>`;
  }

  function arranquesDe(id) {
    const lista = window.SIEGE_DLE.puntosAtaque || [];
    const fila = lista.find((e) => e.mapa === id);
    return fila ? fila.puntos : [];
  }

  function vistaListaMapas() {
    const mapas = window.SIEGE_DLE.mapas || [];
    const filas = mapas.map((m) => {
      const thumb = m.imagen
        ? `<div class="mapa-ficha__thumb"><img src="${m.imagen}" alt="${m.nombre}" loading="lazy" /></div>`
        : "";
      return `<div class="mapa-ficha">
        ${thumb}
        <div class="mapa-ficha__content">
          <div class="mapa-ficha__head"><strong>🗺️ ${m.nombre}</strong><span class="pill">${m.sitios.length} puntos</span></div>
          <p class="mapa-desc">${m.descripcion}</p>
          <p class="mapa-dato"><span class="mapa-dato__label">Puntos de bomba</span>${m.sitios.map((s) => `<span class="pill">💣 ${s}</span>`).join("")}</p>
          <p class="mapa-dato"><span class="mapa-dato__label">Arranques</span>${arranquesDe(m.id).map((s) => `<span class="pill pill-acc">🚀 ${s}</span>`).join("")}</p>
        </div>
      </div>`;
    }).join("");
    return `<div class="briefing">
      <div class="briefing__head"><span class="tag">LOS ${mapas.length} MAPAS</span>
        <span class="briefing__date">PUNTOS DE BOMBA + ARRANQUES</span></div>
      <h2>Mapas y puntos</h2>
      <div class="mapas-lista">${filas}</div>
      <button class="btn btn-ghost btn-block" data-acc="a-volver-inicio" type="button">← Volver</button>
    </div>`;
  }

  function vistaReglas() {
    return `<div class="briefing">
      <div class="briefing__head"><span class="tag">CÓMO SE JUEGA</span>
        <span class="briefing__date">TÚ VS RIVAL · PRIMERO EN 4</span></div>
      <h2>Modo Partida</h2>
      <ol class="reglas-lista">
        <li><strong>Veto de mapa:</strong> salen <strong>5 mapas al azar</strong>. Vos baneás 1 y el rival banea 1.</li>
        <li><strong>Sorteo:</strong> entre los 3 que quedan, el mapa que se juega sale <strong>totalmente al azar</strong>.</li>
        <li><strong>Punto y arranque:</strong> si <strong>defendés</strong> elegís el punto de bomba (💣); si <strong>atacás</strong> elegís el punto de arranque (🚀) y el punto lo pone el rival. El punto donde ganaste queda <strong>bloqueado</strong> para el resto de la partida.</li>
        <li><strong>Bans:</strong> cada ronda baneás 1 rival y el rival banea 1 tuyo. Los baneos se <strong>acumulan</strong> en toda la partida.</li>
        <li><strong>Draft:</strong> armás tu equipo de <strong>5</strong> con el bando que te toca en la ronda.</li>
        <li><strong>Ronda:</strong> tomás <strong>2 decisiones</strong> con 3 opciones cada una. Sin pistas: el que se equivoca, se equivoca.</li>
        <li><strong>Gana quien llegue a 4</strong> rondas. Quien arranca <strong>alterna</strong> entre partidas.</li>
      </ol>
      <button class="btn btn-ghost btn-block" data-acc="a-volver-inicio" type="button">← Volver</button>
    </div>`;
  }

  // ---------- VETO DE MAPA Y SORTEO ----------
  function tarjetaMapa(mapa, marcado, sello) {
    const imgHtml = mapa.imagen
      ? `<div class="mapa-card__thumb"><img src="${mapa.imagen}" alt="${mapa.nombre}" loading="lazy" /></div>`
      : "";
    return `<button class="mapa-card${marcado ? " seleccionado" : ""}" data-mapa="${mapa.id}" type="button">
      ${imgHtml}
      <div class="mapa-card__info">
        <strong>🗺️ ${mapa.nombre}</strong>
        <span class="mapa-desc">${mapa.descripcion}</span>
        <span class="sitio-sello">${sello}</span>
      </div>
    </button>`;
  }

  // Paso 1: el jugador banea 1 de los 5 mapas candidatos.
  function vistaVetoMapa() {
    const st = ST();
    const candidatos = (st.mapasCandidatos || []).map((id) => P().mapaPorId(id)).filter(Boolean);
    const tarjetas = candidatos.map((m) => tarjetaMapa(m, seleccionMapa === m.id,
      seleccionMapa === m.id ? "MARCASTE ESTE MAPA" : "BANEAR ESTE MAPA")).join("");
    return `<div class="briefing">
      <div class="briefing__head"><span class="tag">FASE PREVIA · VETO DE MAPAS</span>
        <span class="briefing__date">5 CANDIDATOS · BANEA 1 CADA UNO</span></div>
      <h2>Baneá un mapa</h2>
      <p class="muted">Salen <strong>${candidatos.length} mapas</strong>. Vos baneás uno y el rival banea otro:
        entre los <strong>3 restantes</strong> el mapa se <strong>sortea</strong>.</p>
      <div class="mapa-grid">${tarjetas}</div>
      <div class="veto-acciones">
        <button class="btn btn-primary btn-block" id="btn-veto-mapa" data-acc="a-confirmar-veto" type="button" ${seleccionMapa ? "" : "disabled"}>Confirmar veto</button>
        <div class="veto-acciones__secundarias">
          <button class="btn btn-ghost" data-acc="a-reroll-mapas" type="button" ${st.rerollMapasUsado ? "disabled" : ""} title="${st.rerollMapasUsado ? "Ya usaste el cambio de mapas en esta partida" : "Sortea otros 5 mapas (solo 1 vez)"}">
            🎲 ${st.rerollMapasUsado ? "Randomizar mapas (Ya usado)" : "Randomizar mapas de nuevo (1 disponible)"}
          </button>
          <button class="btn btn-ghost" data-acc="a-cancelar-partida" type="button">← Regresar y no jugar</button>
        </div>
      </div>
    </div>`;
  }

  // Paso 2: los dos vetos dejaron 3 mapas; de ahí sale uno al azar.
  function tarjetaSorteo(mapa) {
    const imgHtml = mapa.imagen
      ? `<div class="mapa-card__thumb"><img src="${mapa.imagen}" alt="${mapa.nombre}" loading="lazy" /></div>`
      : "";
    return `<div class="mapa-card mapa-card--sorteo" data-sorteo="${mapa.id}">
      ${imgHtml}
      <div class="mapa-card__info">
        <strong>🗺️ ${mapa.nombre}</strong>
        <span class="mapa-desc">${mapa.descripcion}</span>
        <span class="sitio-sello">EN CARTELERA</span>
      </div>
    </div>`;
  }

  function vistaSorteo() {
    const st = ST();
    const disponibles = P().mapasDisponibles().map((id) => P().mapaPorId(id)).filter(Boolean);
    const mJ = P().mapaPorId(st.vetoMapaJ);
    const mR = P().mapaPorId(st.vetoMapaRival);
    const tarjetas = disponibles.map(tarjetaSorteo).join("");
    return `<div class="briefing">
      <div class="briefing__head"><span class="tag">SORTEO DE MAPA</span>
        <span class="briefing__date">${disponibles.length} MAPAS EN CARTELERA</span></div>
      <h2 id="sorteo-titulo">🎲 A sortear el mapa…</h2>
      <p class="muted">Vos baneaste <strong>${mJ ? mJ.nombre : "—"}</strong> · El rival baneó <strong>${mR ? mR.nombre : "—"}</strong>.
        De los que quedaron en pie sale uno <strong>totalmente al azar</strong>.</p>
      <div class="mapa-grid" id="sorteo-grid">${tarjetas}</div>
      <button class="btn btn-primary btn-block" id="btn-sortear" data-acc="a-sortear" type="button">🎲 ¡Sortear mapa!</button>
      <button class="btn btn-ghost btn-block" data-acc="a-cancelar-partida" type="button" style="margin-top:.6rem">← Regresar y no jugar</button>
    </div>`;
  }

  function vistaMapa() {
    const st = ST();
    const heroImg = st.mapa && st.mapa.imagen
      ? `<div class="mapa-hero"><img src="${st.mapa.imagen}" alt="${st.mapa.nombre}" /></div>`
      : "";
    return `${cabecera()}
      <div class="briefing">
        <div class="briefing__head"><span class="tag">MAPA SORTEADO</span></div>
        ${heroImg}
        <h2>🗺️ ${st.mapa.nombre}</h2>
        <p class="muted">${st.mapa.descripcion}</p>
        <div class="briefing__meta">
          <div class="meta"><span>PUNTOS DE BOMBA</span><strong>💣 ${st.mapa.sitios.length}</strong></div>
          <div class="meta"><span>ARRANQUES</span><strong>🚀 ${P().puntosSpawn().length}</strong></div>
          <div class="meta"><span>PARTIDA</span><strong>Primero en 4 rondas</strong></div>
        </div>
        <p class="muted" style="margin-top:.8rem">Cada ronda tiene dos cosas: el <strong>punto de bomba</strong> (lo fija
          <strong>siempre el defensor</strong>: si defendés lo elegís vos, si atacás lo pone el rival) y el <strong>punto de
          arranque</strong> del atacante (🚀: si atacás lo elegís vos, si defendés lo pone el rival). El punto donde ganaste
          queda <strong>bloqueado</strong> para el resto de la partida; si perdiste, se puede volver a elegir.</p>
        <p class="muted">Esta partida se empieza <strong>${st.empieza === "ataque" ? "atacando" : "defendiendo"}</strong> (se alterna entre partidas). El rival ya tiene su plan.</p>
        <button class="btn btn-primary btn-block" data-acc="a-sitio" type="button">Comenzar ronda 1</button>
      </div>`;
  }

  // ---------- PUNTO DE BOMBA Y PUNTO DE ARRANQUE ----------
  // Dos caras de la misma ronda: el punto de bomba lo fija SIEMPRE el defensor y el punto de
  // arranque SIEMPRE el atacante. Cuando elige el rival, acá no se renderiza ningún botón.
  function tarjetaSitio(nombre, i, bloqueado, elegido) {
    const cls = ["sitio-card"];
    if (bloqueado) cls.push("bloqueado");
    if (elegido) cls.push("seleccionado");
    const sello = bloqueado ? "GANASTE AQUÍ · BLOQUEADO" : elegido ? "TU ELECCIÓN" : "DISPONIBLE";
    return `<button class="${cls.join(" ")}" data-sitio="${i}" type="button" ${bloqueado ? "disabled" : ""}>
      <span class="sitio-ico" aria-hidden="true">💣</span>
      <strong>${nombre}</strong>
      <span class="sitio-sello">${sello}</span>
    </button>`;
  }

  function tarjetaSpawn(nombre, i, elegido) {
    return `<button class="sitio-card${elegido ? " seleccionado" : ""}" data-spawn="${i}" type="button">
      <span class="sitio-ico" aria-hidden="true">🚀</span>
      <strong>${nombre}</strong>
      <span class="sitio-sello">${elegido ? "TU PUNTO DE ARRANQUE" : "ARRANCAR ACÁ"}</span>
    </button>`;
  }

  function vistaSitio() {
    const st = ST();
    const lado = P().ladoProximo();
    const ataco = lado === "ataque";
    const sitios = (st.mapa && st.mapa.sitios) || [];
    const bloqueados = (st.sitiosGanados || []).map((i) => sitios[i]);
    const nombreMapa = (st.mapa && st.mapa.nombre ? st.mapa.nombre : "").toUpperCase();

    // ATACÁS: elegís desde dónde entrás; el punto de bomba lo puso el defensor y no se toca.
    if (ataco) {
      const spawns = P().puntosSpawn();
      const tarjetas = spawns.map((nombre, i) => tarjetaSpawn(nombre, i, seleccionSpawn === i)).join("");
      return `${cabecera()}
        <div class="briefing">
          <div class="briefing__head"><span class="tag">RONDA ${st.rondaNum + 1} · ATAQUE · PUNTO DE ARRANQUE</span></div>
          <div class="sitio-titulo-row">
            <h2>Elegí desde dónde entrás</h2>
            <span class="sitio-mapa-derecha">${nombreMapa}</span>
          </div>
          <p class="muted">El equipo defensor ya eligió el punto de bomba y <strong>vos no podés tocarlo</strong>:
            la ronda se juega en 💣 <strong>${st.sitio || "el punto del rival"}</strong>. Tocá tu punto de arranque.</p>
          <div class="punto-rival">💣 ${st.sitio || "…"}</div>
          <div class="sitio-grid">${tarjetas}</div>
          <button class="btn btn-primary btn-block" id="btn-elegir-spawn" data-acc="a-elegir-spawn" type="button" ${seleccionSpawn === null ? "disabled" : ""}>Usar este arranque y continuar</button>
        </div>`;
    }

    // DEFENDÉS: elegís el punto de bomba; el rival (atacante) ya eligió su arranque.
    const tarjetas = sitios.map((nombre, i) => tarjetaSitio(nombre, i, P().sitioBloqueado(i), seleccionSitio === i)).join("");
    return `${cabecera()}
      <div class="briefing">
        <div class="briefing__head"><span class="tag">RONDA ${st.rondaNum + 1} · DEFENSA · PUNTO DE BOMBA</span></div>
        <div class="sitio-titulo-row">
          <h2>Elegí el punto a defender</h2>
          <span class="sitio-mapa-derecha">${nombreMapa}</span>
        </div>
        <p class="muted">Vos defendés: elegí uno de los ${sitios.length} puntos de ${st.mapa.nombre}.
          El rival ya eligió desde dónde entra.</p>
        <div class="punto-rival">🚀 ${st.spawn || "…"}</div>
        <div class="sitio-grid">${tarjetas}</div>
        <p class="muted sitio-regla">Ganar en un punto lo <strong>bloquea</strong> y no se vuelve a jugar en esta partida.
          Perder deja el punto disponible para volver a pickearlo.</p>
        ${bloqueados.length ? `<p class="muted">Bloqueados: <strong>${bloqueados.join(" · ")}</strong></p>` : ""}
        <button class="btn btn-primary btn-block" id="btn-elegir-sitio" data-acc="a-elegir-sitio" type="button" ${seleccionSitio === null ? "disabled" : ""}>Elegir punto y continuar</button>
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
    const bloqueados = (st.sitiosGanados || []).map((i) => st.mapa.sitios[i]);
    return `${cabecera()}
      <div class="briefing"><div class="briefing__head"><span class="tag">RONDA ${st.rondaNum + 1} · ${lado.toUpperCase()}</span></div>
        <h2>${lado === "ataque" ? "Atacás el punto" : "Defendés el punto"}</h2>
        <p class="muted">${st.mapa.nombre} — ${lado === "ataque"
          ? `arranque 🚀 <strong>${st.spawn}</strong> · punto rival 💣 <strong>${st.sitio}</strong>`
          : `punto 💣 <strong>${st.sitio}</strong> · arranque rival 🚀 <strong>${st.spawn}</strong>`}. Primero en 4 rondas gana.</p>
        ${bloqueados.length ? `<p class="muted">Puntos bloqueados: <strong>${bloqueados.join(" · ")}</strong></p>` : ""}
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
        : `<button class="btn btn-primary btn-block" data-acc="a-sitio" type="button">Ronda ${st.rondaNum + 1}: punto y arranque</button>`}`;
    conectarZona(zona);
    if (res.puntoBloqueado) {
      window.SIEGE_DLE.toast.mostrar(`Punto "${res.sitio}" ganado: queda bloqueado y no se vuelve a jugar en esta partida.`, "success");
    }
  }

  // ---------- FIN ----------
  function vistaFin() {
    const st = ST();
    const victoria = st.puntosJ >= 4;
    return `<div class="briefing fin-${victoria ? "ok" : "bad"}">
        <div class="briefing__head"><span class="tag">PARTIDA TERMINADA</span></div>
        <h2>${victoria ? "🏆 VICTORIA" : "DERROTA"}</h2>
        <p class="stat-grande">${st.puntosJ} — ${st.puntosIA}</p>
        <p class="muted">${st.mapa.nombre} · 💣 ${st.sitio} · ${st.rondas.length} rondas.</p>
        <div class="historial">${st.rondas.map((r) => `<span class="pill ${r.resultado === "victoria" ? "ok" : "bad"}" title="Ronda ${r.num} (${r.lado})${r.sitio ? " — 💣 " + r.sitio : ""}${r.spawn ? " — 🚀 " + r.spawn : ""}">R${r.num}</span>`).join("")}</div>
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
    (raiz || document).querySelectorAll("[data-sitio]").forEach((b) => b.addEventListener("click", () => {
      if (ST().fase !== "sitio" || b.disabled) return;
      seleccionSitio = Number(b.dataset.sitio);
      render();
    }));
    (raiz || document).querySelectorAll("[data-spawn]").forEach((b) => b.addEventListener("click", () => {
      if (ST().fase !== "sitio" || b.disabled) return;
      seleccionSpawn = Number(b.dataset.spawn);
      render();
    }));
    (raiz || document).querySelectorAll("[data-mapa]").forEach((b) => b.addEventListener("click", () => {
      if (ST().fase !== "vetoMapa" || b.disabled) return;
      seleccionMapa = b.dataset.mapa;
      render();
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

  // SORTEO: el mapa sale totalmente al azar entre los que quedaron en pie, con una ruleta
  // que va frenando y termina clavada en el mapa ganador.
  function sortearMapa() {
    const st = ST();
    if (st.fase !== "sorteo") return;
    const disponibles = P().mapasDisponibles();
    if (!disponibles.length) return;
    const elegido = disponibles[Math.floor(Math.random() * disponibles.length)];
    const btn = document.getElementById("btn-sortear");
    if (btn) { btn.disabled = true; btn.textContent = "🎲 Girando…"; }
    const titulo = document.getElementById("sorteo-titulo");
    const grid = document.getElementById("sorteo-grid");
    const tarjetas = grid ? [...grid.querySelectorAll("[data-sorteo]")] : [];
    const vueltas = 15;
    let tick = 0;
    const giro = setInterval(() => {
      const idx = tarjetas.length ? Math.floor(Math.random() * tarjetas.length) : -1;
      tarjetas.forEach((c, i) => c.classList.toggle("seleccionado", i === idx));
      tick += 1;
      if (tick >= vueltas) {
        clearInterval(giro);
        temporizadores = temporizadores.filter((t) => t !== giro);
        const final = tarjetas.findIndex((c) => c.dataset.sorteo === elegido);
        tarjetas.forEach((c, i) => c.classList.toggle("seleccionado", i === final));
        const mapa = P().mapaPorId(elegido);
        if (titulo && mapa) titulo.textContent = `🎉 ${mapa.nombre}`;
        window.SIEGE_DLE.toast.mostrar(`Salió ${mapa ? mapa.nombre : "el mapa"}: a jugar esa ranked.`, "success");
        temporizadores.push(setTimeout(() => {
          if (st.fase !== "sorteo") return;
          P().elegirMapa(elegido);
          st.fase = "mapa";
          render();
        }, 1100));
      }
    }, 120);
    temporizadores.push(giro);
  }

  function accion(cual) {
    const st = ST();
    if (cual === "a-jugar") {
      // Arranca una partida nueva: primer paso, el veto de mapas.
      panelInicio = null;
      P().nuevoPartido();
      pasoBan = 0; seleccionBan = null; seleccionSitio = null; seleccionSpawn = null; seleccionMapa = null;
    }
    else if (cual === "a-ver-mapas") { panelInicio = "mapas"; }
    else if (cual === "a-como-se-juega") { panelInicio = "reglas"; }
    else if (cual === "a-volver-inicio" || cual === "a-cancelar-partida") {
      panelInicio = null;
      st.fase = "inicio";
      seleccionMapa = null;
      seleccionSitio = null;
      seleccionSpawn = null;
    }
    else if (cual === "a-reroll-mapas") {
      if (st.fase !== "vetoMapa" || st.rerollMapasUsado) return;
      P().randomizarMapas();
      seleccionMapa = null;
      window.SIEGE_DLE.toast.mostrar("Mapas sorteados de nuevo (1 sola vez por partida).", "info");
    }
    else if (cual === "a-confirmar-veto") {
      // El jugador banea 1 mapa y acto seguido el rival banea 1 distinto: quedan 3 en cartelera.
      if (st.fase !== "vetoMapa" || !seleccionMapa) return;
      if (!P().vetoMapaJ(seleccionMapa)) return;
      const vetoRival = P().vetoMapaRival();
      const mapaRival = vetoRival ? P().mapaPorId(vetoRival) : null;
      seleccionMapa = null;
      st.fase = "sorteo";
      if (mapaRival) {
        window.SIEGE_DLE.toast.mostrar(`El rival banea el mapa ${mapaRival.nombre}: prefiere otro terreno.`, "warning");
      }
    }
    else if (cual === "a-sortear") {
      // No re-renderiza: la ruleta maneja su propia animación y timers.
      sortearMapa();
      return;
    }
    else if (cual === "a-sitio") {
      // La ronda arranca con punto y arranque: cada uno lo fija el bando que le corresponde.
      P().prepararRonda();
      seleccionSitio = null;
      seleccionSpawn = null;
      st.fase = "sitio";
      if (P().ladoProximo() === "ataque") P().elegirSitioIA(); // el rival defiende: pone el punto
      else P().elegirSpawnIA();                                 // el rival ataca: pone su arranque
    }
    else if (cual === "a-elegir-sitio") {
      if (st.fase !== "sitio" || seleccionSitio === null) return;
      if (!P().elegirSitioJ(seleccionSitio)) return;
      st.fase = "bans"; pasoBan = 0; seleccionBan = null;
    }
    else if (cual === "a-elegir-spawn") {
      if (st.fase !== "sitio" || seleccionSpawn === null) return;
      const nombre = P().puntosSpawn()[seleccionSpawn];
      if (!nombre || !P().elegirSpawnJ(nombre)) return;
      st.fase = "bans"; pasoBan = 0; seleccionBan = null;
    }
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
    else if (cual === "a-otra") { P().nuevoPartido(); pasoBan = 0; seleccionSitio = null; seleccionSpawn = null; seleccionMapa = null; panelInicio = null; }
    render();
  }

  window.SIEGE_DLE = window.SIEGE_DLE || {};
  window.SIEGE_DLE.partidaUI = { entrar, render };
})();
