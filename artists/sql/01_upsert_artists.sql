-- Import/Upsert artists and Korean translations from generated CSV files.
-- Run from repo root with psql (example):
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f artists/sql/01_upsert_artists.sql

BEGIN;

CREATE TEMP TABLE stg_artists (
  slug text,
  name text,
  is_published boolean
);

\copy stg_artists (slug, name, is_published) FROM 'artists/csv/artists_import.csv' WITH (FORMAT csv, HEADER true)

INSERT INTO artists (slug, name, is_published)
SELECT
  trim(slug) AS slug,
  trim(name) AS name,
  COALESCE(is_published, true) AS is_published
FROM stg_artists
WHERE trim(COALESCE(slug, '')) <> ''
  AND trim(COALESCE(name, '')) <> ''
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  is_published = EXCLUDED.is_published,
  updated_at = now();

CREATE TEMP TABLE stg_artist_translations (
  artist_slug text,
  locale text,
  name text
);

\copy stg_artist_translations (artist_slug, locale, name) FROM 'artists/csv/artist_translations_import.csv' WITH (FORMAT csv, HEADER true)

INSERT INTO artist_translations (artist_id, locale, name)
SELECT
  a.id,
  lower(trim(t.locale)) AS locale,
  trim(t.name) AS name
FROM stg_artist_translations t
JOIN artists a
  ON a.slug = trim(t.artist_slug)
WHERE trim(COALESCE(t.artist_slug, '')) <> ''
  AND trim(COALESCE(t.locale, '')) <> ''
  AND trim(COALESCE(t.name, '')) <> ''
ON CONFLICT (artist_id, locale) DO UPDATE
SET
  name = EXCLUDED.name,
  updated_at = now();

COMMIT;
