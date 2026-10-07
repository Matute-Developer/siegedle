-- Esquema v0.4.0. Base ligera, lista para crecer sin romper nada.
-- Si vienes de una versión anterior, borra siege.db y data/db.json para regenerar.

CREATE TABLE IF NOT EXISTS operadores (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  bando TEXT NOT NULL CHECK (bando IN ('atacante','defensor')),
  rol TEXT NOT NULL,
  sexo TEXT NOT NULL,
  continente TEXT NOT NULL,
  anio INTEGER NOT NULL,
  velocidad INTEGER NOT NULL CHECK (velocidad BETWEEN 1 AND 3),
  gadget TEXT NOT NULL,
  unidad TEXT NOT NULL,
  icono TEXT,
  icono_local TEXT
);

CREATE TABLE IF NOT EXISTS intentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operador_id TEXT NOT NULL,
  fecha TEXT NOT NULL,
  FOREIGN KEY (operador_id) REFERENCES operadores(id)
);

CREATE INDEX IF NOT EXISTS idx_operadores_bando ON operadores(bando);
CREATE INDEX IF NOT EXISTS idx_intentos_fecha ON intentos(fecha);
