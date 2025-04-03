import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";

export default function DailyEntries() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  
  // Fetch today's entries
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data: entries, isLoading } = useQuery({
    queryKey: [`/api/transactions/byType/entry`],
  });
  
  // Calculate totals
  const totalEntries = entries?.length || 0;
  const totalRevenue = entries?.reduce((sum, entry) => sum + entry.amount, 0) || 0;
  
  // Create new entry
  const createEntry = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/transactions', {
        type: "entry",
        amount: 25, // Fixed price for entry
        paymentMethod,
        clientName: clientName || undefined,
        notes: notes || undefined,
        date: new Date()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/byType/entry`] });
      queryClient.invalidateQueries({ queryKey: [`/api/stats/daily?date=${todayStr}`] });
      toast({
        title: "Entrée ajoutée",
        description: "L'entrée journalière a été enregistrée avec succès."
      });
      
      // Reset form
      setClientName("");
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
    createEntry.mutate();
  };
  
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Entrées journalières</h2>
          <p className="text-sm text-gray-500">Gestion des entrées à 25 DH par jour</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Ajouter une entrée</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle entrée journalière</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label htmlFor="client-name" className="block text-sm font-medium text-gray-700">
                  Nom du client (optionnel)
                </label>
                <Input
                  id="client-name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nom du client"
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
                  disabled={createEntry.isPending}
                >
                  {createEntry.isPending ? "Enregistrement..." : "Enregistrer (25 DH)"}
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
              Total des entrées aujourd'hui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalEntries}</div>
            <p className="text-sm text-gray-500 mt-1">entrées enregistrées</p>
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
            <p className="text-sm text-gray-500 mt-1">pour aujourd'hui</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des entrées</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Heure</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Chargement des entrées...
                  </TableCell>
                </TableRow>
              ) : entries?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Aucune entrée enregistrée pour aujourd'hui.
                  </TableCell>
                </TableRow>
              ) : (
                entries?.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {format(new Date(entry.date), 'dd/MM/yyyy - HH:mm')}
                    </TableCell>
                    <TableCell>{entry.clientName || "Anonyme"}</TableCell>
                    <TableCell>{entry.amount} DH</TableCell>
                    <TableCell>
                      {entry.paymentMethod === 'cash' && 'Espèces'}
                      {entry.paymentMethod === 'card' && 'Carte bancaire'}
                      {entry.paymentMethod === 'mobile_transfer' && 'Transfert mobile'}
                    </TableCell>
                    <TableCell>{entry.notes || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
