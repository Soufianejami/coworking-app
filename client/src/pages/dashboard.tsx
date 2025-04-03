import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import SummaryCards from "@/components/dashboard/summary-cards";
import TransactionForm from "@/components/dashboard/transaction-form";
import RevenueCalendar from "@/components/dashboard/revenue-calendar";
import RecentTransactions from "@/components/dashboard/recent-transactions";
import { formatDate } from "@/lib/date-utils";

export default function Dashboard() {
  const today = new Date();
  
  // Get today's stats
  const { data: dailyStats, isLoading: statsLoading } = useQuery({
    queryKey: [`/api/stats/daily?date=${format(today, 'yyyy-MM-dd')}`],
  });
  
  // Get recent transactions
  const { data: recentTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/transactions?limit=5'],
  });
  
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {/* Header - Title and Actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Tableau de bord</h2>
          <p className="text-sm text-gray-500">
            {formatDate(today, 'EEEE, d MMMM yyyy')}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-gray-500" />
            Aujourd'hui
          </Button>
          <Button 
            onClick={() => setShowTransactionForm(true)}
            className="flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Nouvelle transaction
          </Button>
        </div>
      </div>
      
      {/* Revenue Summary Cards */}
      <SummaryCards dailyStats={dailyStats} isLoading={statsLoading} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Form */}
        <div className="lg:col-span-1">
          <TransactionForm
            open={showTransactionForm}
            onOpenChange={setShowTransactionForm}
          />
        </div>
        
        {/* Revenue Calendar */}
        <div className="lg:col-span-2">
          <RevenueCalendar />
        </div>
      </div>
      
      {/* Recent Transactions */}
      <div className="mt-6">
        <RecentTransactions 
          transactions={recentTransactions || []} 
          isLoading={transactionsLoading} 
        />
      </div>
    </div>
  );
}
