import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

export default function Subscriptions() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [subscriberName, setSubscriberName] = useState("");
  const [email, setEmail] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  
  // Fetch all subscriptions
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: [`/api/transactions/byType/subscription`],
  });
  
  // Calculate totals
  const totalSubscriptions = subscriptions?.length || 0;
  const totalRevenue = subscriptions?.reduce((sum, sub) => sum + sub.amount, 0) || 0;
  
  // Create new subscription
  const createSubscription = useMutation({
    mutationFn: async () => {
      const start = new Date(startDate);
      const end = addMonths(start, 1);
      
      return apiRequest('POST', '/api/transactions', {
        type: "subscription",
        amount: 300, // Fixed price for subscription
        paymentMethod,
        clientName: subscriberName,
        clientEmail: email || undefined,
        notes: notes || undefined,
        date: start,
        subscriptionEndDate: end
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/byType/subscription`] });
      queryClient.invalidateQueries({ queryKey: [`/api/stats/daily`] });
      toast({
        title: "Abonnement ajouté",
        description: "L'abonnement mensuel a été enregistré avec succès."
      });
      
      // Reset form
      setSubscriberName("");
      setEmail("");
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setNotes("");
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive"
      });
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriberName) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer le nom de l'abonné.",
        variant: "destructive"
      });
      return;
    }
    createSubscription.mutate();
  };
  
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Abonnements</h2>
          <p className="text-sm text-gray-500">Gestion des abonnements mensuels à 300 DH</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Nouvel abonnement</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvel abonnement mensuel</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label htmlFor="subscriber-name" className="block text-sm font-medium text-gray-700">
                  Nom de l'abonné <span className="text-red-500">*</span>
                </label>
                <Input
                  id="subscriber-name"
                  value={subscriberName}
                  onChange={(e) => setSubscriberName(e.target.value)}
                  placeholder="Nom complet"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email (optionnel)
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemple.com"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">
                  Date de début
                </label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label htmlFor="payment-method" className="block text-sm font-medium text-gray-700">
                  Méthode de paiement
                </label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes (optionnel)
                </label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes additionnelles"
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <div className="pt-2 flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => setOpen(false)}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSubscription.isPending}
                >
                  {createSubscription.isPending ? "Enregistrement..." : "Enregistrer (300 DH)"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-gray-700">
              Total des abonnements ce mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSubscriptions}</div>
            <p className="text-sm text-gray-500 mt-1">abonnements enregistrés</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-gray-700">
              Revenu total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalRevenue} DH</div>
            <p className="text-sm text-gray-500 mt-1">des abonnements</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des abonnements</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date d'inscription</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    Chargement des abonnements...
                  </TableCell>
                </TableRow>
              ) : subscriptions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    Aucun abonnement enregistré.
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions?.map((subscription) => {
                  const startDate = new Date(subscription.date);
                  const endDate = subscription.subscriptionEndDate 
                    ? new Date(subscription.subscriptionEndDate)
                    : addMonths(startDate, 1);
                  
                  const isActive = endDate > new Date();
                  
                  return (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        {format(startDate, 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{subscription.clientName}</TableCell>
                      <TableCell>{subscription.clientEmail || "-"}</TableCell>
                      <TableCell>
                        {format(startDate, 'dd/MM/yyyy')} au {format(endDate, 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{subscription.amount} DH</TableCell>
                      <TableCell>
                        {subscription.paymentMethod === 'cash' && 'Espèces'}
                        {subscription.paymentMethod === 'card' && 'Carte bancaire'}
                        {subscription.paymentMethod === 'mobile_transfer' && 'Transfert mobile'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "success" : "secondary"}>
                          {isActive ? "Actif" : "Expiré"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
