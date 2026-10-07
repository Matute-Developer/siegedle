/* Puntos de arranque de los ATACANTES por mapa: el equipo que ataca elige por ronda desde
   dónde entra (el "punto de arranque"). El defensor no los usa: él elige el punto de bomba.
   mapa: id del mapa en data/mapas.js. Para agregar un mapa o un arranque: misma forma. */
window.SIEGE_DLE = window.SIEGE_DLE || {};
window.SIEGE_DLE.puntosAtaque = [
  {
    mapa: "banco",
    puntos: [
      "Boulevard",
      "Joyería",
      "Callejón"
    ]
  },
  {
    mapa: "frontera",
    puntos: [
      "Entrada de vehículos Este",
      "Valle",
      "Salida de vehículos Oeste"
    ]
  },
  {
    mapa: "casino-calypso",
    puntos: [
      "Poolside",
      "Helipad",
      "Low Spawn",
      "Garden Ruins"
    ]
  },
  {
    mapa: "chalet",
    puntos: [
      "Patio delantero",
      "Fogata",
      "Acantilado",
      "Lakeside"
    ]
  },
  {
    mapa: "club",
    puntos: [
      "Puerta principal",
      "Muelle de carga",
      "Almacén",
      "Construcción"
    ]
  },
  {
    mapa: "litoral",
    puntos: [
      "Entrada principal",
      "Piscina",
      "Ruinas"
    ]
  },
  {
    mapa: "consulado",
    puntos: [
      "Barricada antidisturbios",
      "Línea policial",
      "Gasolinera",
      "Entrada lateral"
    ]
  },
  {
    mapa: "la-fortaleza",
    puntos: [
      "Puerta principal",
      "Estacionamiento",
      "Jardín",
      "Establos"
    ]
  },
  {
    mapa: "cafe-dostoyevsky",
    puntos: [
      "Muelles del río",
      "Mercado navideño",
      "Parque"
    ]
  },
  {
    mapa: "guarida",
    puntos: [
      "Campo de tiro",
      "Puerta",
      "Ascensor",
      "Muelle"
    ]
  },
  {
    mapa: "laboratorios-nighthaven",
    puntos: [
      "Parque",
      "Generador",
      "Helipuerto"
    ]
  },
  {
    mapa: "rascacielos",
    puntos: [
      "Helipuerto",
      "Torre",
      "Unidades de ventilación"
    ]
  },
  {
    mapa: "parque-de-atracciones",
    puntos: [
      "Entrada principal",
      "Tazas",
      "Autos chocadores"
    ]
  },
  {
    mapa: "villa",
    puntos: [
      "Carretera principal",
      "Ruinas",
      "Fuente"
    ]
  }
];
