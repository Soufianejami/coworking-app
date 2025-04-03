import { 
  InsertProduct, InsertTransaction, InsertDailyStats,
  Product, Transaction, DailyStats,
  TransactionType, PaymentMethod
} from "@shared/schema";
import { startOfDay, endOfDay, format, parseISO, addMonths } from "date-fns";

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

export class MemStorage implements IStorage {
  private products: Map<number, Product>;
  private transactions: Map<number, Transaction>;
  private dailyStatsMap: Map<string, DailyStats>;
  
  private productId: number;
  private transactionId: number;
  private dailyStatsId: number;
  
  constructor() {
    this.products = new Map();
    this.transactions = new Map();
    this.dailyStatsMap = new Map();
    
    this.productId = 1;
    this.transactionId = 1;
    this.dailyStatsId = 1;
    
    // Initialize with sample products
    this.initializeProducts();
  }
  
  private initializeProducts() {
    const defaultProducts: InsertProduct[] = [
      { name: "Café expresso", price: 15, category: "beverage", isActive: true },
      { name: "Café américain", price: 18, category: "beverage", isActive: true },
      { name: "Thé à la menthe", price: 12, category: "beverage", isActive: true },
      { name: "Eau minérale", price: 10, category: "beverage", isActive: true },
      { name: "Jus d'orange", price: 20, category: "beverage", isActive: true }
    ];
    
    defaultProducts.forEach(product => this.createProduct(product));
  }
  
  // Products
  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }
  
  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }
  
  async createProduct(product: InsertProduct): Promise<Product> {
    const newProduct: Product = {
      ...product,
      id: this.productId++
    };
    this.products.set(newProduct.id, newProduct);
    return newProduct;
  }
  
  async updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined> {
    const existingProduct = this.products.get(id);
    if (!existingProduct) return undefined;
    
    const updatedProduct = { ...existingProduct, ...product };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }
  
  // Transactions
  async getAllTransactions(limit?: number, offset = 0): Promise<Transaction[]> {
    const allTransactions = Array.from(this.transactions.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (limit) {
      return allTransactions.slice(offset, offset + limit);
    }
    
    return allTransactions;
  }
  
  async getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    const start = startOfDay(startDate).getTime();
    const end = endOfDay(endDate).getTime();
    
    return Array.from(this.transactions.values())
      .filter(tx => {
        const txDate = new Date(tx.date).getTime();
        return txDate >= start && txDate <= end;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getTransactionsByType(type: TransactionType): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(tx => tx.type === type)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }
  
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const newTransaction: Transaction = {
      ...transaction,
      id: this.transactionId++,
      date: transaction.date || new Date()
    };
    
    // If it's a subscription, calculate end date if not provided
    if (newTransaction.type === 'subscription' && !newTransaction.subscriptionEndDate) {
      newTransaction.subscriptionEndDate = addMonths(new Date(newTransaction.date), 1);
    }
    
    this.transactions.set(newTransaction.id, newTransaction);
    
    // Update daily stats
    await this.updateStatsForTransaction(newTransaction);
    
    return newTransaction;
  }
  
  // Daily stats
  async getDailyStats(date: Date): Promise<DailyStats | undefined> {
    const dateKey = format(date, 'yyyy-MM-dd');
    return this.dailyStatsMap.get(dateKey);
  }
  
  async upsertDailyStats(stats: InsertDailyStats): Promise<DailyStats> {
    const dateKey = format(new Date(stats.date), 'yyyy-MM-dd');
    const existingStats = this.dailyStatsMap.get(dateKey);
    
    if (existingStats) {
      const updatedStats = { ...existingStats, ...stats };
      this.dailyStatsMap.set(dateKey, updatedStats);
      return updatedStats;
    }
    
    const newStats: DailyStats = {
      ...stats,
      id: this.dailyStatsId++
    };
    
    this.dailyStatsMap.set(dateKey, newStats);
    return newStats;
  }
  
  async getDailyStatsByRange(startDate: Date, endDate: Date): Promise<DailyStats[]> {
    const start = startOfDay(startDate).getTime();
    const end = endOfDay(endDate).getTime();
    
    return Array.from(this.dailyStatsMap.values())
      .filter(stats => {
        const statsDate = new Date(stats.date).getTime();
        return statsDate >= start && statsDate <= end;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  
  // Helper methods
  private async updateStatsForTransaction(transaction: Transaction): Promise<void> {
    const transactionDate = startOfDay(new Date(transaction.date));
    let stats = await this.getDailyStats(transactionDate);
    
    if (!stats) {
      stats = {
        id: this.dailyStatsId++,
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
}

export const storage = new MemStorage();
