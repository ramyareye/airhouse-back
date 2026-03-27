import {
  type AnyPgColumn,
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user as authUser } from "../../auth-schema";

export const scheduleTypeEnum = pgEnum("schedule_type_enum", [
  "normal",
  "operating_hours",
  "special",
]);

export const artists = pgTable(
  "artists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    bio: text("bio"),
    imageUrl: text("image_url"),
    webUrl: text("web_url"),
    facebookUrl: text("facebook_url"),
    instagramUrl: text("instagram_url"),
    twitterUrl: text("twitter_url"),
    youtubeUrl: text("youtube_url"),
    soundcloudUrl: text("soundcloud_url"),
    spotifyUrl: text("spotify_url"),
    isPublished: boolean("is_published").notNull().default(true),
    rawContent: jsonb("raw_content"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("artists_name_idx").on(table.name),
    index("artists_published_idx").on(table.isPublished),
  ],
);

export const artistGenres = pgTable(
  "artist_genres",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    parentGenreId: uuid("parent_genre_id").references((): AnyPgColumn => artistGenres.id, {
      onDelete: "set null",
    }),
    position: integer("position"),
    isPublished: boolean("is_published").notNull().default(true),
    rawContent: jsonb("raw_content"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("artist_genres_parent_idx").on(table.parentGenreId),
    index("artist_genres_name_idx").on(table.name),
  ],
);

export const artistGenreLinks = pgTable(
  "artist_genre_links",
  {
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => artistGenres.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      columns: [table.artistId, table.genreId],
      name: "artist_genre_links_pk",
    }),
    index("artist_genre_links_genre_idx").on(table.genreId),
  ],
);

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    latitude: text("latitude"),
    longitude: text("longitude"),
    imageUrl: text("image_url"),
    logoUrl: text("logo_url"),
    isPublished: boolean("is_published").notNull().default(true),
    rawContent: jsonb("raw_content"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("venues_name_idx").on(table.name),
    index("venues_published_idx").on(table.isPublished),
  ],
);

export const artistCategories = pgTable(
  "artist_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    parentCategoryId: uuid("parent_category_id").references(
      (): AnyPgColumn => artistCategories.id,
      { onDelete: "set null" },
    ),
    // Lower value comes first when sorting categories.
    position: integer("position"),
    isPublished: boolean("is_published").notNull().default(true),
    rawContent: jsonb("raw_content"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("artist_categories_parent_idx").on(table.parentCategoryId),
    index("artist_categories_position_idx").on(table.position),
  ],
);

export const artistCategoryLinks = pgTable(
  "artist_category_links",
  {
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => artistCategories.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      columns: [table.artistId, table.categoryId],
      name: "artist_category_links_pk",
    }),
    index("artist_category_links_category_idx").on(table.categoryId),
  ],
);

export const schedules = pgTable(
  "schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    scheduleType: scheduleTypeEnum("schedule_type").notNull().default("normal"),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "string" }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "string" }),
    isPublished: boolean("is_published").notNull().default(true),
    rawContent: jsonb("raw_content"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("schedules_starts_at_idx").on(table.startsAt),
    index("schedules_venue_id_idx").on(table.venueId),
    index("schedules_published_idx").on(table.isPublished),
    index("schedules_type_idx").on(table.scheduleType),
  ],
);

export const scheduleArtists = pgTable(
  "schedule_artists",
  {
    scheduleId: uuid("schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      columns: [table.scheduleId, table.artistId],
      name: "schedule_artists_pk",
    }),
    index("schedule_artists_artist_id_idx").on(table.artistId),
  ],
);

export const scheduleCategories = pgTable(
  "schedule_categories",
  {
    scheduleId: uuid("schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => artistCategories.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      columns: [table.scheduleId, table.categoryId],
      name: "schedule_categories_pk",
    }),
    index("schedule_categories_category_id_idx").on(table.categoryId),
  ],
);

export const userSchedules = pgTable(
  "user_schedules",
  {
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    scheduleId: uuid("schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.scheduleId],
      name: "user_schedules_pk",
    }),
    index("user_schedules_user_id_idx").on(table.userId),
    index("user_schedules_schedule_id_idx").on(table.scheduleId),
  ],
);

export const venuePolygons = pgTable(
  "venue_polygons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    pointOrder: integer("point_order").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
  },
  (table) => [index("venue_polygons_venue_id_idx").on(table.venueId)],
);

export const venueArtists = pgTable(
  "venue_artists",
  {
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull().default("programming"),
  },
  (table) => [
    primaryKey({
      columns: [table.venueId, table.artistId, table.relationType],
      name: "venue_artists_pk",
    }),
    index("venue_artists_artist_id_idx").on(table.artistId),
  ],
);

export const venueHierarchy = pgTable(
  "venue_hierarchy",
  {
    parentVenueId: uuid("parent_venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    childVenueId: uuid("child_venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      columns: [table.parentVenueId, table.childVenueId],
      name: "venue_hierarchy_pk",
    }),
    index("venue_hierarchy_child_id_idx").on(table.childVenueId),
  ],
);

export const feedItems = pgTable(
  "feed_items",
  {
    id: bigint("id", { mode: "number" }).primaryKey(),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    linkLabel: text("link_label"),
    imageUrl: text("image_url"),
    videoUrl: text("video_url"),
    visibility: text("visibility"),
    isSticky: boolean("is_sticky").notNull().default(false),
    rawContent: jsonb("raw_content"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("feed_items_published_at_idx").on(table.publishedAt),
    index("feed_items_visibility_idx").on(table.visibility),
  ],
);

export const artistTranslations = pgTable(
  "artist_translations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name"),
    bio: text("bio"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("artist_translations_artist_id_idx").on(table.artistId),
    index("artist_translations_locale_idx").on(table.locale),
    uniqueIndex("artist_translations_artist_locale_uidx").on(table.artistId, table.locale),
  ],
);

export const venueTranslations = pgTable(
  "venue_translations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("venue_translations_venue_id_idx").on(table.venueId),
    index("venue_translations_locale_idx").on(table.locale),
    uniqueIndex("venue_translations_venue_locale_uidx").on(table.venueId, table.locale),
  ],
);

export const scheduleTranslations = pgTable(
  "schedule_translations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scheduleId: uuid("schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("schedule_translations_schedule_id_idx").on(table.scheduleId),
    index("schedule_translations_locale_idx").on(table.locale),
    uniqueIndex("schedule_translations_schedule_locale_uidx").on(table.scheduleId, table.locale),
  ],
);

export const feedItemTranslations = pgTable(
  "feed_item_translations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    feedItemId: bigint("feed_item_id", { mode: "number" })
      .notNull()
      .references(() => feedItems.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title"),
    body: text("body"),
    linkLabel: text("link_label"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("feed_item_translations_feed_item_id_idx").on(table.feedItemId),
    index("feed_item_translations_locale_idx").on(table.locale),
    uniqueIndex("feed_item_translations_feed_item_locale_uidx").on(table.feedItemId, table.locale),
  ],
);
