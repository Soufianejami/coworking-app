import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertTransactionSchema } from "@shared/schema";
import { format, parseISO, subMonths, startOfMonth, endOfMonth } from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  // API prefix
  const apiPrefix = "/api";
  
  // Product routes
  app.get(`${apiPrefix}/products`, async (req: Request, res: Response) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/products/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post(`${apiPrefix}/products`, async (req: Request, res: Response) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const newProduct = await storage.createProduct(productData);
      res.status(201).json(newProduct);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.patch(`${apiPrefix}/products/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const updatedProduct = await storage.updateProduct(id, req.body);
      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(updatedProduct);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Transaction routes
  app.get(`${apiPrefix}/transactions`, async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const transactions = await storage.getAllTransactions(limit, offset);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/transactions/byDate`, async (req: Request, res: Response) => {
    try {
      let startDate = req.query.startDate ? parseISO(req.query.startDate as string) : new Date();
      let endDate = req.query.endDate ? parseISO(req.query.endDate as string) : new Date();
      
      const transactions = await storage.getTransactionsByDateRange(startDate, endDate);
      res.json(transactions);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/transactions/byType/:type`, async (req: Request, res: Response) => {
    try {
      const type = req.params.type;
      if (!['entry', 'subscription', 'cafe'].includes(type)) {
        return res.status(400).json({ message: "Invalid transaction type" });
      }
      
      const transactions = await storage.getTransactionsByType(type as any);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/transactions/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid transaction ID" });
      }
      
      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.json(transaction);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post(`${apiPrefix}/transactions`, async (req: Request, res: Response) => {
    try {
      const transactionData = insertTransactionSchema.parse(req.body);
      const newTransaction = await storage.createTransaction(transactionData);
      res.status(201).json(newTransaction);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Daily stats routes
  app.get(`${apiPrefix}/stats/daily`, async (req: Request, res: Response) => {
    try {
      const date = req.query.date ? parseISO(req.query.date as string) : new Date();
      const stats = await storage.getDailyStats(date);
      
      if (!stats) {
        return res.json({
          date,
          totalRevenue: 0,
          entriesRevenue: 0,
          entriesCount: 0,
          subscriptionsRevenue: 0,
          subscriptionsCount: 0,
          cafeRevenue: 0,
          cafeOrdersCount: 0
        });
      }
      
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/stats/range`, async (req: Request, res: Response) => {
    try {
      let startDate, endDate;
      
      if (req.query.startDate && req.query.endDate) {
        startDate = parseISO(req.query.startDate as string);
        endDate = parseISO(req.query.endDate as string);
      } else {
        // Default to current month
        const today = new Date();
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
      }
      
      const stats = await storage.getDailyStatsByRange(startDate, endDate);
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
