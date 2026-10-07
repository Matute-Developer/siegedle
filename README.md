# SIEGE DLE — v0.21.0 (adivinanza + modo Partida con sorteo de mapa y punto de arranque + fichas con retrato + backend + BD ligera)

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
  contenido hay tres botones: **JUGAR** (arranca el veto), **Ver mapas** (los 14 mapas con sus
  puntos de bomba y sus arranques) y **Cómo se juega**.
- **Veto + sorteo de mapa**: salen **5 mapas al azar** (sin repetir el último jugado), vos baneás 1
  y el rival banea 1 distinto; entre los **3 restantes el mapa sale totalmente al azar**, con una
  ruleta que se ve girar en pantalla (`#btn-sortear`, `vistaSorteo()`).
- Los 14 mapas con sus **4 puntos de bomba** y sus **puntos de arranque** (`js/data/puntos-ataque.js`):
  Banco, Frontera, Casino Calypso, Chalet, Club, Litoral, Consulado, La Fortaleza, Café Dostoyevsky,
  Guarida, Laboratorios de Nighthaven, Rascacielos, Parque de Atracciones y Villa.
- **Punto de bomba y punto de arranque** (uno por bando): el **punto de bomba lo fija siempre el
  defensor** (si defendés lo pickeás vos; si atacás lo pone el rival y no se puede tocar) y el
  **punto de arranque lo fija siempre el atacante** (si atacás elegís desde dónde entrás 🚀; si
  defendés lo pone el rival). **El punto donde ganaste una ronda queda bloqueado** y no se vuelve a
  jugar en toda la partida; si perdiste ahí, sigue disponible y se puede volver a pickear (nunca te
  quedas sin puntos: con 3 victorias siempre queda al menos 1 libre).
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
- IA con 4 estilos (agresivo, defensivo, inteligencia, equilibrado), equipo de 5 auto que
  también cubre huecos y busca sinergia, pero con ruido para no ser perfecta.
- Rondas 1-3 de un lado y 4-6 del otro, alternando quién empieza entre partidas.
- La **composición se evalúa y se puede equivocar**: cada rasgo tiene un objetivo por lado,
  llegar a él suma, amontonar todo en una sola cosa deja de sumar y quedarse corto resta
  (huecos, cobertura, sinergia y, en ataque, falta de apertura dura). Nada está escrito:
  la probabilidad por punto de ventaja es 0.012 y se acota a **[20 %, 85 %]**, así que una
  composición mala perjudica pero nunca regala la derrota, ni una buena regala la victoria.
  (Pruebas: draft con criterio ≈ 55 % por ronda y ≈ 68 % de partidas; al azar ≈ 44 % y ≈ 57 %;
  malo a propósito ≈ 27 % y ≈ 18 %. Ninguna queda en 0 % ni en 100 %.)
- Panel de pronóstico en vivo: probabilidad de ronda y de partida, fuerzas y ventaja,
  con barras animadas que cambian con cada decisión y cada resultado. Sinergia, cobertura
  y categorías siguen ocultas en el motor.
- 2 decisiones variadas por ronda (6 opciones por lado, rotan). Si el plan entra en lo que tu
  equipo sabe hacer, ayuda; si forzás un plan que tu composición no sostiene, perjudica
  (incluso resta). Nunca es decisiva por sí sola.

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
