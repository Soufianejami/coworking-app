import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, parseISO, compareAsc, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [revenueFilter, setRevenueFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const startOfCurrentMonth = startOfMonth(currentMonth);
  const endOfCurrentMonth = endOfMonth(currentMonth);
  
  // Get monthly stats
  const { data: monthlyStats } = useQuery({
    queryKey: [`/api/stats/range?startDate=${format(startOfCurrentMonth, 'yyyy-MM-dd')}&endDate=${format(endOfCurrentMonth, 'yyyy-MM-dd')}`],
  });
  
  // Get transactions for selected date
  const { data: selectedDateTransactions, refetch: refetchTransactions } = useQuery({
    queryKey: [`/api/transactions/byDate`],
    enabled: false, // Disable automatic fetching
  });
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => {
      const prevMonth = new Date(prev);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      return prevMonth;
    });
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      const nextMonth = new Date(prev);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth;
    });
  };
  
  // Handle day click
  const handleDayClick = async (date: Date, hasData: boolean) => {
    if (!hasData) return; // Only open dialog if there's data for this day
    
    setSelectedDate(date);
    setDialogOpen(true);
    
    // Fetch transactions for selected date
    await refetchTransactions({
      queryKey: [`/api/transactions/byDate?startDate=${format(date, 'yyyy-MM-dd')}&endDate=${format(date, 'yyyy-MM-dd')}`],
    });
  };
  
  // Get days for current month view
  const getCalendarDays = () => {
    const startDay = startOfCurrentMonth.getDay();
    const daysInMonth = endOfCurrentMonth.getDate();
    const days = [];
    
    // Previous month days
    const prevMonthDays = startDay === 0 ? 6 : startDay - 1; // Adjust for week starting on Monday
    for (let i = prevMonthDays; i > 0; i--) {
      const prevMonthDate = new Date(currentMonth);
      prevMonthDate.setMonth(currentMonth.getMonth() - 1);
      prevMonthDate.setDate(new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate() - i + 1);
      days.push({ date: prevMonthDate, isCurrentMonth: false, hasData: false });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      
      // Check if there's stats data for this day
      const hasData = monthlyStats?.some((stat: any) => 
        isSameDay(new Date(stat.date), date)
      );
      
      // Find stats for this day
      const dayStats = monthlyStats?.find((stat: any) => 
        isSameDay(new Date(stat.date), date)
      );
      
      days.push({
        date,
        isCurrentMonth: true,
        hasData,
        stats: dayStats
      });
    }
    
    // Next month days to fill up the remaining slots in the calendar grid
    const remainingSlots = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingSlots; i++) {
      const nextMonthDate = new Date(currentMonth);
      nextMonthDate.setMonth(currentMonth.getMonth() + 1);
      nextMonthDate.setDate(i);
      days.push({ date: nextMonthDate, isCurrentMonth: false, hasData: false });
    }
    
    return days;
  };
  
  // Get revenue color class based on amount
  const getRevenueColorClass = (amount: number) => {
    if (!amount) return "bg-gray-100 text-gray-800";
    if (amount < 300) return "bg-gray-100 text-gray-800";
    if (amount < 600) return "bg-green-100 text-green-800";
    return "bg-green-100 text-green-800";
  };
  
  // Format transaction type
  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'entry':
        return { name: "Entrée", class: "bg-green-100 text-green-800" };
      case 'subscription':
        return { name: "Abonnement", class: "bg-purple-100 text-purple-800" };
      case 'cafe':
        return { name: "Café", class: "bg-amber-100 text-amber-800" };
      default:
        return { name: type, class: "bg-gray-100 text-gray-800" };
    }
  };
  
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Calendrier des revenus</h2>
          <p className="text-sm text-gray-500">
            Visualisez les revenus par jour dans un calendrier interactif
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <CardTitle className="text-lg font-medium leading-6 text-gray-900">
            Calendrier des revenus
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousMonth}
              className="p-1.5 text-gray-400 hover:text-gray-500"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
            <span className="text-sm font-medium text-gray-900">
              {format(currentMonth, 'MMMM yyyy', { locale: fr })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextMonth}
              className="p-1.5 text-gray-400 hover:text-gray-500"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </Button>
            <div className="ml-4">
              <Select value={revenueFilter} onValueChange={setRevenueFilter}>
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue placeholder="Tous les revenus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les revenus</SelectItem>
                  <SelectItem value="entry">Entrées journalières</SelectItem>
                  <SelectItem value="subscription">Abonnements</SelectItem>
                  <SelectItem value="cafe">Café & Boissons</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 overflow-x-auto">
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden shadow">
            {/* Day headers */}
            <div className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-700">Lun</div>
            <div className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-700">Mar</div>
            <div className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-700">Mer</div>
            <div className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-700">Jeu</div>
            <div className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-700">Ven</div>
            <div className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-700">Sam</div>
            <div className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-700">Dim</div>
            
            {/* Calendar days */}
            {getCalendarDays().map((day, index) => {
              const isToday = isSameDay(day.date, new Date());
              let revenueAmount = 0;
              
              if (day.stats) {
                if (revenueFilter === 'all') {
                  revenueAmount = day.stats.totalRevenue;
                } else if (revenueFilter === 'entry') {
                  revenueAmount = day.stats.entriesRevenue;
                } else if (revenueFilter === 'subscription') {
                  revenueAmount = day.stats.subscriptionsRevenue;
                } else if (revenueFilter === 'cafe') {
                  revenueAmount = day.stats.cafeRevenue;
                }
              }
              
              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(day.date, day.hasData)}
                  className={`
                    h-24 p-2 cursor-pointer transition-colors
                    ${day.isCurrentMonth ? 'bg-white' : 'bg-white text-gray-400'}
                    ${isToday ? 'bg-blue-50 border-2 border-primary' : ''}
                    ${day.hasData ? 'hover:bg-blue-50' : ''}
                  `}
                >
                  <div className={`text-sm ${isToday ? 'text-primary font-semibold' : day.isCurrentMonth ? 'text-gray-700' : 'text-gray-400'}`}>
                    {format(day.date, 'd')}
                  </div>
                  {day.hasData && revenueAmount > 0 && (
                    <div className="mt-2">
                      <div className={`${getRevenueColorClass(revenueAmount)} text-xs font-medium px-2 py-0.5 rounded`}>
                        {revenueAmount} DH
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Day detail dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Détails des revenus - {selectedDate && format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDate && (
            <div className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500">
                      Entrées journalières
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {selectedDateTransactions?.filter((t: any) => t.type === 'entry')
                        .reduce((sum: number, t: any) => sum + t.amount, 0)} DH
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedDateTransactions?.filter((t: any) => t.type === 'entry').length || 0} entrées
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500">
                      Abonnements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {selectedDateTransactions?.filter((t: any) => t.type === 'subscription')
                        .reduce((sum: number, t: any) => sum + t.amount, 0)} DH
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedDateTransactions?.filter((t: any) => t.type === 'subscription').length || 0} abonnements
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500">
                      Café & Boissons
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {selectedDateTransactions?.filter((t: any) => t.type === 'cafe')
                        .reduce((sum: number, t: any) => sum + t.amount, 0)} DH
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedDateTransactions?.filter((t: any) => t.type === 'cafe').length || 0} commandes
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Heure</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Paiement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDateTransactions?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        Aucune transaction pour cette journée.
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedDateTransactions?.map((transaction: any) => {
                      const type = formatTransactionType(transaction.type);
                      return (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {format(new Date(transaction.date), 'HH:mm')}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${type.class}`}>
                              {type.name}
                            </span>
                          </TableCell>
                          <TableCell>
                            {transaction.clientName || "Anonyme"}
                          </TableCell>
                          <TableCell>
                            {transaction.type === 'entry' && "Entrée journalière"}
                            {transaction.type === 'subscription' && "Abonnement mensuel"}
                            {transaction.type === 'cafe' && transaction.items && 
                              transaction.items.map((item: any) => 
                                `${item.quantity}x ${item.name}`
                              ).join(", ")
                            }
                          </TableCell>
                          <TableCell>{transaction.amount} DH</TableCell>
                          <TableCell>
                            {transaction.paymentMethod === 'cash' && 'Espèces'}
                            {transaction.paymentMethod === 'card' && 'Carte bancaire'}
                            {transaction.paymentMethod === 'mobile_transfer' && 'Transfert mobile'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
