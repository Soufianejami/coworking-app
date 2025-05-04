import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Loader2, Trash2, PlusCircle, Edit, Check, X, Coffee } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Interface pour les ingrédients
interface Ingredient {
  id: number;
  name: string;
  unit: string;
  quantityInStock: number;
}

// Interface pour les produits
interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  isActive: boolean;
}

// Interface pour les recettes
interface Recipe {
  id: number;
  productId: number;
  name: string;
  description: string | null;
  product: Product;
  ingredients: RecipeIngredient[];
}

// Interface pour les ingrédients de recette
interface RecipeIngredient {
  id: number;
  recipeId: number;
  ingredientId: number;
  quantity: number;
  ingredient: Ingredient;
}

// Schéma pour le formulaire de recette
const recipeFormSchema = z.object({
  name: z.string().min(1, { message: 'Le nom est requis' }),
  description: z.string().optional(),
  productId: z.string().min(1, { message: 'Le produit est requis' }),
  ingredients: z.array(z.object({
    ingredientId: z.string().min(1, { message: "L'ingrédient est requis" }),
    quantity: z.coerce.number().min(0.01, { message: 'La quantité doit être positive' })
  })).min(1, { message: 'Au moins un ingrédient est requis' })
});

type RecipeFormValues = z.infer<typeof recipeFormSchema>;

export default function RecipesPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);

  // Requêtes pour obtenir les données
  const { data: recipes, isLoading: isLoadingRecipes } = useQuery<Recipe[]>({
    queryKey: ['/api/recipes'],
    refetchOnWindowFocus: false
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    refetchOnWindowFocus: false
  });

  const { data: ingredients, isLoading: isLoadingIngredients } = useQuery<Ingredient[]>({
    queryKey: ['/api/ingredients'],
    refetchOnWindowFocus: false
  });

  // Filtrer les produits pour n'afficher tous les produits café et boissons, qu'ils soient actifs ou non
  // Inclure tous les produits de catégorie café, coffee, beverage ou autre
  const cafeProducts = products?.filter(p => 
    // Vérifier toutes les catégories possibles
    ['cafe', 'coffee', 'beverage', 'café', 'other'].includes(p.category)
  ) || [];
  
  // Afficher dans la console les produits filtrés et ceux qui ont été exclus pour le débogage
  console.log("Tous les produits:", products);
  console.log("Produits de café filtrés:", cafeProducts);
  console.log("Produits exclus:", products?.filter(p => !['cafe', 'coffee', 'beverage', 'café', 'other'].includes(p.category)));

  // Configuration du formulaire
  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      name: '',
      description: '',
      productId: '',
      ingredients: [{ ingredientId: '', quantity: 0 }]
    }
  });

  // Configuration des champs de tableau pour les ingrédients
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ingredients"
  });

  // Mutations pour les opérations CRUD
  const addRecipeMutation = useMutation({
    mutationFn: async (data: RecipeFormValues) => {
      const payload = {
        recipe: {
          name: data.name,
          description: data.description,
          productId: parseInt(data.productId)
        },
        ingredients: data.ingredients.map(ing => ({
          ingredientId: parseInt(ing.ingredientId),
          quantity: ing.quantity
        }))
      };

      const res = await apiRequest('POST', '/api/recipes', payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      toast({
        title: 'Recette ajoutée',
        description: 'La recette a été ajoutée avec succès'
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: `Erreur lors de l'ajout de la recette: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  const updateRecipeMutation = useMutation({
    mutationFn: async (data: RecipeFormValues & { id: number }) => {
      const { id, ...formData } = data;
      const payload = {
        recipe: {
          name: formData.name,
          description: formData.description,
          productId: parseInt(formData.productId)
        },
        ingredients: formData.ingredients.map(ing => ({
          ingredientId: parseInt(ing.ingredientId),
          quantity: ing.quantity
        }))
      };

      const res = await apiRequest('PATCH', `/api/recipes/${id}`, payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      toast({
        title: 'Recette mise à jour',
        description: 'La recette a été mise à jour avec succès'
      });
      setIsEditDialogOpen(false);
      setCurrentRecipe(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: `Erreur lors de la mise à jour de la recette: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/recipes/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      toast({
        title: 'Recette supprimée',
        description: 'La recette a été supprimée avec succès'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: `Erreur lors de la suppression de la recette: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Gestionnaires d'événements
  const onAddRecipe = (data: RecipeFormValues) => {
    addRecipeMutation.mutate(data);
  };

  const onUpdateRecipe = (data: RecipeFormValues) => {
    if (currentRecipe) {
      updateRecipeMutation.mutate({ ...data, id: currentRecipe.id });
    }
  };

  const openEditDialog = (recipe: Recipe) => {
    setCurrentRecipe(recipe);
    
    // Préparer les données pour le formulaire
    form.reset({
      name: recipe.name,
      description: recipe.description || '',
      productId: recipe.productId.toString(),
      ingredients: recipe.ingredients.map(ing => ({
        ingredientId: ing.ingredientId.toString(),
        quantity: ing.quantity
      }))
    });
    
    setIsEditDialogOpen(true);
  };

  const isLoading = isLoadingRecipes || isLoadingProducts || isLoadingIngredients;

  // Effet pour pré-remplir le nom de la recette en fonction du produit sélectionné
  useEffect(() => {
    const productId = form.watch('productId');
    if (productId && products) {
      const selectedProduct = products.find(p => p.id === parseInt(productId));
      if (selectedProduct && !isEditDialogOpen) {
        form.setValue('name', selectedProduct.name);
      }
    }
  }, [form.watch('productId'), products, form, isEditDialogOpen]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fiches Techniques</h1>
          <p className="text-muted-foreground">
            Définissez les ingrédients et les quantités nécessaires pour préparer chaque boisson du menu.
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Créer une recette
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Créer une nouvelle fiche technique</DialogTitle>
              <DialogDescription>
                Définissez les ingrédients et les quantités précises nécessaires pour préparer ce produit.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onAddRecipe)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Produit</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un produit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cafeProducts.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} - {product.price} DH
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choisissez le produit pour lequel vous créez cette recette.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de la recette</FormLabel>
                      <FormControl>
                        <Input placeholder="Café espresso" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-base">Ingrédients</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ ingredientId: '', quantity: 0 })}
                      className="gap-1"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Ajouter un ingrédient
                    </Button>
                  </div>
                  <div className="border rounded-md p-4 space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex gap-4 items-end">
                        <FormField
                          control={form.control}
                          name={`ingredients.${index}.ingredientId`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Ingrédient {index + 1}</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionnez un ingrédient" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {ingredients?.map((ingredient) => (
                                    <SelectItem key={ingredient.id} value={ingredient.id.toString()}>
                                      {ingredient.name} ({ingredient.unit})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`ingredients.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem className="w-32">
                              <FormLabel>Quantité</FormLabel>
                              <FormControl>
                                <Input type="number" min="0.01" step="0.01" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => fields.length > 1 && remove(index)}
                          className="mb-2 text-destructive hover:text-destructive"
                          disabled={fields.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  {form.formState.errors.ingredients?.root && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.ingredients.root.message}
                    </p>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={addRecipeMutation.isPending}
                    className="gap-2"
                  >
                    {addRecipeMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Créer la recette
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
          <CardTitle>Liste des fiches techniques</CardTitle>
          <CardDescription>
            Toutes les fiches techniques qui définissent les quantités précises d'ingrédients pour chaque boisson.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Produit associé</TableHead>
                <TableHead>Prix de vente</TableHead>
                <TableHead>Ingrédients</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipes && recipes.length > 0 ? (
                recipes.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Coffee className="h-4 w-4 text-muted-foreground" />
                        {recipe.name}
                      </div>
                    </TableCell>
                    <TableCell>{recipe.product.name}</TableCell>
                    <TableCell>{recipe.product.price} DH</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {recipe.ingredients.map((ing) => (
                          <Badge key={ing.id} variant="outline" className="whitespace-nowrap">
                            {ing.ingredient.name}: {ing.quantity} {ing.ingredient.unit}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(recipe)}
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
                                la recette "{recipe.name}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteRecipeMutation.mutate(recipe.id)}
                              >
                                {deleteRecipeMutation.isPending ? (
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
                  <TableCell colSpan={5} className="text-center">
                    Aucune recette trouvée. Créez votre première recette !
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogue d'édition de recette */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Modifier la recette</DialogTitle>
            <DialogDescription>
              Modifiez les ingrédients et les quantités de cette recette.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpdateRecipe)} className="space-y-4">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produit</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un produit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cafeProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name} - {product.price} DH
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de la recette</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-base">Ingrédients</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ ingredientId: '', quantity: 0 })}
                    className="gap-1"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Ajouter un ingrédient
                  </Button>
                </div>
                <div className="border rounded-md p-4 space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-4 items-end">
                      <FormField
                        control={form.control}
                        name={`ingredients.${index}.ingredientId`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Ingrédient {index + 1}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionnez un ingrédient" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ingredients?.map((ingredient) => (
                                  <SelectItem key={ingredient.id} value={ingredient.id.toString()}>
                                    {ingredient.name} ({ingredient.unit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`ingredients.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem className="w-32">
                            <FormLabel>Quantité</FormLabel>
                            <FormControl>
                              <Input type="number" min="0.01" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => fields.length > 1 && remove(index)}
                        className="mb-2 text-destructive hover:text-destructive"
                        disabled={fields.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {form.formState.errors.ingredients?.root && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.ingredients.root.message}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updateRecipeMutation.isPending}
                  className="gap-2"
                >
                  {updateRecipeMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Enregistrer les modifications
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}