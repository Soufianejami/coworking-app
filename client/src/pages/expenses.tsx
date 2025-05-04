import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { Expense, ExpenseCategory, EXPENSE_CATEGORIES, insertExpenseSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import MainLayout from "@/components/layout/main-layout";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { DateRange } from "react-day-picker";
import { addDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2, Pencil, Plus, Trash2, FilterX } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

// Form schema for creating/updating an expense
const expenseFormSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().min(3, "La description doit comporter au moins 3 caractères"),
  amount: z.coerce.number().positive("Le montant doit être positif"),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Format de date invalide",
  }),
});

export default function ExpensesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  
  // Fetch all expenses
  const { data: expenses = [], isLoading } = useQuery<Expense[], Error>({
    queryKey: ["/api/expenses"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Combined effect to handle initialization and filtering
  useEffect(() => {
    // Only set default date range once when data is first loaded
    if (expenses.length > 0) {
      if (!dateRange) {
        // Initialize with current month by default
        const now = new Date();
        setDateRange({
          from: startOfMonth(now),
          to: endOfMonth(now)
        });
        return; // Don't filter yet, we'll do it when dateRange changes
      }
      
      // Handle filtering with date range
      if (dateRange.from) {
        const filtered = expenses.filter(expense => {
          const expenseDate = new Date(expense.date);
          
          if (dateRange.to) {
            // Use explicit date objects to avoid type issues
            return isWithinInterval(expenseDate, {
              start: new Date(dateRange.from as Date),
              end: new Date(dateRange.to as Date)
            });
          } else {
            // If only from date exists (single day selection)
            return expenseDate.toDateString() === new Date(dateRange.from as Date).toDateString();
          }
        });
        setFilteredExpenses(filtered);
      } else {
        // No valid date range, show all expenses
        setFilteredExpenses(expenses);
      }
    } else {
      // No expenses, empty filter result
      setFilteredExpenses([]);
    }
  }, [expenses, dateRange]);

  // Create expense form
  const createForm = useForm<z.infer<typeof expenseFormSchema>>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      category: "rent",
      description: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0], // Format as YYYY-MM-DD
    },
  });

  // Update expense form
  const updateForm = useForm<z.infer<typeof expenseFormSchema>>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      category: "rent",
      description: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
    },
  });

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof expenseFormSchema>) => {
      const expenseData = {
        ...data,
        date: new Date(data.date),
      };
      const res = await apiRequest("POST", "/api/expenses", expenseData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erreur lors de la création de la dépense");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setOpenCreateDialog(false);
      createForm.reset({
        category: "rent",
        description: "",
        amount: 0,
        date: new Date().toISOString().split("T")[0],
      });
      toast({
        title: "Dépense créée",
        description: "La dépense a été créée avec succès",
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

  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof expenseFormSchema> }) => {
      // Assurons-nous que la date est formatée correctement
      const expenseData = {
        ...data,
        // Formatage explicite de la date en ISO string
        date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
        // Assurons-nous que le montant est bien un nombre
        amount: Number(data.amount)
      };
      const res = await apiRequest("PATCH", `/api/expenses/${id}`, expenseData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erreur lors de la mise à jour de la dépense");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setOpenEditDialog(false);
      updateForm.reset();
      toast({
        title: "Dépense mise à jour",
        description: "La dépense a été mise à jour avec succès",
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

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/expenses/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erreur lors de la suppression de la dépense");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Dépense supprimée",
        description: "La dépense a été supprimée avec succès",
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

  // Calculate total expenses based on filtered data if available
  const totalExpenses = filteredExpenses.length > 0 
    ? filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
    : expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  // Function to reset the date filter
  const resetDateFilter = () => {
    setDateRange(undefined);
    setFilteredExpenses(expenses);
  };

  // Handle expense creation
  function onCreateExpense(data: z.infer<typeof expenseFormSchema>) {
    createExpenseMutation.mutate(data);
  }

  // Handle expense update
  function onUpdateExpense(data: z.infer<typeof expenseFormSchema>) {
    if (selectedExpense) {
      updateExpenseMutation.mutate({ id: selectedExpense.id, data });
    }
  }

  // Handle selecting an expense for editing
  function handleEditExpense(expense: Expense) {
    setSelectedExpense(expense);
    updateForm.reset({
      category: expense.category,
      description: expense.description || "",
      amount: Number(expense.amount),
      date: new Date(expense.date).toISOString().split("T")[0],
    });
    setOpenEditDialog(true);
  }

  // Handle confirming expense deletion
  function handleDeleteExpense(id: number) {
    deleteExpenseMutation.mutate(id);
  }

  // Get category badge variant
  function getCategoryBadgeVariant(category: ExpenseCategory) {
    switch (category) {
      case "rent":
        return "default";
      case "electricity":
        return "destructive";
      case "water":
        return "blue";
      case "wifi":
        return "purple";
      case "supplies":
        return "yellow";
      case "maintenance":
        return "orange";
      default:
        return "secondary";
    }
  }

  // Get human-readable category name
  function getCategoryName(category: ExpenseCategory) {
    const categoryMap: Record<ExpenseCategory, string> = {
      rent: "Loyer",
      electricity: "Électricité",
      water: "Eau",
      wifi: "Internet",
      supplies: "Fournitures",
      maintenance: "Maintenance",
      other: "Autre",
    };
    return categoryMap[category] || category;
  }

  // Filter expenses based on date range
  const expensesToShow = filteredExpenses.length > 0 ? filteredExpenses : expenses;
  
  // Helper function to set date to first or last day of month
  const setCurrentMonth = () => {
    const now = new Date();
    setDateRange({ 
      from: startOfMonth(now), 
      to: endOfMonth(now) 
    });
  };
  
  // Group expenses by month
  const expensesByMonth: Record<string, Expense[]> = {};
  expensesToShow.forEach((expense) => {
    const date = new Date(expense.date);
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!expensesByMonth[monthYear]) {
      expensesByMonth[monthYear] = [];
    }
    expensesByMonth[monthYear].push(expense);
  });

  // Sort months in descending order
  const sortedMonths = Object.keys(expensesByMonth).sort((a, b) => b.localeCompare(a));

  return (
    <div className="container py-6">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gestion des Dépenses</CardTitle>
            <CardDescription>
              Suivez et gérez les dépenses mensuelles de votre espace de coworking
            </CardDescription>
          </div>
          {isAdmin && (
            <Button onClick={() => setOpenCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Dépense
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Date Filter */}
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div className="flex-1">
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={setCurrentMonth}
                variant="outline"
                size="sm"
              >
                Mois courant
              </Button>
              {dateRange && (
                <Button
                  onClick={resetDateFilter}
                  variant="outline"
                  size="sm"
                >
                  <FilterX className="mr-2 h-4 w-4" />
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total des Dépenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Loyer & Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    filteredExpenses.length > 0
                      ? filteredExpenses
                          .filter((e) => ["rent", "electricity", "water", "wifi"].includes(e.category))
                          .reduce((sum, e) => sum + Number(e.amount), 0)
                      : expenses
                          .filter((e) => ["rent", "electricity", "water", "wifi"].includes(e.category))
                          .reduce((sum, e) => sum + Number(e.amount), 0)
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Fournitures & Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    filteredExpenses.length > 0
                      ? filteredExpenses
                          .filter((e) => ["supplies", "maintenance", "other"].includes(e.category))
                          .reduce((sum, e) => sum + Number(e.amount), 0)
                      : expenses
                          .filter((e) => ["supplies", "maintenance", "other"].includes(e.category))
                          .reduce((sum, e) => sum + Number(e.amount), 0)
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Expenses by Month */}
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            Aucune dépense enregistrée
          </CardContent>
        </Card>
      ) : (
        sortedMonths.map((month) => {
          const monthExpenses = expensesByMonth[month];
          const monthTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
          const [year, monthNum] = month.split("-");
          const monthName = new Date(parseInt(year), parseInt(monthNum) - 1, 1).toLocaleDateString(
            "fr-FR",
            { month: "long", year: "numeric" }
          );

          return (
            <Card key={month} className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  <span className="capitalize">{monthName}</span>
                </CardTitle>
                <CardDescription>
                  Total: {formatCurrency(monthTotal)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{formatDate(expense.date, "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant={getCategoryBadgeVariant(expense.category) as any}>
                            {getCategoryName(expense.category)}
                          </Badge>
                        </TableCell>
                        <TableCell>{expense.description || "-"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(expense.amount))}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditExpense(expense)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Êtes-vous sûr de vouloir supprimer cette dépense ?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteExpense(expense.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Create Expense Dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle dépense</DialogTitle>
            <DialogDescription>
              Ajoutez les détails de la nouvelle dépense
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateExpense)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une catégorie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="rent">Loyer</SelectItem>
                        <SelectItem value="electricity">Électricité</SelectItem>
                        <SelectItem value="water">Eau</SelectItem>
                        <SelectItem value="wifi">Internet</SelectItem>
                        <SelectItem value="supplies">Fournitures</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Description de la dépense" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (DH)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenCreateDialog(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createExpenseMutation.isPending}>
                  {createExpenseMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    "Créer"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier la dépense</DialogTitle>
            <DialogDescription>
              Modifiez les détails de la dépense
            </DialogDescription>
          </DialogHeader>
          <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(onUpdateExpense)} className="space-y-4">
              <FormField
                control={updateForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une catégorie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="rent">Loyer</SelectItem>
                        <SelectItem value="electricity">Électricité</SelectItem>
                        <SelectItem value="water">Eau</SelectItem>
                        <SelectItem value="wifi">Internet</SelectItem>
                        <SelectItem value="supplies">Fournitures</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Description de la dépense" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (DH)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenEditDialog(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={updateExpenseMutation.isPending}>
                  {updateExpenseMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    "Enregistrer"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      </div>
  );
}