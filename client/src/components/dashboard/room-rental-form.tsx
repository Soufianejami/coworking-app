import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Clock, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

// Schéma pour la validation du formulaire
const roomRentalSchema = z.object({
  roomType: z.enum(["grande", "moyenne", "petite", "salle_reunion"]),
  price: z.number().min(0, "Le prix doit être un nombre positif"),
  clientName: z.string().min(2, "Le nom du client est requis"),
  clientContact: z.string().optional(),
  date: z.date(),
  startTime: z.date(),
  endTime: z.date(),
  notes: z.string().optional(),
  paymentMethod: z.enum(["cash", "card", "mobile_transfer"]),
});

type RoomRentalFormData = z.infer<typeof roomRentalSchema>;

interface RoomRentalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RoomRentalForm({ open, onOpenChange }: RoomRentalFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState<Date | undefined>(new Date());
  const [endTime, setEndTime] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setHours(date.getHours() + 1);
    return date;
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<RoomRentalFormData>({
    resolver: zodResolver(roomRentalSchema),
    defaultValues: {
      roomType: "grande",
      price: 0,
      clientName: "",
      clientContact: "",
      paymentMethod: "cash",
      notes: "",
    }
  });

  // Mutation pour créer une nouvelle location
  const createRentalMutation = useMutation({
    mutationFn: async (data: RoomRentalFormData) => {
      const response = await apiRequest("POST", "/api/room-rentals", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors de la création de la location");
      }
      return await response.json();
    },
    onSuccess: () => {
      // Rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["/api/room-rentals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/daily"] });
      
      // Afficher un message de succès
      toast({
        title: "Location ajoutée",
        description: "La location a été enregistrée avec succès.",
      });
      
      // Réinitialiser et fermer le formulaire
      reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Gérer la soumission du formulaire
  const onSubmit = async (data: RoomRentalFormData) => {
    try {
      // Vérification pour s'assurer que toutes les dates sont valides
      if (!selectedDate || !startTime || !endTime) {
        toast({
          title: "Erreur de validation",
          description: "Veuillez sélectionner toutes les dates et heures.",
          variant: "destructive",
        });
        return;
      }
      
      // Création du payload avec les dates assurées comme définies
      const payload = {
        ...data,
        date: selectedDate as Date,
        startTime: startTime as Date,
        endTime: endTime as Date,
      };
      
      // Appel direct de l'API
      const response = await fetch("/api/room-rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la création de la location");
      }
      
      // Traitement de la réponse
      const newRental = await response.json();
      
      // Rafraîchir les données et afficher un message de succès
      queryClient.invalidateQueries({ queryKey: ["/api/room-rentals"] });
      
      toast({
        title: "Location ajoutée",
        description: "La location a été enregistrée avec succès.",
      });
      
      // Réinitialiser et fermer le formulaire
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  // Formatage de l'heure pour l'affichage
  const formatTimeDisplay = (date?: Date) => {
    if (!date) return "";
    return format(date, "HH:mm");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Nouvelle Location de Salle</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type de salle et prix */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roomType">Type de salle</Label>
              <Select 
                defaultValue="grande"
                onValueChange={(value) => setValue("roomType", value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grande">Grande Salle</SelectItem>
                  <SelectItem value="moyenne">Salle Moyenne</SelectItem>
                  <SelectItem value="petite">Petite Salle</SelectItem>
                  <SelectItem value="salle_reunion">Salle de Réunion</SelectItem>
                </SelectContent>
              </Select>
              {errors.roomType && (
                <p className="text-sm text-red-500">{errors.roomType.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Prix (DH)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                {...register("price", { valueAsNumber: true })}
              />
              {errors.price && (
                <p className="text-sm text-red-500">{errors.price.message}</p>
              )}
            </div>
          </div>
          
          {/* Informations client */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nom du client</Label>
              <Input id="clientName" {...register("clientName")} />
              {errors.clientName && (
                <p className="text-sm text-red-500">{errors.clientName.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientContact">Contact (tél/email)</Label>
              <Input id="clientContact" {...register("clientContact")} />
            </div>
          </div>
          
          {/* Date et heures */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "d MMMM yyyy", { locale: fr })
                    ) : (
                      <span>Sélectionner une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setValue("date", date as Date);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Heure début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startTime && "text-muted-foreground"
                    )}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {startTime ? formatTimeDisplay(startTime) : "Début"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label>Heure</Label>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const newTime = new Date(startTime || new Date());
                              const currentHour = newTime.getHours();
                              newTime.setHours(currentHour === 0 ? 23 : currentHour - 1);
                              setStartTime(newTime);
                              setValue("startTime", newTime);
                            }}
                          >
                            -
                          </Button>
                          <span className="w-10 text-center">
                            {startTime ? startTime.getHours().toString().padStart(2, '0') : "00"}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const newTime = new Date(startTime || new Date());
                              const currentHour = newTime.getHours();
                              newTime.setHours((currentHour + 1) % 24);
                              setStartTime(newTime);
                              setValue("startTime", newTime);
                            }}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label>Minutes</Label>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const newTime = new Date(startTime || new Date());
                              const currentMinute = newTime.getMinutes();
                              newTime.setMinutes(currentMinute === 0 ? 55 : Math.max(0, currentMinute - 5));
                              setStartTime(newTime);
                              setValue("startTime", newTime);
                            }}
                          >
                            -
                          </Button>
                          <span className="w-10 text-center">
                            {startTime ? startTime.getMinutes().toString().padStart(2, '0') : "00"}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const newTime = new Date(startTime || new Date());
                              const currentMinute = newTime.getMinutes();
                              newTime.setMinutes((currentMinute + 5) % 60);
                              setStartTime(newTime);
                              setValue("startTime", newTime);
                            }}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Heure fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endTime && "text-muted-foreground"
                    )}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {endTime ? formatTimeDisplay(endTime) : "Fin"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label>Heure</Label>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const newTime = new Date(endTime || new Date());
                              const currentHour = newTime.getHours();
                              newTime.setHours(currentHour === 0 ? 23 : currentHour - 1);
                              setEndTime(newTime);
                              setValue("endTime", newTime);
                            }}
                          >
                            -
                          </Button>
                          <span className="w-10 text-center">
                            {endTime ? endTime.getHours().toString().padStart(2, '0') : "00"}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const newTime = new Date(endTime || new Date());
                              const currentHour = newTime.getHours();
                              newTime.setHours((currentHour + 1) % 24);
                              setEndTime(newTime);
                              setValue("endTime", newTime);
                            }}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label>Minutes</Label>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const newTime = new Date(endTime || new Date());
                              const currentMinute = newTime.getMinutes();
                              newTime.setMinutes(currentMinute === 0 ? 55 : Math.max(0, currentMinute - 5));
                              setEndTime(newTime);
                              setValue("endTime", newTime);
                            }}
                          >
                            -
                          </Button>
                          <span className="w-10 text-center">
                            {endTime ? endTime.getMinutes().toString().padStart(2, '0') : "00"}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const newTime = new Date(endTime || new Date());
                              const currentMinute = newTime.getMinutes();
                              newTime.setMinutes((currentMinute + 5) % 60);
                              setEndTime(newTime);
                              setValue("endTime", newTime);
                            }}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Moyen de paiement et notes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Moyen de paiement</Label>
              <Select 
                defaultValue="cash"
                onValueChange={(value) => setValue("paymentMethod", value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un moyen de paiement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Espèces</SelectItem>
                  <SelectItem value="card">Carte</SelectItem>
                  <SelectItem value="mobile_transfer">Transfert Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register("notes")} placeholder="Notes additionnelles" />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="reset" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createRentalMutation.isPending}>
              {createRentalMutation.isPending ? "Enregistrement..." : "Enregistrer la location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}