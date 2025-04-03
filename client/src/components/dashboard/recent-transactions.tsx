import { format } from "date-fns";
import { Link } from "wouter";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface RecentTransactionsProps {
  transactions: any[];
  isLoading: boolean;
}

export default function RecentTransactions({ transactions, isLoading }: RecentTransactionsProps) {
  // Function to format transaction type
  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'entry':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Entrée</Badge>;
      case 'subscription':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Abonnement</Badge>;
      case 'cafe':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Café</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Format transaction description
  const formatDescription = (transaction: any) => {
    switch (transaction.type) {
      case 'entry':
        return "Entrée journalière";
      case 'subscription':
        return `Abonnement mensuel${transaction.clientName ? ' - ' + transaction.clientName : ''}`;
      case 'cafe':
        if (transaction.items && transaction.items.length > 0) {
          return transaction.items.map((item: any) => 
            `${item.quantity}x ${item.name}`
          ).join(", ");
        }
        return "Commande café";
      default:
        return "-";
    }
  };

  // Format payment method
  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'cash':
        return "Espèces";
      case 'card':
        return "Carte bancaire";
      case 'mobile_transfer':
        return "Transfert mobile";
      default:
        return method;
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow">
      <CardHeader className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
        <CardTitle className="text-lg font-medium leading-6 text-gray-900">
          Transactions récentes
        </CardTitle>
        <Link href="/calendar" className="text-sm font-medium text-primary hover:text-blue-600">
          Voir toutes les transactions
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Heure</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                    Aucune transaction récente à afficher.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(transaction.date), "dd/MM/yyyy - HH:mm")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatTransactionType(transaction.type)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDescription(transaction)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-gray-900">
                      {transaction.amount} DH
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-gray-500">
                      {formatPaymentMethod(transaction.paymentMethod)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/calendar?date=${format(new Date(transaction.date), 'yyyy-MM-dd')}&id=${transaction.id}`} className="text-primary hover:text-blue-700">
                        Détails
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {!isLoading && transactions.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <nav className="flex items-center justify-between">
              <div className="flex-1 flex justify-between">
                <Button variant="outline" disabled className="relative">
                  Précédent
                </Button>
                <Button variant="outline" disabled className="ml-3 relative">
                  Suivant
                </Button>
              </div>
            </nav>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
