import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TicketIcon, BellIcon, Coffee, Home } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface SummaryCardsWithRentalsProps {
  dailyStats: any;
  isLoading: boolean;
}

export default function SummaryCardsWithRentals({ dailyStats, isLoading }: SummaryCardsWithRentalsProps) {
  // Récupérer les locations de salles
  const { data: roomRentals } = useQuery({
    queryKey: ["/api/room-rentals"],
  });
  
  // Calculer le total des locations du jour
  const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
  const todayRentals = Array.isArray(roomRentals) 
    ? roomRentals.filter(rental => rental.date.startsWith(today))
    : [];
  
  const rentalsTotalRevenue = todayRentals.reduce((sum, rental) => sum + (rental.price || 0), 0);
  
  return (
    <div className="mb-6 sm:mb-8 grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
      {/* Total Revenue Widget */}
      <Card className="overflow-hidden shadow">
        <CardContent className="p-0">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary bg-opacity-10 rounded-md p-2 sm:p-3">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Total Aujourd'hui
                  </dt>
                  <dd className="flex items-baseline">
                    {isLoading ? (
                      <Skeleton className="h-6 sm:h-8 w-16 sm:w-24" />
                    ) : (
                      <div className="text-xl sm:text-2xl font-semibold text-gray-900">
                        {dailyStats?.totalRevenue || 0} DH
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 sm:px-5 py-2 sm:py-3">
            <div className="text-xs sm:text-sm">
              <Link href="/reports" className="font-medium text-primary hover:text-blue-700">
                Voir détails
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Entries Widget */}
      <Card className="overflow-hidden shadow">
        <CardContent className="p-0">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-2 sm:p-3">
                <TicketIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Entrées (25 DH)
                  </dt>
                  <dd className="flex flex-col sm:flex-row sm:items-baseline">
                    {isLoading ? (
                      <Skeleton className="h-6 sm:h-8 w-16 sm:w-24" />
                    ) : (
                      <>
                        <div className="text-xl sm:text-2xl font-semibold text-gray-900">
                          {dailyStats?.entriesRevenue || 0} DH
                        </div>
                        <span className="sm:ml-2 text-xs sm:text-sm font-medium text-gray-500">
                          {dailyStats?.entriesCount || 0} entrées
                        </span>
                      </>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 sm:px-5 py-2 sm:py-3">
            <div className="text-xs sm:text-sm">
              <Link href="/daily-entries" className="font-medium text-primary hover:text-blue-700">
                Ajouter entrée
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Widget */}
      <Card className="overflow-hidden shadow">
        <CardContent className="p-0">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-2 sm:p-3">
                <BellIcon className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Abonnements (300 DH)
                  </dt>
                  <dd className="flex flex-col sm:flex-row sm:items-baseline">
                    {isLoading ? (
                      <Skeleton className="h-6 sm:h-8 w-16 sm:w-24" />
                    ) : (
                      <>
                        <div className="text-xl sm:text-2xl font-semibold text-gray-900">
                          {dailyStats?.subscriptionsRevenue || 0} DH
                        </div>
                        <span className="sm:ml-2 text-xs sm:text-sm font-medium text-gray-500">
                          {dailyStats?.subscriptionsCount || 0} aujourd'hui
                        </span>
                      </>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 sm:px-5 py-2 sm:py-3">
            <div className="text-xs sm:text-sm">
              <Link href="/subscriptions" className="font-medium text-primary hover:text-blue-700">
                Gérer abonnements
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Café Sales Widget */}
      <Card className="overflow-hidden shadow">
        <CardContent className="p-0">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-amber-100 rounded-md p-2 sm:p-3">
                <Coffee className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Café & Boissons
                  </dt>
                  <dd className="flex flex-col sm:flex-row sm:items-baseline">
                    {isLoading ? (
                      <Skeleton className="h-6 sm:h-8 w-16 sm:w-24" />
                    ) : (
                      <>
                        <div className="text-xl sm:text-2xl font-semibold text-gray-900">
                          {dailyStats?.cafeRevenue || 0} DH
                        </div>
                        <span className="sm:ml-2 text-xs sm:text-sm font-medium text-gray-500">
                          {dailyStats?.cafeOrdersCount || 0} commandes
                        </span>
                      </>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 sm:px-5 py-2 sm:py-3">
            <div className="text-xs sm:text-sm">
              <Link href="/cafe" className="font-medium text-primary hover:text-blue-700">
                Nouvelle commande
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Room Rentals Widget */}
      <Card className="overflow-hidden shadow">
        <CardContent className="p-0">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-2 sm:p-3">
                <Home className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Locations de Salles
                  </dt>
                  <dd className="flex flex-col sm:flex-row sm:items-baseline">
                    <div className="text-xl sm:text-2xl font-semibold text-gray-900">
                      {rentalsTotalRevenue} DH
                    </div>
                    <span className="sm:ml-2 text-xs sm:text-sm font-medium text-gray-500">
                      {todayRentals.length} locations
                    </span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 sm:px-5 py-2 sm:py-3">
            <div className="text-xs sm:text-sm">
              <button 
                onClick={() => window.scrollTo({top: document.getElementById('room-rentals-section')?.offsetTop || 0, behavior: 'smooth'})}
                className="font-medium text-primary hover:text-blue-700"
              >
                Gérer locations
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}