# SIEGE DLE — v0.15.0 (adivinanza + modo Partida + backend + BD ligera)

Juego táctico de deducción inspirado en Rainbow Six Siege. Interfaz 100 % en español.
Proyecto de fans dedicado al clan TKOA. Sin afiliación con Ubisoft.

## Dos modos de uso
1. **Sin instalar nada:** doble clic en `index.html`. Usa `js/data/operators.js` (reserva local, 76 operadores).
2. **Con backend (recomendado):** `http://localhost:3000`. Usa SQLite (`backend/siege.db`)
   o JSON (`backend/data/db.json`) según tu Node. El frontal muestra la fuente en
   `index.html` (`#origen-datos`).

## Juego
- Objetivo secreto aleatorio en cada ronda (`js/logic/game-state.js`).
- Análisis ilimitados, el último siempre arriba. Cada celda se pinta de **verde si coincide** y **rojo si no coincide**.
- La columna Año indica con **▲** (objetivo posterior) o **▼** (objetivo anterior).
- Columna Icono con el retrato del operador (`js/components/retrato.js`; sin imagen muestra iniciales).
- Columnas Rol y Gadget con la lista completa por operador (base de la página de referencia),
  con velocidades, continentes, años y sexos corregidos al juego actual.
- Al adivinar salta el cartel de victoria con el nombre del operador y botón de otra ronda.
- Dedicatoria visible al clan TKOA + mensaje en cabecera y pie.

## Modo Partida (TÚ vs RIVAL, primero en 4)
- Mapa + sitio aleatorios por partida (sin repetir el anterior), visibles siempre.
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
css/                        -> variables, base, layout, components, animations, responsive
js/
  config.js                 -> ajustes globales
  data/textos.js            -> textos en español
  data/operators.js         -> RESERVA local (el backend es la fuente principal)
  data/mapas.js             -> mapas, sitios y bonus (fácil agregar más)
  services/api.js           -> único que habla con /api/*, con reserva automática
  logic/game-state.js       -> estado de la adivinanza
  logic/rasgos.js           -> 12 rasgos + familias, afinidades y mínimos por lado (ocultos)
  logic/partida.js          -> motor Partida: bans, draft, IA, simulación
  components/               -> navigation, search, board, modal, toast, retrato, partida-ui
  app.js                    -> arranque: api.cargarOperadores() y luego pinta
backend/
  server.js                 -> sirve ../ frontal + /api/*, sin dependencias
  src/db.js                 -> SQLite (node:sqlite) con reserva JSON, misma interfaz
  src/operators.repo.js      -> puerta de datos; no tocar rutas si cambias de BD
  src/router.js              -> API v1; añade aquí el próximo recurso
  data/schema.sql            -> tablas operadores + intentos
  data/seed.json             -> 76 operadores (misma forma que el frontal)
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
