import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Coffee, Cog, Edit, Plus, ShoppingBasket, Trash2, 
  CupSoda, ToggleLeft, ToggleRight 
} from "lucide-react";
import { Product } from "@shared/schema";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const productFormSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  price: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: "Le prix doit être un nombre positif",
    }),
  category: z.string().min(1, { message: "La catégorie est requise" }),
  isActive: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function ProductsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Fetch products
  const {
    data: products = [] as Product[],
    isLoading,
    error,
  } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      price: "",
      category: "",
      isActive: true,
    },
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const res = await apiRequest("POST", "/api/products", {
        ...values,
        price: parseFloat(values.price),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsProductDialogOpen(false);
      form.reset();
      toast({
        title: "Produit créé",
        description: "Le produit a été ajouté avec succès.",
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

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (values: ProductFormValues & { id: number }) => {
      const { id, ...data } = values;
      const res = await apiRequest("PATCH", `/api/products/${id}`, {
        ...data,
        price: parseFloat(data.price),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      form.reset();
      toast({
        title: "Produit mis à jour",
        description: "Le produit a été mis à jour avec succès.",
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

  // Toggle product active status
  const toggleProductActiveMutation = useMutation({
    mutationFn: async (product: Product) => {
      const res = await apiRequest("PATCH", `/api/products/${product.id}`, {
        isActive: !product.isActive,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Statut mis à jour",
        description: "Le statut du produit a été mis à jour avec succès.",
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

  const handleSubmit = (values: ProductFormValues) => {
    // Empêcher l'ajout de nouvelles boissons depuis cette page (sauf modification)
    if (values.category === "beverage" && !editingProduct) {
      toast({
        title: "Opération non autorisée",
        description: "Les nouvelles boissons doivent être ajoutées depuis la gestion du stock",
        variant: "destructive",
      });
      return;
    }

    if (editingProduct) {
      updateProductMutation.mutate({
        ...values,
        id: editingProduct.id,
      });
    } else {
      createProductMutation.mutate(values);
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      price: product.price.toString(),
      category: product.category,
      isActive: product.isActive,
    });
    setIsProductDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    form.reset({
      name: "",
      price: "",
      category: "",
      isActive: true,
    });
    setIsProductDialogOpen(true);
  };

  // Filter products by category
  const filteredProducts = products.filter((product: Product) => {
    if (activeTab === "all") return true;
    return product.category === activeTab;
  });

  // Count products by category
  const categoryCounts = products.reduce((acc: Record<string, number>, product: Product) => {
    const category = product.category;
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category]++;
    return acc;
  }, {} as Record<string, number>);

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <h1 className="text-2xl font-bold mb-2">Accès refusé</h1>
          <p className="text-gray-600">
            Vous n'avez pas l'autorisation d'accéder à cette page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Menu Café</h1>
          <p className="text-gray-500">
            Gérez les boissons et produits qui apparaissent sur le menu client pour la vente
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Produit
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 flex flex-wrap">
          <TabsTrigger value="all">
            <ShoppingBasket className="h-4 w-4 mr-2" />
            Tous ({products.length})
          </TabsTrigger>
          <TabsTrigger value="beverage">
            <CupSoda className="h-4 w-4 mr-2" />
            Boissons ({categoryCounts.beverage || 0})
          </TabsTrigger>
          <TabsTrigger value="coffee">
            <Coffee className="h-4 w-4 mr-2" />
            Café ({categoryCounts.coffee || 0})
          </TabsTrigger>
          <TabsTrigger value="other">
            <Cog className="h-4 w-4 mr-2" />
            Autres ({categoryCounts.other || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === "all"
                  ? "Tous les produits"
                  : activeTab === "beverage"
                  ? "Boissons"
                  : activeTab === "coffee"
                  ? "Cafés"
                  : "Autres produits"}
              </CardTitle>
              <CardDescription>
                Gérez les produits, leurs prix et leur disponibilité
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Chargement des produits...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Aucun produit trouvé</p>
                  <Button onClick={openCreateDialog}>
                    Ajouter un produit
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product: Product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell>
                            {product.category === "beverage" && (
                              <Badge variant="secondary">
                                <CupSoda className="h-3 w-3 mr-1" />
                                Boisson
                              </Badge>
                            )}
                            {product.category === "coffee" && (
                              <Badge variant="secondary">
                                <Coffee className="h-3 w-3 mr-1" />
                                Café
                              </Badge>
                            )}
                            {product.category === "other" && (
                              <Badge variant="secondary">
                                <Cog className="h-3 w-3 mr-1" />
                                Autre
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{product.price} DH</TableCell>
                          <TableCell>
                            <Badge
                              variant={product.isActive ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => toggleProductActiveMutation.mutate(product)}
                            >
                              {product.isActive ? (
                                <>
                                  <ToggleRight className="h-3 w-3 mr-1" />
                                  Actif
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="h-3 w-3 mr-1" />
                                  Inactif
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(product)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => {
                                  setProductToDelete(product);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
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
      </Tabs>

      {/* Product Form Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Modifier un produit" : "Ajouter un produit"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Modifiez les informations du produit ci-dessous."
                : "Ajoutez un nouveau produit au menu."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du produit</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Café expresso" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix (DH)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Prix en DH"
                        min="0"
                        step="0.01"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une catégorie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="coffee">Café</SelectItem>
                        {/* Désactivation de l'option boisson dans la gestion des produits */}
                        {editingProduct?.category === "beverage" ? (
                          <SelectItem value="beverage">Boisson</SelectItem>
                        ) : (
                          <SelectItem
                            value="beverage"
                            disabled
                            className="text-muted-foreground"
                          >
                            Boisson (géré dans Stock)
                          </SelectItem>
                        )}
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Disponible à la vente</FormLabel>
                      <FormDescription>
                        Déterminez si ce produit peut être commandé par les clients
                      </FormDescription>
                    </div>
                    <FormControl>
                      <div
                        className={`cursor-pointer p-2 rounded-full ${
                          field.value
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                        onClick={() => field.onChange(!field.value)}
                      >
                        {field.value ? (
                          <ToggleRight className="h-6 w-6" />
                        ) : (
                          <ToggleLeft className="h-6 w-6" />
                        )}
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setIsProductDialogOpen(false);
                    setEditingProduct(null);
                    form.reset();
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit">
                  {editingProduct ? "Mettre à jour" : "Ajouter"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le produit</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce produit ? Cette action ne peut pas être annulée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setProductToDelete(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                // Cette fonctionnalité nécessite d'ajouter une méthode DELETE dans l'API
                toast({
                  title: "Information",
                  description: "La suppression de produits n'est pas encore implémentée. Désactivez plutôt le produit.",
                });
                setDeleteDialogOpen(false);
                setProductToDelete(null);
              }}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}