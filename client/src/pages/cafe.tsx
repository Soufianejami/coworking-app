import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { Pencil, Trash2, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import CafeMenu from "@/components/cafe/cafe-menu";

export default function Cafe() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [clientName, setClientName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<{
    id: number;
    name: string;
    price: number;
    quantity: number;
  }[]>([]);
  
  // Check if user is admin (temporairement, les admins ont les mêmes droits que superadmin)
  const isSuperAdmin = user?.role === "admin";
  
  // Fetch today's orders
  const { data: cafeOrders, isLoading } = useQuery({
    queryKey: [`/api/transactions/byType/cafe`],
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: [`/api/products`],
  });
  
  // Calculate totals
  const totalOrders = cafeOrders?.length || 0;
  const totalRevenue = cafeOrders?.reduce((sum, order) => sum + order.amount, 0) || 0;
  
  // Calculate order total
  const orderTotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Create new cafe order
  const createOrder = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/transactions", {
        type: "cafe",
        amount: orderTotal,
        paymentMethod,
        clientName: clientName || undefined,
        notes: notes || undefined,
        date: new Date(),
        items: selectedItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        }))
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/byType/cafe`] });
      queryClient.invalidateQueries({ queryKey: [`/api/stats/daily`] });
      toast({
        title: "Commande ajoutée",
        description: "La commande a été enregistrée avec succès.",
      });

      // Reset form
      setClientName("");
      setNotes("");
      setSelectedItems([]);
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  // Update order mutation
  const updateOrder = useMutation({
    mutationFn: async (updatedOrder: any) => {
      return apiRequest("PATCH", `/api/transactions/${updatedOrder.id}`, updatedOrder);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/byType/cafe`] });
      queryClient.invalidateQueries({ queryKey: [`/api/stats/daily`] });
      toast({
        title: "Commande modifiée",
        description: "La commande a été modifiée avec succès.",
      });
      setEditDialogOpen(false);
      setCurrentOrder(null);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la modification.",
        variant: "destructive",
      });
    },
  });

  // Delete order mutation
  const deleteOrder = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/byType/cafe`] });
      queryClient.invalidateQueries({ queryKey: [`/api/stats/daily`] });
      toast({
        title: "Commande supprimée",
        description: "La commande a été supprimée avec succès.",
      });
      setDeleteDialogOpen(false);
      setCurrentOrder(null);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un produit.",
        variant: "destructive",
      });
      return;
    }
    createOrder.mutate();
  };
  
  const handleEdit = (order: any) => {
    setCurrentOrder(order);
    setClientName(order.clientName || "");
    setPaymentMethod(order.paymentMethod || "cash");
    setNotes(order.notes || "");
    setSelectedItems(order.items || []);
    setEditDialogOpen(true);
  };
  
  const handleDelete = (order: any) => {
    setCurrentOrder(order);
    setDeleteDialogOpen(true);
  };
  
  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un produit.",
        variant: "destructive",
      });
      return;
    }
    
    if (!currentOrder) return;
    
    const updatedOrder = {
      ...currentOrder,
      amount: selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      clientName: clientName || undefined,
      paymentMethod,
      notes: notes || undefined,
      items: selectedItems
    };
    
    updateOrder.mutate(updatedOrder);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Café & Boissons</h2>
          <p className="text-sm text-gray-500">
            Gestion des commandes de boissons
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Nouvelle commande</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle commande</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label
                  htmlFor="client-name"
                  className="block text-sm font-medium text-gray-700"
                >
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionnez les produits
                </label>
                <CafeMenu
                  products={products || []}
                  selectedItems={selectedItems}
                  setSelectedItems={setSelectedItems}
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Total</span>
                  <span className="text-sm font-medium text-gray-900">
                    {orderTotal} DH
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="payment-method"
                  className="block text-sm font-medium text-gray-700"
                >
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
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700"
                >
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
                <Button type="submit" disabled={createOrder.isPending}>
                  {createOrder.isPending
                    ? "Enregistrement..."
                    : `Enregistrer (${orderTotal} DH)`}
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
              Total des commandes aujourd'hui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalOrders}</div>
            <p className="text-sm text-gray-500 mt-1">commandes enregistrées</p>
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

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des commandes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Heure</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Produits</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead>Notes</TableHead>
                {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 7 : 6} className="text-center py-4">
                    Chargement des commandes...
                  </TableCell>
                </TableRow>
              ) : cafeOrders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 7 : 6} className="text-center py-4">
                    Aucune commande enregistrée.
                  </TableCell>
                </TableRow>
              ) : (
                cafeOrders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      {format(new Date(order.date), "dd/MM/yyyy - HH:mm")}
                    </TableCell>
                    <TableCell>{order.clientName || "Anonyme"}</TableCell>
                    <TableCell>
                      {order.items ? 
                        order.items.map((item: any) => 
                          `${item.quantity}x ${item.name}`
                        ).join(", ")
                        : "-"
                      }
                    </TableCell>
                    <TableCell>{order.amount} DH</TableCell>
                    <TableCell>
                      {order.paymentMethod === "cash" && "Espèces"}
                      {order.paymentMethod === "card" && "Carte bancaire"}
                      {order.paymentMethod === "mobile_transfer" && "Transfert mobile"}
                    </TableCell>
                    <TableCell>{order.notes || "-"}</TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(order)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Modifier</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(order)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Supprimer</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Order Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la commande</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4 mt-4">
            <div>
              <label
                htmlFor="client-name-edit"
                className="block text-sm font-medium text-gray-700"
              >
                Nom du client (optionnel)
              </label>
              <Input
                id="client-name-edit"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nom du client"
                className="mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sélectionnez les produits
              </label>
              <CafeMenu
                products={products || []}
                selectedItems={selectedItems}
                setSelectedItems={setSelectedItems}
              />
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="text-sm font-medium text-gray-900">
                  {orderTotal} DH
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="payment-method-edit"
                className="block text-sm font-medium text-gray-700"
              >
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
              <label
                htmlFor="notes-edit"
                className="block text-sm font-medium text-gray-700"
              >
                Notes (optionnel)
              </label>
              <Textarea
                id="notes-edit"
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
                onClick={() => {
                  setEditDialogOpen(false);
                  setCurrentOrder(null);
                }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={updateOrder.isPending}>
                {updateOrder.isPending
                  ? "Sauvegarde en cours..."
                  : `Sauvegarder (${orderTotal} DH)`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la commande</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette commande ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setCurrentOrder(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => currentOrder && deleteOrder.mutate(currentOrder.id)}
              disabled={deleteOrder.isPending}
            >
              {deleteOrder.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
