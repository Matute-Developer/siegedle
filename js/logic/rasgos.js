/* Motor de rasgos tácticos. Traduce rol/gadget/velocidad a 12 rasgos internos 0-10.
   Las categorías NO se muestran al jugador; solo alimentan draft, IA y probabilidades. */
(function () {
  const RASGOS = ["entry", "frag", "support", "breach", "intel", "antigadget", "roam", "anchor", "denial", "plant", "vertical", "flank"];

  // [clave en minúsculas, {rasgo: puntos}]
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
    ["support", { support: 2, plant: 1 }]
  ];

  const REGLAS_GADGET = [
    ["Frag", { frag: 1 }],
    ["Stun", { entry: 1 }],
    ["Flash", { entry: 1 }],
    ["Smoke", { plant: 1, denial: 1 }],
    ["Claymore", { flank: 1 }],
    ["Impact EMP", { antigadget: 1 }],
    ["Breach Charge", { breach: 1 }],
    ["Soft Breach", { breach: 1 }],
    ["Hard Breach", { breach: 2 }],
    ["C4", { frag: 1, denial: 1 }],
    ["Barbed Wire", { denial: 1 }],
    ["Deployable Shield", { anchor: 1, plant: 1 }],
    ["Bulletproof", { intel: 1 }],
    ["Proximity", { intel: 1, flank: 1 }],
    ["Impacts", { breach: 1, entry: 1 }]
  ];

  const PESOS_ATAQUE = { entry: 3, breach: 3, plant: 2, frag: 2, intel: 2, support: 2, antigadget: 2, vertical: 1, flank: 1, anchor: 1, denial: 1, roam: 1 };
  const PESOS_DEFENSA = { anchor: 3, denial: 3, intel: 2, roam: 2, antigadget: 2, frag: 2, support: 1, entry: 1, plant: 0, breach: 0, vertical: 1, flank: 1 };

  // Mínimos internos de una composición completa (5) por lado. No se muestran.
  // Sirven a la vez como objetivo: llegar a ellos suma, pasarse mucho suma cada vez menos,
  // y quedarse corto resta (así una composición extrema es mala sin ser una derrota automática).
  const MINIMOS = {
    ataque: { breach: 5, entry: 5, intel: 4, plant: 2, antigadget: 3 },
    defensa: { anchor: 2, denial: 7, intel: 5, roam: 4, support: 2 }
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
        if (t.includes(clave)) sumar(r, pesos);
      });
    });
    REGLAS_GADGET.forEach(([clave, pesos]) => {
      if ((op.gadget || "").includes(clave)) sumar(r, pesos);
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
    hardbreach: ["hard breach", "soft breach"],
    entry: ["entry"],
    fragger: ["fragger", "angle watch"],
    antigadget: ["utility clear"],
    support: ["support"],
    plant: [],
    intel: ["intel"],
    roamer: ["roamer"],
    anchor: [],
    denial: ["denial", "trapper"]
  };

  // Familia dominante de un operador según sus rasgos (y su rol si hay empate).
  function familiaDe(op) {
    const r = rasgosDe(op);
    const rol = (op.rol || "").toLowerCase();
    let mejor = null; let val = 0;
    ORDEN_FAMILIAS.forEach((f) => {
      const propio = FAMILIAS[f].rasgos.reduce((acc, t) => acc + (r[t] || 0), 0);
      const menciona = PALABRAS_ROL[f].some((p) => rol.includes(p)) ? 1.5 : 0;
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
      .some((o) => /hard breach/i.test(o.rol || "") || (o.gadget || "").includes("Hard Breach"));
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
