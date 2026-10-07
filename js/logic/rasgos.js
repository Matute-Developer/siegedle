/* Motor de rasgos tácticos. Traduce rol/gadget/velocidad a 12 rasgos internos 0-10.
   Las categorías NO se muestran al jugador; solo alimentan draft, IA y probabilidades. */
(function () {
  const RASGOS = ["entry", "frag", "support", "breach", "intel", "antigadget", "roam", "anchor", "denial", "plant", "vertical", "flank"];

  // [clave en minúsculas, {rasgo: puntos}] — inglés (r6ops) y español (BD actual del juego).
  const REGLAS_ROL = [
    ["anti-intel", { antigadget: 1, intel: 1 }],
    ["entry fragger", { entry: 2, frag: 2 }],
    ["soft breach", { breach: 1, vertical: 1 }],
    ["hard breach", { breach: 2 }],
    ["breach denial", { denial: 2, antigadget: 1 }],
    ["utility clear", { antigadget: 2 }],
    ["intel", { intel: 2 }],
    ["angle watch", { frag: 1, flank: 1 }],
    ["area denial", { denial: 2 }],
    ["trapper", { denial: 2, flank: 1 }],
    ["roamer", { roam: 2 }],
    ["entry lock", { denial: 2 }],
    ["control of mass", { denial: 1, anchor: 1 }],
    ["vanguard", { entry: 1, frag: 1 }],
    ["flank watch", { flank: 2, intel: 1 }],
    ["support", { support: 2, plant: 1 }],
    // --- español (la BD usa roles en español) ---
    ["anti-brecha", { denial: 2, antigadget: 1 }],
    ["anti-dispositivos", { antigadget: 2 }],
    ["anti-escudos", { antigadget: 1 }],
    ["brecha pesada", { breach: 2 }],
    ["brecha", { breach: 1, vertical: 1 }],
    ["escudo", { entry: 1, plant: 1 }],
    ["cobertura", { flank: 2, intel: 1 }],
    ["trampas", { denial: 2, flank: 1 }],
    ["caza", { intel: 1, flank: 1 }],
    ["sigilo", { roam: 2 }],
    ["movilidad", { roam: 1, entry: 1 }],
    ["engaño", { roam: 1, intel: 1 }],
    ["soporte", { support: 2, plant: 1 }],
    ["curación", { support: 2 }],
    ["blindaje", { anchor: 2 }],
    ["control de área", { denial: 2 }],
    ["control de mapa", { denial: 1, anchor: 1 }],
    ["control de masas", { denial: 1, anchor: 1 }],
    ["control", { denial: 1 }]
  ];

  // En minúsculas: se compara contra el gadget ya pasado a minúsculas y solo gana la
  // clave más larga de cada pieza (así "carga de brecha pesada" no suma dos veces).
  const REGLAS_GADGET = [
    ["frag", { frag: 1 }],
    ["stun", { entry: 1 }],
    ["flash", { entry: 1 }],
    ["granada cegadora", { entry: 1 }],
    ["smoke", { plant: 1, denial: 1 }],
    ["humo", { plant: 1, denial: 1 }],
    ["claymore", { flank: 1 }],
    ["impact emp", { antigadget: 1 }],
    ["emp de impacto", { antigadget: 1 }],
    ["breach charge", { breach: 1 }],
    ["soft breach", { breach: 1 }],
    ["hard breach", { breach: 2 }],
    ["carga de brecha pesada", { breach: 2 }],
    ["carga de brecha", { breach: 1 }],
    ["c4", { frag: 1, denial: 1 }],
    ["barbed wire", { denial: 1 }],
    ["espino", { denial: 1 }],
    ["barricada", { denial: 1 }],
    ["deployable shield", { anchor: 1, plant: 1 }],
    ["escudo desplegable", { anchor: 1, plant: 1 }],
    ["bulletproof", { intel: 1 }],
    ["cámara antibalas", { intel: 1 }],
    ["bloqueador de pared", { antigadget: 1, intel: 1 }],
    ["proximity", { intel: 1, flank: 1 }],
    ["proximidad", { intel: 1, flank: 1 }],
    ["impacts", { breach: 1, entry: 1 }],
    ["granadas de impacto", { breach: 1, entry: 1 }],
    ["impacto", { breach: 1, entry: 1 }],
    ["depresor", { denial: 1, flank: 1 }]
  ];

  const PESOS_ATAQUE = { entry: 3, breach: 3, plant: 2, frag: 2, intel: 2, support: 2, antigadget: 2, vertical: 1, flank: 1, anchor: 1, denial: 1, roam: 1 };
  const PESOS_DEFENSA = { anchor: 3, denial: 4, intel: 3, roam: 3, antigadget: 2, frag: 2, support: 2, entry: 1, plant: 0, breach: 0, vertical: 1, flank: 1 };

  // Mínimos internos de una composición completa (5) por lado. No se muestran.
  // Sirven a la vez como objetivo: llegar a ellos suma, pasarse mucho suma cada vez menos,
  // y quedarse corto resta (así una composición extrema es mala sin ser una derrota automática).
  // Calibrados contra la BD actual: los roles en español marcan menos intel y menos roam que
  // la base anterior, así que esos objetivos bajan un punto; y como la defensa vive de la
  // negación, la información y el roam, PESOS_DEFENSA los sube para que ambos lados queden parejos.
  const MINIMOS = {
    ataque: { breach: 5, entry: 5, intel: 4, plant: 2, antigadget: 3 },
    defensa: { anchor: 2, denial: 7, intel: 4, roam: 3, support: 2 }
  };

  // Afinidades entre rasgos: qué se complementa con qué (Thermite ↔ Thatcher, plant ↔ humo, etc.).
  // Interno: alimenta el draft y la evaluación, nunca se muestra.
  const AFINIDADES = [
    ["breach", "antigadget", 3],
    ["breach", "intel", 2],
    ["breach", "vertical", 2],
    ["breach", "breach", 2],
    ["entry", "support", 3],
    ["entry", "intel", 2],
    ["entry", "antigadget", 2],
    ["entry", "flank", 1],
    ["frag", "flank", 2],
    ["frag", "intel", 2],
    ["plant", "denial", 3],
    ["plant", "support", 3],
    ["plant", "plant", 2],
    ["anchor", "denial", 3],
    ["anchor", "intel", 2],
    ["anchor", "antigadget", 2],
    ["roam", "intel", 2],
    ["roam", "denial", 2],
    ["roam", "flank", 2],
    ["denial", "flank", 2],
    ["denial", "denial", 1],
    ["denial", "antigadget", 3],
    ["denial", "intel", 2],
    ["denial", "support", 1],
    ["intel", "antigadget", 2],
    ["intel", "flank", 1],
    ["support", "intel", 1],
    ["vertical", "entry", 1]
  ];

  function vacios() {
    const r = {};
    RASGOS.forEach((t) => { r[t] = 0; });
    return r;
  }

  function sumar(dest, pesos) {
    Object.keys(pesos).forEach((k) => { dest[k] = (dest[k] || 0) + pesos[k]; });
  }

  function rasgosDe(op) {
    const r = vacios();
    (op.rol || "").split(",").forEach((pedazo) => {
      const t = pedazo.trim().toLowerCase();
      REGLAS_ROL.forEach(([clave, pesos]) => {
        if (clave === "intel" && t.includes("anti-intel")) return;
        // "anti-brecha" y "brecha pesada" ya traen su propio peso: no sumar la brecha suave encima.
        if (clave === "brecha" && (t.includes("anti-brecha") || t.includes("brecha pesada"))) return;
        // "control de área/mapa/masas" ya tiene su regla propia.
        if (clave === "control" && t.includes("control de")) return;
        if (t.includes(clave)) sumar(r, pesos);
      });
    });
    const g = (op.gadget || "").toLowerCase();
    g.split(",").forEach((pedazo) => {
      const t = pedazo.trim();
      if (!t) return;
      let mejor = null;
      REGLAS_GADGET.forEach((regla) => {
        if (t.includes(regla[0]) && (!mejor || regla[0].length > mejor[0].length)) mejor = regla;
      });
      if (mejor) sumar(r, mejor[1]);
    });
    if (op.velocidad === 3) sumar(r, { entry: 1, frag: 1 });
    if (op.velocidad === 1) sumar(r, { anchor: 1 });
    if (op.velocidad === 3 && op.bando === "defensor") sumar(r, { roam: 1 });
    if (op.velocidad === 1 && op.bando === "atacante") sumar(r, { plant: 1 });
    return r;
  }

  function equipoStats(ids) {
    const ops = (window.SIEGE_DLE.operators || []).filter((o) => ids.includes(o.id));
    const total = vacios();
    ops.forEach((op) => sumar(total, rasgosDe(op)));
    const cubiertos = RASGOS.filter((t) => total[t] >= 3).length;
    const top = [...RASGOS].sort((a, b) => total[b] - total[a]).slice(0, 3);
    return { rasgos: total, cubiertos, top, cantidad: ops.length };
  }

  // Categorías internas de composición (nunca se muestran al jugador).
  // combo = con qué otras familias encaja bien esta (ej.: hard breach ↔ anti-gadget).
  const FAMILIAS = {
    hardbreach: { rasgos: ["breach"], combo: ["antigadget", "intel", "hardbreach"] },
    entry: { rasgos: ["entry"], combo: ["intel", "support", "fragger"] },
    fragger: { rasgos: ["frag"], combo: ["flank", "intel", "entry"] },
    antigadget: { rasgos: ["antigadget"], combo: ["hardbreach", "intel", "denial"] },
    support: { rasgos: ["support", "plant"], combo: ["entry", "denial", "hardbreach"] },
    plant: { rasgos: ["plant"], combo: ["denial", "support"] },
    intel: { rasgos: ["intel"], combo: ["entry", "hardbreach", "roamer", "anchor"] },
    roamer: { rasgos: ["roam"], combo: ["intel", "fragger", "denial"] },
    anchor: { rasgos: ["anchor"], combo: ["denial", "intel", "antigadget"] },
    denial: { rasgos: ["denial"], combo: ["antigadget", "anchor", "plant", "intel", "support"] }
  };

  const ORDEN_FAMILIAS = Object.keys(FAMILIAS);

  // Del texto del rol se extrae la familia real del operador (desempata empates de rasgos).
  const PALABRAS_ROL = {
    hardbreach: ["hard breach", "soft breach", "brecha"],
    entry: ["entry", "vanguardia"],
    fragger: ["fragger", "angle watch", "cobertura"],
    antigadget: ["utility clear", "anti-dispositivos", "anti-brecha", "anti-escudos"],
    support: ["support", "soporte", "curación"],
    plant: [],
    intel: ["intel", "caza"],
    roamer: ["roamer", "sigilo", "movilidad", "engaño"],
    anchor: ["blindaje", "escudo"],
    denial: ["denial", "trapper", "trampas", "control"]
  };

  // Familia dominante de un operador según sus rasgos (y su rol si hay empate).
  function familiaDe(op) {
    const r = rasgosDe(op);
    const rol = (op.rol || "").toLowerCase();
    let mejor = null; let val = 0;
    ORDEN_FAMILIAS.forEach((f) => {
      const propio = FAMILIAS[f].rasgos.reduce((acc, t) => acc + (r[t] || 0), 0);
      // "anti-brecha" es negación de apertura, no apertura: no puntúa como hardbreach.
      const vale = !(f === "hardbreach" && rol.includes("anti-brecha"));
      const menciona = vale && PALABRAS_ROL[f].some((p) => rol.includes(p)) ? 1.5 : 0;
      const s = propio + menciona;
      if (s > val) { val = s; mejor = f; }
    });
    return mejor;
  }

  // Cuánto se complementan dos operadores entre sí (escala chica, ~0-15).
  function sinergiaEntre(a, b) {
    let s = 0;
    AFINIDADES.forEach(([t, u, w]) => {
      s += (a[t] || 0) * (b[u] || 0) * w;
      if (t !== u) s += (a[u] || 0) * (b[t] || 0) * w;
    });
    return s / 4;
  }

  // Sinergia promedio de un candidato con los que ya están elegidos.
  function sinergiaCon(ids, op) {
    const otros = (window.SIEGE_DLE.operators || []).filter((o) => ids.includes(o.id));
    if (!otros.length) return 0;
    const r = rasgosDe(op);
    const suma = otros.reduce((s, o) => s + sinergiaEntre(rasgosDe(o), r), 0);
    return suma / otros.length;
  }

  // Sinergia media de los pares de un equipo.
  function sinergiaEquipo(ids) {
    const lista = (window.SIEGE_DLE.operators || []).filter((o) => ids.includes(o.id)).map(rasgosDe);
    if (lista.length < 2) return 0;
    let s = 0; let pares = 0;
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) { s += sinergiaEntre(lista[i], lista[j]); pares += 1; }
    }
    return s / pares;
  }

  // Cuántos de los mínimos del lado quedan sin cubrir con 5 operadores.
  function huecos(st, lado) {
    const m = MINIMOS[lado] || {};
    return Object.keys(m).filter((t) => (st.rasgos[t] || 0) < m[t]).length;
  }

  // ¿Alguien del equipo puede abrir pared reforzada?
  function conAperturaDura(ids) {
    return (window.SIEGE_DLE.operators || [])
      .filter((o) => ids.includes(o.id))
      .some((o) => /hard breach|brecha pesada/i.test(o.rol || "")
        || /hard breach|carga de brecha pesada/i.test(o.gadget || ""));
  }

  // Fuerza de un equipo en un lado dado: base por rasgos + cobertura + sinergia - huecos.
  // - Llegar al objetivo de cada rasgo suma; pasarse mucho suma cada vez menos (no compensa
  //   amontonar todo en una sola cosa), y quedarse corto resta.
  // - Nunca da porcentajes: la probabilidad se acota aparte, así una composición mala
  //   perjudica pero no regala la derrota ni una buena regala la victoria.
  function fuerza(ids, lado, mapa) {
    const st = equipoStats(ids);
    const pesos = lado === "ataque" ? PESOS_ATAQUE : PESOS_DEFENSA;
    const m = MINIMOS[lado] || {};
    let base = 0;
    RASGOS.forEach((t) => {
      const v = st.rasgos[t] || 0;
      const obj = m[t] !== undefined ? m[t] : 2;
      const dentro = Math.min(v, obj);
      const sobra = Math.max(0, v - obj);
      base += (pesos[t] || 0) * (dentro + sobra * 0.2);
    });
    const faltan = huecos(st, lado);
    const sin = sinergiaEquipo(ids);
    let f = base;
    f += (st.cubiertos - 5) * 3;              // composición con varios frentes suma; monocorde resta
    f -= faltan * 6;                          // los huecos del lado pesan fuerte
    f += sin * 0.35;                          // pares que se complementan suman (sin dominar)
    if (lado === "ataque" && ids.length >= 3 && !conAperturaDura(ids)) f -= 10;
    if (mapa) f += ids.filter((id) => (mapa.favorecidos || []).includes(id)).length * 1.5;
    return { valor: Math.max(0, f), stats: st, huecos: faltan, cobertura: st.cubiertos, sinergia: sin };
  }

  // Texto cualitativo para el jugador (sin números).
  function evaluar(ids, lado) {
    const st = equipoStats(ids);
    const faltas = huecos(st, lado);
    if (!faltas) return "Composición sólida y sin huecos evidentes.";
    if (faltas <= 2) return "Composición aceptable, con algún punto flojo.";
    return "Composición arriesgada: tiene huecos importantes.";
  }

  window.SIEGE_DLE = window.SIEGE_DLE || {};
  window.SIEGE_DLE.rasgos = {
    RASGOS, AFINIDADES, MINIMOS, FAMILIAS, rasgosDe, familiaDe, equipoStats, fuerza, evaluar,
    sinergiaEntre, sinergiaCon, sinergiaEquipo, huecos,
    PESOS_ATAQUE, PESOS_DEFENSA
  };
})();
