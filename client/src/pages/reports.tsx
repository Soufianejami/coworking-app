import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, DownloadIcon } from "lucide-react";

export default function Reports() {
  const [period, setPeriod] = useState("current_month");
  const [reportType, setReportType] = useState("all");
  
  // Calculate date range based on selected period
  const today = new Date();
  let startDate, endDate;
  
  if (period === "current_month") {
    startDate = startOfMonth(today);
    endDate = endOfMonth(today);
  } else if (period === "previous_month") {
    const prevMonth = subMonths(today, 1);
    startDate = startOfMonth(prevMonth);
    endDate = endOfMonth(prevMonth);
  } else if (period === "last_3_months") {
    startDate = startOfMonth(subMonths(today, 2));
    endDate = endOfMonth(today);
  }
  
  // Fetch data for the selected period
  const { data: statsData, isLoading } = useQuery({
    queryKey: [`/api/stats/range?startDate=${format(startDate, 'yyyy-MM-dd')}&endDate=${format(endDate, 'yyyy-MM-dd')}`],
  });
  
  // Process data for charts
  const prepareChartData = () => {
    if (!statsData) return [];
    
    return statsData.map((day: any) => ({
      date: format(new Date(day.date), 'dd/MM'),
      entrées: day.entriesRevenue,
      abonnements: day.subscriptionsRevenue,
      café: day.cafeRevenue,
      total: day.totalRevenue
    }));
  };
  
  // Calculate summary
  const calculateSummary = () => {
    if (!statsData) return {
      totalRevenue: 0,
      entriesRevenue: 0,
      entriesCount: 0,
      subscriptionsRevenue: 0,
      subscriptionsCount: 0,
      cafeRevenue: 0,
      cafeOrdersCount: 0
    };
    
    return statsData.reduce((summary: any, day: any) => {
      summary.totalRevenue += day.totalRevenue;
      summary.entriesRevenue += day.entriesRevenue;
      summary.entriesCount += day.entriesCount;
      summary.subscriptionsRevenue += day.subscriptionsRevenue;
      summary.subscriptionsCount += day.subscriptionsCount;
      summary.cafeRevenue += day.cafeRevenue;
      summary.cafeOrdersCount += day.cafeOrdersCount;
      return summary;
    }, {
      totalRevenue: 0,
      entriesRevenue: 0,
      entriesCount: 0,
      subscriptionsRevenue: 0,
      subscriptionsCount: 0,
      cafeRevenue: 0,
      cafeOrdersCount: 0
    });
  };
  
  const summary = calculateSummary();
  const chartData = prepareChartData();
  
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Rapports</h2>
          <p className="text-sm text-gray-500">
            Visualisez et exportez les rapports financiers
          </p>
        </div>
        <div className="flex space-x-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <CalendarIcon className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Mois en cours</SelectItem>
              <SelectItem value="previous_month">Mois précédent</SelectItem>
              <SelectItem value="last_3_months">3 derniers mois</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="flex items-center gap-2">
            <DownloadIcon className="h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>
      
      {/* Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">
              Revenu total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.totalRevenue} DH</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">
              Entrées journalières
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.entriesRevenue} DH</div>
            <p className="text-sm text-gray-500 mt-1">{summary.entriesCount} entrées</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">
              Abonnements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.subscriptionsRevenue} DH</div>
            <p className="text-sm text-gray-500 mt-1">{summary.subscriptionsCount} abonnements</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">
              Café & Boissons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.cafeRevenue} DH</div>
            <p className="text-sm text-gray-500 mt-1">{summary.cafeOrdersCount} commandes</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Reports Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Analyse des revenus</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="revenue" className="space-y-4">
            <TabsList>
              <TabsTrigger value="revenue">Revenus totaux</TabsTrigger>
              <TabsTrigger value="breakdown">Répartition</TabsTrigger>
              <TabsTrigger value="comparison">Comparaison</TabsTrigger>
            </TabsList>
            
            {/* Total Revenue Tab */}
            <TabsContent value="revenue">
              <div className="h-[400px] mt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    Chargement des données...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value} DH`} />
                      <Legend />
                      <Bar dataKey="total" name="Revenu total" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </TabsContent>
            
            {/* Revenue Breakdown Tab */}
            <TabsContent value="breakdown">
              <div className="h-[400px] mt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    Chargement des données...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value} DH`} />
                      <Legend />
                      <Bar dataKey="entrées" name="Entrées" fill="#10B981" />
                      <Bar dataKey="abonnements" name="Abonnements" fill="#8B5CF6" />
                      <Bar dataKey="café" name="Café & Boissons" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </TabsContent>
            
            {/* Revenue Comparison Tab */}
            <TabsContent value="comparison">
              <div className="h-[400px] mt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    Chargement des données...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[{
                        name: "Répartition des revenus",
                        entrées: summary.entriesRevenue,
                        abonnements: summary.subscriptionsRevenue,
                        café: summary.cafeRevenue
                      }]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value} DH`} />
                      <Legend />
                      <Bar dataKey="entrées" name="Entrées" fill="#10B981" />
                      <Bar dataKey="abonnements" name="Abonnements" fill="#8B5CF6" />
                      <Bar dataKey="café" name="Café & Boissons" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm font-medium text-gray-500">Entrées</div>
                  <div className="text-2xl font-bold">{Math.round(summary.entriesRevenue / summary.totalRevenue * 100)}%</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Abonnements</div>
                  <div className="text-2xl font-bold">{Math.round(summary.subscriptionsRevenue / summary.totalRevenue * 100)}%</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Café & Boissons</div>
                  <div className="text-2xl font-bold">{Math.round(summary.cafeRevenue / summary.totalRevenue * 100)}%</div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
