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
  "new",  // Added to match CSV data
]);

export type Condition = z.infer<typeof conditionEnum>;

// Sports card schema
export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  team: text("team"),  // Made optional to accommodate CSV data
  sport: text("sport").notNull(),
  year: integer("year").notNull(),
  brand: text("brand"), // Updated from brandSet to match CSV
  cardSet: text("card_set"), // Added cardSet to match CSV
  cardNumber: text("card_number"),
  condition: text("condition").notNull(),
  purchasePrice: numeric("purchase_price").default("0"), // Added to match CSV
  currentValue: numeric("current_value").default("0"), // Added to match CSV
  notes: text("notes"),
  frontImageUrl: text("front_image_url"),
  backImageUrl: text("back_image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  createdAt: true,
  updatedAt: true,
  priceHistory: true
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
  team: z.string().optional(),
  sport: z.string().min(1, "Sport is required"),
  year: z.number().int().min(1800, "Year must be at least 1800").max(new Date().getFullYear() + 1, "Year cannot be too far in the future"),
  brand: z.string().optional(),
  cardSet: z.string().optional(),
  purchasePrice: z.string().or(z.number()).pipe(z.coerce.number().min(0, "Purchase price must be a positive number")).optional().default(0),
  currentValue: z.string().or(z.number()).pipe(z.coerce.number().min(0, "Current value must be a positive number")).optional().default(0),
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
