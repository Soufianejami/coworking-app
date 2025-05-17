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
  const onSubmit = (data: RoomRentalFormData) => {
    const payload = {
      ...data,
      date: selectedDate,
      startTime: startTime,
      endTime: endTime,
    };
    createRentalMutation.mutate(payload);
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
                  <div className="grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        placeholder="Heure"
                        value={startTime ? startTime.getHours() : ""}
                        onChange={(e) => {
                          const newTime = new Date(startTime || new Date());
                          newTime.setHours(parseInt(e.target.value) || 0);
                          setStartTime(newTime);
                          setValue("startTime", newTime);
                        }}
                      />
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="Min"
                        value={startTime ? startTime.getMinutes() : ""}
                        onChange={(e) => {
                          const newTime = new Date(startTime || new Date());
                          newTime.setMinutes(parseInt(e.target.value) || 0);
                          setStartTime(newTime);
                          setValue("startTime", newTime);
                        }}
                      />
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
                  <div className="grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        placeholder="Heure"
                        value={endTime ? endTime.getHours() : ""}
                        onChange={(e) => {
                          const newTime = new Date(endTime || new Date());
                          newTime.setHours(parseInt(e.target.value) || 0);
                          setEndTime(newTime);
                          setValue("endTime", newTime);
                        }}
                      />
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="Min"
                        value={endTime ? endTime.getMinutes() : ""}
                        onChange={(e) => {
                          const newTime = new Date(endTime || new Date());
                          newTime.setMinutes(parseInt(e.target.value) || 0);
                          setEndTime(newTime);
                          setValue("endTime", newTime);
                        }}
                      />
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