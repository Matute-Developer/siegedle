# Backend SIEGE DLE v0.6.0

API + base de datos ligera. **Sin dependencias** (solo Node integrado).

## Requisito
Node.js 18+ (recomendado 22+ para SQLite nativo).
- Si tienes Node 22+: usa `siege.db` (SQLite real).
- Si tienes Node 18-20: usa `data/db.json` automáticamente, misma API.

## Puesta en marcha (Windows)
1. Instala Node LTS: ejecuta `..\instalar-node.bat` o `winget install OpenJS.NodeJS.LTS`.
2. Inicia: ejecuta `..\iniciar.bat` o:
   ```
   cd backend
   node server.js --port=3000
   ```
3. Abre `http://localhost:3000`.

Sin backend, el frontal sigue abriendo con doble clic en `index.html` (usa datos locales).

## Endpoints v1
- `GET /api/salud` → estado + motor (`sqlite` o `json`).
- `GET /api/operadores` → lista completa.
- `GET /api/operadores?bando=atacante` → filtro.
- `GET /api/operadores/:id` → detalle.
- `POST /api/intentos` con `{"operador_id":"ash"}` → registra intento.
- `GET /api/intentos` → últimos 50.

## Archivos
```
server.js            -> sirve frontal (..) + /api/*
src/db.js            -> SQLite con reserva JSON, crea siege.db desde schema.sql + seed.json
src/operators.repo.js -> única puerta de datos de operadores
src/router.js         -> rutas; añade aquí el próximo recurso
data/schema.sql       -> tablas operadores + intentos
data/seed.json        -> 76 operadores (rol, gadget, icono)
```

## Cómo ampliar
- Nuevo campo de operador: añade columna en `schema.sql`, clave en `seed.json` y en
  `js/data/operators.js`. Al arrancar, el backend detecta el cambio y recarga los datos solo
  (tus intentos guardados se conservan, no hay que borrar nada).
- Retratos: campo `icono` (nombre de archivo o null). La base de imágenes se configura
  en `js/config.js` (`iconosBase`); con null se muestran iniciales automáticamente.
- Nuevo recurso (armas, mapas): crea `src/armas.repo.js` + ruta en `router.js`, misma pauta.
