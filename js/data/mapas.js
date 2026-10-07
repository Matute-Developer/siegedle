/* Mapas y puntos de bomba (4 puntos por mapa). Para agregar un mapa: añade un objeto con
   la misma forma. favorecidos: ids de operadores que reciben un bonus leve en ese mapa
   (nunca decisivo). sitios: los 4 puntos tal como se muestran; cada ronda se juega en uno. */
window.SIEGE_DLE = window.SIEGE_DLE || {};
window.SIEGE_DLE.mapas = [
  { id: "banco", nombre: "Banco",
    descripcion: "Grandes distancias y múltiples accesos. Control de exteriores y juego vertical.",
    favorecidos: ["kali", "dokkaebi", "iq", "valkyrie", "vigil", "azami"],
    sitios: [
      "CEO / Sala ejecutiva",
      "Área abierta / Sala del personal",
      "Oficina de cajeros / Archivos",
      "CCTV / Taquillas"
    ] },
  { id: "frontera", nombre: "Frontera",
    descripcion: "Líneas de visión largas y entradas exteriores. La información manda.",
    favorecidos: ["iq", "dokkaebi", "lion", "valkyrie", "mozzie", "jager"],
    sitios: [
      "Sala de suministros / Aduanas",
      "Taller / Sala de ventilación",
      "Baño / Cajeros",
      "Taquillas de armería / Archivos"
    ] },
  { id: "casino-calypso", nombre: "Casino Calypso",
    descripcion: "Casino de lujo con pasillos anchos y mucho vidrio. Mezcla control de área y entradas rápidas.",
    favorecidos: ["ash", "iana", "valkyrie", "mozzie", "capitao", "wamai"],
    sitios: [
      "CCTV / Control de bóveda",
      "Bar / Apuestas",
      "Blackjack / Póker",
      "Sala de puros / Piscina"
    ] },
  { id: "chalet", nombre: "Chalet",
    descripcion: "Muros reforzados, vertical y ventanas. El hard breach es la llave de la casa.",
    favorecidos: ["thermite", "ace", "hibana", "thatcher", "maverick", "kaid", "bandit"],
    sitios: [
      "Oficina / Dormitorio principal",
      "Sala de juegos / Bar",
      "Cocina / Comedor",
      "Bodega / Garaje de motos de nieve"
    ] },
  { id: "club", nombre: "Club",
    descripcion: "Muchos muros reforzables y sitios cerrados. El hard breach y el roaming mandan.",
    favorecidos: ["thermite", "hibana", "ace", "thatcher", "bandit", "kaid", "mute", "azami"],
    sitios: [
      "Gimnasio / Dormitorio",
      "CCTV / Sala del dinero",
      "Bar / Escenario",
      "Iglesia / Sala de armas"
    ] },
  { id: "litoral", nombre: "Litoral",
    descripcion: "Muchas entradas y libertad de ángulos. Roaming y entradas rápidas.",
    favorecidos: ["ash", "zofia", "iana", "buck", "vigil", "valkyrie", "mozzie"],
    sitios: [
      "Sala de billar / Sala Hookah",
      "Teatro / Ático",
      "Cocina / Recepción",
      "Bar azul / Bar Sunrise"
    ] },
  { id: "consulado", nombre: "Consulado",
    descripcion: "Plantas conectadas por escaleras y ventanas por todos lados. Juego vertical y control exterior.",
    favorecidos: ["buck", "sledge", "thermite", "thatcher", "kaid", "mira"],
    sitios: [
      "Sala de reuniones / Oficina del cónsul",
      "Sala del piano / Sala de exposiciones",
      "Cajeros / Servidores",
      "Cafetería / Garaje"
    ] },
  { id: "la-fortaleza", nombre: "La Fortaleza",
    descripcion: "Interior compacto con pasillos estrechos. Trampas y negación de área rinden el doble.",
    favorecidos: ["smoke", "kapkan", "lesion", "melusi", "ying", "capitao"],
    sitios: [
      "Hammam / Sala de estar",
      "Sala de espera / Cafetería",
      "Baño / Oficina del comandante",
      "Dormitorio / Sala de juegos"
    ] },
  { id: "cafe-dostoyevsky", nombre: "Café Dostoyevsky",
    descripcion: "Juego vertical y pasillos cerrados. Control de las plantas superiores.",
    favorecidos: ["buck", "sledge", "ying", "smoke", "jager", "wamai"],
    sitios: [
      "Salón de cócteles / Bar",
      "Sala de la chimenea / Sala de minería",
      "Sala de lectura / Sala de la chimenea",
      "Cocina de servicio / Cocina"
    ] },
  { id: "guarida", nombre: "Guarida",
    descripcion: "Laberíntica y de conexiones internas, con poco espacio para respirar. Cada pasillo es una trampa.",
    favorecidos: ["mute", "mira", "azami", "solis", "grim", "jackal"],
    sitios: [
      "Oficina del comandante / Sala R6",
      "Literas / Sala de reuniones",
      "Armería / Mantenimiento de armas",
      "Laboratorio / Soporte del laboratorio"
    ] },
  { id: "laboratorios-nighthaven", nombre: "Laboratorios de Nighthaven",
    descripcion: "Estructura moderna con puentes y exteriores abiertos. La información y el anti-gadget pesan.",
    favorecidos: ["kali", "zero", "twitch", "brava", "wamai", "aruni"],
    sitios: [
      "Comando / Servidores",
      "Control / Almacén",
      "Cocina / Cafetería",
      "Tanques / Montaje"
    ] },
  { id: "rascacielos", nombre: "Rascacielos",
    descripcion: "Dos plantas con trampillas y muchas rotaciones. Premia la apertura vertical.",
    favorecidos: ["buck", "sledge", "hibana", "maestro", "echo", "jager"],
    sitios: [
      "Sala de té / Karaoke",
      "Oficina de trabajo / Exposición",
      "BBQ / Cocina",
      "Dormitorio / Baño"
    ] },
  { id: "parque-de-atracciones", nombre: "Parque de Atracciones",
    descripcion: "Túneles oscuros y zonas cerradas. El roaming agresivo y las trampas corto rinden mucho.",
    favorecidos: ["caveira", "vigil", "kapkan", "lesion", "jackal", "nomad"],
    sitios: [
      "Sala de iniciación / Oficina",
      "Literas / Guardería",
      "Armería / Sala del trono",
      "Laboratorio / Almacén"
    ] },
  { id: "villa", nombre: "Villa",
    descripcion: "Mapa grande con mucho roaming y juego vertical.",
    favorecidos: ["nomad", "jackal", "buck", "sledge", "vigil", "caveira"],
    sitios: [
      "Sala del aviador / Sala de juegos",
      "Sala de trofeos / Sala de estatuas",
      "Cocina / Comedor",
      "Almacén de arte / Oficina antigua"
    ] }
];
