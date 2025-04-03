import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";

export default function RevenueCalendar() {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [revenueFilter, setRevenueFilter] = useState("all");
  
  const startOfCurrentMonth = startOfMonth(currentMonth);
  const endOfCurrentMonth = endOfMonth(currentMonth);

  // Get monthly stats
  const { data: monthlyStats, isLoading } = useQuery({
    queryKey: [`/api/stats/range?startDate=${format(startOfCurrentMonth, 'yyyy-MM-dd')}&endDate=${format(endOfCurrentMonth, 'yyyy-MM-dd')}`],
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

  // Get days for current month view
  const getCalendarDays = () => {
    const startDay = startOfCurrentMonth.getDay();
    const daysInMonth = endOfCurrentMonth.getDate();
    const days = [];

    // Adjust for week starting on Monday (0 = Sunday in JS)
    const prevMonthDays = startDay === 0 ? 6 : startDay - 1;
    
    // Previous month days
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

  return (
    <Card className="bg-white rounded-lg shadow lg:col-span-2">
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
              <Link
                key={index}
                href={day.hasData ? `/calendar?date=${format(day.date, 'yyyy-MM-dd')}` : "#"}
                onClick={(e) => {
                  if (!day.hasData) {
                    e.preventDefault();
                  }
                }}
              >
                <div
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
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
