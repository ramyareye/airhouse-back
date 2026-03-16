CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  CREATE TYPE "schedule_type_enum" AS ENUM ('normal', 'operating_hours', 'special');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "email_verified" boolean NOT NULL DEFAULT false,
  "phone_number" text UNIQUE,
  "phone_number_verified" boolean NOT NULL DEFAULT false,
  "image" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY,
  "expires_at" timestamp NOT NULL,
  "token" text NOT NULL UNIQUE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" text,
  "password" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "rate_limit" (
  "id" text PRIMARY KEY,
  "key" text NOT NULL UNIQUE,
  "count" integer NOT NULL,
  "last_request" bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS "artists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "bio" text,
  "image_url" text,
  "web_url" text,
  "facebook_url" text,
  "instagram_url" text,
  "twitter_url" text,
  "youtube_url" text,
  "soundcloud_url" text,
  "spotify_url" text,
  "is_published" boolean NOT NULL DEFAULT true,
  "raw_content" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "artist_genres" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "parent_genre_id" uuid REFERENCES "artist_genres"("id") ON DELETE set null,
  "position" integer,
  "is_published" boolean NOT NULL DEFAULT true,
  "raw_content" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "artist_genre_links" (
  "artist_id" uuid NOT NULL REFERENCES "artists"("id") ON DELETE cascade,
  "genre_id" uuid NOT NULL REFERENCES "artist_genres"("id") ON DELETE cascade,
  PRIMARY KEY ("artist_id", "genre_id")
);

CREATE TABLE IF NOT EXISTS "venues" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text,
  "latitude" text,
  "longitude" text,
  "image_url" text,
  "logo_url" text,
  "is_published" boolean NOT NULL DEFAULT true,
  "raw_content" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "artist_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "parent_category_id" uuid REFERENCES "artist_categories"("id") ON DELETE set null,
  "position" integer,
  "is_published" boolean NOT NULL DEFAULT true,
  "raw_content" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "artist_category_links" (
  "artist_id" uuid NOT NULL REFERENCES "artists"("id") ON DELETE cascade,
  "category_id" uuid NOT NULL REFERENCES "artist_categories"("id") ON DELETE cascade,
  PRIMARY KEY ("artist_id", "category_id")
);

CREATE TABLE IF NOT EXISTS "schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "description" text,
  "schedule_type" "schedule_type_enum" NOT NULL DEFAULT 'normal',
  "venue_id" uuid NOT NULL REFERENCES "venues"("id") ON DELETE cascade,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz,
  "is_published" boolean NOT NULL DEFAULT true,
  "raw_content" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "schedule_artists" (
  "schedule_id" uuid NOT NULL REFERENCES "schedules"("id") ON DELETE cascade,
  "artist_id" uuid NOT NULL REFERENCES "artists"("id") ON DELETE cascade,
  PRIMARY KEY ("schedule_id", "artist_id")
);

CREATE TABLE IF NOT EXISTS "schedule_categories" (
  "schedule_id" uuid NOT NULL REFERENCES "schedules"("id") ON DELETE cascade,
  "category_id" uuid NOT NULL REFERENCES "artist_categories"("id") ON DELETE cascade,
  PRIMARY KEY ("schedule_id", "category_id")
);

CREATE TABLE IF NOT EXISTS "venue_polygons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "venue_id" uuid NOT NULL REFERENCES "venues"("id") ON DELETE cascade,
  "point_order" integer NOT NULL,
  "latitude" double precision NOT NULL,
  "longitude" double precision NOT NULL
);

CREATE TABLE IF NOT EXISTS "venue_artists" (
  "venue_id" uuid NOT NULL REFERENCES "venues"("id") ON DELETE cascade,
  "artist_id" uuid NOT NULL REFERENCES "artists"("id") ON DELETE cascade,
  "relation_type" text NOT NULL DEFAULT 'programming',
  PRIMARY KEY ("venue_id", "artist_id", "relation_type")
);

CREATE TABLE IF NOT EXISTS "venue_hierarchy" (
  "parent_venue_id" uuid NOT NULL REFERENCES "venues"("id") ON DELETE cascade,
  "child_venue_id" uuid NOT NULL REFERENCES "venues"("id") ON DELETE cascade,
  PRIMARY KEY ("parent_venue_id", "child_venue_id")
);

CREATE TABLE IF NOT EXISTS "feed_items" (
  "id" bigint PRIMARY KEY,
  "published_at" timestamptz NOT NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "body" text,
  "link" text,
  "link_label" text,
  "image_url" text,
  "video_url" text,
  "visibility" text,
  "is_sticky" boolean NOT NULL DEFAULT false,
  "raw_content" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "artist_translations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "artist_id" uuid NOT NULL REFERENCES "artists"("id") ON DELETE cascade,
  "locale" text NOT NULL,
  "name" text,
  "bio" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "venue_translations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "venue_id" uuid NOT NULL REFERENCES "venues"("id") ON DELETE cascade,
  "locale" text NOT NULL,
  "name" text,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "schedule_translations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "schedule_id" uuid NOT NULL REFERENCES "schedules"("id") ON DELETE cascade,
  "locale" text NOT NULL,
  "title" text,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "feed_item_translations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "feed_item_id" bigint NOT NULL REFERENCES "feed_items"("id") ON DELETE cascade,
  "locale" text NOT NULL,
  "title" text,
  "body" text,
  "link_label" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "artists_name_idx" ON "artists" ("name");
CREATE INDEX IF NOT EXISTS "artists_published_idx" ON "artists" ("is_published");

CREATE INDEX IF NOT EXISTS "artist_genres_parent_idx" ON "artist_genres" ("parent_genre_id");
CREATE INDEX IF NOT EXISTS "artist_genres_name_idx" ON "artist_genres" ("name");
CREATE INDEX IF NOT EXISTS "artist_genre_links_genre_idx" ON "artist_genre_links" ("genre_id");

CREATE INDEX IF NOT EXISTS "venues_name_idx" ON "venues" ("name");
CREATE INDEX IF NOT EXISTS "venues_published_idx" ON "venues" ("is_published");

CREATE INDEX IF NOT EXISTS "artist_categories_parent_idx" ON "artist_categories" ("parent_category_id");
CREATE INDEX IF NOT EXISTS "artist_categories_position_idx" ON "artist_categories" ("position");
CREATE INDEX IF NOT EXISTS "artist_category_links_category_idx" ON "artist_category_links" ("category_id");

CREATE INDEX IF NOT EXISTS "schedules_starts_at_idx" ON "schedules" ("starts_at");
CREATE INDEX IF NOT EXISTS "schedules_venue_id_idx" ON "schedules" ("venue_id");
CREATE INDEX IF NOT EXISTS "schedules_published_idx" ON "schedules" ("is_published");
CREATE INDEX IF NOT EXISTS "schedules_type_idx" ON "schedules" ("schedule_type");
CREATE INDEX IF NOT EXISTS "schedule_artists_artist_id_idx" ON "schedule_artists" ("artist_id");
CREATE INDEX IF NOT EXISTS "schedule_categories_category_id_idx" ON "schedule_categories" ("category_id");

CREATE INDEX IF NOT EXISTS "venue_polygons_venue_id_idx" ON "venue_polygons" ("venue_id");
CREATE INDEX IF NOT EXISTS "venue_artists_artist_id_idx" ON "venue_artists" ("artist_id");
CREATE INDEX IF NOT EXISTS "venue_hierarchy_child_id_idx" ON "venue_hierarchy" ("child_venue_id");

CREATE INDEX IF NOT EXISTS "feed_items_published_at_idx" ON "feed_items" ("published_at");
CREATE INDEX IF NOT EXISTS "feed_items_visibility_idx" ON "feed_items" ("visibility");

CREATE INDEX IF NOT EXISTS "artist_translations_artist_id_idx" ON "artist_translations" ("artist_id");
CREATE INDEX IF NOT EXISTS "artist_translations_locale_idx" ON "artist_translations" ("locale");
CREATE UNIQUE INDEX IF NOT EXISTS "artist_translations_artist_locale_uidx" ON "artist_translations" ("artist_id", "locale");

CREATE INDEX IF NOT EXISTS "venue_translations_venue_id_idx" ON "venue_translations" ("venue_id");
CREATE INDEX IF NOT EXISTS "venue_translations_locale_idx" ON "venue_translations" ("locale");
CREATE UNIQUE INDEX IF NOT EXISTS "venue_translations_venue_locale_uidx" ON "venue_translations" ("venue_id", "locale");

CREATE INDEX IF NOT EXISTS "schedule_translations_schedule_id_idx" ON "schedule_translations" ("schedule_id");
CREATE INDEX IF NOT EXISTS "schedule_translations_locale_idx" ON "schedule_translations" ("locale");
CREATE UNIQUE INDEX IF NOT EXISTS "schedule_translations_schedule_locale_uidx" ON "schedule_translations" ("schedule_id", "locale");

CREATE INDEX IF NOT EXISTS "feed_item_translations_feed_item_id_idx" ON "feed_item_translations" ("feed_item_id");
CREATE INDEX IF NOT EXISTS "feed_item_translations_locale_idx" ON "feed_item_translations" ("locale");
CREATE UNIQUE INDEX IF NOT EXISTS "feed_item_translations_feed_item_locale_uidx" ON "feed_item_translations" ("feed_item_id", "locale");
