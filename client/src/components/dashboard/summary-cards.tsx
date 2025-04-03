import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TicketIcon, BellIcon, Coffee } from "lucide-react";
import { Link } from "wouter";

interface SummaryCardsProps {
  dailyStats: any;
  isLoading: boolean;
}

export default function SummaryCards({ dailyStats, isLoading }: SummaryCardsProps) {
  return (
    <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Revenue Widget */}
      <Card className="overflow-hidden shadow">
        <CardContent className="p-0">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary bg-opacity-10 rounded-md p-3">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Aujourd'hui
                  </dt>
                  <dd className="flex items-baseline">
                    {isLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <div className="text-2xl font-semibold text-gray-900">
                        {dailyStats?.totalRevenue || 0} DH
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
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
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <TicketIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Entrées (25 DH)
                  </dt>
                  <dd className="flex items-baseline">
                    {isLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <>
                        <div className="text-2xl font-semibold text-gray-900">
                          {dailyStats?.entriesRevenue || 0} DH
                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-500">
                          {dailyStats?.entriesCount || 0} entrées
                        </span>
                      </>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
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
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <BellIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Abonnements (300 DH)
                  </dt>
                  <dd className="flex items-baseline">
                    {isLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <>
                        <div className="text-2xl font-semibold text-gray-900">
                          {dailyStats?.subscriptionsRevenue || 0} DH
                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-500">
                          {dailyStats?.subscriptionsCount || 0} aujourd'hui
                        </span>
                      </>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
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
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-amber-100 rounded-md p-3">
                <Coffee className="h-6 w-6 text-amber-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Café & Boissons
                  </dt>
                  <dd className="flex items-baseline">
                    {isLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <>
                        <div className="text-2xl font-semibold text-gray-900">
                          {dailyStats?.cafeRevenue || 0} DH
                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-500">
                          {dailyStats?.cafeOrdersCount || 0} commandes
                        </span>
                      </>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/cafe" className="font-medium text-primary hover:text-blue-700">
                Nouvelle commande
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
