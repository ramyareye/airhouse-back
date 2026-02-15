import { relations } from "drizzle-orm";
import { artists, scheduleArtists, schedules, venues } from "./schema";

export const venuesRelations = relations(venues, ({ many }) => ({
  schedules: many(schedules),
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  venue: one(venues, {
    fields: [schedules.venueId],
    references: [venues.id],
  }),
  artistLinks: many(scheduleArtists),
}));

export const artistsRelations = relations(artists, ({ many }) => ({
  scheduleLinks: many(scheduleArtists),
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
