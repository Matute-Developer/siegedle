/* Mapas y sitios de bomba. Para agregar un mapa: añade un objeto con la misma forma.
   favorecidos: ids de operadores que reciben un bonus leve en ese mapa (nunca decisivo). */
window.SIEGE_DLE = window.SIEGE_DLE || {};
window.SIEGE_DLE.mapas = [
  { id: "clubhouse", nombre: "Clubhouse",
    descripcion: "Muchos muros reforzables y sitios cerrados. El hard breach y el roaming mandan.",
    favorecidos: ["thermite", "hibana", "ace", "thatcher", "bandit", "kaid", "mute", "azami"],
    sitios: [
      { nombre: "CCTV / Cash", consejo: "Favorece buen hard breach y control de utilidades." },
      { nombre: "Church / Arsenal", consejo: "Pide apertura vertical y limpieza de trampas." },
      { nombre: "Master / Gym", consejo: "Premia la entrada rápida y el control de ventanas." }
    ] },
  { id: "oregon", nombre: "Oregon",
    descripcion: "Sitios cerrados y escaleras clave. Mucho juego alrededor del objetivo.",
    favorecidos: ["smoke", "jager", "wamai", "mute", "sledge", "buck", "ying"],
    sitios: [
      { nombre: "Basement", consejo: "Pide control de escaleras y negación de planta." },
      { nombre: "Dorms", consejo: "Premia intel y limpieza metódica." },
      { nombre: "Kitchen / Dining", consejo: "Favorece presión dividida y flank watch." }
    ] },
  { id: "coastline", nombre: "Coastline",
    descripcion: "Muchas entradas y libertad de ángulos. Roaming y entradas rápidas.",
    favorecidos: ["ash", "zofia", "iana", "buck", "vigil", "valkyrie", "mozzie"],
    sitios: [
      { nombre: "Hookah / Billiards", consejo: "Premia entradas explosivas por varias puertas." },
      { nombre: "Kitchen / Service", consejo: "Pide control de pasillos y roaming." }
    ] },
  { id: "bank", nombre: "Bank",
    descripcion: "Grandes distancias y múltiples accesos. Control de exteriores y vertical.",
    favorecidos: ["kali", "dokkaebi", "iq", "valkyrie", "vigil", "azami"],
    sitios: [
      { nombre: "Basement", consejo: "Pide juego vertical desde arriba." },
      { nombre: "Lockers / CCTV", consejo: "Premia intel y control de pasillos largos." },
      { nombre: "CEO Office", consejo: "Favorece control de ventanas y exteriores." }
    ] },
  { id: "kafe", nombre: "Kafe Dostoyevsky",
    descripcion: "Juego vertical y pasillos cerrados. Control de plantas superiores.",
    favorecidos: ["buck", "sledge", "ying", "smoke", "jager", "wamai"],
    sitios: [
      { nombre: "Kitchen", consejo: "Pide apertura de trampillas y control superior." },
      { nombre: "Reading / Fireplace", consejo: "Premia negación y control de pasillos." },
      { nombre: "Bar / Cocktail", consejo: "Favorece ejecución coordinada al sitio." }
    ] },
  { id: "chalet", nombre: "Chalet",
    descripcion: "Muros reforzados, vertical y ventanas. Hard breach imprescindible.",
    favorecidos: ["thermite", "ace", "hibana", "thatcher", "maverick", "kaid", "bandit"],
    sitios: [
      { nombre: "Master / Office", consejo: "Pide hard breach y control de exteriores." },
      { nombre: "Basement", consejo: "Premia control de escaleras y negación." }
    ] },
  { id: "border", nombre: "Border",
    descripcion: "Líneas de visión largas y entradas exteriores. La información manda.",
    favorecidos: ["iq", "dokkaebi", "lion", "valkyrie", "mozzie", "jager"],
    sitios: [
      { nombre: "Armory / Archives", consejo: "Pide anti-gadget y limpieza de intel rival." },
      { nombre: "Customs / Supply", consejo: "Premia control de exteriores." }
    ] },
  { id: "villa", nombre: "Villa",
    descripcion: "Mapa grande con mucho roaming y juego vertical.",
    favorecidos: ["nomad", "jackal", "buck", "sledge", "vigil", "caveira"],
    sitios: [
      { nombre: "Aviator / Games", consejo: "Pide flank watch y control de zonas." },
      { nombre: "Living / Library", consejo: "Premia roaming y rotaciones rápidas." }
    ] }
];
