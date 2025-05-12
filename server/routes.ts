import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProductSchema, insertTransactionSchema, insertExpenseSchema, 
  insertInventorySchema, insertStockMovementSchema,
  insertUserSchema, insertIngredientSchema, insertRecipeSchema,
  USER_ROLES, EXPENSE_CATEGORIES, STOCK_ACTION_TYPES
} from "@shared/schema";
import { format, parseISO, subMonths, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { setupAuth, requireAdmin, requireSuperAdmin, requireAdminOrSuperAdmin, hashPassword } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Initialize default admin user if needed
  try {
    await (storage as any).initializeDefaultAdminIfNeeded(hashPassword);
  } catch (error) {
    console.error("Error initializing default admin:", error);
  }
  
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
  
  app.post(`${apiPrefix}/products`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const newProduct = await storage.createProduct(productData);
      res.status(201).json(newProduct);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.patch(`${apiPrefix}/products/:id`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
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
  
  app.delete(`${apiPrefix}/products/:id`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const success = await storage.deleteProduct(id);
      if (!success) {
        return res.status(404).json({ message: "Product not found or could not be deleted" });
      }
      
      res.status(200).json({ message: "Product successfully deleted" });
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
      console.log("Received transaction data:", req.body);
      // Parse the transaction data with our schema
      const transactionData = insertTransactionSchema.parse(req.body);
      
      // Create the transaction
      const newTransaction = await storage.createTransaction(transactionData);
      
      // If this is a cafe transaction with items, process stock or ingredients
      if (newTransaction.type === 'cafe' && newTransaction.items && Array.isArray(newTransaction.items)) {
        const userId = (req.user as any).id;
        
        // Check each item in the transaction
        for (const item of newTransaction.items) {
          try {
            // Get the product
            const product = await storage.getProduct(item.id);
            if (!product) {
              continue;
            }

            // First, check if there's a recipe for this product (coffee, espresso, etc.)
            const recipe = await storage.getRecipeByProduct(item.id);
            
            if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
              // If there's a recipe, use it to reduce ingredient stocks
              try {
                await storage.useRecipeForTransaction(recipe.id, userId, newTransaction.id);
                console.log(`Used recipe for product ${item.id}, name: ${product.name}, quantity: ${item.quantity}`);
              } catch (recipeError: any) {
                // Log the error but don't fail the transaction
                console.error(`Failed to use recipe for product ${item.id}: ${recipeError.message}`);
              }
            } 
            // For non-recipe products, check if they're in inventory
            else if (product.category === 'beverage' || product.category === 'other') {
              // Check if there's inventory for this product
              const inventoryItem = await storage.getInventoryItemByProductId(item.id);
              
              // If inventory exists, reduce the stock
              if (inventoryItem) {
                try {
                  await storage.removeStock(
                    item.id, 
                    item.quantity, 
                    userId, 
                    `Vente - Transaction #${newTransaction.id}`,
                    newTransaction.id
                  );
                  console.log(`Updated stock for product ${item.id}, removed ${item.quantity} units`);
                } catch (stockError: any) {
                  // Just log the error but don't fail the transaction
                  console.error(`Failed to update stock for product ${item.id}: ${stockError.message}`);
                }
              }
            }
          } catch (productError: any) {
            console.error(`Error processing product ${item.id}: ${productError.message}`);
          }
        }
      }
      
      res.status(201).json(newTransaction);
    } catch (error: any) {
      console.error("Transaction creation error:", error);
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update transaction (super_admin only)
  app.patch(`${apiPrefix}/transactions/:id`, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de transaction invalide" });
      }
      
      // Get the transaction to ensure it exists
      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction non trouvée" });
      }
      
      // Update the transaction
      const updatedTransaction = await storage.updateTransaction(id, req.body);
      if (!updatedTransaction) {
        return res.status(500).json({ message: "Erreur lors de la mise à jour de la transaction" });
      }
      
      res.json(updatedTransaction);
    } catch (error: any) {
      console.error("Erreur de mise à jour de transaction:", error);
      res.status(400).json({ message: error.message });
    }
  });
  
  // Delete transaction (super_admin only)
  app.delete(`${apiPrefix}/transactions/:id`, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de transaction invalide" });
      }
      
      // Delete the transaction
      const result = await storage.deleteTransaction(id);
      if (!result) {
        return res.status(404).json({ message: "Transaction non trouvée" });
      }
      
      res.status(200).json({ message: "Transaction supprimée avec succès" });
    } catch (error: any) {
      console.error("Erreur de suppression de transaction:", error);
      res.status(500).json({ message: error.message });
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
  
  // Endpoint pour fermer une journée manuellement
  app.post(`${apiPrefix}/close-day`, async (req: Request, res: Response) => {
    try {
      // Obtenir la date actuelle du système
      const currentDate = new Date();
      const today = startOfDay(currentDate);
      
      // Récupérer toutes les transactions de la journée
      const transactions = await storage.getTransactionsByDateRange(today, endOfDay(today));
      
      // Calculer les statistiques de la journée
      const entriesTransactions = transactions.filter(t => t.type === 'entry');
      const subscriptionsTransactions = transactions.filter(t => t.type === 'subscription');
      const cafeTransactions = transactions.filter(t => t.type === 'cafe');
      
      const entriesRevenue = entriesTransactions.reduce((sum, t) => sum + t.amount, 0);
      const entriesCount = entriesTransactions.length;
      
      const subscriptionsRevenue = subscriptionsTransactions.reduce((sum, t) => sum + t.amount, 0);
      const subscriptionsCount = subscriptionsTransactions.length;
      
      const cafeRevenue = cafeTransactions.reduce((sum, t) => sum + t.amount, 0);
      const cafeOrdersCount = cafeTransactions.length;
      
      const totalRevenue = entriesRevenue + subscriptionsRevenue + cafeRevenue;
      
      // Enregistrer ou mettre à jour les statistiques pour la journée actuelle
      const stats = await storage.upsertDailyStats({
        date: today,
        totalRevenue,
        entriesRevenue,
        entriesCount,
        subscriptionsRevenue,
        subscriptionsCount,
        cafeRevenue,
        cafeOrdersCount
      });
      
      // Calculer la date du prochain jour (pour indiquer le changement de journée)
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Renvoyer les statistiques de la journée fermée
      res.json({
        message: "Journée fermée avec succès",
        date: today,
        nextDay: tomorrow,
        stats
      });
    } catch (error: any) {
      console.error("Erreur lors de la fermeture de la journée:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Endpoint pour calculer le bénéfice net total dans un intervalle
  app.get(`${apiPrefix}/stats/net-profit`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Both startDate and endDate are required" });
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      // Get all transactions in the range
      const transactions = await storage.getTransactionsByDateRange(start, end);
      
      // Calculer les revenus par type
      const entriesRevenue = transactions
        .filter(t => t.type === 'entry')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const subscriptionsRevenue = transactions
        .filter(t => t.type === 'subscription')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const cafeRevenue = transactions
        .filter(t => t.type === 'cafe')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalRevenue = entriesRevenue + subscriptionsRevenue + cafeRevenue;
      
      // Get all expenses in the range
      const expenses = await storage.getExpensesByDateRange(start, end);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      
      // Calcul des coûts des produits café vendus (Cost of Goods Sold)
      let cafeCostOfSales = 0;
      
      // Pour chaque transaction de type café
      for (const transaction of transactions.filter(t => t.type === 'cafe')) {
        // Si la transaction a des items (produits vendus)
        if (transaction.items && Array.isArray(transaction.items)) {
          for (const item of transaction.items) {
            // Récupérer les informations d'inventaire pour ce produit
            const inventoryItem = await storage.getInventoryItemByProductId(item.id);
            if (inventoryItem && inventoryItem.purchasePrice) {
              // Ajouter le coût de ce produit (prix d'achat × quantité)
              cafeCostOfSales += inventoryItem.purchasePrice * item.quantity;
            }
          }
        }
      }
      
      // Calcul du bénéfice net
      const grossProfit = totalRevenue - cafeCostOfSales;
      const netProfit = grossProfit - totalExpenses;
      
      res.json({
        startDate: start,
        endDate: end,
        revenue: {
          entries: entriesRevenue,
          subscriptions: subscriptionsRevenue,
          cafe: cafeRevenue,
          total: totalRevenue
        },
        costs: {
          cafeProducts: cafeCostOfSales,
          expenses: totalExpenses,
          total: cafeCostOfSales + totalExpenses
        },
        grossProfit,
        netProfit
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Endpoint pour calculer le bénéfice net par jour dans un intervalle
  app.get(`${apiPrefix}/stats/net-profit/daily`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Both startDate and endDate are required" });
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      // Générer la liste des jours dans l'intervalle
      const days = [];
      const currentDate = new Date(start);
      
      while (currentDate <= end) {
        const dayStart = startOfDay(new Date(currentDate));
        const dayEnd = endOfDay(new Date(currentDate));
        
        // Récupérer les transactions de ce jour
        const dayTransactions = await storage.getTransactionsByDateRange(dayStart, dayEnd);
        
        // Récupérer les dépenses de ce jour
        const dayExpenses = await storage.getExpensesByDateRange(dayStart, dayEnd);
        
        // Calculer les revenus par type
        const entriesRevenue = dayTransactions
          .filter(t => t.type === 'entry')
          .reduce((sum, t) => sum + t.amount, 0);
          
        const subscriptionsRevenue = dayTransactions
          .filter(t => t.type === 'subscription')
          .reduce((sum, t) => sum + t.amount, 0);
          
        const cafeRevenue = dayTransactions
          .filter(t => t.type === 'cafe')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const totalRevenue = entriesRevenue + subscriptionsRevenue + cafeRevenue;
        const totalExpenses = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        // Calculer le coût des produits vendus (café)
        let cafeCostOfSales = 0;
        
        // Pour chaque transaction de type café
        for (const transaction of dayTransactions.filter(t => t.type === 'cafe')) {
          // Si la transaction a des items (produits vendus)
          if (transaction.items && Array.isArray(transaction.items)) {
            for (const item of transaction.items) {
              // Récupérer les informations d'inventaire pour ce produit
              const inventoryItem = await storage.getInventoryItemByProductId(item.id);
              if (inventoryItem && inventoryItem.purchasePrice) {
                // Ajouter le coût de ce produit (prix d'achat × quantité)
                cafeCostOfSales += inventoryItem.purchasePrice * item.quantity;
              }
            }
          }
        }
        
        // Calcul du bénéfice net
        const grossProfit = totalRevenue - cafeCostOfSales;
        const netProfit = grossProfit - totalExpenses;
        
        days.push({
          date: dayStart,
          revenue: {
            entries: entriesRevenue,
            subscriptions: subscriptionsRevenue,
            cafe: cafeRevenue,
            total: totalRevenue
          },
          costs: {
            cafeProducts: cafeCostOfSales,
            expenses: totalExpenses,
            total: cafeCostOfSales + totalExpenses
          },
          grossProfit,
          netProfit
        });
        
        // Passer au jour suivant
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      res.json(days);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Endpoint pour calculer le bénéfice net mensuel dans un intervalle
  app.get(`${apiPrefix}/stats/net-profit/monthly`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Both startDate and endDate are required" });
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      // Générer la liste des mois dans l'intervalle
      const months = [];
      let currentDate = new Date(start.getFullYear(), start.getMonth(), 1);
      
      while (currentDate <= end) {
        const monthStart = startOfMonth(new Date(currentDate));
        const monthEnd = endOfMonth(new Date(currentDate));
        
        // Récupérer les transactions de ce mois
        const monthTransactions = await storage.getTransactionsByDateRange(monthStart, monthEnd);
        
        // Récupérer les dépenses de ce mois
        const monthExpenses = await storage.getExpensesByDateRange(monthStart, monthEnd);
        
        // Calculer les revenus par type
        const entriesRevenue = monthTransactions
          .filter(t => t.type === 'entry')
          .reduce((sum, t) => sum + t.amount, 0);
          
        const subscriptionsRevenue = monthTransactions
          .filter(t => t.type === 'subscription')
          .reduce((sum, t) => sum + t.amount, 0);
          
        const cafeRevenue = monthTransactions
          .filter(t => t.type === 'cafe')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const totalRevenue = entriesRevenue + subscriptionsRevenue + cafeRevenue;
        const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        // Calculer le coût des produits vendus (café)
        let cafeCostOfSales = 0;
        
        // Pour chaque transaction de type café
        for (const transaction of monthTransactions.filter(t => t.type === 'cafe')) {
          // Si la transaction a des items (produits vendus)
          if (transaction.items && Array.isArray(transaction.items)) {
            for (const item of transaction.items) {
              // Récupérer les informations d'inventaire pour ce produit
              const inventoryItem = await storage.getInventoryItemByProductId(item.id);
              if (inventoryItem && inventoryItem.purchasePrice) {
                // Ajouter le coût de ce produit (prix d'achat × quantité)
                cafeCostOfSales += inventoryItem.purchasePrice * item.quantity;
              }
            }
          }
        }
        
        // Calcul du bénéfice net
        const grossProfit = totalRevenue - cafeCostOfSales;
        const netProfit = grossProfit - totalExpenses;
        
        months.push({
          month: format(monthStart, 'yyyy-MM'),
          monthName: format(monthStart, 'MMMM yyyy', { locale: fr }),
          startDate: monthStart,
          endDate: monthEnd,
          revenue: {
            entries: entriesRevenue,
            subscriptions: subscriptionsRevenue,
            cafe: cafeRevenue,
            total: totalRevenue
          },
          costs: {
            cafeProducts: cafeCostOfSales,
            expenses: totalExpenses,
            total: cafeCostOfSales + totalExpenses
          },
          grossProfit,
          netProfit
        });
        
        // Passer au mois suivant
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      
      res.json(months);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // User management routes (admin only)
  app.get(`${apiPrefix}/users`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/users/:id`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post(`${apiPrefix}/users`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      // Validate user data
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash the password
      userData.password = await hashPassword(userData.password);
      
      // Create the user
      const newUser = await storage.createUser(userData);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = newUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.patch(`${apiPrefix}/users/:id`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Check if user exists
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // If updating password, hash it
      if (req.body.password) {
        req.body.password = await hashPassword(req.body.password);
      }
      
      // Update user
      const updatedUser = await storage.updateUser(id, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.delete(`${apiPrefix}/users/:id`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Don't allow deleting yourself
      if (id === (req.user as any).id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const result = await storage.deleteUser(id);
      if (!result) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Expense routes
  app.get(`${apiPrefix}/expenses`, async (req: Request, res: Response) => {
    try {
      const expenses = await storage.getAllExpenses();
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/expenses/byDate`, async (req: Request, res: Response) => {
    try {
      let startDate = req.query.startDate ? parseISO(req.query.startDate as string) : new Date();
      let endDate = req.query.endDate ? parseISO(req.query.endDate as string) : new Date();
      
      const expenses = await storage.getExpensesByDateRange(startDate, endDate);
      res.json(expenses);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/expenses/byCategory/:category`, async (req: Request, res: Response) => {
    try {
      const category = req.params.category;
      if (!EXPENSE_CATEGORIES.includes(category as any)) {
        return res.status(400).json({ message: "Invalid expense category" });
      }
      
      const expenses = await storage.getExpensesByCategory(category as any);
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/expenses/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid expense ID" });
      }
      
      const expense = await storage.getExpense(id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json(expense);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post(`${apiPrefix}/expenses`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      // Validate expense data
      const expenseData = insertExpenseSchema.parse(req.body);
      
      // Set created by
      expenseData.createdById = (req.user as any).id;
      
      // Create the expense
      const newExpense = await storage.createExpense(expenseData);
      res.status(201).json(newExpense);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.patch(`${apiPrefix}/expenses/:id`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid expense ID" });
      }
      
      // S'assurer que la date est correctement formatée
      if (req.body.date && typeof req.body.date === 'string') {
        try {
          // Convertir la chaîne de date en objet Date
          req.body.date = new Date(req.body.date);
        } catch (dateError) {
          return res.status(400).json({ message: "Format de date invalide" });
        }
      }
      
      const updatedExpense = await storage.updateExpense(id, req.body);
      if (!updatedExpense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json(updatedExpense);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.delete(`${apiPrefix}/expenses/:id`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid expense ID" });
      }
      
      const result = await storage.deleteExpense(id);
      if (!result) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.status(200).json({ message: "Expense deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Net revenue calculation (revenue - expenses)
  app.get(`${apiPrefix}/stats/net-revenue`, async (req: Request, res: Response) => {
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
      
      // Get daily stats for the date range
      const stats = await storage.getDailyStatsByRange(startDate, endDate);
      
      // Calculate total revenue
      const totalRevenue = stats.reduce((sum, day) => sum + day.totalRevenue, 0);
      
      // Get expenses for the date range
      const expenses = await storage.getExpensesByDateRange(startDate, endDate);
      
      // Calculate total expenses
      const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
      
      // Calculate net revenue
      const netRevenue = totalRevenue - totalExpenses;
      
      res.json({
        startDate,
        endDate,
        totalRevenue,
        totalExpenses,
        netRevenue,
        expenseBreakdown: expenses.reduce((breakdown: Record<string, number>, expense) => {
          const category = expense.category;
          breakdown[category] = (breakdown[category] || 0) + Number(expense.amount);
          return breakdown;
        }, {})
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Inventory routes (admin and super_admin only)
  app.get(`${apiPrefix}/inventory`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const inventory = await storage.getInventoryWithProducts();
      res.json(inventory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/inventory/low-stock`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const lowStockItems = await storage.getLowStockItems();
      res.json(lowStockItems);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/inventory/expiring`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const daysThreshold = req.query.days ? parseInt(req.query.days as string) : 7;
      const expiringItems = await storage.getExpiringItems(daysThreshold);
      res.json(expiringItems);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/inventory/:id`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid inventory ID" });
      }
      
      const inventoryItem = await storage.getInventoryItem(id);
      if (!inventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      res.json(inventoryItem);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post(`${apiPrefix}/inventory`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const inventoryData = insertInventorySchema.parse(req.body);
      const newInventoryItem = await storage.createInventoryItem(inventoryData);
      res.status(201).json(newInventoryItem);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.patch(`${apiPrefix}/inventory/:id`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid inventory ID" });
      }
      
      const updatedInventoryItem = await storage.updateInventoryItem(id, req.body);
      if (!updatedInventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      res.json(updatedInventoryItem);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Stock movement routes (admin and super_admin only)
  app.get(`${apiPrefix}/stock-movements`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const movements = await storage.getStockMovements(limit, offset);
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/stock-movements/product/:productId`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const movements = await storage.getStockMovementsByProduct(productId);
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post(`${apiPrefix}/stock/add`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { productId, quantity, reason } = req.body;
      
      if (isNaN(productId) || isNaN(quantity)) {
        return res.status(400).json({ message: "Invalid product ID or quantity" });
      }
      
      const userId = (req.user as any).id;
      const result = await storage.addStock(productId, quantity, userId, reason);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.post(`${apiPrefix}/stock/remove`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { productId, quantity, reason } = req.body;
      
      if (isNaN(productId) || isNaN(quantity)) {
        return res.status(400).json({ message: "Invalid product ID or quantity" });
      }
      
      const userId = (req.user as any).id;
      const result = await storage.removeStock(productId, quantity, userId, reason);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.post(`${apiPrefix}/stock/adjust`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { productId, newQuantity, reason } = req.body;
      
      if (isNaN(productId) || isNaN(newQuantity)) {
        return res.status(400).json({ message: "Invalid product ID or quantity" });
      }
      
      const userId = (req.user as any).id;
      const result = await storage.adjustStock(productId, newQuantity, userId, reason);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // ---- NOUVELLES ROUTES POUR INGRÉDIENTS ET RECETTES ----
  
  // Routes pour les ingrédients
  app.get(`${apiPrefix}/ingredients`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const ingredients = await storage.getAllIngredients();
      res.json(ingredients);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/ingredients/:id`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID d'ingrédient invalide" });
      }
      
      const ingredient = await storage.getIngredient(id);
      if (!ingredient) {
        return res.status(404).json({ message: "Ingrédient non trouvé" });
      }
      
      res.json(ingredient);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post(`${apiPrefix}/ingredients`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const ingredientData = insertIngredientSchema.parse(req.body);
      const newIngredient = await storage.createIngredient(ingredientData);
      res.status(201).json(newIngredient);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.patch(`${apiPrefix}/ingredients/:id`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID d'ingrédient invalide" });
      }
      
      const updatedIngredient = await storage.updateIngredient(id, req.body);
      if (!updatedIngredient) {
        return res.status(404).json({ message: "Ingrédient non trouvé" });
      }
      
      res.json(updatedIngredient);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.delete(`${apiPrefix}/ingredients/:id`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID d'ingrédient invalide" });
      }
      
      const result = await storage.deleteIngredient(id);
      if (!result) {
        return res.status(404).json({ message: "Ingrédient non trouvé" });
      }
      
      res.status(200).json({ message: "Ingrédient supprimé avec succès" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/ingredients/low-stock`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const threshold = req.query.threshold ? parseInt(req.query.threshold as string) : undefined;
      const ingredients = await storage.getLowStockIngredients(threshold);
      res.json(ingredients);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Routes pour la gestion du stock d'ingrédients
  app.post(`${apiPrefix}/ingredients/:id/add-stock`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID d'ingrédient invalide" });
      }
      
      const { quantity, reason } = req.body;
      if (!quantity || isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ message: "Quantité invalide" });
      }
      
      const userId = (req.user as any).id;
      const result = await storage.addIngredientStock(id, quantity, userId, reason);
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.post(`${apiPrefix}/ingredients/:id/remove-stock`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID d'ingrédient invalide" });
      }
      
      const { quantity, reason, transactionId, recipeId } = req.body;
      if (!quantity || isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ message: "Quantité invalide" });
      }
      
      const userId = (req.user as any).id;
      const result = await storage.removeIngredientStock(id, quantity, userId, reason, transactionId, recipeId);
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.post(`${apiPrefix}/ingredients/:id/adjust-stock`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID d'ingrédient invalide" });
      }
      
      const { newQuantity, reason } = req.body;
      if (newQuantity === undefined || isNaN(newQuantity) || newQuantity < 0) {
        return res.status(400).json({ message: "Nouvelle quantité invalide" });
      }
      
      const userId = (req.user as any).id;
      const result = await storage.adjustIngredientStock(id, newQuantity, userId, reason);
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/ingredient-movements`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const movements = await storage.getIngredientMovements(limit, offset);
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/ingredient-movements/:ingredientId`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const ingredientId = parseInt(req.params.ingredientId);
      if (isNaN(ingredientId)) {
        return res.status(400).json({ message: "ID d'ingrédient invalide" });
      }
      
      const movements = await storage.getIngredientMovementsByIngredient(ingredientId);
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Routes pour les recettes
  app.get(`${apiPrefix}/recipes`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const recipes = await storage.getAllRecipes();
      res.json(recipes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/recipes/:id`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de recette invalide" });
      }
      
      const recipe = await storage.getRecipe(id);
      if (!recipe) {
        return res.status(404).json({ message: "Recette non trouvée" });
      }
      
      res.json(recipe);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get(`${apiPrefix}/recipes/by-product/:productId`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "ID de produit invalide" });
      }
      
      const recipe = await storage.getRecipeByProduct(productId);
      if (!recipe) {
        return res.status(404).json({ message: "Aucune recette trouvée pour ce produit" });
      }
      
      res.json(recipe);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post(`${apiPrefix}/recipes`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { recipe, ingredients } = req.body;
      if (!recipe || !ingredients || !Array.isArray(ingredients)) {
        return res.status(400).json({ message: "Données de recette invalides" });
      }
      
      const recipeData = insertRecipeSchema.parse(recipe);
      const newRecipe = await storage.createRecipe(recipeData, ingredients);
      
      res.status(201).json(newRecipe);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.patch(`${apiPrefix}/recipes/:id`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de recette invalide" });
      }
      
      const { recipe, ingredients } = req.body;
      if (!recipe) {
        return res.status(400).json({ message: "Données de recette manquantes" });
      }
      
      const updatedRecipe = await storage.updateRecipe(id, recipe, ingredients);
      if (!updatedRecipe) {
        return res.status(404).json({ message: "Recette non trouvée" });
      }
      
      res.json(updatedRecipe);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.delete(`${apiPrefix}/recipes/:id`, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de recette invalide" });
      }
      
      const result = await storage.deleteRecipe(id);
      if (!result) {
        return res.status(404).json({ message: "Recette non trouvée" });
      }
      
      res.status(200).json({ message: "Recette supprimée avec succès" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Utilisation d'une recette lors d'une vente
  app.post(`${apiPrefix}/recipes/:id/use`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de recette invalide" });
      }
      
      const { transactionId } = req.body;
      if (!transactionId) {
        return res.status(400).json({ message: "ID de transaction requis" });
      }
      
      const userId = (req.user as any).id;
      const movements = await storage.useRecipeForTransaction(id, userId, transactionId);
      
      res.json({ success: true, movements });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
