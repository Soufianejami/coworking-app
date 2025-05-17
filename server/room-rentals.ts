import { Request, Response } from "express";
import { storage } from "./storage";

// Stockage temporaire en mémoire pour les locations de salles
declare global {
  var roomRentals: any[];
}

// Initialiser le stockage s'il n'existe pas
if (!global.roomRentals) {
  global.roomRentals = [];
}

// Pour définir les routes API des locations de salles
export function setupRoomRentalsRoutes(app: any, apiPrefix: string) {
  // Routes pour les locations de salles
  app.get(`${apiPrefix}/room-rentals`, async (req: Request, res: Response) => {
    try {
      // Retourner les locations enregistrées (stockées en mémoire temporairement)
      const rentals = global.roomRentals || [];
      return res.status(200).json(rentals);
    } catch (error: any) {
      console.error("Error fetching room rentals:", error);
      return res.status(500).json({ message: `Error fetching room rentals: ${error.message}` });
    }
  });
  
  app.get(`${apiPrefix}/room-rentals/:id`, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // Pour l'instant, retourner 404 en attendant l'implémentation complète
      return res.status(404).json({ message: `Room rental with ID ${id} not found` });
    } catch (error: any) {
      console.error("Error fetching room rental:", error);
      return res.status(500).json({ message: `Error fetching room rental: ${error.message}` });
    }
  });
  
  app.post(`${apiPrefix}/room-rentals`, async (req: Request, res: Response) => {
    try {
      const rentalData = req.body;
      // Ajouter l'ID de l'utilisateur qui crée la location
      rentalData.createdById = (req.user as any).id;
      
      // Formatage des dates
      const rental = {
        id: global.roomRentals.length + 1,
        ...rentalData,
        date: new Date(rentalData.date).toISOString(),
        startTime: new Date(rentalData.startTime).toISOString(),
        endTime: new Date(rentalData.endTime).toISOString(),
      };
      
      // Ajouter au stockage en mémoire
      global.roomRentals.push(rental);
      
      // Mise à jour des statistiques journalières
      try {
        const date = new Date(rental.date);
        const dateFormatted = date.toISOString().split('T')[0];
        
        // Récupérer les statistiques du jour
        const dailyStats = await storage.getDailyStats(date);
        
        if (dailyStats) {
          // Ajouter le montant de la location aux revenus totaux
          const updatedStats = {
            ...dailyStats,
            totalRevenue: dailyStats.totalRevenue + rental.price,
            // On pourrait aussi ajouter un champ spécifique pour les locations si nécessaire
          };
          
          // Mettre à jour les statistiques
          await storage.upsertDailyStats(updatedStats);
          console.log(`Revenus mis à jour: ${updatedStats.totalRevenue}DH`);
        }
      } catch (statsError) {
        console.error("Erreur lors de la mise à jour des statistiques:", statsError);
        // Continuer malgré l'erreur, la location est déjà enregistrée
      }
      
      return res.status(201).json(rental);
    } catch (error: any) {
      console.error("Error creating room rental:", error);
      return res.status(500).json({ message: `Error creating room rental: ${error.message}` });
    }
  });
  
  app.patch(`${apiPrefix}/room-rentals/:id`, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const rentalData = req.body;
      
      // Pour l'instant, simuler la mise à jour et retourner les données
      const rental = {
        id: parseInt(id),
        ...rentalData,
        date: new Date(rentalData.date || new Date()).toISOString(),
        startTime: new Date(rentalData.startTime || new Date()).toISOString(),
        endTime: new Date(rentalData.endTime || new Date()).toISOString(),
      };
      
      return res.status(200).json(rental);
    } catch (error: any) {
      console.error("Error updating room rental:", error);
      return res.status(500).json({ message: `Error updating room rental: ${error.message}` });
    }
  });
  
  app.delete(`${apiPrefix}/room-rentals/:id`, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // Pour l'instant, simuler la suppression
      return res.status(200).json({ message: `Room rental with ID ${id} deleted successfully` });
    } catch (error: any) {
      console.error("Error deleting room rental:", error);
      return res.status(500).json({ message: `Error deleting room rental: ${error.message}` });
    }
  });
}