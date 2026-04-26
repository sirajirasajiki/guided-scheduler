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
  allergies: text("allergies"), // JSON文字列 (AllergyInfo | null)
  createdAt: integer("created_at").notNull(),
});
