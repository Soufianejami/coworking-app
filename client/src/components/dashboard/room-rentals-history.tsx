import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Edit2, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Types pour les locations de salles
type RoomRental = {
  id: number;
  date: string;
  roomType: "grande" | "moyenne" | "petite" | "salle_reunion";
  price: number;
  clientName: string;
  clientContact: string | null;
  startTime: string;
  endTime: string;
  notes: string | null;
  paymentMethod: "cash" | "card" | "mobile_transfer";
  createdById: number;
};

interface RoomRentalsHistoryProps {
  onEdit: (rental: RoomRental) => void;
}

export default function RoomRentalsHistory({ onEdit }: RoomRentalsHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteRentalId, setDeleteRentalId] = useState<number | null>(null);

  // Requête pour récupérer les locations
  const { data: rentals, isLoading } = useQuery<RoomRental[]>({
    queryKey: ["/api/room-rentals"],
  });

  // Mutation pour supprimer une location
  const deleteRentalMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/room-rentals/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors de la suppression");
      }
      return await response.json();
    },
    onSuccess: () => {
      // Rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["/api/room-rentals"] });
      
      // Afficher un message de succès
      toast({
        title: "Location supprimée",
        description: "La location a été supprimée avec succès.",
      });
      
      // Réinitialiser l'ID
      setDeleteRentalId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Gérer la confirmation de suppression
  const handleDelete = (id: number) => {
    setDeleteRentalId(id);
  };

  // Gérer la suppression effective
  const confirmDelete = () => {
    if (deleteRentalId) {
      deleteRentalMutation.mutate(deleteRentalId);
    }
  };

  // Formatage du type de salle
  const formatRoomType = (type: string) => {
    switch (type) {
      case "grande": return "Grande Salle";
      case "moyenne": return "Salle Moyenne";
      case "petite": return "Petite Salle";
      case "salle_reunion": return "Salle de Réunion";
      default: return type;
    }
  };

  // Formatage du moyen de paiement
  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case "cash": return "Espèces";
      case "card": return "Carte";
      case "mobile_transfer": return "Transfert Mobile";
      default: return method;
    }
  };

  // Formatage de la date et de l'heure
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "d MMM yyyy à HH:mm", { locale: fr });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des Locations</CardTitle>
      </CardHeader>
      <CardContent>
        {rentals && rentals.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Salle</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead>Horaires</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rentals.map((rental) => (
                  <TableRow key={rental.id}>
                    <TableCell>
                      {format(new Date(rental.date), "d MMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {formatRoomType(rental.roomType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>{rental.clientName}</div>
                      {rental.clientContact && (
                        <div className="text-xs text-gray-500">{rental.clientContact}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {rental.price.toFixed(2)} DH
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span>Début: {format(new Date(rental.startTime), "HH:mm")}</span>
                        <br />
                        <span>Fin: {format(new Date(rental.endTime), "HH:mm")}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatPaymentMethod(rental.paymentMethod)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(rental)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog open={deleteRentalId === rental.id} onOpenChange={(open) => !open && setDeleteRentalId(null)}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(rental.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer cette location ? 
                                Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={confirmDelete}
                                className="bg-red-500 hover:bg-red-600 text-white"
                              >
                                {deleteRentalMutation.isPending && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            Aucune location de salle enregistrée
          </div>
        )}
      </CardContent>
    </Card>
  );
}