import { relations } from "drizzle-orm";
import {
  artistCategories,
  artistCategoryLinks,
  artistGenreLinks,
  artistGenres,
  artists,
  artistTranslations,
  feedItems,
  feedItemTranslations,
  scheduleArtists,
  scheduleCategories,
  schedules,
  scheduleTranslations,
  userSchedules,
  venueArtists,
  venueHierarchy,
  venuePolygons,
  venues,
  venueTranslations,
} from "./schema";

export const venuesRelations = relations(venues, ({ many }) => ({
  schedules: many(schedules),
  translations: many(venueTranslations),
  polygons: many(venuePolygons),
  artistLinks: many(venueArtists),
  parentVenueLinks: many(venueHierarchy, { relationName: "parent_venue" }),
  childVenueLinks: many(venueHierarchy, { relationName: "child_venue" }),
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  venue: one(venues, {
    fields: [schedules.venueId],
    references: [venues.id],
  }),
  translations: many(scheduleTranslations),
  artistLinks: many(scheduleArtists),
  categoryLinks: many(scheduleCategories),
  userScheduleLinks: many(userSchedules),
}));

export const artistsRelations = relations(artists, ({ many }) => ({
  translations: many(artistTranslations),
  scheduleLinks: many(scheduleArtists),
  categoryLinks: many(artistCategoryLinks),
  genreLinks: many(artistGenreLinks),
  venueLinks: many(venueArtists),
}));

export const artistGenresRelations = relations(artistGenres, ({ one, many }) => ({
  parentGenre: one(artistGenres, {
    relationName: "genre_hierarchy",
    fields: [artistGenres.parentGenreId],
    references: [artistGenres.id],
  }),
  childGenres: many(artistGenres, {
    relationName: "genre_hierarchy",
  }),
  artistLinks: many(artistGenreLinks),
}));

export const artistGenreLinksRelations = relations(artistGenreLinks, ({ one }) => ({
  artist: one(artists, {
    fields: [artistGenreLinks.artistId],
    references: [artists.id],
  }),
  genre: one(artistGenres, {
    fields: [artistGenreLinks.genreId],
    references: [artistGenres.id],
  }),
}));

export const scheduleArtistsRelations = relations(scheduleArtists, ({ one }) => ({
  schedule: one(schedules, {
    fields: [scheduleArtists.scheduleId],
    references: [schedules.id],
  }),
  artist: one(artists, {
    fields: [scheduleArtists.artistId],
    references: [artists.id],
  }),
}));

export const artistCategoriesRelations = relations(artistCategories, ({ one, many }) => ({
  parentCategory: one(artistCategories, {
    relationName: "category_hierarchy",
    fields: [artistCategories.parentCategoryId],
    references: [artistCategories.id],
  }),
  childCategories: many(artistCategories, {
    relationName: "category_hierarchy",
  }),
  artistLinks: many(artistCategoryLinks),
  scheduleLinks: many(scheduleCategories),
}));

export const artistCategoryLinksRelations = relations(artistCategoryLinks, ({ one }) => ({
  artist: one(artists, {
    fields: [artistCategoryLinks.artistId],
    references: [artists.id],
  }),
  category: one(artistCategories, {
    fields: [artistCategoryLinks.categoryId],
    references: [artistCategories.id],
  }),
}));

export const scheduleCategoriesRelations = relations(scheduleCategories, ({ one }) => ({
  schedule: one(schedules, {
    fields: [scheduleCategories.scheduleId],
    references: [schedules.id],
  }),
  category: one(artistCategories, {
    fields: [scheduleCategories.categoryId],
    references: [artistCategories.id],
  }),
}));

export const userSchedulesRelations = relations(userSchedules, ({ one }) => ({
  schedule: one(schedules, {
    fields: [userSchedules.scheduleId],
    references: [schedules.id],
  }),
}));

export const venuePolygonsRelations = relations(venuePolygons, ({ one }) => ({
  venue: one(venues, {
    fields: [venuePolygons.venueId],
    references: [venues.id],
  }),
}));

export const venueArtistsRelations = relations(venueArtists, ({ one }) => ({
  venue: one(venues, {
    fields: [venueArtists.venueId],
    references: [venues.id],
  }),
  artist: one(artists, {
    fields: [venueArtists.artistId],
    references: [artists.id],
  }),
}));

export const venueHierarchyRelations = relations(venueHierarchy, ({ one }) => ({
  parentVenue: one(venues, {
    relationName: "parent_venue",
    fields: [venueHierarchy.parentVenueId],
    references: [venues.id],
  }),
  childVenue: one(venues, {
    relationName: "child_venue",
    fields: [venueHierarchy.childVenueId],
    references: [venues.id],
  }),
}));

export const artistTranslationsRelations = relations(artistTranslations, ({ one }) => ({
  artist: one(artists, {
    fields: [artistTranslations.artistId],
    references: [artists.id],
  }),
}));

export const venueTranslationsRelations = relations(venueTranslations, ({ one }) => ({
  venue: one(venues, {
    fields: [venueTranslations.venueId],
    references: [venues.id],
  }),
}));

export const scheduleTranslationsRelations = relations(scheduleTranslations, ({ one }) => ({
  schedule: one(schedules, {
    fields: [scheduleTranslations.scheduleId],
    references: [schedules.id],
  }),
}));

export const feedItemsRelations = relations(feedItems, ({ many }) => ({
  translations: many(feedItemTranslations),
}));

export const feedItemTranslationsRelations = relations(feedItemTranslations, ({ one }) => ({
  feedItem: one(feedItems, {
    fields: [feedItemTranslations.feedItemId],
    references: [feedItems.id],
  }),
}));
