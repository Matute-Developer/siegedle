# SIEGE DLE — v0.25.1 (adivinanza + modo Partida con rondas tácticas interactivas + fichas con retrato)

Juego táctico de deducción inspirado en Rainbow Six Siege. Interfaz 100 % en español.
Proyecto de fans dedicado al clan TKOA. Sin afiliación con Ubisoft.

> **Dedicatoria: Nacho te amo ♥** — para el clan TKOA.

## Dos modos de uso
1. **Sin instalar nada:** doble clic en `index.html`. Usa `js/data/operators.js` (reserva local, 78 operadores).
2. **Con backend (recomendado):** `http://localhost:3000`. Usa SQLite (`backend/siege.db`)
   o JSON (`backend/data/db.json`) según tu Node. El frontal muestra la fuente en
   `index.html` (`#origen-datos`).

## Juego
- Objetivo secreto aleatorio en cada ronda (`js/logic/game-state.js`).
- Análisis ilimitados, el último siempre arriba. Cada celda se pinta de **verde si coincide** y **rojo si no coincide**.
- La columna Año indica con **▲** (objetivo posterior) o **▼** (objetivo anterior).
- Columna Icono con el retrato del operador (`js/components/retrato.js`): 68 del CDN, 10 locales en
  `imagenes/` (Striker y Sentry sumados en v0.17.1) y solo quedan en iniciales si no hay ninguna fuente.
- Columnas Rol y Gadget con la lista completa por operador, tomadas de la **base de datos
  actualizada con lo último del juego** (dump SQL, 78 operadores: rol, gadgets, velocidad,
  año, sexo y región con país). Ids, unidades (CTU) e iconos siguen siendo los locales.
- Al adivinar salta el cartel de victoria con el nombre del operador y botón de otra ronda.
- En la vista **Operadores** cada tarjeta es pulsable y abre una **ficha breve** del operador:
  **retrato completo** (`imagenes/retrato-*.jpg`, los 78 de r6.skin reescalados a 300 px, ~2,5 MB
  en total), bando, unidad, rol, gadgets, velocidad, año, sexo y región. Cierre por ✕, **Esc** o
  clic fuera y devolución del foco a la tarjeta (`js/components/ficha.js`). Si un retrato no
  carga, la ficha vuelve sola al avatar circular; en la galería, el tablero y la Partida sigue
  viendo el icono de siempre.
- Dedicatoria visible al clan TKOA + mensaje en cabecera y pie.

## Modo Partida (TÚ vs RIVAL, primero en 4)
- **Pantalla de inicio**: el modo no arranca en los mapas. El cartel de arriba dice
  **«JUGATE UNA RANKED NACHO»** (modo meme) y abajo *«como diria un amigo BALRIGHT»*; en el
  contenido hay tres botones: **JUGAR** (arranca el veto), **Ver mapas** (los 16 mapas con
  foto en grande y nombre, sin info) y **Cómo se juega**.
- **Veto + sorteo de mapa**: salen **5 mapas al azar** con sus imágenes reales (`imagenes/mapas/`).
  En el veto los 5 van **uno al lado del otro** (estilo Siege original, con scroll lateral en
  celular), con la **foto completa y solo el nombre en degradado transparente**, sin data.
  En el sorteo también: solo foto en grande y nombre. Adentro tenés la opción de
  **Regresar y no jugar** (volver al inicio sin penalización) y
  de **Randomizar mapas de nuevo 1 sola vez** si querés otra combinación de 5 mapas candidatos.
  Vos baneás 1 y el rival banea 1 distinto; entre los **3 restantes el mapa sale totalmente al azar**, con una
  ruleta que se ve girar en pantalla (`#btn-sortear`, `vistaSorteo()`).
  **Un mapa por partida**: una vez sorteado el mapa queda fijo y no se puede cambiar en toda la partida.
- Los 16 mapas con imágenes oficiales y sus **4 puntos de bomba** y **puntos de arranque** (`js/data/puntos-ataque.js`):
  Banco, Frontera, Chalet, Club, Litoral, Consulado, Café Dostoyevsky, Guarida, Laboratorios de Nighthaven,
  Rascacielos, Parque de Atracciones, Villa, Oregón, Canal, Outback y Llanuras Esmeralda.
- **Punto de bomba y punto de arranque**: al elegir el punto a defender o el arranque a entrar,
  el nombre del mapa aparece destacado a la derecha (ej. `Elegí el punto a defender       CHALET`).
  El punto donde ganaste una ronda queda bloqueado mientras juegues del mismo lado; si perdiste ahí,
  sigue disponible para repetirlo o irte a otro. Al **cambiar de lado** (ronda 4 u overtime) los puntos
  se **liberan** y podés elegir cualquiera (`state.ladoUltimo` en `prepararRonda()`).
- Cada ronda: vos baneás 1 del bando rival y el rival banea 1 del tuyo. Los baneos valen para toda la partida.
  El baneo se marca y se confirma aparte; hay un reloj global de 30 s para todo el baneo y otro global de 90 s
  para los 5 picks (no se reinicia por personaje). Si se acaban, el sistema termina solo.
- Pausa real y global: congela el reloj y la narración en el instante que apretás y queda ahí hasta que retomes,
  tanto en bans/draft (⏸ del reloj) como durante la ronda (⏸ Pausar / ⏩ Saltar).
- Draft de 5 por ronda: solo atacantes si atacás, solo defensores si defendés. Las 3 opciones
  por pick salen de la **lógica de composición interna**: con un eje ya elegido (Thermite, Smoke…)
  se ofrecen los mejores de las familias que lo complementan (hard breach, anti-gadget, intel,
  entry, fragger, roamer, anchor, denial, support, plant), eligiendo especialistas y con variedad;
  sin eje, 3 rutas de composición distintas (cubrir hueco, encaje del lado, apuesta). Las
  categorías **nunca se muestran**; en las fichas solo aparece el rol real del operador.
- IA con 4 estilos (agresivo, defensivo, inteligencia, equilibrado) y **memoria entre rondas**:
  si abusás del C4 temprano, drona y espera; si sos agresivo, castiga tus picks; si sos pasivo,
  toma terreno. Su plan (ritmo, dronaje) se anuncia al arrancar la ronda.
- Rondas 1-3 de un lado y 4-6 del otro, alternando quién empieza entre partidas.
- **Ronda táctica interactiva** (motor `js/logic/ronda-tactica.js`, situaciones en
  `js/data/tactica-situaciones.js`, preguntas en `js/data/tactica-preguntas.js`):
  línea temporal por momentos con reloj (2:45), situaciones reales con operadores de tu
  draft (pasos bajo la sala con C4, carga de Thermite en la pared, hackeo de Dokkaebi,
  escáner de IQ, plant con segundos en el reloj) y 2-4 acciones con trade-offs visibles
  (riesgo, recompensa, requisitos de operador/recurso/tiempo).
- Las acciones tienen **condiciones reales**: sin C4 no hay C4, sin Bandit/Kaid no hay trick,
  sin tiempo no hay espera. Los botones imposibles se deshabilitan con el motivo.
- **Probabilidades con modificadores explicados** (posición, agrupamiento, info, sincronía,
  sinergias como Thatcher+Thermite, counters como IQ vs C4 o Warden vs humo): nivel
  MUY BAJA→MUY ALTA siempre, % con desglose solo en momentos clave. Todo puede fallar;
  nada está garantizado.
- **Cadenas y QTE**: esperar puede abrir una ventana de 1 segundo (DETONAR o nada) con
  cuenta regresiva; si no respondés, se elige lo más seguro. Pausa real congela el QTE.
- **Información oculta**: del rival solo ves cantidad en pie; posiciones y HP se deducen
  con cámaras, sonido e intel (panel de datos confirmados + nivel y alerta rival).
- **Utilidad consumible** (gas de Smoke, EDD, ADS, baterías, PEM, drones…) y **HP por
  operador** con estados; gastar todo temprano se paga en el plant.
- **Killfeed con identidad**: cada baja muestra el retrato en blanco y negro con cruz roja
  del operador que murió (rival o aliado); el texto nombra siempre a las víctimas reales
  del reparto, nunca a otro. En los equipos, los caídos quedan en gris con ☠.
- **Sin victoria pasiva**: el ataque gana SOLO eliminando a los 5 o con plant que sobrevive
  al reloj; la defensa, eliminando a los 5 o negando el plant hasta que el ataque se quede
  sin nada. A los 15s sin plant (o tope de momentos) arranca el **ASALTO FINAL obligatorio**: solo
  MATAR o PLANTAR, todo a probabilidad visible, y cada resultado quita HP o planta, así que
  siempre se define peleando.
- **Duelo 1v1 jugable**: cuando queda uno contra uno aparecen las fotos de los dos que se
  enfrentan y elegís cómo ganarlo: **minijuego de reflejos** (zona verde, 8 segundos) o
  **desafío Siege** (acertar elimina, fallar duele 35 HP). Fallar el duelo duele y se repite
  hasta que alguien caiga.
- **Cartel de muerte en el medio de la pantalla**: cada baja (aliada o rival) muestra
  2 segundos el retrato grande en blanco y negro con cruz roja + nombre ("RIVAL ELIMINADO"
  / "ALIADO CAÍDO"), además del killfeed.
- **Careo siempre visible**: cuando quedan 3 o menos en total aparecen las fotos de los
  que se enfrentan (los tuyos VS los rivales); en el 1v1 exacto se abre el duelo jugable.
- **Duelo casual**: además del 1v1 exacto, en cualquier momento (inicio, mitad o cierre)
  puede cruzarse un duelo con nombre y apellido (ej. ASH VS CAVEIRA), máximo uno por ronda.
  Duelo a MUERTE y difícil: quiz solo media→experta, minijuego más rápido y angosto.
  El que pierde, cae.
- **Quiz de conocimiento Siege** en momentos importantes (país de Kapkan, Yokai de Echo,
  Evil Eye, trick Bandit+Kaid, CTUs, mapas del juego…): 67 preguntas de media a experta y
  respuestas siempre mezcladas (la correcta nunca queda fija). Acertar da +info y +5% en
  la próxima acción; fallar cuesta 12 s y alerta al rival. Máx. 2 por ronda.
  Las situaciones no se repiten de forma seguida (exclusión de las últimas 3 + peso por usos)
  y los textos tienen variantes; si el pool se vacía o se acaban los momentos, la ronda se
  define con un duelo final a balas (con bajas reales, nunca moneda al aire) y el resumen
  muestra el motivo de cierre (eliminación, tiempo, plant o duelo).
- **Plant/retake, clutch 1vX** con interfaz especial, condiciones de victoria por
  eliminación/tiempo/plant, y **resumen de ronda** con bajas, daño, utilidad usada y
  malgastada, plant, clutch, mejor y peor decisión.
- La **composición se evalúa y se puede equivocar**: cada rasgo tiene un objetivo por lado,
  llegar a él suma, amontonar todo en una sola cosa deja de sumar y quedarse corto resta
  (huecos, cobertura, sinergia y, en ataque, falta de apertura dura). Nada está escrito:
  la probabilidad por punto de ventaja es 0.012 y se acota a **[20 %, 85 %]**, así que una
  composición mala perjudica pero nunca regala la derrota, ni una buena regala la victoria.
  (Pruebas: draft con criterio ≈ 55 % por ronda y ≈ 68 % de partidas; al azar ≈ 44 % y ≈ 57 %;
  malo a propósito ≈ 27 % y ≈ 18 %. Ninguna queda en 0 % ni en 100 %.)
- Panel de pronóstico en vivo antes de cada ronda: probabilidad, fuerzas y ventaja.

## Arranque con backend (Windows)
```
instalar-node.bat   -> instala Node LTS una sola vez
iniciar.bat         -> arranca API + frontal en puerto 3000
```
Manual: `cd backend` → `node server.js --port=3000`.

## Estructura
```
index.html                  -> 3 vistas (#/jugar, #/operadores, #/partida)
imagenes/                   -> retratos (retrato-*.jpg) + badges locales (r6s-operators-badge-*)
css/                        -> variables, base, layout, components, animations, responsive
js/
  config.js                 -> ajustes globales
  data/textos.js            -> textos en español
  data/operators.js         -> RESERVA local (el backend es la fuente principal)
  data/mapas.js             -> mapas, puntos y bonus (fácil agregar más)
  data/puntos-ataque.js     -> puntos de arranque de los atacantes por mapa
  data/tactica-preguntas.js -> desafíos de conocimiento Siege (fácil→experto)
  data/tactica-situaciones.js -> 28 momentos tácticos con acciones y consecuencias
  logic/ronda-tactica.js    -> motor táctico: momentos, probs, HP, plant, clutch, quiz
  components/ronda-tactica-ui.js -> vista de la ronda (timeline, intel, QTE, resumen)
  css/tactica.css            -> estilos de la ronda táctica
  services/api.js           -> único que habla con /api/*, con reserva automática
  logic/game-state.js       -> estado de la adivinanza
  logic/rasgos.js           -> 12 rasgos + familias, afinidades y mínimos por lado (ocultos)
  logic/partida.js          -> motor Partida: bans, draft, IA, simulación
  components/               -> navigation, search, board, modal, ficha, toast, retrato, partida-ui
  app.js                    -> arranque: api.cargarOperadores() y luego pinta
backend/
  server.js                 -> sirve ../ frontal + /api/*, sin dependencias
  src/db.js                 -> SQLite (node:sqlite) con reserva JSON, misma interfaz
  src/operators.repo.js      -> puerta de datos; no tocar rutas si cambias de BD
  src/router.js              -> API v1; añade aquí el próximo recurso
  data/schema.sql            -> tablas operadores + intentos
  data/seed.json             -> 78 operadores (misma forma que el frontal)
  siege.db                  -> se crea solo al arrancar (ignorado en git)
  data/db.json              -> se crea solo si tu Node no tiene SQLite
```

## API v1
- `GET /api/salud`, `GET /api/operadores`, `GET /api/operadores?bando=...`
- `GET /api/operadores/:id`, `POST /api/intentos`, `GET /api/intentos`

## Ampliar
- Nuevo campo: `schema.sql` + `seed.json`; el backend recarga los datos solo al arrancar.
- Nuevo recurso (armas, mapas): crea `src/<recurso>.repo.js` + ruta en `router.js`.
- Mecánica de juego: `logic/game-state.js` + `components/board.js` (`cell-ok/mid/bad` ya definidas).
