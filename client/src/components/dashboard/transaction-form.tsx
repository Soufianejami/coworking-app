import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import CafeMenu from "@/components/cafe/cafe-menu";
import { Product } from "@shared/schema";

interface TransactionFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function TransactionForm({ open, onOpenChange }: TransactionFormProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"entry" | "subscription" | "cafe">("entry");
  const [clientName, setClientName] = useState("");
  const [subscriberName, setSubscriberName] = useState("");
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [subscriptionStart, setSubscriptionStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "mobile_transfer">("cash");
  const [notes, setNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<{
    id: number;
    name: string;
    price: number;
    quantity: number;
  }[]>([]);
  
  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);
  
  useEffect(() => {
    // Reset form when transaction type changes
    setClientName("");
    setSubscriberName("");
    setSubscriberEmail("");
    setSubscriptionStart(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
    setSelectedItems([]);
  }, [transactionType]);
  
  // Fetch products for cafe menu
  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: transactionType === "cafe",
  });
  
  // Calculate order total for cafe
  const orderTotal = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  
  // Get current date string for invalidating stats query
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  // Create transaction mutation
  const createTransaction = useMutation({
    mutationFn: async () => {
      let data = {
        type: transactionType,
        paymentMethod,
        notes: notes || undefined,
        // Use a string date format directly
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
      } as any;
      
      if (transactionType === "entry") {
        data.amount = 25; // Fixed price for entry
        data.clientName = clientName || undefined;
      } else if (transactionType === "subscription") {
        data.amount = 300; // Fixed price for subscription
        data.clientName = subscriberName;
        data.clientEmail = subscriberEmail || undefined;
        // Use subscription start date if provided
        try {
          const startDate = new Date(subscriptionStart);
          // Format the date as a string in ISO format
          data.date = format(startDate, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
        } catch (error) {
          console.error("Error formatting date:", error);
          // Use current date as fallback
          data.date = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
        }
      } else if (transactionType === "cafe") {
        data.amount = orderTotal;
        data.clientName = clientName || undefined;
        data.items = selectedItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        }));
      }
      
      console.log("Sending transaction data:", data);
      return apiRequest("POST", "/api/transactions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stats/daily?date=${todayStr}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: "Transaction réussie",
        description: "La transaction a été enregistrée avec succès.",
      });
      
      // Reset form
      resetForm();
      
      // Close dialog if controlled
      if (onOpenChange) {
        onOpenChange(false);
      } else {
        setIsOpen(false);
      }
    },
    onError: (error: any) => {
      console.error("Transaction error:", error);
      toast({
        title: "Erreur",
        description: error?.message || "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });
  
  const resetForm = () => {
    setTransactionType("entry");
    setClientName("");
    setSubscriberName("");
    setSubscriberEmail("");
    setSubscriptionStart(format(new Date(), "yyyy-MM-dd"));
    setPaymentMethod("cash");
    setNotes("");
    setSelectedItems([]);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (transactionType === "subscription" && !subscriberName) {
      toast({
        title: "Champ requis",
        description: "Veuillez entrer le nom de l'abonné.",
        variant: "destructive",
      });
      return;
    }
    
    if (transactionType === "cafe" && selectedItems.length === 0) {
      toast({
        title: "Sélection requise",
        description: "Veuillez sélectionner au moins un produit.",
        variant: "destructive",
      });
      return;
    }
    
    createTransaction.mutate();
  };
  
  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
    
    if (!newOpen) {
      // Reset form when closing
      setTimeout(resetForm, 300);
    }
  };
  
  const renderFormFields = () => {
    switch (transactionType) {
      case "entry":
        return (
          <div id="entry-fields">
            <div className="mb-4">
              <label
                htmlFor="client-name"
                className="block text-sm font-medium text-gray-700"
              >
                Nom du client (optionnel)
              </label>
              <Input
                type="text"
                id="client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        );
      case "subscription":
        return (
          <div id="subscription-fields">
            <div className="mb-4">
              <label
                htmlFor="subscriber-name"
                className="block text-sm font-medium text-gray-700"
              >
                Nom de l'abonné <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                id="subscriber-name"
                value={subscriberName}
                onChange={(e) => setSubscriberName(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="subscription-start"
                className="block text-sm font-medium text-gray-700"
              >
                Date de début
              </label>
              <Input
                type="date"
                id="subscription-start"
                value={subscriptionStart}
                onChange={(e) => setSubscriptionStart(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="subscription-email"
                className="block text-sm font-medium text-gray-700"
              >
                Email (optionnel)
              </label>
              <Input
                type="email"
                id="subscription-email"
                value={subscriberEmail}
                onChange={(e) => setSubscriberEmail(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        );
      case "cafe":
        return (
          <div id="cafe-fields">
            <div className="mb-4">
              <label
                htmlFor="client-name-cafe"
                className="block text-sm font-medium text-gray-700"
              >
                Nom du client (optionnel)
              </label>
              <Input
                type="text"
                id="client-name-cafe"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Produits
              </label>
              <CafeMenu
                products={Array.isArray(products) ? products : []}
                selectedItems={selectedItems}
                setSelectedItems={setSelectedItems}
              />
            </div>
            <div className="bg-gray-50 p-3 rounded-md mb-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="text-sm font-medium text-gray-900">
                  {orderTotal} DH
                </span>
              </div>
            </div>
          </div>
        );
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Card className="bg-white rounded-lg shadow">
          <CardHeader className="px-6 py-5 border-b border-gray-200">
            <CardTitle className="text-lg font-medium leading-6 text-gray-900">
              Ajouter une transaction
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-500 mb-4">
              Sélectionnez le type de transaction que vous souhaitez effectuer.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={() => setIsOpen(true)}
                className="text-center py-8 rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                variant="ghost"
              >
                Entrée Journalière
                <div className="mt-1 text-sm text-gray-500">25 DH</div>
              </Button>
              <Button 
                onClick={() => setIsOpen(true)}
                className="text-center py-8 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200"
                variant="ghost"
              >
                Abonnement Mensuel
                <div className="mt-1 text-sm text-gray-500">300 DH</div>
              </Button>
              <Button 
                onClick={() => setIsOpen(true)}
                className="text-center py-8 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200"
                variant="ghost"
              >
                Café & Boissons
                <div className="mt-1 text-sm text-gray-500">Menu varié</div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>Ajouter une transaction</DialogTitle>
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="mb-4">
            <label
              htmlFor="transaction-type"
              className="block text-sm font-medium text-gray-700"
            >
              Type de transaction
            </label>
            <Select
              value={transactionType}
              onValueChange={(value: any) => setTransactionType(value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Type de transaction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entrée journalière (25 DH)</SelectItem>
                <SelectItem value="subscription">
                  Abonnement mensuel (300 DH)
                </SelectItem>
                <SelectItem value="cafe">Café & Boissons</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderFormFields()}

          <div className="mb-4">
            <label
              htmlFor="payment-method"
              className="block text-sm font-medium text-gray-700"
            >
              Méthode de paiement
            </label>
            <Select
              value={paymentMethod}
              onValueChange={(value: any) => setPaymentMethod(value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Méthode de paiement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="card">Carte bancaire</SelectItem>
                <SelectItem value="mobile_transfer">Transfert mobile</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4">
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700"
            >
              Notes (optionnel)
            </label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={createTransaction.isPending}
            >
              {createTransaction.isPending
                ? "Enregistrement..."
                : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
