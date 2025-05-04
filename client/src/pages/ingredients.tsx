import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2, PlusCircle, Edit, BarChart } from 'lucide-react';

// Schéma de validation des ingrédients
const ingredientSchema = z.object({
  name: z.string().min(1, { message: 'Le nom est requis' }),
  description: z.string().optional(),
  unit: z.string().min(1, { message: "L'unité de mesure est requise" }),
  purchasePrice: z.coerce.number().min(0, { message: 'Le prix doit être positif' }).optional(),
  quantityInStock: z.coerce.number().min(0, { message: 'La quantité doit être positive' }).default(0),
  minThreshold: z.coerce.number().min(0, { message: 'Le seuil minimal doit être positif' }).default(5)
});

type IngredientFormValues = z.infer<typeof ingredientSchema>;

// Schéma de validation pour l'ajustement du stock
const stockAdjustmentSchema = z.object({
  quantity: z.coerce.number().min(1, { message: 'La quantité doit être positive' }),
  reason: z.string().optional()
});

type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>;

// Interface pour les ingrédients
interface Ingredient {
  id: number;
  name: string;
  description: string | null;
  unit: string;
  purchasePrice: number | null;
  quantityInStock: number;
  minThreshold: number;
  expirationDate: string | null;
  lastRestockDate: string;
  createdAt: string;
  updatedAt: string;
}

export default function IngredientsPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
  const [isRemoveStockDialogOpen, setIsRemoveStockDialogOpen] = useState(false);
  const [currentIngredient, setCurrentIngredient] = useState<Ingredient | null>(null);

  // Récupération des ingrédients
  const { data: ingredients, isLoading, error } = useQuery<Ingredient[]>({
    queryKey: ['/api/ingredients'],
    refetchOnWindowFocus: false
  });

  // Formulaire d'ajout/édition d'ingrédient
  const ingredientForm = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      name: '',
      description: '',
      unit: '',
      purchasePrice: 0,
      quantityInStock: 0,
      minThreshold: 5
    }
  });

  // Formulaire d'ajustement du stock
  const stockForm = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      quantity: 1,
      reason: ''
    }
  });

  // Mutation pour ajouter un ingrédient
  const addIngredientMutation = useMutation({
    mutationFn: async (data: IngredientFormValues) => {
      const res = await apiRequest('POST', '/api/ingredients', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] });
      toast({
        title: 'Ingrédient ajouté',
        description: "L'ingrédient a été ajouté avec succès",
      });
      setIsAddDialogOpen(false);
      ingredientForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: `Erreur lors de l'ajout de l'ingrédient: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Mutation pour mettre à jour un ingrédient
  const updateIngredientMutation = useMutation({
    mutationFn: async (data: IngredientFormValues & { id: number }) => {
      const { id, ...ingredientData } = data;
      const res = await apiRequest('PATCH', `/api/ingredients/${id}`, ingredientData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] });
      toast({
        title: 'Ingrédient mis à jour',
        description: "L'ingrédient a été mis à jour avec succès",
      });
      setIsEditDialogOpen(false);
      setCurrentIngredient(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: `Erreur lors de la mise à jour de l'ingrédient: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Mutation pour supprimer un ingrédient
  const deleteIngredientMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/ingredients/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] });
      toast({
        title: 'Ingrédient supprimé',
        description: "L'ingrédient a été supprimé avec succès",
      });
      setCurrentIngredient(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: `Erreur lors de la suppression de l'ingrédient: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Mutation pour ajouter du stock
  const addStockMutation = useMutation({
    mutationFn: async ({ id, quantity, reason }: { id: number, quantity: number, reason?: string }) => {
      const res = await apiRequest('POST', `/api/ingredients/${id}/add-stock`, { quantity, reason });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] });
      toast({
        title: 'Stock ajouté',
        description: "Le stock a été ajouté avec succès",
      });
      setIsAddStockDialogOpen(false);
      stockForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: `Erreur lors de l'ajout de stock: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Mutation pour retirer du stock
  const removeStockMutation = useMutation({
    mutationFn: async ({ id, quantity, reason }: { id: number, quantity: number, reason?: string }) => {
      const res = await apiRequest('POST', `/api/ingredients/${id}/remove-stock`, { quantity, reason });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] });
      toast({
        title: 'Stock retiré',
        description: "Le stock a été retiré avec succès",
      });
      setIsRemoveStockDialogOpen(false);
      stockForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: `Erreur lors du retrait de stock: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Gestion du formulaire d'ajout d'ingrédient
  const onAddIngredient = (data: IngredientFormValues) => {
    addIngredientMutation.mutate(data);
  };

  // Gestion du formulaire d'édition d'ingrédient
  const onUpdateIngredient = (data: IngredientFormValues) => {
    if (currentIngredient) {
      updateIngredientMutation.mutate({ ...data, id: currentIngredient.id });
    }
  };

  // Gestion de l'ajout de stock
  const onAddStock = (data: StockAdjustmentFormValues) => {
    if (currentIngredient) {
      addStockMutation.mutate({
        id: currentIngredient.id,
        quantity: data.quantity,
        reason: data.reason
      });
    }
  };

  // Gestion du retrait de stock
  const onRemoveStock = (data: StockAdjustmentFormValues) => {
    if (currentIngredient) {
      removeStockMutation.mutate({
        id: currentIngredient.id,
        quantity: data.quantity,
        reason: data.reason
      });
    }
  };

  // Ouvrir la boîte de dialogue d'édition
  const openEditDialog = (ingredient: Ingredient) => {
    setCurrentIngredient(ingredient);
    ingredientForm.reset({
      name: ingredient.name,
      description: ingredient.description || '',
      unit: ingredient.unit,
      purchasePrice: ingredient.purchasePrice || 0,
      quantityInStock: ingredient.quantityInStock,
      minThreshold: ingredient.minThreshold
    });
    setIsEditDialogOpen(true);
  };

  // Ouvrir la boîte de dialogue d'ajout de stock
  const openAddStockDialog = (ingredient: Ingredient) => {
    setCurrentIngredient(ingredient);
    stockForm.reset({
      quantity: 1,
      reason: `Réapprovisionnement de ${ingredient.name}`
    });
    setIsAddStockDialogOpen(true);
  };

  // Ouvrir la boîte de dialogue de retrait de stock
  const openRemoveStockDialog = (ingredient: Ingredient) => {
    setCurrentIngredient(ingredient);
    stockForm.reset({
      quantity: 1,
      reason: `Utilisation manuelle de ${ingredient.name}`
    });
    setIsRemoveStockDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-2xl font-bold text-destructive">Erreur</h2>
        <p className="text-muted-foreground">Une erreur est survenue lors du chargement des ingrédients.</p>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Ingrédients</h1>
          <p className="text-muted-foreground">
            Gérez les ingrédients utilisés dans vos recettes de café et autres boissons.
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Ajouter un ingrédient
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Ajouter un nouvel ingrédient</DialogTitle>
              <DialogDescription>
                Entrez les détails du nouvel ingrédient que vous souhaitez ajouter au système.
              </DialogDescription>
            </DialogHeader>
            <Form {...ingredientForm}>
              <form onSubmit={ingredientForm.handleSubmit(onAddIngredient)} className="space-y-4">
                <FormField
                  control={ingredientForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input placeholder="Café moulu" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ingredientForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Description (optionnelle)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ingredientForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unité de mesure</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez une unité" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="g">Grammes (g)</SelectItem>
                          <SelectItem value="kg">Kilogrammes (kg)</SelectItem>
                          <SelectItem value="ml">Millilitres (ml)</SelectItem>
                          <SelectItem value="L">Litres (L)</SelectItem>
                          <SelectItem value="pcs">Pièces</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choisissez l'unité de mesure pour cet ingrédient.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={ingredientForm.control}
                    name="purchasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix d'achat (DH)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={ingredientForm.control}
                    name="quantityInStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qté en stock</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={ingredientForm.control}
                    name="minThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seuil min.</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={addIngredientMutation.isPending}
                    className="gap-2"
                  >
                    {addIngredientMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Ajouter l'ingrédient
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Liste des ingrédients</CardTitle>
          <CardDescription>
            Tous les ingrédients disponibles pour vos recettes de café et autres boissons.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead className="text-right">Prix d'achat (DH)</TableHead>
                <TableHead className="text-right">Qté en stock</TableHead>
                <TableHead className="text-right">Seuil min.</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingredients && ingredients.length > 0 ? (
                ingredients.map((ingredient) => (
                  <TableRow key={ingredient.id}>
                    <TableCell className="font-medium">{ingredient.name}</TableCell>
                    <TableCell>{ingredient.unit}</TableCell>
                    <TableCell className="text-right">{ingredient.purchasePrice || '-'}</TableCell>
                    <TableCell className={`text-right ${ingredient.quantityInStock <= ingredient.minThreshold ? 'text-destructive font-medium' : ''}`}>
                      {ingredient.quantityInStock}
                    </TableCell>
                    <TableCell className="text-right">{ingredient.minThreshold}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAddStockDialog(ingredient)}
                          title="Ajouter du stock"
                        >
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRemoveStockDialog(ingredient)}
                          title="Retirer du stock"
                          disabled={ingredient.quantityInStock <= 0}
                        >
                          <BarChart className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(ingredient)}
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action ne peut pas être annulée. Cela supprimera définitivement
                                l'ingrédient "{ingredient.name}" et tous les enregistrements associés.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteIngredientMutation.mutate(ingredient.id)}
                              >
                                {deleteIngredientMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Aucun ingrédient trouvé. Ajoutez votre premier ingrédient !
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogue d'édition d'ingrédient */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier l'ingrédient</DialogTitle>
            <DialogDescription>
              Modifiez les détails de l'ingrédient.
            </DialogDescription>
          </DialogHeader>
          <Form {...ingredientForm}>
            <form onSubmit={ingredientForm.handleSubmit(onUpdateIngredient)} className="space-y-4">
              <FormField
                control={ingredientForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={ingredientForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={ingredientForm.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unité de mesure</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une unité" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="g">Grammes (g)</SelectItem>
                        <SelectItem value="kg">Kilogrammes (kg)</SelectItem>
                        <SelectItem value="ml">Millilitres (ml)</SelectItem>
                        <SelectItem value="L">Litres (L)</SelectItem>
                        <SelectItem value="pcs">Pièces</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={ingredientForm.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix d'achat (DH)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ingredientForm.control}
                  name="quantityInStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qté en stock</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ingredientForm.control}
                  name="minThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seuil min.</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updateIngredientMutation.isPending}
                  className="gap-2"
                >
                  {updateIngredientMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Enregistrer les modifications
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialogue d'ajout de stock */}
      <Dialog open={isAddStockDialogOpen} onOpenChange={setIsAddStockDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ajouter du stock</DialogTitle>
            <DialogDescription>
              {currentIngredient?.name ? `Ajoutez du stock pour ${currentIngredient.name}` : ''}
            </DialogDescription>
          </DialogHeader>
          <Form {...stockForm}>
            <form onSubmit={stockForm.handleSubmit(onAddStock)} className="space-y-4">
              <FormField
                control={stockForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantité à ajouter ({currentIngredient?.unit})</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stockForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Raison (optionnelle)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Achat, réapprovisionnement, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={addStockMutation.isPending}
                  className="gap-2"
                >
                  {addStockMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Ajouter au stock
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialogue de retrait de stock */}
      <Dialog open={isRemoveStockDialogOpen} onOpenChange={setIsRemoveStockDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Retirer du stock</DialogTitle>
            <DialogDescription>
              {currentIngredient?.name ? `Retirez du stock pour ${currentIngredient.name}` : ''}
            </DialogDescription>
          </DialogHeader>
          <Form {...stockForm}>
            <form onSubmit={stockForm.handleSubmit(onRemoveStock)} className="space-y-4">
              <FormField
                control={stockForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantité à retirer ({currentIngredient?.unit})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max={currentIngredient?.quantityInStock}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Stock disponible: {currentIngredient?.quantityInStock} {currentIngredient?.unit}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stockForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Raison (optionnelle)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Utilisation, perte, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={removeStockMutation.isPending || (currentIngredient?.quantityInStock || 0) <= 0}
                  className="gap-2"
                >
                  {removeStockMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Retirer du stock
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}