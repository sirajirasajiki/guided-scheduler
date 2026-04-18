import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  adminToken: text("admin_token").notNull().unique(),
  shareToken: text("share_token").notNull().unique(),
  candidateDates: text("candidate_dates").notNull(), // JSON文字列
  confirmedDate: text("confirmed_date"),
  createdAt: integer("created_at").notNull(),
});

export const participants = sqliteTable("participants", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  name: text("name").notNull(),
  responses: text("responses").notNull(), // JSON文字列
  createdAt: integer("created_at").notNull(),
});

export const restaurants = sqliteTable("restaurants", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  name: text("name").notNull(),
  url: text("url"),
  memo: text("memo"),
  createdAt: integer("created_at").notNull(),
});

export const restaurantVotes = sqliteTable("restaurant_votes", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  participantName: text("participant_name").notNull(),
  createdAt: integer("created_at").notNull(),
});
