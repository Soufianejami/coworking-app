import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, formatDistance } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import MainLayout from "@/components/layout/main-layout";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  LayoutList, 
  AlertTriangle, 
  CakeSlice, 
  PlusCircle, 
  MinusCircle, 
  RefreshCw, 
  History,
  Edit
} from "lucide-react";

type Product = {
  id: number;
  name: string;
  price: number;
  category: string;
  isActive: boolean;
};

type InventoryItem = {
  id: number;
  productId: number;
  quantity: number;
  minThreshold: number;
  purchasePrice: number | null;
  expirationDate: string | null;
  lastRestockDate: string;
  createdAt: string;
  updatedAt: string;
  product: Product;
};

type StockMovement = {
  id: number;
  inventoryId: number;
  productId: number;
  quantity: number;
  actionType: 'add' | 'remove' | 'adjust';
  reason: string | null;
  transactionId: number | null;
  performedById: number;
  timestamp: string;
  product: Product;
};

export default function StockPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("inventory");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isCreateInventoryOpen, setIsCreateInventoryOpen] = useState(false);
  const [isUpdateInventoryOpen, setIsUpdateInventoryOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [addStockForm, setAddStockForm] = useState({
    productId: "",
    quantity: "",
    reason: "",
  });

  const [removeStockForm, setRemoveStockForm] = useState({
    productId: "",
    quantity: "",
    reason: "",
  });

  const [adjustStockForm, setAdjustStockForm] = useState({
    productId: "",
    newQuantity: "",
    reason: "",
  });

  const [inventoryForm, setInventoryForm] = useState({
    productId: "",
    minThreshold: "5",
    purchasePrice: "",
    expirationDate: "",
  });

  // Query for inventory items
  const {
    data: inventoryItems = [],
    isLoading: isLoadingInventory,
    error: inventoryError,
  } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    enabled: user?.role === "admin",
  });

  // Query for low stock items
  const {
    data: lowStockItems = [],
    isLoading: isLoadingLowStock,
    error: lowStockError,
  } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/low-stock"],
    enabled: user?.role === "admin",
  });

  // Query for expiring items
  const {
    data: expiringItems = [],
    isLoading: isLoadingExpiring,
    error: expiringError,
  } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/expiring"],
    enabled: user?.role === "admin",
  });

  // Query for stock movements
  const {
    data: stockMovements = [],
    isLoading: isLoadingMovements,
    error: movementsError,
  } = useQuery<StockMovement[]>({
    queryKey: ["/api/stock-movements"],
    enabled: user?.role === "admin" && activeTab === "movements",
  });

  // Query for products
  const {
    data: products = [],
    isLoading: isLoadingProducts,
    error: productsError,
  } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: user?.role === "admin",
  });

  // Filter products for beverage products (not coffee)
  const beverageProducts = products.filter(
    (product) => 
      product.category === "beverage" && 
      !product.name.toLowerCase().includes("café") &&
      product.isActive
  );

  // Filter products that don't have inventory yet
  const productsWithoutInventory = beverageProducts.filter(
    (product) => 
      !inventoryItems.some((item) => item.productId === product.id)
  );

  // Add stock mutation
  const addStockMutation = useMutation({
    mutationFn: async (data: { productId: number; quantity: number; reason: string }) => {
      const res = await apiRequest("POST", "/api/stock/add", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/expiring"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
      setIsAddDialogOpen(false);
      setAddStockForm({ productId: "", quantity: "", reason: "" });
      toast({
        title: "Stock ajouté",
        description: "Le stock a été mis à jour avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove stock mutation
  const removeStockMutation = useMutation({
    mutationFn: async (data: { productId: number; quantity: number; reason: string }) => {
      const res = await apiRequest("POST", "/api/stock/remove", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/expiring"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
      setIsRemoveDialogOpen(false);
      setRemoveStockForm({ productId: "", quantity: "", reason: "" });
      toast({
        title: "Stock retiré",
        description: "Le stock a été mis à jour avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Adjust stock mutation
  const adjustStockMutation = useMutation({
    mutationFn: async (data: { productId: number; newQuantity: number; reason: string }) => {
      const res = await apiRequest("POST", "/api/stock/adjust", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/expiring"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
      setIsAdjustDialogOpen(false);
      setAdjustStockForm({ productId: "", newQuantity: "", reason: "" });
      toast({
        title: "Stock ajusté",
        description: "Le stock a été mis à jour avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create inventory mutation
  const createInventoryMutation = useMutation({
    mutationFn: async (data: { 
      productId: number; 
      minThreshold: number; 
      purchasePrice?: number;
      expirationDate?: string 
    }) => {
      const res = await apiRequest("POST", "/api/inventory", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/expiring"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });  // Pour mettre à jour la liste des produits
      setIsCreateInventoryOpen(false);
      setInventoryForm({ productId: "", minThreshold: "5", purchasePrice: "", expirationDate: "" });
      toast({
        title: "Produit ajouté",
        description: "Le produit a été ajouté à l'inventaire et est maintenant disponible dans le menu.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update inventory mutation
  const updateInventoryMutation = useMutation({
    mutationFn: async (data: { id: number; minThreshold: number; expirationDate?: string | null }) => {
      const res = await apiRequest("PATCH", `/api/inventory/${data.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/expiring"] });
      setIsUpdateInventoryOpen(false);
      setSelectedItem(null);
      toast({
        title: "Inventaire mis à jour",
        description: "L'élément d'inventaire a été mis à jour avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    addStockMutation.mutate({
      productId: parseInt(addStockForm.productId),
      quantity: parseInt(addStockForm.quantity),
      reason: addStockForm.reason,
    });
  };

  const handleRemoveStock = (e: React.FormEvent) => {
    e.preventDefault();
    removeStockMutation.mutate({
      productId: parseInt(removeStockForm.productId),
      quantity: parseInt(removeStockForm.quantity),
      reason: removeStockForm.reason,
    });
  };

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    adjustStockMutation.mutate({
      productId: parseInt(adjustStockForm.productId),
      newQuantity: parseInt(adjustStockForm.newQuantity),
      reason: adjustStockForm.reason,
    });
  };

  const handleCreateInventory = (e: React.FormEvent) => {
    e.preventDefault();
    createInventoryMutation.mutate({
      productId: parseInt(inventoryForm.productId),
      minThreshold: parseInt(inventoryForm.minThreshold),
      ...(inventoryForm.purchasePrice ? { purchasePrice: parseInt(inventoryForm.purchasePrice) } : {}),
      ...(inventoryForm.expirationDate ? { expirationDate: inventoryForm.expirationDate } : {}),
    });
  };

  const handleUpdateInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const formData = {
      id: selectedItem.id,
      minThreshold: parseInt(inventoryForm.minThreshold),
      ...(inventoryForm.purchasePrice ? { purchasePrice: parseInt(inventoryForm.purchasePrice) } : {}),
      ...(inventoryForm.expirationDate ? { expirationDate: inventoryForm.expirationDate } : { expirationDate: null }),
    };

    updateInventoryMutation.mutate(formData);
  };

  const openEditInventory = (item: InventoryItem) => {
    setSelectedItem(item);
    setInventoryForm({
      productId: item.productId.toString(),
      minThreshold: item.minThreshold.toString(),
      purchasePrice: item.purchasePrice ? item.purchasePrice.toString() : '',
      expirationDate: item.expirationDate 
        ? format(new Date(item.expirationDate), 'yyyy-MM-dd')
        : '',
    });
    setIsUpdateInventoryOpen(true);
  };

  // If user is not admin, show access denied message
  if (user?.role !== "admin") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Accès refusé</h1>
          <p className="text-gray-600">
            Vous n'avez pas l'autorisation d'accéder à cette page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Stocks - Boissons</h1>
          <p className="text-gray-500">
            Gérez les stocks des boissons et ajoutez-les au menu
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCreateInventoryOpen(true)} disabled={productsWithoutInventory.length === 0}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Nouveau Produit
          </Button>
        </div>
      </div>

      {/* Alerts section */}
      {lowStockItems.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Stock insuffisant</AlertTitle>
          <AlertDescription>
            {lowStockItems.length === 1 
              ? "1 produit a un stock insuffisant" 
              : `${lowStockItems.length} produits ont un stock insuffisant`}
          </AlertDescription>
        </Alert>
      )}

      {expiringItems.length > 0 && (
        <Alert className="mb-4 border-amber-500 text-amber-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Produits avec date de péremption proche</AlertTitle>
          <AlertDescription>
            {expiringItems.length === 1 
              ? "1 produit arrive à expiration bientôt" 
              : `${expiringItems.length} produits arrivent à expiration bientôt`}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory">
            <CakeSlice className="h-4 w-4 mr-2" />
            Inventaire
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Alertes
          </TabsTrigger>
          <TabsTrigger value="movements">
            <History className="h-4 w-4 mr-2" />
            Mouvements
          </TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Stock de Boissons</CardTitle>
              <CardDescription>
                Liste de tous les produits en stock avec leurs quantités.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsAddDialogOpen(true)}
                  disabled={inventoryItems.length === 0}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Ajouter du stock
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsRemoveDialogOpen(true)}
                  disabled={inventoryItems.length === 0}
                >
                  <MinusCircle className="h-4 w-4 mr-2" />
                  Retirer du stock
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsAdjustDialogOpen(true)}
                  disabled={inventoryItems.length === 0}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Ajuster le stock
                </Button>
              </div>

              {isLoadingInventory ? (
                <div className="flex justify-center items-center h-32">
                  <p>Chargement de l'inventaire...</p>
                </div>
              ) : inventoryItems.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-32">
                  <p className="text-gray-500 mb-4">Aucun produit en inventaire</p>
                  {productsWithoutInventory.length > 0 && (
                    <Button onClick={() => setIsCreateInventoryOpen(true)}>
                      Ajouter un premier produit
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Stock actuel</TableHead>
                        <TableHead>Seuil d'alerte</TableHead>
                        <TableHead>Prix d'achat</TableHead>
                        <TableHead>Péremption</TableHead>
                        <TableHead>Dernier ajout</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.product.name}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={item.quantity <= item.minThreshold ? "destructive" : "default"}
                            >
                              {item.quantity} unités
                            </Badge>
                          </TableCell>
                          <TableCell>{item.minThreshold} unités</TableCell>
                          <TableCell>
                            {item.purchasePrice ? (
                              <span>{item.purchasePrice} DH</span>
                            ) : (
                              <span className="text-gray-400">Non défini</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.expirationDate ? (
                              <span className={
                                new Date(item.expirationDate) < new Date() 
                                  ? "text-red-500" 
                                  : new Date(item.expirationDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                  ? "text-amber-500"
                                  : ""
                              }>
                                {format(new Date(item.expirationDate), 'dd/MM/yyyy')}
                              </span>
                            ) : (
                              <span className="text-gray-400">Non défini</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(item.lastRestockDate), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setAddStockForm({
                                    ...addStockForm,
                                    productId: item.productId.toString(),
                                  });
                                  setIsAddDialogOpen(true);
                                }}
                              >
                                <PlusCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setRemoveStockForm({
                                    ...removeStockForm,
                                    productId: item.productId.toString(),
                                  });
                                  setIsRemoveDialogOpen(true);
                                }}
                              >
                                <MinusCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditInventory(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {/* Low stock alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Stock insuffisant</CardTitle>
                <CardDescription>
                  Produits avec un stock inférieur au seuil d'alerte.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLowStock ? (
                  <div className="flex justify-center items-center h-32">
                    <p>Chargement des alertes...</p>
                  </div>
                ) : lowStockItems.length === 0 ? (
                  <div className="flex justify-center items-center h-32 text-green-600">
                    <p>Tous les produits ont un stock suffisant</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produit</TableHead>
                          <TableHead>Stock actuel</TableHead>
                          <TableHead>Seuil</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lowStockItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.product.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive">{item.quantity} unités</Badge>
                            </TableCell>
                            <TableCell>{item.minThreshold} unités</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setAddStockForm({
                                    ...addStockForm,
                                    productId: item.productId.toString(),
                                  });
                                  setIsAddDialogOpen(true);
                                }}
                              >
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Ajouter du stock
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expiration alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Dates de péremption proches</CardTitle>
                <CardDescription>
                  Produits qui expirent dans les 7 prochains jours.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingExpiring ? (
                  <div className="flex justify-center items-center h-32">
                    <p>Chargement des alertes...</p>
                  </div>
                ) : expiringItems.length === 0 ? (
                  <div className="flex justify-center items-center h-32 text-green-600">
                    <p>Aucun produit n'expire bientôt</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produit</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Péremption</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expiringItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.product.name}
                            </TableCell>
                            <TableCell>{item.quantity} unités</TableCell>
                            <TableCell className="text-amber-500">
                              {item.expirationDate && (
                                <>
                                  {format(new Date(item.expirationDate), 'dd/MM/yyyy')}
                                  <div className="text-xs text-gray-500">
                                    {formatDistance(new Date(item.expirationDate), new Date(), {
                                      addSuffix: true,
                                      locale: fr
                                    })}
                                  </div>
                                </>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditInventory(item)}
                              >
                                <Calendar className="h-4 w-4 mr-2" />
                                Mettre à jour
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stock Movements Tab */}
        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Historique des mouvements</CardTitle>
              <CardDescription>
                Tous les ajouts, retraits et ajustements de stock.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMovements ? (
                <div className="flex justify-center items-center h-32">
                  <p>Chargement des mouvements...</p>
                </div>
              ) : stockMovements.length === 0 ? (
                <div className="flex justify-center items-center h-32">
                  <p className="text-gray-500">Aucun mouvement de stock enregistré</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Produit</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead>Raison</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockMovements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell>
                            {format(new Date(movement.timestamp), 'dd/MM/yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {movement.product.name}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                movement.actionType === 'add'
                                  ? 'default'
                                  : movement.actionType === 'remove'
                                  ? 'destructive'
                                  : 'outline'
                              }
                            >
                              {movement.actionType === 'add'
                                ? 'Ajout'
                                : movement.actionType === 'remove'
                                ? 'Retrait'
                                : 'Ajustement'}
                            </Badge>
                          </TableCell>
                          <TableCell className={
                            movement.quantity > 0 
                              ? "text-green-600" 
                              : movement.quantity < 0 
                              ? "text-red-500" 
                              : ""
                          }>
                            {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                          </TableCell>
                          <TableCell>
                            {movement.reason || (
                              movement.transactionId
                                ? <span className="text-gray-500">Vente #{movement.transactionId}</span>
                                : <span className="text-gray-500">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Stock Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter du Stock</DialogTitle>
            <DialogDescription>
              Ajoutez du stock pour un produit. La date de dernier réapprovisionnement sera mise à jour automatiquement.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStock}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="productId">Produit</Label>
                <select
                  id="productId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={addStockForm.productId}
                  onChange={(e) =>
                    setAddStockForm({ ...addStockForm, productId: e.target.value })
                  }
                  required
                >
                  <option value="">Sélectionner un produit</option>
                  {beverageProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantité à ajouter</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={addStockForm.quantity}
                  onChange={(e) =>
                    setAddStockForm({ ...addStockForm, quantity: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Raison (optionnel)</Label>
                <Input
                  id="reason"
                  value={addStockForm.reason}
                  onChange={(e) =>
                    setAddStockForm({ ...addStockForm, reason: e.target.value })
                  }
                  placeholder="Ex: Réapprovisionnement mensuel"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={addStockMutation.isPending}
              >
                {addStockMutation.isPending ? "Ajout en cours..." : "Ajouter le stock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Stock Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirer du Stock</DialogTitle>
            <DialogDescription>
              Retirez du stock pour un produit (casse, erreur, etc.).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRemoveStock}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="productId">Produit</Label>
                <select
                  id="productId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={removeStockForm.productId}
                  onChange={(e) =>
                    setRemoveStockForm({ ...removeStockForm, productId: e.target.value })
                  }
                  required
                >
                  <option value="">Sélectionner un produit</option>
                  {beverageProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantité à retirer</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={removeStockForm.quantity}
                  onChange={(e) =>
                    setRemoveStockForm({ ...removeStockForm, quantity: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Raison (optionnel)</Label>
                <Input
                  id="reason"
                  value={removeStockForm.reason}
                  onChange={(e) =>
                    setRemoveStockForm({ ...removeStockForm, reason: e.target.value })
                  }
                  placeholder="Ex: Produit cassé"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                variant="destructive"
                disabled={removeStockMutation.isPending}
              >
                {removeStockMutation.isPending ? "Retrait en cours..." : "Retirer le stock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuster le Stock</DialogTitle>
            <DialogDescription>
              Ajustez directement le stock d'un produit à une valeur spécifique.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdjustStock}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="productId">Produit</Label>
                <select
                  id="productId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={adjustStockForm.productId}
                  onChange={(e) => {
                    const productId = e.target.value;
                    setAdjustStockForm({ ...adjustStockForm, productId });
                    
                    // If a product is selected, set current quantity
                    if (productId) {
                      const selectedProduct = inventoryItems.find(
                        (item) => item.productId === parseInt(productId)
                      );
                      if (selectedProduct) {
                        setAdjustStockForm({
                          ...adjustStockForm,
                          productId,
                          newQuantity: selectedProduct.quantity.toString(),
                        });
                      }
                    }
                  }}
                  required
                >
                  <option value="">Sélectionner un produit</option>
                  {beverageProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newQuantity">Nouvelle quantité</Label>
                <Input
                  id="newQuantity"
                  type="number"
                  min="0"
                  value={adjustStockForm.newQuantity}
                  onChange={(e) =>
                    setAdjustStockForm({ ...adjustStockForm, newQuantity: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Raison (optionnel)</Label>
                <Input
                  id="reason"
                  value={adjustStockForm.reason}
                  onChange={(e) =>
                    setAdjustStockForm({ ...adjustStockForm, reason: e.target.value })
                  }
                  placeholder="Ex: Inventaire annuel"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={adjustStockMutation.isPending}
              >
                {adjustStockMutation.isPending ? "Ajustement en cours..." : "Ajuster le stock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Inventory Dialog */}
      <Dialog open={isCreateInventoryOpen} onOpenChange={setIsCreateInventoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un produit à l'inventaire</DialogTitle>
            <DialogDescription>
              Ajoutez un nouveau produit à l'inventaire des boissons.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateInventory}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="productId">Produit</Label>
                <select
                  id="productId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={inventoryForm.productId}
                  onChange={(e) =>
                    setInventoryForm({ ...inventoryForm, productId: e.target.value })
                  }
                  required
                >
                  <option value="">Sélectionner un produit</option>
                  {productsWithoutInventory.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minThreshold">Seuil d'alerte minimum</Label>
                <Input
                  id="minThreshold"
                  type="number"
                  min="1"
                  value={inventoryForm.minThreshold}
                  onChange={(e) =>
                    setInventoryForm({ ...inventoryForm, minThreshold: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="purchasePrice">Prix d'achat (en DH)</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Prix d'achat unitaire"
                  value={inventoryForm.purchasePrice}
                  onChange={(e) =>
                    setInventoryForm({ ...inventoryForm, purchasePrice: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expirationDate">Date de péremption (optionnel)</Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={inventoryForm.expirationDate}
                  onChange={(e) =>
                    setInventoryForm({ ...inventoryForm, expirationDate: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={createInventoryMutation.isPending || !inventoryForm.productId}
              >
                {createInventoryMutation.isPending ? "Création en cours..." : "Créer l'entrée d'inventaire"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Inventory Dialog */}
      <Dialog open={isUpdateInventoryOpen} onOpenChange={setIsUpdateInventoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mettre à jour l'inventaire</DialogTitle>
            <DialogDescription>
              Modifiez les paramètres d'inventaire pour {selectedItem?.product.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateInventory}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="minThreshold">Seuil d'alerte minimum</Label>
                <Input
                  id="minThreshold"
                  type="number"
                  min="1"
                  value={inventoryForm.minThreshold}
                  onChange={(e) =>
                    setInventoryForm({ ...inventoryForm, minThreshold: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="purchasePrice">Prix d'achat (en DH)</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Prix d'achat unitaire"
                  value={inventoryForm.purchasePrice}
                  onChange={(e) =>
                    setInventoryForm({ ...inventoryForm, purchasePrice: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expirationDate">Date de péremption</Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={inventoryForm.expirationDate}
                  onChange={(e) =>
                    setInventoryForm({ ...inventoryForm, expirationDate: e.target.value })
                  }
                />
                {inventoryForm.expirationDate && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setInventoryForm({ ...inventoryForm, expirationDate: "" })}
                  >
                    Effacer la date
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={updateInventoryMutation.isPending}
              >
                {updateInventoryMutation.isPending ? "Mise à jour en cours..." : "Mettre à jour"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}