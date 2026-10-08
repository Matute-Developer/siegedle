/* Motor táctico del modo Partida: rondas narrativas interactivas estilo Siege.
   Cada ronda es un SISTEMA, no una historia lineal: momentos generados según mapa, sitio,
   spawn, equipos, tiempo, recursos, información, memoria del rival y RNG.
   RESULTADO = decisión + contexto + info + composición + recursos + tiempo + RNG.
   Mecánicas: línea temporal por momentos, acciones con condiciones (operador/recurso/
   tiempo), probabilidades con modificadores explicados, trade-offs con riesgo visible,
   información oculta (confirmada/probable), utilidad consumible, HP y estados, plant/
   retake, clutch, cadenas de decisiones, QTE, quiz de conocimiento integrado, killfeed,
   rival con plan y memoria entre rondas, resumen con estadísticas.
   Para agregar contenido (operadores, mapas, preguntas, eventos): tocar solo data/. */
(function () {
  // Recursos signature por operador. Fallback: atacantes {util:1}, defensores {util:1}.
  // c4 solo para quienes lo llevan de verdad.
  const UTILIDAD = {
    smoke: { gas: 3 }, kapkan: { edd: 3 }, jager: { ads: 2 }, bandit: { bat: 3, c4: 1 },
    kaid: { bat: 2 }, mira: { espejo: 2, c4: 1 }, echo: { yokai: 2 }, maestro: { evil: 2 },
    mozzie: { pest: 2 }, lesion: { gu: 3 }, ela: { grz: 3 }, frost: { cepo: 3 },
    alibi: { prisma: 3 }, melusi: { banshee: 2 }, aruni: { surya: 2 }, wamai: { magnet: 2 },
    valkyrie: { cam: 3 }, mute: { jammer: 2, c4: 1 }, vigil: { c4: 1 }, azami: { kiba: 3 },
    thunderbird: { kona: 2 }, osa: { talon: 1 }, flores: { ratero: 2 }, sens: { rod: 2 },
    grim: { kawan: 2 }, brava: { kludge: 2 }, ram: { bugi: 1 }, deimos: { mark: 1 },
    zero: { argus: 2 }, fenrir: { mina: 2 }, solis: {}, tubarao: { zoto: 2 },
    twitch: { dron: 2, shock: 2 }, iq: { dron: 1 }, dokkaebi: { hack: 2, dron: 1 },
    lion: { scan: 2 }, finka: { boost: 1 }, nomad: { airjab: 2 }, gridlock: { trax: 2 },
    ash: { brecha: 2 }, zofia: { brecha: 2 }, fuze: { carga: 3 }, ying: { candela: 2 },
    capitao: { fuego: 2, humo: 2 }, jackal: { dron: 1 }, buck: {}, sledge: {},
    rook: { chaleco: 1 }, doc: { stim: 2 }, clash: {}, oryx: {}, warden: {},
    caveira: {}, nokk: {}, iana: {}, kali: {}, glaz: {}, blitz: {}, montagne: {},
    maverick: {}, blackbeard: {}, castle: {}, pulse: {}, tachanka: {}, goyo: { volcan: 2 },
    thermite: { carga: 2 }, hibana: { carga: 3 }, ace: { carga: 2 }, thatcher: { pem: 2 }
  };

  const NOMBRES_REC = {
    c4: "C4", gas: "gas", edd: "EDD", ads: "ADS", bat: "batería", espejo: "espejo",
    yokai: "Yokai", evil: "Evil Eye", pest: "Pest", gu: "GU", grz: "Grzmot", cepo: "cepo",
    prisma: "Prisma", banshee: "Banshee", surya: "Surya", magnet: "Mag-NET", cam: "cámaras",
    jammer: "inhibidor", kiba: "Kiba", kona: "Kona", talon: "Talon", ratero: "Ratero",
    rod: "ROD", kawan: "Kawan", kludge: "Kludge", bugi: "BU-GI", mark: "DeathMARK",
    argus: "Argus", mina: "mina", zoto: "Zoto", stim: "estimulante", chaleco: "chaleco",
    boost: "impulso", pem: "PEM", carga: "carga", dron: "dron", shock: "descarga",
    brecha: "brecha", humo: "humo", fuego: "fuego", candela: "Candela", trax: "Trax",
    airjab: "Airjab", hack: "hackeo", scan: "escaneo", volcan: "Volcán", util: "utilidad"
  };

  const TIEMPO_INICIAL = 165; // 2:45 de ronda
  const MAX_MOMENTOS = 6; // rondas cortas: 6 momentos de decisión como máximo, después duelo final
  const MAX_QUIZ = 2;

  function P() { return window.SIEGE_DLE.partida; }
  function ST() { return P().state; }
  function ops() { return window.SIEGE_DLE.operators || []; }
  function porId(id) { return ops().find((o) => o.id === id); }
  function nomOp(id) { const o = porId(id); return o ? o.nombre : id; }
  function alAzar(l) { return l[Math.floor(Math.random() * l.length)]; }

  function T() { return ST().tactica; }

  function formatoReloj(s) {
    const v = Math.max(0, Math.round(s));
    return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
  }

  function nivelProb(p) {
    if (p < 0.2) return "MUY BAJA";
    if (p < 0.4) return "BAJA";
    if (p < 0.6) return "MEDIA";
    if (p < 0.8) return "ALTA";
    return "MUY ALTA";
  }

  // ---------- contexto para condiciones y textos de data/ ----------
  function ctx() {
    const t = T();
    const st = ST();
    return {
      lado: t.lado, tiempo: t.tiempo, mapa: st.mapa.nombre, sitio: st.sitio, spawn: st.spawn || "",
      intel: t.intel, alerta: t.alerta, mem: st.memoria, plantado: t.plantado,
      vivosJ: vivos(t.equipoJ), vivosR: vivos(t.equipoIA),
      tiene: (id) => t.equipoJ.some((u) => u.id === id && u.hp > 0),
      rival: (id) => t.equipoIA.some((u) => u.id === id && u.hp > 0),
      rec: (k) => t.equipoJ.filter((u) => u.hp > 0).reduce((s, u) => s + (u.rec[k] || 0), 0),
      nom: nomOp
    };
  }

  function vivos(eq) { return eq.filter((u) => u.hp > 0).length; }

  function unidad(id, lado) {
    const base = UTILIDAD[id] || {};
    const rec = Object.assign({}, base);
    if (!Object.keys(rec).length) rec.util = 1;
    return { id, nombre: nomOp(id), hp: 100, rec };
  }

  // ---------- inicio ----------
  function planRival() {
    const st = ST();
    const estilo = st.estiloIA || "equilibrado";
    const mem = st.memoria;
    let ritmo = "normal", nota = "";
    if (estilo === "agresivo" || mem.pasivo >= 2) { ritmo = "rapido"; nota = "El rival viene a atropellar."; }
    else if (estilo === "defensivo" || estilo === "intel" || mem.agresivo >= 3) { ritmo = "lento"; nota = "El rival te estudió: va a jugar lento y a castigar errores."; }
    if (mem.c4 >= 2) nota += " Aprendió tu C4: drona antes de entrar.";
    return { estilo, ritmo, nota };
  }

  function iniciar() {
    const st = ST();
    const lado = st.ronda.lado;
    const ladoRival = lado === "ataque" ? "defensa" : "ataque";
    const t = {
      lado, tiempo: TIEMPO_INICIAL, n: 0,
      equipoJ: st.equipoJ.map((id) => unidad(id, lado)),
      equipoIA: st.equipoIA.map((id) => unidad(id, ladoRival)),
      intel: 0, intelLista: [], intelProb: [],
      alerta: 0, plantado: false,
      plan: planRival(),
      actual: null, quiz: null, quizzes: 0, bonoQuiz: 0, duelo1v1: false,
      dueloCasualSalio: false, dueloPar: null,
      usos: {}, vistos: [], cadena: null,
      feed: [], muertes: [],
      timeline: [{ t: formatoReloj(TIEMPO_INICIAL), texto: `Fase de preparación en ${st.mapa.nombre} — ${st.sitio}.`, tipo: "mapa" }],
      stats: { bajasJ: 0, bajasR: 0, danio: 0, util: 0, utilMal: 0, decisiones: [], clutch: false, plant: false },
      terminado: false, ganada: false
    };
    if (t.equipoJ.some((u) => u.id === "rook")) t.equipoJ.forEach((u) => { u.hp = 125; });
    st.tactica = t;
    if (t.plan.nota) pushTimeline(t.plan.nota, "rival");
  }

  function pushTimeline(texto, tipo) {
    const t = T();
    t.timeline.push({ t: formatoReloj(t.tiempo), texto, tipo: tipo || "prep" });
  }

  function pushMuerte(muerto, de, ladoMuerto) {
    const t = T();
    t.feed.unshift({ a: de, b: muerto, rival: ladoMuerto === "R" });
    if (t.feed.length > 6) t.feed.pop();
  }

  // ---------- generación de momentos ----------
  function candidatas() {
    const c = ctx();
    const todas = window.SIEGE_DLE.situacionesTacticas || [];
    return todas.filter((s) => {
      if (s.lado !== c.lado) return false;
      if (c.tiempo < s.tMin || c.tiempo > s.tMax) return false;
      if (s.cond && !s.cond(c)) return false;
      const accs = (s.acciones || []).filter((a) => accionDisponible(a, c, true));
      return accs.length >= 2;
    });
  }

  function accionDisponible(a, c, blando) {
    // blando: ignora recursos agotados si hay alternativa (para filtrar situaciones).
    if (a.reqT && c.tiempo < a.reqT) return false;
    if (a.reqOp && !a.reqOp.some((id) => c.tiene(id))) return false;
    if (a.reqRec && c.rec(a.reqRec) <= 0) return blando ? false : false;
    return true;
  }

  function elegirSituacion() {
    const t = T();
    if (t.cadena) {
      const s = (window.SIEGE_DLE.situacionesTacticas || []).find((x) => x.id === t.cadena);
      t.cadena = null;
      if (s) return s;
    }
    // Rotación por épocas: nadie se repite hasta que TODO lo elegible ya salió.
    // Si no queda nada fresco, empieza una época nueva (se resetean los vistos).
    const pool = candidatas();
    if (!pool.length) return null;
    // Prioridad fresca a clutch/retake/ejecución (si ya salió, no roba prioridad).
    const prio = pool.filter((s) => (s.id.indexOf("clutch") === 0 || s.id === "retake-def" || s.id === "exec-plant") && !t.vistos.includes(s.id));
    const base = prio.length && Math.random() < 0.8 ? prio : pool;
    let frescas = base.filter((s) => !t.vistos.includes(s.id));
    if (!frescas.length) { t.vistos = []; frescas = base; }
    const pesos = frescas.map((s) => (s.peso || 1) / ((t.usos[s.id] || 0) + 1));
    const total = pesos.reduce((s, x) => s + x, 0);
    let r = Math.random() * total;
    for (let i = 0; i < frescas.length; i++) {
      r -= pesos[i];
      if (r <= 0) return frescas[i];
    }
    return frescas[frescas.length - 1];
  }

  function momento() {
    const t = T();
    if (t.terminado) return null;
    // 1 VS 1: se interrumpe lo normal y se juega el duelo hasta ganarlo (o caer).
    if (vivos(t.equipoJ) === 1 && vivos(t.equipoIA) === 1 && !t.duelo1v1) {
      return momentoDuelo();
    }
    // Duelo casual: puede caer en cualquier momento (inicio, mitad o cierre), sin
    // estar garantizado. Máximo uno por ronda para que se sienta especial.
    if (!t.plantado && !t.dueloCasualSalio && (vivos(t.equipoJ) + vivos(t.equipoIA)) >= 4 && Math.random() < 0.16) {
      const d = momentoDueloCasual();
      if (d) return d;
    }
    // Sin plant y con 15s o menos (o tope de momentos): ASALTO FINAL obligatorio.
    // Matar o plantar, a pura probabilidad. No hay victoria pasiva.
    if (!t.plantado && (t.tiempo <= 15 || t.n >= MAX_MOMENTOS)) {
      return momentoAsalto();
    }
    const sit = elegirSituacion();
    if (!sit) { dueloFinal(); return null; }
    const c = ctx();
    const av = sit.avance || [8, 14];
    // El reloj corre rápido: ~6 momentos tácticos y se llega al asalto final.
    t.tiempo = Math.max(0, t.tiempo - (av[0] + Math.random() * (av[1] - av[0])) * 2);
    t.n += 1;
    t.usos[sit.id] = (t.usos[sit.id] || 0) + 1;
    if (!t.vistos.includes(sit.id)) t.vistos.push(sit.id);
    const accs = sit.acciones.filter((a) => accionDisponible(a, c, false));
    // Orden mezclado + textos alternos: la misma situación no se ve igual dos veces.
    for (let i = accs.length - 1; i > 0; i--) {
      const k = Math.floor(Math.random() * (i + 1));
      [accs[i], accs[k]] = [accs[k], accs[i]];
    }
    const defecto = [...accs].sort((a, b) => riesgoNum(a.riesgo) - riesgoNum(b.riesgo))[0];
    const tit = sit.titulo(c);
    const tex = sit.texto(c);
    t.actual = {
      sit, accs, defectoId: defecto ? defecto.id : null,
      tituloTxt: Array.isArray(tit) ? alAzar(tit) : tit,
      textoTxt: Array.isArray(tex) ? alAzar(tex) : tex
    };
    pushTimeline(t.actual.tituloTxt, "momento");
    // Quiz solo en momentos importantes y con cupo.
    t.quiz = null;
    if (sit.quiz && t.quizzes < MAX_QUIZ && Math.random() < sit.quiz) {
      t.quiz = elegirPregunta(sit.quizDif);
    }
    // Sin plant no hay victoria pasiva: si el reloj llegó a 0, decide el asalto final.
    return t.actual;
  }

  function riesgoNum(r) { return r === "bajo" ? 0 : r === "medio" ? 1 : 2; }

  // Duelo 1v1: las fotos de los dos que quedan y un minijuego de reflejos que hay
  // que ganar. Si fallás y sobrevivís, el duelo se repite hasta que alguien caiga.
  function momentoDuelo() {
    const t = T();
    const av = [4, 7];
    t.tiempo = Math.max(0, t.tiempo - (av[0] + Math.random() * (av[1] - av[0])));
    t.n += 1;
    const yo = unidadViva(t.equipoJ);
    const el = unidadViva(t.equipoIA);
    t.dueloPar = { yo: yo ? yo.id : null, el: el ? el.id : null };
    t.actual = {
      duelo: true,
      sit: { id: "duelo-1v1", titulo: () => "DUELO 1 VS 1", texto: () => "Solo quedan ustedes dos en el mapa." },
      accs: [], defectoId: null, tituloTxt: "DUELO 1 VS 1", textoTxt: "Solo quedan ustedes dos en el mapa.",
      dueloDif: { ancho: 15, vel: 2.2, segs: 8, quizDif: null }
    };
    pushTimeline("¡DUELO 1 VS 1!", "duelo");
    t.quiz = null;
    return t.actual;
  }

  // ASALTO FINAL obligatorio (15s o menos sin plant, o tope de momentos): solo hay
  // 2 caminos, MATAR o PLANTAR, y todo se resuelve a pura probabilidad. Cada resultado
  // quita HP o planta, así que siempre termina: nunca hay victoria pasiva.
  const ACC_MATAR = {
    id: "asalto-matar", etiqueta: "⚔ MATAR O MORIR", sub: "Entrar a matar. Sin red.", riesgo: "alto",
    base: 0.5, tags: ["duelo", "asalto"], estilo: "agresivo", verProb: true,
    mods: [["Sabés dónde están", 10, (c) => c.intel >= 2],
      ["Te esperan armados", -8, (c) => c.alerta >= 2],
      ["Solo queda uno del otro lado", 10, (c) => c.vivosR === 1]],
    resulta: {
      crit: { texto: "Entrás como una exhalación: {rival} cae sin verla venir.", fx: { killR: 1 } },
      ok: { texto: "A matar o morir: {rival} eliminado.", fx: { killR: 1 } },
      parcial: { texto: "Intercambio brutal: {rival} queda herido y vos también.", fx: { dmgR: 55, dmgJ: 35 } },
      fallo: { texto: "Te frenan en seco, pero dejás tocado a {rival}.", fx: { dmgJ: 55, dmgR: 20 } },
      contra: { texto: "Salís a matar y te estaban esperando: caés eliminado.", fx: { killJ: 1 } } }
  };

  const ACC_PLANTAR = {
    id: "asalto-plantar", etiqueta: "💣 PLANTAR EL DEFUSER", sub: "Si planta, el retake es de ellos.", riesgo: "alto",
    base: 0.55, tags: ["plant", "asalto"], estilo: "agresivo", verProb: true,
    mods: [["Sabés dónde están", 8, (c) => c.intel >= 2],
      ["Smoke lo niega todo", -10, (c) => c.rival("smoke")],
      ["Sin reloj: todo o nada", 5, (c) => c.tiempo <= 0]],
    resulta: {
      crit: { texto: "Plant perfecto y rápido: el defuser pita y el sitio es tuyo.", fx: { planta: true } },
      ok: { texto: "El defuser queda plantado. Ahora a defenderlo con la vida.", fx: { planta: true } },
      parcial: { texto: "Plantás herido: el retake va a doler.", fx: { planta: true, dmgJ: 45 } },
      fallo: { texto: "Te cortan el plant a último momento. A seguir peleando.", fx: { dmgJ: 50 } },
      contra: { texto: "Te cazan con el defuser en la mano: caés eliminado.", fx: { killJ: 1 } } }
  };

  function momentoAsalto() {
    const t = T();
    const av = [2, 5];
    t.tiempo = Math.max(0, t.tiempo - (av[0] + Math.random() * (av[1] - av[0])));
    t.n += 1;
    const c = ctx();
    const accs = [ACC_MATAR, ACC_PLANTAR].filter((a) => accionDisponible(a, c, false));
    const defecto = [...accs].sort((a, b) => riesgoNum(a.riesgo) - riesgoNum(b.riesgo))[0];
    t.actual = {
      asalto: true,
      sit: { id: "asalto-final" },
      accs, defectoId: defecto ? defecto.id : null,
      tituloTxt: "⚠ ¡ASALTO FINAL! MATAR O PLANTAR",
      textoTxt: t.tiempo > 0
        ? `Quedan ${formatoReloj(t.tiempo)} y no hay plant: se acabó jugar fino. Entrá a matar o plantá el defuser. No hay victoria pasiva.`
        : "Reloj en cero sin plant: todo se define AHORA. Matá o plantá."
    };
    pushTimeline("¡ASALTO FINAL! Matar o plantar.", "duelo");
    t.quiz = null;
    return t.actual;
  }

  // Duelo casual: un 1v1 que PUEDE aparecer en cualquier momento de la ronda
  // (inicio, mitad o cierre), sin estar garantizado. Duelo a MUERTE y difícil:
  // quiz solo medio/difícil/experto, minijuego más rápido y angosto. El que pierde, cae.
  function momentoDueloCasual() {
    const t = T();
    const yo = unidadViva(t.equipoJ);
    const el = unidadViva(t.equipoIA);
    if (!yo || !el) return null;
    t.dueloCasualSalio = true;
    const av = [6, 12];
    t.tiempo = Math.max(0, t.tiempo - (av[0] + Math.random() * (av[1] - av[0])));
    t.n += 1;
    t.dueloPar = { yo: yo.id, el: el.id };
    t.actual = {
      duelo: true, casual: true,
      sit: { id: "duelo-casual" },
      accs: [], defectoId: null,
      tituloTxt: `DUELO: ${yo.nombre.toUpperCase()} VS ${el.nombre.toUpperCase()}`,
      textoTxt: `¡Se cruzan ${yo.nombre} y ${el.nombre}, solos y sin ayuda! Duelo a muerte: el que pierde, cae.`,
      dueloDif: { ancho: 10, vel: 3.4, segs: 6, quizDif: ["medio", "dificil", "experto"] }
    };
    pushTimeline(`¡DUELO! ¡${yo.nombre} VS ${el.nombre}!`, "duelo");
    t.quiz = null;
    return t.actual;
  }

  function resolverDuelo(gano, via) {
    const t = T();
    if (!t.actual || !t.actual.duelo || t.terminado) return null;
    t.nuevasMuertes = [];
    const par = t.dueloPar || {};
    const yo = t.equipoJ.find((u) => u.id === par.yo && u.hp > 0) || t.equipoJ.find((u) => u.hp > 0);
    const el = t.equipoIA.find((u) => u.id === par.el && u.hp > 0) || t.equipoIA.find((u) => u.hp > 0);
    const esQuiz = via === "quiz";
    const casual = !!(t.actual && t.actual.casual);
    const etiqueta = casual ? "DUELO CASUAL" : (esQuiz ? "DUELO 1V1 (DESAFÍO)" : "DUELO 1V1");
    let texto, tier;
    if (gano && el) {
      matar(el, true);
      if (!casual) t.duelo1v1 = true;
      texto = esQuiz
        ? `Leés la jugada como un libro: ${el.nombre} cae en tu trampa. El conocimiento también mata.`
        : `¡DUELO GANADO! ${el.nombre} cae delante tuyo. Quedás en pie con ${Math.max(0, Math.round(yo ? yo.hp : 0))} de HP.`;
      tier = "ok";
      t.stats.decisiones.push({ etiqueta, buena: true });
    } else if (yo) {
      if (casual) {
        // Duelo casual a muerte: perder es caer, sin segundas chances.
        matar(yo, false);
        texto = `${el ? el.nombre : "El rival"} te gana el duelo: ${yo.nombre} cae eliminado. Era a muerte.`;
        tier = "contra";
      } else {
        const dmg = esQuiz ? 35 : 55;
        golpear(yo, dmg, false);
        const muerto = yo.hp <= 0;
        if (muerto) t.duelo1v1 = true;
        texto = muerto
          ? `${el ? el.nombre : "El rival"} te gana el duelo: caés eliminado.`
          : esQuiz
            ? `Fallás el desafío y ${el ? el.nombre : "el rival"} te castiga: quedás en ${Math.max(0, Math.round(yo.hp))} de HP. El duelo sigue.`
            : `Fallás y ${el ? el.nombre : "el rival"} te castiga: quedás en ${Math.max(0, Math.round(yo.hp))} de HP. El duelo sigue: tenés que ganarlo.`;
        tier = muerto ? "contra" : "fallo";
      }
      t.stats.decisiones.push({ etiqueta, buena: false });
    } else {
      return null;
    }
    pushTimeline(texto, gano ? "ok" : "mal");
    const fin = chequearFin();
    if (!fin && t.plantado && t.n >= MAX_MOMENTOS) dueloFinal();
    return { tier, texto, fin: t.terminado };
  }

  // Duelo por conocimiento: una pregunta Siege para ganar el 1v1 sin disparar.
  // En el duelo casual solo salen medio/difícil/experto: tiene que costar.
  function dueloPregunta(difs) {
    const t = T();
    const lista = (difs && difs.length ? difs : ["facil", "medio", "dificil"]);
    const q = elegirPregunta(lista[Math.floor(Math.random() * lista.length)]);
    if (!q) return null;
    t.dueloQuizQ = q;
    return q;
  }

  function responderDueloQuiz(idx) {
    const t = T();
    const q = t.dueloQuizQ;
    if (!q) return null;
    t.dueloQuizQ = null;
    (t.quizzesIds = t.quizzesIds || []).push(q.id);
    if (idx === q.ok) {
      t.intel = Math.min(3, t.intel + 1);
      pushIntel("Leíste el duelo: +dato confirmado.");
      const res = resolverDuelo(true, "quiz");
      return { bien: true, texto: "Correcto. " + (res ? res.texto : ""), res };
    }
    t.tiempo = Math.max(0, t.tiempo - 8);
    const res = resolverDuelo(false, "quiz");
    return { bien: false, texto: "Fallaste el desafío: −8s y el duelo sigue.", res };
  }

  function elegirPregunta(dif) {
    const todas = window.SIEGE_DLE.preguntasTacticas || [];
    if (!todas.length) return null;
    let pool = todas.filter((p) => p.dif === dif);
    if (!pool.length) pool = todas;
    const usadas = T().quizzesIds || [];
    const frescas = pool.filter((p) => !usadas.includes(p.id));
    const q = alAzar(frescas.length ? frescas : pool);
    return { id: q.id, dif: q.dif, q: q.q, op: q.op.slice(), ok: q.ok };
  }

  function responderQuiz(idx) {
    const t = T();
    if (!t.quiz) return null;
    const q = t.quiz;
    t.quizzes += 1;
    (t.quizzesIds = t.quizzesIds || []).push(q.id);
    t.quiz = null;
    if (idx === q.ok) {
      t.bonoQuiz = 0.05;
      t.intel = Math.min(3, t.intel + 1);
      pushIntel("Interpretaste bien la info: +dato confirmado.");
      return { bien: true, texto: "Correcto. Interpretaste bien la información: +dato confirmado y +5% en tu próxima acción." };
    }
    t.bonoQuiz = 0;
    t.tiempo = Math.max(0, t.tiempo - 12);
    t.alerta = Math.min(3, t.alerta + 1);
    return { bien: false, texto: "Fallaste: perdiste 12 segundos y el rival notó movimiento." };
  }

  function pushIntel(txt) {
    const t = T();
    t.intelLista.push(txt);
    if (t.intelLista.length > 5) t.intelLista.shift();
  }

  // ---------- probabilidades ----------
  function sinergiaCounters(acc, c) {
    const out = [];
    const tg = acc.tags || [];
    const tiene = (id) => c.tiene(id);
    const rival = (id) => c.rival(id);
    if (tg.includes("breach") && tiene("thatcher") && (tiene("thermite") || tiene("hibana") || tiene("ace")))
      out.push(["Sinergia Thatcher + apertura", 8]);
    if (tg.includes("breach") && rival("mute") && !tiene("thatcher"))
      out.push(["Mute protege la pared", -8]);
    if (tg.includes("c4") && rival("iq"))
      out.push(["IQ puede ver el C4", -8]);
    if (tg.includes("intel") && (tiene("valkyrie") || tiene("echo") || tiene("mozzie") || tiene("solis")))
      out.push(["Red de cámaras propia", 6]);
    if (tg.includes("intel") && (tiene("iq") || tiene("dokkaebi") || tiene("jackal")))
      out.push(["Cazadores con info", 6]);
    if (tg.includes("deny") && tiene("smoke") && tiene("maestro"))
      out.push(["Dúo anti-plant Smoke + Maestro", 6]);
    if (tg.includes("humo") && rival("warden"))
      out.push(["Warden ve a través del humo", -8]);
    if (tg.includes("duelo") && c.mem.agresivo >= 3)
      out.push(["El rival ya castiga tus picks", -8]);
    if (tg.includes("rotacion") && c.alerta >= 2)
      out.push(["Te tienen fichado al rotar", -6]);
    return out;
  }

  function calcular(acc) {
    const c = ctx();
    let p = acc.base || 0.5;
    const desglose = [];
    for (const [txt, pts, cond] of (acc.mods || [])) {
      try { if (cond(c)) { p += pts / 100; desglose.push([txt, pts]); } } catch { /* cond rota: se ignora */ }
    }
    for (const [txt, pts] of sinergiaCounters(acc, c)) { p += pts / 100; desglose.push([txt, pts]); }
    if (T().bonoQuiz) { p += T().bonoQuiz; desglose.push(["Bonus de conocimiento", 5]); }
    p = Math.min(0.95, Math.max(0.05, p));
    return { p, nivel: nivelProb(p), desglose };
  }

  // ---------- resolución ----------
  function unidadViva(eq) {
    const v = eq.filter((u) => u.hp > 0);
    return v.length ? alAzar(v) : null;
  }

  function aplicarDmg(eq, cant, esRival) {
    return golpear(unidadViva(eq), cant, esRival);
  }

  function golpear(u, cant, esRival) {
    const t = T();
    if (!u || u.hp <= 0) return null;
    u.hp -= cant;
    t.stats.danio += cant;
    if (u.hp <= 0) { matar(u, esRival); return { muerto: u }; }
    return { herido: u };
  }

  function matar(u, esRival) {
    const t = T();
    if (!u) return u;
    u.hp = 0;
    if (esRival) t.stats.bajasJ += 1;
    else t.stats.bajasR += 1;
    pushMuerte(u, esRival);
    return u;
  }

  function pushMuerte(u, esRival) {
    const t = T();
    // Se guarda la identidad real: la UI muestra SU retrato, no un nombre suelto.
    const entrada = { id: u.id, nombre: u.nombre, rival: !!esRival };
    t.feed.unshift(entrada);
    if (t.feed.length > 6) t.feed.pop();
    // Cola para el cartel de muerte en el medio de la pantalla.
    t.nuevasMuertes = t.nuevasMuertes || [];
    t.nuevasMuertes.push(entrada);
  }

  // Reparto previo: se eligen ANTES las víctimas reales para que el texto nombre
  // a quienes de verdad caen o quedan heridos (nada de "muere X y la kill es Y").
  function prepararReparto(fx) {
    const t = T();
    fx = fx || {};
    const tomar = (eq, n) => {
      const v = eq.filter((u) => u.hp > 0);
      const out = [];
      for (let i = 0; i < (n || 0) && v.length; i++) {
        out.push(v.splice(Math.floor(Math.random() * v.length), 1)[0]);
      }
      return out;
    };
    t.reparto = {
      killR: tomar(t.equipoIA, fx.killR), killJ: tomar(t.equipoJ, fx.killJ),
      dmgR: tomar(t.equipoIA, fx.dmgR ? 1 : 0), dmgJ: tomar(t.equipoJ, fx.dmgJ ? 1 : 0)
    };
    return t.reparto;
  }

  function aplicarFx(fx) {
    const t = T();
    fx = fx || {};
    const rep = t.reparto || { killR: [], killJ: [], dmgR: [], dmgJ: [] };
    rep.killR.forEach((u) => { if (u.hp > 0) matar(u, true); });
    rep.killJ.forEach((u) => { if (u.hp > 0) matar(u, false); });
    if (fx.dmgR && rep.dmgR[0] && rep.dmgR[0].hp > 0) golpear(rep.dmgR[0], fx.dmgR, true);
    if (fx.dmgJ && rep.dmgJ[0] && rep.dmgJ[0].hp > 0) golpear(rep.dmgJ[0], fx.dmgJ, false);
    if (fx.intel) {
      t.intel = Math.max(0, Math.min(3, t.intel + fx.intel));
      if (fx.intel > 0) pushIntel("Dato confirmado en " + ST().sitio + ".");
    }
    if (fx.alerta) t.alerta = Math.max(0, Math.min(3, t.alerta + fx.alerta));
    if (fx.tiempo) t.tiempo = Math.max(0, t.tiempo + fx.tiempo);
    if (fx.planta) { t.plantado = true; t.tiempo = Math.min(t.tiempo, 45); t.stats.plant = true; }
    if (fx.deny) { t.plantado = false; }
  }

  function rellenar(texto) {
    const t = T();
    const st = ST();
    const base = Array.isArray(texto) ? alAzar(texto) : texto;
    // {rival}/{aliado} nombran SIEMPRE a los del reparto (los que de verdad caen o
    // quedan heridos); si no hay reparto, a alguien vivo al azar como antes.
    const rep = t.reparto || {};
    const listR = [...(rep.killR || []), ...(rep.dmgR || [])];
    const listA = [...(rep.killJ || []), ...(rep.dmgJ || [])];
    const rV = unidadViva(t.equipoIA);
    const aV = unidadViva(t.equipoJ);
    let iR = 0, iA = 0;
    const nomR = () => listR.length ? listR[(iR++) % listR.length].nombre : (rV ? rV.nombre : "un rival");
    const nomA = () => listA.length ? listA[(iA++) % listA.length].nombre : (aV ? aV.nombre : "tu equipo");
    return base
      .replace(/\{rival\}/g, nomR)
      .replace(/\{aliado\}/g, nomA)
      .replace(/\{sitio\}/g, st.sitio || "")
      .replace(/\{mapa\}/g, st.mapa ? st.mapa.nombre : "")
      .replace(/\{spawn\}/g, st.spawn || "")
      .replace(/\{tiempo\}/g, formatoReloj(t.tiempo));
  }

  function resolverAccion(idAcc) {
    const t = T();
    if (!t.actual || t.terminado) return null;
    const acc = t.actual.accs.find((a) => a.id === idAcc);
    if (!acc) return null;
    t.nuevasMuertes = [];
    const c = ctx();
    // Condiciones: operador / recurso / tiempo.
    if (acc.reqOp && !acc.reqOp.some((id) => c.tiene(id))) return { error: "Ese operador no está disponible." };
    if (acc.reqRec && c.rec(acc.reqRec) <= 0) return { error: `No queda ${NOMBRES_REC[acc.reqRec] || acc.reqRec}.` };
    if (acc.reqT && c.tiempo < acc.reqT) return { error: "Ya no hay tiempo para eso." };
    if (acc.consume) {
      const u = t.equipoJ.filter((x) => x.hp > 0).find((x) => (x.rec[acc.consume] || 0) > 0);
      if (u) { u.rec[acc.consume] -= 1; t.stats.util += 1; }
    }
    const { p, desglose } = calcular(acc);
    const r = Math.random();
    let tier;
    if (r <= p - 0.35) tier = "crit";
    else if (r <= p) tier = "ok";
    else if (r <= p + 0.20) tier = "parcial";
    else if (r >= p + 0.45 && acc.resulta.contra) tier = "contra";
    else tier = "fallo";
    const res = acc.resulta[tier] || acc.resulta.fallo;
    const variante = Array.isArray(res) ? alAzar(res) : res;
    prepararReparto(variante.fx);
    aplicarFx(variante.fx);
    if (acc.consume && (tier === "fallo" || tier === "contra")) t.stats.utilMal += 1;
    // Memoria del rival: aprende tus hábitos.
    const mem = ST().memoria;
    if (acc.estilo === "agresivo") mem.agresivo += 1;
    if (acc.estilo === "pasivo") mem.pasivo += 1;
    if ((acc.tags || []).includes("c4")) mem.c4 += 1;
    const buena = tier === "crit" || tier === "ok";
    t.stats.decisiones.push({ etiqueta: acc.etiqueta, buena });
    if (vivos(t.equipoJ) === 1 && vivos(t.equipoIA) > 1) t.stats.clutch = true;
    const textoFinal = rellenar(variante.texto);
    pushTimeline(textoFinal, buena ? "ok" : "mal");
    t.bonoQuiz = 0;
    if (acc.cadena) t.cadena = acc.cadena;
    const fin = chequearFin();
    // Tope de momentos: con plant se sigue el retake; sin plant el asalto final
    // (vía momento()) lo decide. El duelo final queda solo como red de seguridad.
    if (!fin && t.plantado && t.n >= MAX_MOMENTOS) dueloFinal();
    return { tier, p, nivel: nivelProb(p), desglose: acc.verProb ? desglose : [], texto: textoFinal, fin: t.terminado };
  }

  function chequearFin() {
    const t = T();
    if (t.terminado) return true;
    const vJ = vivos(t.equipoJ), vR = vivos(t.equipoIA);
    // Solo hay dos formas de ganar: wipe total o plant que sobrevive al reloj.
    if (vR === 0) return terminar(true, "eliminacion");
    if (vJ === 0) return terminar(false, "eliminacion");
    if (t.plantado && t.tiempo <= 0) return terminar(t.lado === "ataque", "plant");
    // Sin plant y con gente viva NO hay victoria pasiva: decide el asalto final.
    return false;
  }

  // Duelo final (red de seguridad): se pelea hasta el wipe. Con plant activo y sin
  // resolución, el plant explota y gana el ataque; sin plant, gana quien tenga más en pie.
  function dueloFinal() {
    const t = T();
    if (t.terminado) return;
    pushTimeline("Se acaba el margen para jugar fino: todo se define a balas en el sitio.", "exec");
    let choques = 0;
    while (vivos(t.equipoJ) > 0 && vivos(t.equipoIA) > 0 && choques < 12) {
      choques += 1;
      const bj = aplicarDmg(t.equipoIA, 25 + Math.floor(Math.random() * 40), true);
      const br = vivos(t.equipoJ) > 0 ? aplicarDmg(t.equipoJ, 25 + Math.floor(Math.random() * 40), false) : null;
      const partes = [];
      if (bj && bj.muerto) partes.push(`cae ${bj.muerto.nombre} (rival)`);
      if (br && br.muerto) partes.push(`cae ${br.muerto.nombre} (tuyo)`);
      pushTimeline(partes.length ? `Intercambio ${choques}: ${partes.join(" y ")}.` : `Intercambio ${choques}: puro daño, nadie cae.`, partes.length ? "ok" : "mal");
    }
    const vJ = vivos(t.equipoJ), vR = vivos(t.equipoIA);
    let ganada;
    if (vR === 0) ganada = true;
    else if (vJ === 0) ganada = false;
    // Con plant activo y sin resolución, el plant explota: gana el ataque.
    else if (t.plantado) ganada = (t.lado === "ataque");
    else if (vJ !== vR) ganada = vJ > vR;
    else {
      const hpJ = t.equipoJ.reduce((s, u) => s + u.hp, 0);
      const hpR = t.equipoIA.reduce((s, u) => s + u.hp, 0);
      ganada = hpJ === hpR ? Math.random() < 0.5 : hpJ > hpR;
    }
    terminar(ganada, "duelo");
  }

  function terminar(ganada, motivo) {
    const t = T();
    if (t.terminado) return true;
    if (ganada === undefined) {
      const vJ = vivos(t.equipoJ), vR = vivos(t.equipoIA);
      ganada = vJ > vR;
    }
    t.terminado = true;
    t.ganada = !!ganada;
    t.motivo = motivo || "eliminacion";
    t.stats.motivo = t.motivo;
    // Mejor y peor decisión de la ronda.
    const ds = t.stats.decisiones;
    t.stats.mejor = ds.length ? ds.reduce((a, b) => (b.buena && !a.buena ? b : a)).etiqueta : "—";
    const malas = ds.filter((d) => !d.buena);
    t.stats.peor = malas.length ? malas[malas.length - 1].etiqueta : "—";
    t.stats.tiempoRestante = formatoReloj(t.tiempo);
    pushTimeline(ganada ? "¡RONDA GANADA!" : "Ronda perdida.", ganada ? "ok" : "mal");
    return true;
  }

  function cerrar() {
    const t = T();
    return P().cerrarRondaTactica(t.ganada, t.stats);
  }

  // Auto-juego para el botón Saltar: decide con criterio simple hasta cerrar.
  function auto() {
    const t = T();
    let guard = 0;
    if (!t.actual && !t.terminado) siguiente();
    while (!t.terminado && guard++ < 30) {
      if (t.quiz) responderQuiz(t.quiz.ok);
      if (!t.actual) break;
      if (t.actual.duelo) { resolverDuelo(Math.random() < 0.5); if (!t.terminado) siguiente(); continue; }
      const scored = t.actual.accs.map((a) => {
        const { p } = calcular(a);
        return { a, s: p - riesgoNum(a.riesgo) * 0.04 };
      }).sort((x, y) => y.s - x.s);
      resolverAccion(scored[0].a.id);
      if (!t.terminado) siguiente();
    }
    return t.terminado;
  }

  function siguiente() {
    const t = T();
    if (!t || t.terminado) return null;
    return momento();
  }

  window.SIEGE_DLE = window.SIEGE_DLE || {};
  window.SIEGE_DLE.tactica = {
    iniciar, momento, siguiente, resolverAccion, resolverDuelo, responderQuiz,
    dueloPregunta, responderDueloQuiz, cerrar, auto, calcular, nivelProb,
    formatoReloj, NOMBRES_REC, ctx,
    estado: () => ST().tactica
  };
})();
