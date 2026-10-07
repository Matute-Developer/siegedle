/* Motor del modo Partida: punto por ronda (bloqueado si lo ganaste), bans por ronda
   (acumulativos), draft por lado, IA y simulación.
   Cada ronda: se elige el punto, vos baneás 1 del bando rival, el rival banea 1 del tuyo,
   draftean 5 cada uno (solo atacantes si atacás, solo defensores si defendés) y se simula
   con 2 decisiones. */
(function () {
  const META_ATK = ["thermite", "thatcher", "ace", "hibana", "maverick", "ash", "dokkaebi", "lion", "iana", "zero"];
  const META_DEF = ["jager", "bandit", "kaid", "smoke", "mira", "valkyrie", "mozzie", "azami", "mute", "fenrir"];

  const ESTILOS = {
    agresivo: { nombre: "Agresivo", desc: "Entrada y roaming constante.", pesos: { entry: 3, frag: 3, roam: 2, intel: 1, breach: 1 } },
    defensivo: { nombre: "Defensivo", desc: "Anclaje y negación del sitio.", pesos: { anchor: 3, denial: 3, antigadget: 2, support: 1, intel: 1 } },
    intel: { nombre: "Inteligencia", desc: "Información y control del mapa.", pesos: { intel: 3, antigadget: 2, flank: 2, entry: 1, denial: 1 } },
    equilibrado: { nombre: "Equilibrado", desc: "Sin debilidades claras.", pesos: null }
  };

  // sitio: punto de la ronda en curso (string), sitioIdx: su índice en mapa.sitios,
  // sitiosGanados: índices de los puntos donde el jugador ganó una ronda (quedan bloqueados).
  const state = {
    fase: "mapa", mapa: null, sitio: null, sitioIdx: null, sitiosGanados: [],
    estiloIA: "equilibrado", empieza: "ataque",
    vetados: [],
    equipoJ: [], equipoIA: [], opciones: [],
    rondas: [], puntosJ: 0, puntosIA: 0, rondaNum: 0, ronda: null
  };

  function ops() { return window.SIEGE_DLE.operators || []; }
  function porId(id) { return ops().find((o) => o.id === id); }
  function nombre(id) { const op = porId(id); return op ? op.nombre : id; }
  function alAzar(lista) { return lista[Math.floor(Math.random() * lista.length)]; }
  function ladoRival(lado) { return lado === "ataque" ? "defensa" : "ataque"; }
  function bandoDeLado(lado) { return lado === "ataque" ? "atacante" : "defensor"; }

  function elegirMapa() {
    const mapas = window.SIEGE_DLE.mapas || [];
    let ultimo = null;
    try { ultimo = localStorage.getItem("siegedle_ultimo_mapa"); } catch { /* sin almacenamiento */ }
    const candidatos = mapas.filter((m) => m.id !== ultimo);
    const mapa = alAzar(candidatos.length ? candidatos : mapas);
    try { localStorage.setItem("siegedle_ultimo_mapa", mapa.id); } catch { /* sin almacenamiento */ }
    return mapa;
  }

  // ---------- PUNTO DE LA RONDA ----------
  // Cada ronda se juega en un punto del mapa. Si defendés lo elegís vos; si atacás lo elige
  // el rival. El punto donde ganaste queda bloqueado para el resto de la partida;
  // si perdiste, sigue disponible y se puede volver a elegir.
  function sitiosDisponibles() {
    const sitios = (state.mapa && state.mapa.sitios) || [];
    return sitios.map((_, i) => i).filter((i) => !state.sitiosGanados.includes(i));
  }

  function sitioBloqueado(i) { return state.sitiosGanados.includes(i); }

  function elegirSitioJ(i) {
    const sitios = (state.mapa && state.mapa.sitios) || [];
    if (!Number.isInteger(i) || i < 0 || i >= sitios.length) return false;
    if (sitioBloqueado(i)) return false;
    state.sitioIdx = i;
    state.sitio = sitios[i];
    return true;
  }

  function elegirSitioIA() {
    const disp = sitiosDisponibles();
    if (!disp.length) return false;
    return elegirSitioJ(alAzar(disp));
  }

  function nuevoPartido() {
    state.fase = "mapa";
    state.estiloIA = alAzar(Object.keys(ESTILOS));
    // Alterna quién empieza entre partidas.
    try {
      const ultimo = localStorage.getItem("siegedle_empieza");
      state.empieza = ultimo === "ataque" ? "defensa" : "ataque";
      localStorage.setItem("siegedle_empieza", state.empieza);
    } catch { state.empieza = state.empieza === "ataque" ? "defensa" : "ataque"; }
    const mapa = elegirMapa();
    state.mapa = mapa;
    state.sitio = null; state.sitioIdx = null; state.sitiosGanados = [];
    state.vetados = [];
    state.equipoJ = []; state.equipoIA = []; state.opciones = [];
    state.rondas = []; state.puntosJ = 0; state.puntosIA = 0; state.rondaNum = 0; state.ronda = null;
  }

  function ladoDeRonda(n) {
    const otro = state.empieza === "ataque" ? "defensa" : "ataque";
    if (n <= 3) return state.empieza;
    if (n <= 6) return otro;
    return n % 2 === 1 ? state.empieza : otro;
  }

  // Lado de la ronda que se va a jugar (rondaNum + 1).
  function ladoProximo() { return ladoDeRonda(state.rondaNum + 1); }

  // ---------- BANS (1 por equipo por ronda, acumulativos) ----------
  // Cada equipo banea del bando que va a enfrentar.
  function banRival() {
    const ladoJ = ladoProximo();
    const bandoObjetivo = ladoJ === "ataque" ? "atacante" : "defensor";
    return candidatosBan(bandoObjetivo, state.estiloIA);
  }

  function candidatosBan(bando, estilo) {
    let base;
    if (bando === "atacante") {
      base = estilo === "defensivo" ? ["thermite", "ace", "hibana", "maverick", "thatcher"]
        : estilo === "agresivo" ? ["ash", "dokkaebi", "lion", "iana", "blitz"]
        : estilo === "intel" ? ["iq", "dokkaebi", "zero", "lion", "twitch"]
        : META_ATK.slice(0, 5);
      if (Math.random() < 0.3) base = META_ATK;
    } else {
      base = estilo === "defensivo" ? ["jager", "bandit", "kaid", "mute", "fenrir"]
        : estilo === "agresivo" ? ["caveira", "vigil", "ela", "alibi", "oryx"]
        : estilo === "intel" ? ["valkyrie", "mozzie", "solis", "pulse", "maestro"]
        : META_DEF.slice(0, 5);
      if (Math.random() < 0.3) base = META_DEF;
    }
    const disp = base.filter((id) => !state.vetados.includes(id) && porId(id));
    const resto = ops().filter((o) => o.bando === bando && !state.vetados.includes(o.id) && !disp.includes(o.id));
    const bolsa = disp.length ? disp : resto.map((o) => o.id);
    return alAzar(bolsa);
  }

  function motivoBan(id) {
    const op = porId(id);
    const rol = (op && op.rol) || "";
    if (/Hard Breach|Breach|Brecha/i.test(rol)) return "bloquea la apertura";
    if (/Intel|Inteligencia/i.test(rol)) return "niega información";
    if (/Roam/i.test(rol)) return "frena el roaming";
    if (/Entry|Vanguardia/i.test(rol)) return "corta la entrada";
    return "rompe tu plan";
  }

  // ---------- DRAFT (5 picks, pool según tu lado) ----------
  function disponiblesDraft() {
    const lado = ladoProximo();
    const bando = bandoDeLado(lado);
    const fuera = new Set([...state.vetados, ...state.equipoJ]);
    return ops().filter((o) => o.bando === bando && !fuera.has(o.id));
  }

  function puntuar(op, pesos) {
    const r = window.SIEGE_DLE.rasgos.rasgosDe(op);
    let s = 0;
    Object.keys(pesos).forEach((t) => { s += (r[t] || 0) * pesos[t]; });
    return s;
  }

  // Categoría interna que más aporta un operador (entry, breach, intel... nunca se muestra).
  function dominante(op) {
    const R = window.SIEGE_DLE.rasgos;
    const r = R.rasgosDe(op);
    let mejor = null; let val = -1;
    R.RASGOS.forEach((t) => {
      const v = r[t] || 0;
      if (v > val) { val = v; mejor = t; }
    });
    return mejor;
  }

  // El pick que da forma a la composición: el que más aporta al lado que se juega.
  function ejeDelEquipo(ids, pesosLado) {
    const R = window.SIEGE_DLE.rasgos;
    let mejor = null; let val = -1;
    ids.forEach((id) => {
      const op = porId(id);
      if (!op) return;
      const r = R.rasgosDe(op);
      let s = 0;
      R.RASGOS.forEach((t) => { s += (r[t] || 0) * (pesosLado[t] || 0); });
      if (s > val) { val = s; mejor = op; }
    });
    return mejor;
  }

  // Cuánto le falta a la composición, por categoría, para llegar a 5 bien armados.
  function carencias(ids, lado) {
    const R = window.SIEGE_DLE.rasgos;
    const st = R.equipoStats(ids);
    const m = R.MINIMOS[lado] || {};
    const c = {};
    R.RASGOS.forEach((t) => { c[t] = Math.max(0, (m[t] || 2) - st.rasgos[t]) * (m[t] ? 2 : 1); });
    return c;
  }

  // Opciones del draft: coherentes con lo que ya elegiste y con el lado jugado.
  // 1) Si hay un eje (Thermite, Smoke...), el mejor de cada familia que lo complementa.
  // 2) Si no, 3 rutas de composición distintas (cubrir hueco, encaje de lado, apuesta).
  function opcionesDraft() {
    const bolsa = disponiblesDraft();
    if (bolsa.length <= 3) return bolsa.map((o) => o.id);
    const R = window.SIEGE_DLE.rasgos;
    const lado = ladoProximo();
    const pesosLado = lado === "ataque" ? R.PESOS_ATAQUE : R.PESOS_DEFENSA;
    const eq = state.equipoJ;
    const car = carencias(eq, lado);
    const eje = eq.length ? ejeDelEquipo(eq, pesosLado) : null;
    const famEje = eje ? R.familiaDe(eje) : null;
    const comboEje = famEje ? (R.FAMILIAS[famEje].combo || []) : [];
    const apuesta = alAzar(lado === "ataque"
      ? ["breach", "entry", "plant", "intel"]
      : ["anchor", "denial", "roam", "intel"]);

    const ruido = new Map(bolsa.map((o) => [o.id, Math.random() * 4]));
    const scoreCubre = (op) => puntuar(op, car) * 1.4 + puntuar(op, pesosLado) * 0.35 + ruido.get(op.id) * 0.8;
    const scoreLado = (op) => puntuar(op, pesosLado) + (ruido.get(op.id) - 2);
    const scoreCompanero = (op) => {
      let s = R.sinergiaCon(eq, op) * 1.8;
      if (eje) {
        s += R.sinergiaEntre(R.rasgosDe(eje), R.rasgosDe(op)) * 1.6;
        const famOp = R.familiaDe(op);
        if (famOp) s += famOp === famEje ? 12 : comboEje.includes(famOp) ? 14 : 0;
      }
      s += puntuar(op, car) * 0.3;
      s += puntuar(op, pesosLado) * 0.3;
      return s + ruido.get(op.id) * 0.5;
    };
    const scoreApuesta = (op) => (R.rasgosDe(op)[apuesta] || 0) * 3 + ruido.get(op.id) * 0.6;

    // 1) Con eje: el mejor de cada familia que complementa tu línea de juego.
    if (eje && famEje && Math.random() < 0.6) {
      const puntos = new Map(bolsa.map((o) => [o.id, scoreCompanero(o)]));
      // Dentro de una familia manda el especialista (no el que un poco de todo).
      const dentro = (f) => bolsa.filter((o) => R.familiaDe(o) === f).map((o) => {
        const r = R.rasgosDe(o);
        const propio = R.FAMILIAS[f].rasgos.reduce((a, t) => a + (r[t] || 0), 0);
        const total = R.RASGOS.reduce((a, t) => a + (r[t] || 0), 0);
        return { o, s: propio * 4 - (total - propio) * 1.5 + puntos.get(o.id) * 0.5 };
      }).sort((a, b) => b.s - a.s);
      const familias = [...new Set([famEje, ...comboEje])];
      const porFamilia = [];
      familias.forEach((f) => {
        const cands = dentro(f);
        if (!cands.length) return;
        // Variedad: elige entre los 3 mejores de esa familia.
        const bolsaFam = cands.slice(0, 3);
        const azar = Math.random();
        const idx = azar < 0.5 ? 0 : azar < 0.8 ? 1 : 2;
        porFamilia.push({ op: bolsaFam[Math.min(idx, bolsaFam.length - 1)].o, s: cands[0].s });
      });
      porFamilia.sort((a, b) => b.s - a.s);
      const salida = porFamilia.slice(0, 3).map((x) => x.op.id);
      const global = [...bolsa].sort((a, b) => puntos.get(b.id) - puntos.get(a.id));
      global.forEach((o) => { if (salida.length < 3 && !salida.includes(o.id)) salida.push(o.id); });
      return salida.slice(0, 3);
    }

    // 2) Sin eje: 3 rutas de composición distintas (categorías dominantes distintas).
    const porCubre = [...bolsa].sort((a, b) => scoreCubre(b) - scoreCubre(a));
    const porLado = [...bolsa].sort((a, b) => scoreLado(b) - scoreLado(a));
    const porApuesta = [...bolsa].sort((a, b) => scoreApuesta(b) - scoreApuesta(a));
    const elegidos = [];
    // Cada ruta aporta una dirección distinta y, dentro de la ruta, se elige entre las 3
    // mejores para que no siempre salga el mismo operador.
    const tomar = (lista) => {
      const doms = new Set(elegidos.map((id) => dominante(porId(id))));
      const cands = lista.filter((o) => !elegidos.includes(o.id));
      if (!cands.length) return;
      const distintos = cands.filter((o) => !doms.has(dominante(o)));
      const usar = distintos.length ? distintos : cands;
      const top = usar.slice(0, 3);
      const azar = Math.random();
      const idx = azar < 0.45 ? 0 : azar < 0.78 ? 1 : 2;
      elegidos.push(top[Math.min(idx, top.length - 1)].id);
    };
    tomar(porCubre);
    tomar(porLado);
    tomar(porApuesta);
    const resto = bolsa.filter((o) => !elegidos.includes(o.id));
    while (elegidos.length < 3 && resto.length) elegidos.push(resto.splice(Math.floor(Math.random() * resto.length), 1)[0].id);
    return elegidos.slice(0, 3);
  }

  // El rival arma un equipo con su estilo, pero también cubriendo huecos y con sinergia.
  function generarEquipoIA() {
    const R = window.SIEGE_DLE.rasgos;
    const ladoJ = ladoProximo();
    const ladoIA = ladoRival(ladoJ);
    const bandoRival = bandoDeLado(ladoIA);
    const fuera = new Set([...state.vetados, ...state.equipoJ]);
    const bolsa = ops().filter((o) => o.bando === bandoRival && !fuera.has(o.id));
    const estilo = ESTILOS[state.estiloIA];
    const pesos = estilo.pesos || (ladoIA === "ataque" ? R.PESOS_ATAQUE : R.PESOS_DEFENSA);
    const elegidos = [];
    for (let i = 0; i < 5; i++) {
      const disponibles = bolsa.filter((o) => !elegidos.includes(o.id));
      if (!disponibles.length) break;
      const car = carencias(elegidos, ladoIA);
      const puntuados = disponibles.map((op) => ({
        op,
        s: puntuar(op, pesos) * 1.3
          + puntuar(op, car) * 0.5
          + R.sinergiaCon(elegidos, op) * 0.6
          + Math.random() * 20
      })).sort((a, b) => b.s - a.s);
      elegidos.push(puntuados[0].op.id);
    }
    state.equipoIA = elegidos;
  }

  // ---------- RONDAS ----------
  function topRasgo(ids, rasgo) {
    let mejor = null; let val = -1;
    ids.forEach((id) => {
      const op = porId(id);
      if (!op) return;
      const v = window.SIEGE_DLE.rasgos.rasgosDe(op)[rasgo] || 0;
      if (v > val) { val = v; mejor = op; }
    });
    return val > 0 ? mejor : null;
  }

  const DECISIONES = {
    ataque: [
      { clave: "A", titulo: "Entrada explosiva", desc: "Reventar todo y entrar sin pedir permiso.", rasgos: ["entry", "frag"] },
      { clave: "B", titulo: "Juego metódico", desc: "Dron, info y apertura quirúrgica.", rasgos: ["intel", "breach"] },
      { clave: "C", titulo: "Presión dividida", desc: "Atacar por tres lados a la vez.", rasgos: ["flank", "support"] },
      { clave: "D", titulo: "Lluvia desde arriba", desc: "Abrir techo y llover plomo.", rasgos: ["vertical", "breach"] },
      { clave: "E", titulo: "Caza de roamers", desc: "Limpiar el mapa antes del sitio.", rasgos: ["intel", "roam"] },
      { clave: "F", titulo: "Al plant directo", desc: "Humo, escudo y a plantar.", rasgos: ["plant", "support"] }
    ],
    defensa: [
      { clave: "A", titulo: "Aguantar el sitio", desc: "Ni un paso atrás.", rasgos: ["anchor", "denial"] },
      { clave: "B", titulo: "Jugar al retake", desc: "Ceder el sitio y recuperarlo.", rasgos: ["roam", "intel"] },
      { clave: "C", titulo: "Cazar al rival", desc: "Salir a buscar cada duelo.", rasgos: ["frag", "entry"] },
      { clave: "D", titulo: "Apagarles los ojos", desc: "Cegar drones y cámaras.", rasgos: ["antigadget", "intel"] },
      { clave: "E", titulo: "Nido de trampas", desc: "Que cada paso duela.", rasgos: ["denial", "flank"] },
      { clave: "F", titulo: "Presión temprana", desc: "Pelear los primeros 30 segundos.", rasgos: ["roam", "frag"] }
    ]
  };

  const CONFIRMACIONES = [
    "Decidís: {t}. Tu equipo juega a su fortaleza.",
    "Orden dada: {t}. A ver si sale.",
    "Vas con {t}. Sin miedo al éxito."
  ];

  function construirEventos() {
    const lado = state.ronda.lado;
    const atk = lado === "ataque";
    const J = state.equipoJ; const R = state.equipoIA;
    const evs = [];
    evs.push({ tipo: "mapa", texto: `Fase de preparación en ${state.mapa.nombre} — ${state.sitio}.` });
    evs.push({ tipo: "prep", texto: atk ? "Tu equipo prepara la entrada al sitio." : "Tu equipo refuerza el sitio y esconde trampas." });
    const intelJ = topRasgo(J, "intel");
    const intelR = topRasgo(R, "intel");
    if (intelJ) evs.push({ tipo: "intel", texto: `${intelJ.nombre} consigue información clave del rival.` });
    if (intelR) evs.push({ tipo: "rival", texto: `${intelR.nombre} detecta movimientos de tu equipo.` });
    evs.push({ decision: 0 });
    const antiJ = topRasgo(J, "antigadget");
    if (antiJ && atk) evs.push({ tipo: "clash", texto: `${antiJ.nombre} desactiva dispositivos electrónicos.` });
    if (atk) {
      const br = topRasgo(J, "breach");
      const den = window.SIEGE_DLE.rasgos.equipoStats(R).rasgos.denial;
      if (br && den >= 5) evs.push({ tipo: "clash", texto: `${br.nombre} forcejea con un muro muy defendido.` });
      else if (br) evs.push({ tipo: "clash", texto: `${br.nombre} consigue abrir el muro reforzado.` });
      else evs.push({ tipo: "rival", texto: "Sin apertura clara, tu equipo busca otra vía." });
    } else {
      const den = topRasgo(J, "denial");
      if (den) evs.push({ tipo: "clash", texto: `${den.nombre} frena el avance rival con utilidades.` });
      const roam = topRasgo(J, "roam");
      if (roam) evs.push({ tipo: "intel", texto: `${roam.nombre} acecha desde fuera del sitio.` });
    }
    const fragJ = topRasgo(J, atk ? "entry" : "frag");
    const fragR = topRasgo(R, atk ? "frag" : "entry");
    if (fragJ && fragR) evs.push({ tipo: "duelo", texto: `Duelo clave: ${fragJ.nombre} contra ${fragR.nombre}.` });
    else if (fragJ) evs.push({ tipo: "duelo", texto: `${fragJ.nombre} toma espacio con confianza.` });
    evs.push({ decision: 1 });
    evs.push({ tipo: "exec", texto: "COMIENZA LA EJECUCIÓN" });
    return evs;
  }

  function iniciarRonda() {
    state.rondaNum += 1;
    const lado = ladoDeRonda(state.rondaNum);
    const calc = fuerzasDeRonda(lado);
    state.ronda = {
      lado, fuerzaJ: calc.fJ, fuerzaIA: calc.fI, prob: calc.prob, bono: 0,
      usadas: [], resultado: null, eventos: []
    };
    state.ronda.eventos = construirEventos();
    state.fase = "ronda";
  }

  // Fuerzas y probabilidad base de una ronda en un lado dado (sin bono de decisión).
  function fuerzasDeRonda(lado) {
    const fJ = window.SIEGE_DLE.rasgos.fuerza(state.equipoJ, lado, state.mapa);
    const fR = window.SIEGE_DLE.rasgos.fuerza(state.equipoIA, lado === "ataque" ? "defensa" : "ataque", state.mapa);
    const prob = limitarProb(fJ.valor - fR.valor);
    return { fJ: fJ.valor, fI: fR.valor, prob };
  }

  function limitarProb(ventaja) {
    // Acotado a [0.2, 0.85]: una composición claramente mejor o peor inclina la ronda,
    // pero nunca garantiza ni la victoria ni la derrota.
    return Math.min(0.85, Math.max(0.2, 0.5 + ventaja * 0.012));
  }

  // Pronóstico de la próxima ronda (para mostrar antes de jugarla).
  function pronostico() {
    const lado = ladoDeRonda(state.rondaNum + 1);
    const calc = fuerzasDeRonda(lado);
    return {
      lado, fJ: calc.fJ, fI: calc.fI, prob: calc.prob,
      ventaja: Math.round((calc.prob - 0.5) * 100),
      partido: probPartido(state.puntosJ, state.puntosIA, calc.prob)
    };
  }

  // Probabilidad actual de la ronda en curso (cambia con cada decisión).
  function probActual() {
    const r = state.ronda;
    if (!r) return 0.5;
    return limitarProb(r.fuerzaJ - r.fuerzaIA + r.bono);
  }

  function combinaciones(n, k) {
    if (k < 0 || k > n) return 0;
    let r = 1;
    for (let i = 1; i <= k; i++) r = r * (n - k + i) / i;
    return r;
  }

  // Probabilidad de ganar la partida desde un marcador, estimando p por ronda futura.
  function probPartido(pJ, pI, p) {
    const needJ = 4 - pJ; const needI = 4 - pI;
    if (needJ <= 0) return 1;
    if (needI <= 0) return 0;
    let s = 0;
    for (let k = 0; k < needI; k++) {
      s += combinaciones(needJ - 1 + k, k) * Math.pow(p, needJ) * Math.pow(1 - p, k);
    }
    return Math.min(0.99, Math.max(0.01, s));
  }

  function aplicarDecision(clave) {
    const ronda = state.ronda;
    if (ronda.usadas.includes(clave)) return "Esa opción ya se usó.";
    const def = DECISIONES[ronda.lado].find((d) => d.clave === clave);
    if (!def) return "Opción no válida.";
    ronda.usadas.push(def.clave);
    const st = window.SIEGE_DLE.rasgos.equipoStats(state.equipoJ).rasgos;
    const suma = def.rasgos.reduce((s, t) => s + (st[t] || 0), 0);
    // Jugar a la fortaleza del equipo ayuda; forzar un plan que tu composición no sostiene,
    // perjudica. Nunca es decisivo por sí solo: sigue habiendo suerte.
    const bono = suma >= 7 ? 5 : suma >= 4 ? 2 : suma >= 2 ? 0 : -3;
    ronda.bono += bono;
    return alAzar(CONFIRMACIONES).replace("{t}", def.titulo);
  }

  function resolverRonda() {
    const prob = probActual();
    state.ronda.prob = prob;
    const ganada = Math.random() < prob;
    state.ronda.resultado = ganada ? "victoria" : "derrota";
    if (ganada) {
      state.puntosJ += 1;
      // Punto ganado: queda bloqueado y no se vuelve a jugar en esta partida.
      if (state.sitioIdx !== null && !state.sitiosGanados.includes(state.sitioIdx)) {
        state.sitiosGanados.push(state.sitioIdx);
      }
    } else {
      state.puntosIA += 1;
    }
    state.rondas.push({
      num: state.rondaNum, lado: state.ronda.lado,
      resultado: state.ronda.resultado, sitio: state.sitio
    });
    const fin = state.puntosJ >= 4 || state.puntosIA >= 4;
    if (fin) state.fase = "fin";
    return { ganada, prob, fin, sitio: state.sitio, puntoBloqueado: ganada };
  }

  function prepararRonda() {
    // Limpia equipos y punto de la ronda anterior; los vetos y los puntos ganados se conservan.
    state.equipoJ = []; state.equipoIA = []; state.opciones = [];
    state.sitio = null; state.sitioIdx = null;
  }

  window.SIEGE_DLE = window.SIEGE_DLE || {};
  window.SIEGE_DLE.partida = {
    state, ESTILOS, DECISIONES, nuevoPartido, candidatosBan, motivoBan, nombre,
    banRival, ladoProximo, ladoRival, bandoDeLado,
    opcionesDraft, generarEquipoIA, iniciarRonda, aplicarDecision, resolverRonda,
    ladoDeRonda, prepararRonda, pronostico, probActual, probPartido,
    sitiosDisponibles, sitioBloqueado, elegirSitioJ, elegirSitioIA
  };
})();
