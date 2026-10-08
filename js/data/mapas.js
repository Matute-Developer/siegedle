/* Mapas y puntos de bomba (4 puntos por mapa). Para agregar un mapa: añade un objeto con
   la misma forma. favorecidos: ids de operadores que reciben un bonus leve en ese mapa
   (nunca decisivo). sitios: los 4 puntos tal como se muestran; cada ronda se juega en uno.
   imagen: ruta de la imagen en imagenes/mapas/. */
window.SIEGE_DLE = window.SIEGE_DLE || {};
window.SIEGE_DLE.mapas = [
  {
    id: "banco",
    nombre: "Banco",
    imagen: "imagenes/mapas/r6-maps-bank.jpg.jpeg",
    descripcion: "Grandes distancias y múltiples accesos. Control de exteriores y juego vertical.",
    favorecidos: ["kali", "dokkaebi", "iq", "valkyrie", "vigil", "azami"],
    sitios: [
      "CEO / Sala ejecutiva",
      "Área abierta / Sala del personal",
      "Oficina de cajeros / Archivos",
      "CCTV / Taquillas"
    ]
  },
  {
    id: "frontera",
    nombre: "Frontera",
    imagen: "imagenes/mapas/r6-maps-border__1_.jpg.jpeg",
    descripcion: "Líneas de visión largas y entradas exteriores. La información manda.",
    favorecidos: ["iq", "dokkaebi", "lion", "valkyrie", "mozzie", "jager"],
    sitios: [
      "Sala de suministros / Aduanas",
      "Taller / Sala de ventilación",
      "Baño / Cajeros",
      "Taquillas de armería / Archivos"
    ]
  },
  {
    id: "chalet",
    nombre: "Chalet",
    imagen: "imagenes/mapas/rainbow6_maps_chalet_thumbnail.jpg.jpeg",
    descripcion: "Muros reforzados, vertical y ventanas. El hard breach es la llave de la casa.",
    favorecidos: ["thermite", "ace", "hibana", "thatcher", "maverick", "kaid", "bandit"],
    sitios: [
      "Oficina / Dormitorio principal",
      "Sala de juegos / Bar",
      "Cocina / Comedor",
      "Bodega / Garaje de motos de nieve"
    ]
  },
  {
    id: "club",
    nombre: "Club",
    imagen: "imagenes/mapas/r6-maps-clubhouse.jpg.jpeg",
    descripcion: "Muchos muros reforzables y sitios cerrados. El hard breach y el roaming mandan.",
    favorecidos: ["thermite", "hibana", "ace", "thatcher", "bandit", "kaid", "mute", "azami"],
    sitios: [
      "Gimnasio / Dormitorio",
      "CCTV / Sala del dinero",
      "Bar / Escenario",
      "Iglesia / Sala de armas"
    ]
  },
  {
    id: "litoral",
    nombre: "Litoral",
    imagen: "imagenes/mapas/r6-maps-coastline.jpg.jpeg",
    descripcion: "Muchas entradas y libertad de ángulos. Roaming y entradas rápidas.",
    favorecidos: ["ash", "zofia", "iana", "buck", "vigil", "valkyrie", "mozzie"],
    sitios: [
      "Sala de billar / Sala Hookah",
      "Teatro / Ático",
      "Cocina / Recepción",
      "Bar azul / Bar Sunrise"
    ]
  },
  {
    id: "consulado",
    nombre: "Consulado",
    imagen: "imagenes/mapas/CONSULATE_REWORK_PREVIEW_03_960x540.jpg.jpeg",
    descripcion: "Plantas conectadas por escaleras y ventanas por todos lados. Juego vertical y control exterior.",
    favorecidos: ["buck", "sledge", "thermite", "thatcher", "kaid", "mira"],
    sitios: [
      "Sala de reuniones / Oficina del cónsul",
      "Sala del piano / Sala de exposiciones",
      "Cajeros / Servidores",
      "Cafetería / Garaje"
    ]
  },
  {
    id: "cafe-dostoyevsky",
    nombre: "Café Dostoyevsky",
    imagen: "imagenes/mapas/r6-maps-kafe.jpg.jpeg",
    descripcion: "Juego vertical y pasillos cerrados. Control de las plantas superiores.",
    favorecidos: ["buck", "sledge", "ying", "smoke", "jager", "wamai"],
    sitios: [
      "Salón de cócteles / Bar",
      "Sala de la chimenea / Sala de minería",
      "Sala de lectura / Sala de la chimenea",
      "Cocina de servicio / Cocina"
    ]
  },
  {
    id: "guarida",
    nombre: "Guarida",
    imagen: "imagenes/mapas/r6s-maps-lair.jpg.jpeg",
    descripcion: "Laberíntica y de conexiones internas, con poco espacio para respirar. Cada pasillo es una trampa.",
    favorecidos: ["mute", "mira", "azami", "solis", "grim", "jackal"],
    sitios: [
      "Oficina del comandante / Sala R6",
      "Literas / Sala de reuniones",
      "Armería / Mantenimiento de armas",
      "Laboratorio / Soporte del laboratorio"
    ]
  },
  {
    id: "laboratorios-nighthaven",
    nombre: "Laboratorios de Nighthaven",
    imagen: "imagenes/mapas/Nighthaven_labs_screen.jpg.jpeg",
    descripcion: "Estructura moderna con puentes y exteriores abiertos. La información y el anti-gadget pesan.",
    favorecidos: ["kali", "zero", "twitch", "brava", "wamai", "aruni"],
    sitios: [
      "Comando / Servidores",
      "Control / Almacén",
      "Cocina / Cafetería",
      "Tanques / Montaje"
    ]
  },
  {
    id: "rascacielos",
    nombre: "Rascacielos",
    imagen: "imagenes/mapas/r6-maps-skyscraper.jpg.jpeg",
    descripcion: "Dos plantas con trampillas y muchas rotaciones. Premia la apertura vertical.",
    favorecidos: ["buck", "sledge", "hibana", "maestro", "echo", "jager"],
    sitios: [
      "Sala de té / Karaoke",
      "Oficina de trabajo / Exposición",
      "BBQ / Cocina",
      "Dormitorio / Baño"
    ]
  },
  {
    id: "parque-de-atracciones",
    nombre: "Parque de Atracciones",
    imagen: "imagenes/mapas/rainbow6_maps_theme-park_thumbnail.jpg.jpeg",
    descripcion: "Túneles oscuros y zonas cerradas. El roaming agresivo y las trampas cortas rinden mucho.",
    favorecidos: ["caveira", "vigil", "kapkan", "lesion", "jackal", "nomad"],
    sitios: [
      "Sala de iniciación / Oficina",
      "Literas / Guardería",
      "Armería / Sala del trono",
      "Laboratorio / Almacén"
    ]
  },
  {
    id: "villa",
    nombre: "Villa",
    imagen: "imagenes/mapas/r6-maps-villa.jpg.jpeg",
    descripcion: "Mapa grande con mucho roaming y juego vertical.",
    favorecidos: ["nomad", "jackal", "buck", "sledge", "vigil", "caveira"],
    sitios: [
      "Sala del aviador / Sala de juegos",
      "Sala de trofeos / Sala de estatuas",
      "Cocina / Comedor",
      "Almacén de arte / Oficina antigua"
    ]
  },
  {
    id: "oregon",
    nombre: "Oregón",
    imagen: "imagenes/mapas/r6-maps-oregon.jpg.jpeg",
    descripcion: "Un clásico táctico. Control de dormitorios, sótano disputado y rotaciones rápidas.",
    favorecidos: ["thermite", "hibana", "ace", "mute", "smoke", "jager", "azami"],
    sitios: [
      "Lavandería / Sala de suministros",
      "Dormitorio infantil / Dormitorio principal",
      "Cocina / Comedor",
      "Sala de reuniones / Cocina"
    ]
  },
  {
    id: "kanal",
    nombre: "Canal",
    imagen: "imagenes/mapas/r6-maps-kanal.jpg.jpeg",
    descripcion: "Dos edificios conectados por puentes elevados. Cruces de fuego a larga distancia y control exterior.",
    favorecidos: ["thermite", "ace", "kali", "bandit", "kaid", "valkyrie"],
    sitios: [
      "Servidores / Radar",
      "Cámara de mapas / Comando",
      "Kayak / Suministros",
      "Oficina del director / Salón"
    ]
  },
  {
    id: "outback",
    nombre: "Outback",
    imagen: "imagenes/mapas/r6-maps-outback.jpg.jpeg",
    descripcion: "Estación de servicio australiana. Pasillos cerrados, dos alturas y emboscadas continuas.",
    favorecidos: ["buck", "sledge", "gridlock", "mozzie", "lesion", "valkyrie"],
    sitios: [
      "Lavandería / Sala de juegos",
      "Oficina de fiesta / Garaje",
      "Restaurante / Cocina",
      "Taller mecánico / Garaje"
    ]
  },
  {
    id: "emerald-plains",
    nombre: "Llanuras Esmeralda",
    imagen: "imagenes/mapas/r6s_maps_emeraldplains__1_.jpg.jpeg",
    descripcion: "Country club señorial en Irlanda del Norte. Estructura elegante, con múltiples alturas y claraboyas.",
    favorecidos: ["buck", "sledge", "ram", "azami", "smoke", "mute"],
    sitios: [
      "Galería privada / Administración",
      "Bar / Sala de estar",
      "Cocina / Comedor",
      "Biblioteca / Chimenea"
    ]
  }
];
