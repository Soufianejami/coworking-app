import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, PlusIcon, PowerIcon, Loader2, Home } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import SummaryCards from "@/components/dashboard/summary-cards";
import TransactionForm from "@/components/dashboard/transaction-form";
import RevenueCalendar from "@/components/dashboard/revenue-calendar";
import RecentTransactions from "@/components/dashboard/recent-transactions";
import RoomRentalForm from "@/components/dashboard/room-rental-form";
import RoomRentalsHistory from "@/components/dashboard/room-rentals-history";
import { formatDate } from "@/lib/date-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

export default function Dashboard() {
  const today = new Date();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Pour vérifier si l'utilisateur est admin ou super admin
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
  
  // État pour le jour clôturé (pour gérer l'affichage des données grisées)
  const [dayClosed, setDayClosed] = useState(false);
  
  // Get today's stats
  const { data: dailyStats, isLoading: statsLoading } = useQuery({
    queryKey: [`/api/stats/daily`, format(today, 'yyyy-MM-dd')],
  });
  
  // Get recent transactions
  const { data: recentTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/transactions?limit=5'],
  });
  
  // États pour les formulaires
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showRoomRentalForm, setShowRoomRentalForm] = useState(false);
  const [selectedRoomRental, setSelectedRoomRental] = useState<any>(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  
  // Fonction pour éditer une location existante
  const handleEditRoomRental = (rental: any) => {
    setSelectedRoomRental(rental);
    setShowRoomRentalForm(true);
  };
  
  // Mutation for closing the day
  const closeDayMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/close-day', {});
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/stats/daily`] });
      queryClient.invalidateQueries({ queryKey: [`/api/stats/range`] });
      queryClient.invalidateQueries({ queryKey: [`/api/transactions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/byType/entry`] });
      
      // Mettre à jour l'état pour indiquer que la journée est fermée
      setDayClosed(true);
      
      // Notify user of successful day closure
      toast({
        title: "Journée clôturée avec succès",
        description: `Les statistiques du ${formatDate(today, 'd MMMM yyyy')} ont été enregistrées. La journée suivante est maintenant active.`,
      });
      
      // Close the dialog
      setShowCloseDialog(false);
      
      // Après 2 secondes, recharger la page pour afficher les nouvelles données
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur lors de la clôture",
        description: error.message || "Une erreur est survenue lors de la clôture de la journée.",
        variant: "destructive",
      });
    }
  });
  
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {/* Header - Title and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Tableau de bord</h2>
          <p className="text-sm text-gray-500">
            {formatDate(today, 'EEEE, d MMMM yyyy')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          {isAdmin && (
            <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 text-xs sm:text-sm border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <PowerIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Clôturer la journée</span>
                  <span className="sm:hidden">Clôturer</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clôturer la journée ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action va enregistrer toutes les transactions et statistiques du jour.
                    Cela permettra de commencer une nouvelle journée sur une base propre.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => closeDayMutation.mutate()}
                    className="bg-red-500 hover:bg-red-600 text-white"
                    disabled={closeDayMutation.isPending}
                  >
                    {closeDayMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Confirmer la clôture
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          {!isAdmin && (
            <div className="flex items-center ml-2 text-xs text-gray-500">
              <PowerIcon className="h-4 w-4 mr-1 text-gray-400" />
              <span>Clôture réservée aux administrateurs</span>
            </div>
          )}
          
          <Button 
            onClick={() => setShowTransactionForm(true)}
            className="flex items-center gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
          >
            <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="sm:inline">Nouvelle transaction</span>
          </Button>
          
          <Button 
            onClick={() => {
              setSelectedRoomRental(null);
              setShowRoomRentalForm(true);
            }}
            variant="secondary"
            className="flex items-center gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
          >
            <Home className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="sm:inline">Nouvelle location</span>
          </Button>
        </div>
      </div>
      
      {/* Overlay de grisage si la journée est fermée */}
      {dayClosed && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
            <h3 className="text-xl font-bold mb-2">Journée clôturée avec succès</h3>
            <p className="mb-4">Les données sont en cours de réinitialisation...</p>
            <div className="animate-spin mx-auto h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </div>
      )}
      
      {/* Revenue Summary Cards */}
      <div className={dayClosed ? "opacity-50 pointer-events-none" : ""}>
        <SummaryCards dailyStats={dailyStats} isLoading={statsLoading} />
      </div>
      
      {/* Transaction Form Section */}
      <div className={dayClosed ? "opacity-50 pointer-events-none" : ""}>
        <TransactionForm
          open={showTransactionForm && !dayClosed}
          onOpenChange={setShowTransactionForm}
        />
      </div>
      
      {/* Room Rental Form */}
      <div className={dayClosed ? "opacity-50 pointer-events-none" : ""}>
        <RoomRentalForm
          open={showRoomRentalForm && !dayClosed}
          onOpenChange={setShowRoomRentalForm}
        />
      </div>
      
      {/* Locations de salles */}
      <div className={`mt-6 mb-6 ${dayClosed ? "opacity-50 pointer-events-none" : ""}`}>
        <h3 className="text-xl font-semibold mb-4">Locations de Salles</h3>
        <RoomRentalsHistory onEdit={handleEditRoomRental} />
      </div>
      
      {/* Recent Transactions */}
      <div className={`mt-4 sm:mt-6 ${dayClosed ? "opacity-50 pointer-events-none" : ""}`}>
        <RecentTransactions 
          transactions={Array.isArray(recentTransactions) ? recentTransactions : []} 
          isLoading={transactionsLoading} 
        />
      </div>
    </div>
  );
}