import { pgTable, text, serial, integer, boolean, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Sport type for cards
export const sportEnum = z.enum([
  "basketball",
  "baseball",
  "football",
  "hockey",
  "soccer",
  "other",
]);

export type Sport = z.infer<typeof sportEnum>;

// Condition type for cards
export const conditionEnum = z.enum([
  "mint",
  "nearMint",
  "excellent",
  "veryGood",
  "good",
  "fair",
  "poor",
]);

export type Condition = z.infer<typeof conditionEnum>;

// Sports card schema
export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  team: text("team").notNull(),
  sport: text("sport").notNull(),
  year: integer("year").notNull(),
  brandSet: text("brand_set").notNull(),
  cardNumber: text("card_number"),
  condition: text("condition").notNull(),
  grade: text("grade"),
  estimatedValue: numeric("estimated_value").notNull(),
  notes: text("notes"),
  frontImageUrl: text("front_image_url"),
  backImageUrl: text("back_image_url"),
  addedDate: timestamp("added_date").defaultNow().notNull(),
  priceHistory: jsonb("price_history").$type<{ date: string; value: number }[]>(),
});

// Value history schema for tracking card values over time
export const valueHistory = pgTable("value_history", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id").notNull(),
  value: numeric("value").notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

// Insert schema for cards
export const insertCardSchema = createInsertSchema(cards).omit({
  id: true,
  addedDate: true,
});

// Insert schema for value history
export const insertValueHistorySchema = createInsertSchema(valueHistory).omit({
  id: true,
  date: true,
});

// Types
export type Card = typeof cards.$inferSelect;
export type InsertCard = z.infer<typeof insertCardSchema>;
export type ValueHistory = typeof valueHistory.$inferSelect;
export type InsertValueHistory = z.infer<typeof insertValueHistorySchema>;

// Extended schema for form validation
export const cardFormSchema = insertCardSchema.extend({
  playerName: z.string().min(1, "Player name is required"),
  team: z.string().min(1, "Team is required"),
  sport: z.string().min(1, "Sport is required"),
  year: z.number().int().min(1800, "Year must be at least 1800").max(new Date().getFullYear(), "Year cannot be in the future"),
  brandSet: z.string().min(1, "Brand/set is required"),
  estimatedValue: z.string().or(z.number()).pipe(z.coerce.number().min(0, "Value must be a positive number")),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
