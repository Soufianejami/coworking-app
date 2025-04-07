import { 
  InsertProduct, InsertTransaction, InsertDailyStats,
  Product, Transaction, DailyStats,
  TransactionType, PaymentMethod,
  products, transactions, dailyStats
} from "@shared/schema";
import { startOfDay, endOfDay, format, parseISO, addMonths } from "date-fns";
import { db } from "./db";
import { eq, gte, lte, desc, and, asc } from "drizzle-orm";

export interface IStorage {
  // Products
  getAllProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined>;
  
  // Transactions
  getAllTransactions(limit?: number, offset?: number): Promise<Transaction[]>;
  getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]>;
  getTransactionsByType(type: TransactionType): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  // Daily stats
  getDailyStats(date: Date): Promise<DailyStats | undefined>;
  upsertDailyStats(stats: InsertDailyStats): Promise<DailyStats>;
  getDailyStatsByRange(startDate: Date, endDate: Date): Promise<DailyStats[]>;
}

export class DatabaseStorage implements IStorage {
  // Products
  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }
  
  async getProduct(id: number): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }
  
  async updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined> {
    const result = await db.update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }
  
  // Transactions
  async getAllTransactions(limit?: number, offset = 0): Promise<Transaction[]> {
    const query = db.select()
      .from(transactions)
      .orderBy(desc(transactions.date));
    
    if (limit) {
      query.limit(limit).offset(offset);
    }
    
    return await query;
  }
  
  async getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);
    
    return await db.select()
      .from(transactions)
      .where(and(
        gte(transactions.date, start),
        lte(transactions.date, end)
      ))
      .orderBy(desc(transactions.date));
  }
  
  async getTransactionsByType(type: TransactionType): Promise<Transaction[]> {
    return await db.select()
      .from(transactions)
      .where(eq(transactions.type, type))
      .orderBy(desc(transactions.date));
  }
  
  async getTransaction(id: number): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.id, id));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    // If it's a subscription, calculate end date if not provided
    if (transaction.type === 'subscription' && !transaction.subscriptionEndDate) {
      transaction.subscriptionEndDate = addMonths(transaction.date || new Date(), 1);
    }
    
    const result = await db.insert(transactions).values(transaction).returning();
    const newTransaction = result[0];
    
    // Update daily stats
    await this.updateStatsForTransaction(newTransaction);
    
    return newTransaction;
  }
  
  // Daily stats
  async getDailyStats(date: Date): Promise<DailyStats | undefined> {
    const dayStart = startOfDay(date);
    const result = await db.select().from(dailyStats).where(eq(dailyStats.date, dayStart));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async upsertDailyStats(stats: InsertDailyStats): Promise<DailyStats> {
    const dayStart = startOfDay(stats.date);
    
    // Try to find existing stats
    const existingStats = await this.getDailyStats(dayStart);
    
    if (existingStats) {
      // Update existing stats
      const result = await db.update(dailyStats)
        .set({
          totalRevenue: stats.totalRevenue !== undefined ? stats.totalRevenue : existingStats.totalRevenue,
          entriesRevenue: stats.entriesRevenue !== undefined ? stats.entriesRevenue : existingStats.entriesRevenue,
          entriesCount: stats.entriesCount !== undefined ? stats.entriesCount : existingStats.entriesCount,
          subscriptionsRevenue: stats.subscriptionsRevenue !== undefined ? stats.subscriptionsRevenue : existingStats.subscriptionsRevenue,
          subscriptionsCount: stats.subscriptionsCount !== undefined ? stats.subscriptionsCount : existingStats.subscriptionsCount,
          cafeRevenue: stats.cafeRevenue !== undefined ? stats.cafeRevenue : existingStats.cafeRevenue,
          cafeOrdersCount: stats.cafeOrdersCount !== undefined ? stats.cafeOrdersCount : existingStats.cafeOrdersCount
        })
        .where(eq(dailyStats.id, existingStats.id))
        .returning();
      
      return result[0];
    } else {
      // Create new stats
      const statsWithDefaults = {
        date: dayStart,
        totalRevenue: stats.totalRevenue || 0,
        entriesRevenue: stats.entriesRevenue || 0,
        entriesCount: stats.entriesCount || 0,
        subscriptionsRevenue: stats.subscriptionsRevenue || 0,
        subscriptionsCount: stats.subscriptionsCount || 0,
        cafeRevenue: stats.cafeRevenue || 0,
        cafeOrdersCount: stats.cafeOrdersCount || 0
      };
      
      const result = await db.insert(dailyStats).values(statsWithDefaults).returning();
      return result[0];
    }
  }
  
  async getDailyStatsByRange(startDate: Date, endDate: Date): Promise<DailyStats[]> {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);
    
    return await db.select()
      .from(dailyStats)
      .where(and(
        gte(dailyStats.date, start),
        lte(dailyStats.date, end)
      ))
      .orderBy(asc(dailyStats.date));
  }
  
  // Helper methods
  private async updateStatsForTransaction(transaction: Transaction): Promise<void> {
    const transactionDate = startOfDay(new Date(transaction.date));
    let stats = await this.getDailyStats(transactionDate);
    
    if (!stats) {
      stats = {
        id: 0, // Will be auto-generated by DB
        date: transactionDate,
        totalRevenue: 0,
        entriesRevenue: 0,
        entriesCount: 0,
        subscriptionsRevenue: 0,
        subscriptionsCount: 0,
        cafeRevenue: 0,
        cafeOrdersCount: 0
      };
    }
    
    // Update stats based on transaction type
    stats.totalRevenue += transaction.amount;
    
    switch (transaction.type) {
      case 'entry':
        stats.entriesRevenue += transaction.amount;
        stats.entriesCount += 1;
        break;
      case 'subscription':
        stats.subscriptionsRevenue += transaction.amount;
        stats.subscriptionsCount += 1;
        break;
      case 'cafe':
        stats.cafeRevenue += transaction.amount;
        stats.cafeOrdersCount += 1;
        break;
    }
    
    await this.upsertDailyStats(stats);
  }
  
  // Initialize products if none exist
  async initializeDefaultProductsIfNeeded(): Promise<void> {
    const existingProducts = await this.getAllProducts();
    
    if (existingProducts.length === 0) {
      const defaultProducts: InsertProduct[] = [
        { name: "Café expresso", price: 15, category: "beverage", isActive: true },
        { name: "Café américain", price: 18, category: "beverage", isActive: true },
        { name: "Thé à la menthe", price: 12, category: "beverage", isActive: true },
        { name: "Eau minérale", price: 10, category: "beverage", isActive: true },
        { name: "Jus d'orange", price: 20, category: "beverage", isActive: true }
      ];
      
      for (const product of defaultProducts) {
        await this.createProduct(product);
      }
    }
  }
}

// Create and initialize the database storage
export const storage = new DatabaseStorage();

// Initialize default products (this will run when the server starts)
(async () => {
  try {
    await (storage as DatabaseStorage).initializeDefaultProductsIfNeeded();
    console.log("Storage initialization complete");
  } catch (error) {
    console.error("Error initializing storage:", error);
  }
})();
