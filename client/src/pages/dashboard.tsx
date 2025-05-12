import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, PlusIcon, PowerIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import SummaryCards from "@/components/dashboard/summary-cards";
import TransactionForm from "@/components/dashboard/transaction-form";
import RevenueCalendar from "@/components/dashboard/revenue-calendar";
import RecentTransactions from "@/components/dashboard/recent-transactions";
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
  
  // Get today's stats
  const { data: dailyStats, isLoading: statsLoading } = useQuery({
    queryKey: [`/api/stats/daily`, format(today, 'yyyy-MM-dd')],
  });
  
  // Get recent transactions
  const { data: recentTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/transactions?limit=5'],
  });
  
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  
  // Mutation for closing the day
  const closeDayMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/close-day', {});
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/stats/daily`] });
      queryClient.invalidateQueries({ queryKey: [`/api/stats/range`] });
      queryClient.invalidateQueries({ queryKey: [`/api/transactions`] });
      
      toast({
        title: "Journée clôturée avec succès",
        description: `Les statistiques du ${formatDate(today, 'd MMMM yyyy')} ont été enregistrées.`,
      });
      
      setShowCloseDialog(false);
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
          
          <Button 
            onClick={() => setShowTransactionForm(true)}
            className="flex items-center gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
          >
            <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="sm:inline">Nouvelle transaction</span>
          </Button>
        </div>
      </div>
      
      {/* Revenue Summary Cards */}
      <SummaryCards dailyStats={dailyStats} isLoading={statsLoading} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Transaction Form */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <TransactionForm
            open={showTransactionForm}
            onOpenChange={setShowTransactionForm}
          />
        </div>
        
        {/* Revenue Calendar */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          <RevenueCalendar />
        </div>
      </div>
      
      {/* Recent Transactions */}
      <div className="mt-4 sm:mt-6">
        <RecentTransactions 
          transactions={recentTransactions || []} 
          isLoading={transactionsLoading} 
        />
      </div>
    </div>
  );
}
