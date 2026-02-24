-- Import/Upsert schedules + schedule_artists from stage/timing CSV.
-- Prerequisites:
-- 1) artists/sql/01_upsert_artists.sql has run
-- 2) venues exist and their slugs match artists/csv/venue_stage_candidates.csv values
--
-- Run from repo root:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--   -v festival_day_1='2026-08-29' \
--   -v festival_day_2='2026-08-30' \
--   -f artists/sql/02_upsert_schedules_and_links.sql
--
-- day label mapping in source CSV:
--   토-일 -> :festival_day_1
--   일-월 -> :festival_day_2

BEGIN;

CREATE TEMP TABLE stg_day_map (
  day_label text PRIMARY KEY,
  event_date date NOT NULL
);

INSERT INTO stg_day_map (day_label, event_date)
VALUES
  ('토-일', :'festival_day_1'::date),
  ('일-월', :'festival_day_2'::date);

CREATE TEMP TABLE stg_events (
  day_label text,
  stage_name text,
  time_raw text,
  start_time text,
  end_time text,
  artist_name_raw text,
  artist_name_en text,
  artist_name_ko text,
  artist_key text,
  artist_slug_candidate text,
  row_number integer,
  source_file text
);

\copy stg_events (day_label, stage_name, time_raw, start_time, end_time, artist_name_raw, artist_name_en, artist_name_ko, artist_key, artist_slug_candidate, row_number, source_file) FROM 'artists/csv/artists_stage_timing_2026.csv' WITH (FORMAT csv, HEADER true)

CREATE TEMP TABLE stg_stage_venue (
  stage_name text PRIMARY KEY,
  venue_slug text
);

\copy stg_stage_venue (stage_name, venue_slug) FROM 'artists/csv/venue_stage_candidates.csv' WITH (FORMAT csv, HEADER true)

-- Validation 1: stages in events must exist in stage->venue mapping.
DO $$
DECLARE
  missing_count integer;
BEGIN
  SELECT count(*) INTO missing_count
  FROM (
    SELECT DISTINCT e.stage_name
    FROM stg_events e
    WHERE trim(COALESCE(e.stage_name, '')) <> ''
    EXCEPT
    SELECT stage_name FROM stg_stage_venue
  ) x;

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Missing stage mappings in venue_stage_candidates.csv: % stage(s)', missing_count;
  END IF;
END $$;

-- Ensure mapped venues exist. If a mapped slug is missing, create it.
INSERT INTO venues (slug, name, is_published)
SELECT
  trim(sv.venue_slug) AS slug,
  trim(sv.stage_name) AS name,
  true
FROM stg_stage_venue sv
LEFT JOIN venues v
  ON v.slug = trim(sv.venue_slug)
WHERE trim(COALESCE(sv.venue_slug, '')) <> ''
  AND trim(COALESCE(sv.stage_name, '')) <> ''
  AND v.id IS NULL
ON CONFLICT (slug) DO NOTHING;

-- Keep venue display names aligned with current stage labels.
UPDATE venues v
SET
  name = trim(sv.stage_name),
  updated_at = now()
FROM stg_stage_venue sv
WHERE v.slug = trim(sv.venue_slug)
  AND trim(COALESCE(sv.stage_name, '')) <> ''
  AND v.name IS DISTINCT FROM trim(sv.stage_name);

-- Ensure any artist present in events exists in artists.
INSERT INTO artists (slug, name, is_published)
SELECT DISTINCT
  trim(e.artist_slug_candidate) AS slug,
  trim(e.artist_name_en) AS name,
  true
FROM stg_events e
WHERE trim(COALESCE(e.artist_slug_candidate, '')) <> ''
  AND trim(COALESCE(e.artist_name_en, '')) <> ''
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  updated_at = now();

-- Upsert Korean artist names from schedule rows when available.
INSERT INTO artist_translations (artist_id, locale, name)
SELECT DISTINCT
  a.id,
  'ko',
  trim(e.artist_name_ko)
FROM stg_events e
JOIN artists a
  ON a.slug = trim(e.artist_slug_candidate)
WHERE trim(COALESCE(e.artist_name_ko, '')) <> ''
ON CONFLICT (artist_id, locale) DO UPDATE
SET
  name = EXCLUDED.name,
  updated_at = now();

WITH parsed AS (
  SELECT
    e.*,
    dm.event_date,
    split_part(e.start_time, ':', 1)::int AS sh,
    split_part(e.start_time, ':', 2)::int AS sm,
    split_part(e.end_time, ':', 1)::int AS eh,
    split_part(e.end_time, ':', 2)::int AS em
  FROM stg_events e
  JOIN stg_day_map dm
    ON dm.day_label = e.day_label
  WHERE trim(COALESCE(e.start_time, '')) <> ''
    AND trim(COALESCE(e.end_time, '')) <> ''
    AND trim(COALESCE(e.artist_slug_candidate, '')) <> ''
),
normalized AS (
  SELECT
    p.*,
    (p.event_date::timestamp
      + ((p.sh % 24) || ':' || lpad(p.sm::text, 2, '0') || ':00')::time
      + ((p.sh / 24) * interval '1 day')) AS starts_at,
    (p.event_date::timestamp
      + ((p.eh % 24) || ':' || lpad(p.em::text, 2, '0') || ':00')::time
      + ((p.eh / 24) * interval '1 day')) AS ends_at_raw
  FROM parsed p
),
ready AS (
  SELECT
    n.day_label,
    n.stage_name,
    n.artist_slug_candidate,
    n.artist_name_en,
    n.starts_at,
    CASE
      WHEN n.ends_at_raw <= n.starts_at THEN n.ends_at_raw + interval '1 day'
      ELSE n.ends_at_raw
    END AS ends_at
  FROM normalized n
),
resolved AS (
  SELECT
    r.*,
    v.id AS venue_id,
    sv.venue_slug,
    a.id AS artist_id,
    lower(
      regexp_replace(
        coalesce(sv.venue_slug, 'unknown')
          || '-'
          || to_char(r.starts_at, 'YYYYMMDD-HH24MI')
          || '-'
          || coalesce(a.slug, 'artist'),
        '[^a-z0-9\-]+',
        '-',
        'g'
      )
    ) AS schedule_slug
  FROM ready r
  JOIN stg_stage_venue sv
    ON sv.stage_name = r.stage_name
  JOIN venues v
    ON v.slug = sv.venue_slug
  JOIN artists a
    ON a.slug = r.artist_slug_candidate
)
INSERT INTO schedules (slug, title, description, schedule_type, venue_id, starts_at, ends_at, is_published)
SELECT DISTINCT
  r.schedule_slug,
  r.artist_name_en AS title,
  NULL::text AS description,
  'normal'::schedule_type_enum AS schedule_type,
  r.venue_id,
  r.starts_at,
  r.ends_at,
  true
FROM resolved r
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  venue_id = EXCLUDED.venue_id,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  updated_at = now();

INSERT INTO schedule_artists (schedule_id, artist_id)
SELECT DISTINCT
  s.id,
  a.id
FROM stg_events e
JOIN artists a
  ON a.slug = e.artist_slug_candidate
JOIN stg_day_map dm
  ON dm.day_label = e.day_label
JOIN stg_stage_venue sv
  ON sv.stage_name = e.stage_name
JOIN venues v
  ON v.slug = sv.venue_slug
JOIN schedules s
  ON s.slug = lower(
    regexp_replace(
      coalesce(sv.venue_slug, 'unknown')
        || '-'
        || to_char(
          (dm.event_date::timestamp
            + ((split_part(e.start_time, ':', 1)::int % 24) || ':' || lpad(split_part(e.start_time, ':', 2), 2, '0') || ':00')::time
            + ((split_part(e.start_time, ':', 1)::int / 24) * interval '1 day')),
          'YYYYMMDD-HH24MI'
        )
        || '-'
        || coalesce(a.slug, 'artist'),
      '[^a-z0-9\-]+',
      '-',
      'g'
    )
  )
WHERE trim(COALESCE(e.start_time, '')) <> ''
  AND trim(COALESCE(e.end_time, '')) <> ''
ON CONFLICT (schedule_id, artist_id) DO NOTHING;

COMMIT;
