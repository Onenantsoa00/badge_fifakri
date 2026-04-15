-- Base fifakri — schéma initial
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS eglises (
  id          SERIAL PRIMARY KEY,
  nom         TEXT NOT NULL,
  code        VARCHAR(8) NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matricule_styles (
  id          SERIAL PRIMARY KEY,
  nom         TEXT NOT NULL,
  -- Segments possibles : MMYY | EGLISE_CODE | TOKIM_DDMMYY | COUNTER_3
  segments    JSONB NOT NULL DEFAULT '["MMYY","EGLISE_CODE","TOKIM_DDMMYY","COUNTER_3"]'::jsonb,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS badge_templates (
  id          SERIAL PRIMARY KEY,
  filename    TEXT NOT NULL,
  path        TEXT NOT NULL,
  mime        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  layout      JSONB NOT NULL DEFAULT '{}'::jsonb,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS membres (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom                TEXT NOT NULL,
  prenoms            TEXT NOT NULL,
  eglizy             TEXT NOT NULL,
  distrika           TEXT,
  tokim_panompoana   DATE,
  matricule          TEXT NOT NULL UNIQUE,
  photo_lien         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membres_eglizy ON membres (eglizy);
CREATE INDEX IF NOT EXISTS idx_membres_matricule_prefix ON membres (matricule text_pattern_ops);

INSERT INTO matricule_styles (nom, segments, is_default)
SELECT
  'Fi.Fa.Kri standard',
  '["MMYY","EGLISE_CODE","TOKIM_DDMMYY","COUNTER_3"]'::jsonb,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM matricule_styles WHERE is_default = TRUE);

-- Démo : codes église (à adapter)
INSERT INTO eglises (nom, code) VALUES
  ('Ambohimanarina', 'AMRY'),
  ('Antananarivo Centre', 'ANTC')
ON CONFLICT (code) DO NOTHING;
