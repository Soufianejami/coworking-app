import { pgTable, text, serial, integer, timestamp, boolean, json, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Base user schema
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

// Products for café and beverages
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(), // Price in DH (dirhams)
  category: text("category").notNull(), // "beverage", "food", etc.
  isActive: boolean("is_active").notNull().default(true),
});

export const insertProductSchema = createInsertSchema(products).pick({
  name: true,
  price: true,
  category: true,
  isActive: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Transaction types
export const TRANSACTION_TYPES = ["entry", "subscription", "cafe"] as const;
export type TransactionType = typeof TRANSACTION_TYPES[number];

// Payment methods
export const PAYMENT_METHODS = ["cash", "card", "mobile_transfer"] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

// Transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull().defaultNow(),
  type: text("type").notNull(), // "entry", "subscription", "cafe"
  amount: integer("amount").notNull(), // Total amount in DH
  paymentMethod: text("payment_method").notNull(), // "cash", "card", "mobile_transfer"
  clientName: text("client_name"), // Optional for entries and café
  notes: text("notes"), // Optional notes
  items: json("items").$type<{id: number, quantity: number, name: string, price: number}[]>(), // For café orders
  subscriptionEndDate: timestamp("subscription_end_date"), // For subscriptions
  clientEmail: text("client_email"), // Optional for subscriptions
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true
}).extend({
  type: z.enum(TRANSACTION_TYPES),
  paymentMethod: z.enum(PAYMENT_METHODS),
  // Fix date validation to accept both Date objects and strings with proper transformation
  date: z.union([
    z.date(),
    z.string().transform((str) => {
      try {
        return new Date(str);
      } catch (error) {
        console.error("Error parsing date:", str, error);
        return new Date(); // Fallback to current date
      }
    })
  ]),
  subscriptionEndDate: z.union([
    z.date(),
    z.string().transform((str) => {
      try {
        return new Date(str);
      } catch (error) {
        console.error("Error parsing subscription end date:", str, error);
        // Return a date 30 days from now as fallback
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date;
      }
    })
  ]).optional(),
  // Make some fields optional to fix validation errors
  clientName: z.string().optional(),
  clientEmail: z.string().optional(),
  notes: z.string().optional(),
  items: z.any().optional(), // Allow any type for items JSON
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Daily stats for quick access
export const dailyStats = pgTable("daily_stats", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  totalRevenue: integer("total_revenue").notNull().default(0),
  entriesRevenue: integer("entries_revenue").notNull().default(0),
  entriesCount: integer("entries_count").notNull().default(0),
  subscriptionsRevenue: integer("subscriptions_revenue").notNull().default(0),
  subscriptionsCount: integer("subscriptions_count").notNull().default(0),
  cafeRevenue: integer("cafe_revenue").notNull().default(0),
  cafeOrdersCount: integer("cafe_orders_count").notNull().default(0),
}, (table) => {
  return {
    dateIdx: unique("daily_stats_date_idx").on(table.date),
  }
});

export const insertDailyStatsSchema = createInsertSchema(dailyStats).omit({
  id: true
});

export type InsertDailyStats = z.infer<typeof insertDailyStatsSchema>;
export type DailyStats = typeof dailyStats.$inferSelect;
