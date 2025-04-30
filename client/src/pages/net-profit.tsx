import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  startOfMonth, 
  endOfMonth, 
  format, 
  subMonths, 
  parseISO 
} from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
  BarChart3Icon,
  InfoIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

// Définition des types pour les données de l'API
type RevenueData = {
  entries: number;
  subscriptions: number;
  cafe: number;
  total: number;
};

type CostsData = {
  cafeProducts: number;
  expenses: number;
  total: number;
};

type NetProfitData = {
  startDate: string;
  endDate: string;
  revenue: RevenueData;
  costs: CostsData;
  grossProfit: number;
  netProfit: number;
};

type DailyProfitData = {
  date: string;
  revenue: RevenueData;
  costs: CostsData;
  grossProfit: number;
  netProfit: number;
};

type MonthlyProfitData = {
  month: string;
  monthName: string;
  startDate: string;
  endDate: string;
  revenue: RevenueData;
  costs: CostsData;
  grossProfit: number;
  netProfit: number;
};

export default function NetProfitPage() {
  const { toast } = useToast();
  const [period, setPeriod] = useState("monthly");
  const [timeFrame, setTimeFrame] = useState("3months");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 3),
    to: new Date()
  });

  // Initialiser les dates
  const startDate = dateRange?.from || subMonths(new Date(), 3);
  const endDate = dateRange?.to || new Date();

  // Requête pour le bénéfice net total - Ne s'exécute que lorsque les deux dates sont définies
  const { data: netProfitData, isLoading: isLoadingNetProfit } = useQuery<NetProfitData>({
    queryKey: [
      `/api/stats/net-profit?startDate=${dateRange?.from ? format(startDate, 'yyyy-MM-dd') : ''}&endDate=${dateRange?.to ? format(endDate, 'yyyy-MM-dd') : ''}`
    ],
    enabled: !!dateRange?.from && !!dateRange?.to // Les deux dates doivent être définies
  });

  // Requête pour les données mensuelles - Ne s'exécute que lorsque les deux dates sont définies
  const { data: monthlyData, isLoading: isLoadingMonthly } = useQuery<MonthlyProfitData[]>({
    queryKey: [
      `/api/stats/net-profit/monthly?startDate=${dateRange?.from ? format(startDate, 'yyyy-MM-dd') : ''}&endDate=${dateRange?.to ? format(endDate, 'yyyy-MM-dd') : ''}`
    ],
    enabled: !!dateRange?.from && !!dateRange?.to && period === "monthly"
  });

  // Requête pour les données quotidiennes - Ne s'exécute que lorsque les deux dates sont définies
  const { data: dailyData, isLoading: isLoadingDaily } = useQuery<DailyProfitData[]>({
    queryKey: [
      `/api/stats/net-profit/daily?startDate=${dateRange?.from ? format(startDate, 'yyyy-MM-dd') : ''}&endDate=${dateRange?.to ? format(endDate, 'yyyy-MM-dd') : ''}`
    ],
    enabled: !!dateRange?.from && !!dateRange?.to && period === "daily"
  });

  // Formater les données pour les graphiques
  const formattedMonthlyData = monthlyData && monthlyData.length > 0 ? monthlyData.map((item) => ({
    name: item.monthName,
    revenue: item.revenue.total,
    costs: item.costs.total,
    profit: item.netProfit
  })) : [];

  const formattedDailyData = dailyData && dailyData.length > 0 ? dailyData.map((item) => ({
    name: format(new Date(item.date), 'dd/MM'),
    revenue: item.revenue.total,
    costs: item.costs.total,
    profit: item.netProfit
  })) : [];

  // Gérer le changement de plage de dates
  const handleDateRangeChange = (range: DateRange | undefined) => {
    // Accepter toute plage, même partiellement définie pour permettre une sélection plus intuitive
    setDateRange(range);
  };

  // Gérer le changement de période prédéfinie
  const handleTimeFrameChange = (value: string) => {
    setTimeFrame(value);

    const today = new Date();
    let fromDate;

    switch (value) {
      case "1month":
        fromDate = subMonths(today, 1);
        break;
      case "3months":
        fromDate = subMonths(today, 3);
        break;
      case "6months":
        fromDate = subMonths(today, 6);
        break;
      case "1year":
        fromDate = subMonths(today, 12);
        break;
      default:
        fromDate = subMonths(today, 3);
    }

    setDateRange({
      from: fromDate,
      to: today
    });
  };

  // Calcul du taux de rentabilité
  const profitMargin = netProfitData 
    ? (netProfitData.netProfit / netProfitData.revenue.total) * 100 
    : 0;

  // Déterminer la couleur en fonction de la rentabilité
  const getProfitColor = (profit: number) => profit >= 0 ? "text-green-600" : "text-red-600";
  const getProfitBadgeColor = (profit: number) => profit >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";

  // Formater les nombres avec séparateur de milliers et 2 décimales
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-MA', { 
      style: 'currency',
      currency: 'MAD'
    }).format(num);
  };

  // Formater le pourcentage
  const formatPercentage = (num: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(num / 100);
  };

  // Déterminer les données du graphique en fonction de la période
  const chartData = period === "monthly" ? formattedMonthlyData : formattedDailyData;
  const isLoading = isLoadingNetProfit || (period === "monthly" ? isLoadingMonthly : isLoadingDaily);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bénéfice Net</h1>
          <p className="text-muted-foreground">
            Analyse détaillée des revenus, coûts et bénéfices
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={timeFrame} onValueChange={handleTimeFrameChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Dernier mois</SelectItem>
              <SelectItem value="3months">Derniers 3 mois</SelectItem>
              <SelectItem value="6months">Derniers 6 mois</SelectItem>
              <SelectItem value="1year">Dernière année</SelectItem>
            </SelectContent>
          </Select>
          
          <DatePickerWithRange 
            date={dateRange} 
            onDateChange={handleDateRangeChange} 
          />
        </div>
      </div>

      {/* Cartes récapitulatives */}
      {isLoadingNetProfit ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="shadow-sm">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : netProfitData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Chiffre d'affaires */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Chiffre d'Affaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(netProfitData.revenue.total)}</div>
              <div className="flex items-center gap-1 text-sm">
                <div className="flex items-center">
                  <Badge variant="outline" className="font-normal">
                    Période du {format(parseISO(netProfitData.startDate), 'dd/MM/yyyy')} au {format(parseISO(netProfitData.endDate), 'dd/MM/yyyy')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coût total */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Coûts Totaux
                </CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-80">
                      <p>Les coûts totaux représentent la somme des coûts d'achat des produits vendus plus les dépenses opérationnelles.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(netProfitData.costs.total)}</div>
              <div className="flex flex-col text-sm gap-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Produits:</span>
                  <span>{formatNumber(netProfitData.costs.cafeProducts)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dépenses:</span>
                  <span>{formatNumber(netProfitData.costs.expenses)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Marge brute */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Marge Brute
                </CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-80">
                      <p>La marge brute est la différence entre le chiffre d'affaires et le coût d'achat des produits vendus, avant déduction des dépenses opérationnelles.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getProfitColor(netProfitData.grossProfit)}`}>
                {formatNumber(netProfitData.grossProfit)}
              </div>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">CA - Coût des produits vendus</span>
              </div>
            </CardContent>
          </Card>

          {/* Bénéfice net */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bénéfice Net
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getProfitColor(netProfitData.netProfit)}`}>
                {formatNumber(netProfitData.netProfit)}
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <Badge className={getProfitBadgeColor(profitMargin)}>
                  {formatPercentage(profitMargin)} de marge
                </Badge>
                <div className="flex items-center gap-1">
                  {netProfitData.netProfit >= 0 ? (
                    <TrendingUpIcon className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDownIcon className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex justify-center items-center h-40">
          <p className="text-muted-foreground">Aucune donnée disponible pour la période sélectionnée</p>
        </div>
      )}

      {/* Répartition des revenus */}
      {isLoadingNetProfit ? (
        <Card className="shadow-sm">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ) : netProfitData ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Répartition des Revenus</CardTitle>
            <CardDescription>
              Analyse de la contribution de chaque type de service au chiffre d'affaires
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Entrées quotidiennes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 font-normal">Entrées</Badge>
                  <span className="font-medium">{formatNumber(netProfitData.revenue.entries)}</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  {netProfitData.revenue.total === 0 ? "0%" : ((netProfitData.revenue.entries / netProfitData.revenue.total) * 100).toFixed(1) + "%"}
                </span>
              </div>
              <Progress value={netProfitData.revenue.total === 0 ? 0 : (netProfitData.revenue.entries / netProfitData.revenue.total) * 100} className="h-2 bg-gray-100" indicatorClassName="bg-blue-500" />
            </div>

            {/* Abonnements mensuels */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-purple-100 text-purple-800 font-normal">Abonnements</Badge>
                  <span className="font-medium">{formatNumber(netProfitData.revenue.subscriptions)}</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  {netProfitData.revenue.total === 0 ? "0%" : ((netProfitData.revenue.subscriptions / netProfitData.revenue.total) * 100).toFixed(1) + "%"}
                </span>
              </div>
              <Progress value={netProfitData.revenue.total === 0 ? 0 : (netProfitData.revenue.subscriptions / netProfitData.revenue.total) * 100} className="h-2 bg-gray-100" indicatorClassName="bg-purple-500" />
            </div>

            {/* Café */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 font-normal">Café</Badge>
                  <span className="font-medium">{formatNumber(netProfitData.revenue.cafe)}</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  {netProfitData.revenue.total === 0 ? "0%" : ((netProfitData.revenue.cafe / netProfitData.revenue.total) * 100).toFixed(1) + "%"}
                </span>
              </div>
              <Progress value={netProfitData.revenue.total === 0 ? 0 : (netProfitData.revenue.cafe / netProfitData.revenue.total) * 100} className="h-2 bg-gray-100" indicatorClassName="bg-amber-500" />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Évolution du bénéfice */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h2 className="text-lg font-semibold">Évolution du Bénéfice</h2>
          <Tabs value={period} onValueChange={setPeriod} className="w-full">
            <TabsList>
              <TabsTrigger value="daily" className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                Quotidien
              </TabsTrigger>
              <TabsTrigger value="monthly" className="flex items-center gap-1">
                <BarChart3Icon className="h-4 w-4" />
                Mensuel
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="mt-4">
              <Card className="shadow-sm">
                <CardContent className="pt-6 pb-2">
                  {isLoadingDaily ? (
                    <div className="flex items-center justify-center h-[400px]">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                        <p className="text-muted-foreground">Chargement des données...</p>
                      </div>
                    </div>
                  ) : dailyData && dailyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={formattedDailyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 12 }}
                          interval={Math.ceil(formattedDailyData?.length / 15) - 1}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => [
                            formatNumber(value), 
                            value === 0 ? "Neutre" : value > 0 ? "Profit" : "Perte"
                          ]}
                          labelFormatter={(label) => `Jour: ${label}`}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          name="Revenus" 
                          stroke="#4338ca" 
                          activeDot={{ r: 8 }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="costs" 
                          name="Coûts" 
                          stroke="#ef4444"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="profit" 
                          name="Bénéfice Net" 
                          stroke="#22c55e"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[400px]">
                      <p className="text-muted-foreground">Aucune donnée disponible pour cette période.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="monthly" className="mt-4">
              <Card className="shadow-sm">
                <CardContent className="pt-6 pb-2">
                  {isLoadingMonthly ? (
                    <div className="flex items-center justify-center h-[400px]">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                        <p className="text-muted-foreground">Chargement des données...</p>
                      </div>
                    </div>
                  ) : monthlyData && monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={formattedMonthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => [
                            formatNumber(value), 
                            value === 0 ? "Neutre" : value > 0 ? "Profit" : "Perte"
                          ]}
                          labelFormatter={(label) => `Mois: ${label}`}
                        />
                        <Legend />
                        <Bar 
                          dataKey="revenue" 
                          name="Revenus" 
                          stackId="a" 
                          fill="#4338ca" 
                        />
                        <Bar 
                          dataKey="costs" 
                          name="Coûts" 
                          stackId="a" 
                          fill="#ef4444" 
                        />
                        <Bar 
                          dataKey="profit" 
                          name="Bénéfice Net" 
                          fill="#22c55e" 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[400px]">
                      <p className="text-muted-foreground">Aucune donnée disponible pour cette période.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}