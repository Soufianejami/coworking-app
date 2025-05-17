import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useQueryClient } from "@tanstack/react-query";

interface RoomRentalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SimpleRoomRentalForm({ open, onOpenChange }: RoomRentalFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // État du formulaire
  const [roomType, setRoomType] = useState<string>("grande");
  const [price, setPrice] = useState<string>("100");
  const [clientName, setClientName] = useState<string>("");
  const [clientContact, setClientContact] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startHour, setStartHour] = useState<string>("9");
  const [startMinute, setStartMinute] = useState<string>("0");
  const [endHour, setEndHour] = useState<string>("10");
  const [endMinute, setEndMinute] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [notes, setNotes] = useState<string>("");
  
  // État de chargement
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gérer la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      // Vérifier les données obligatoires
      if (!clientName) {
        toast({
          title: "Erreur de validation",
          description: "Le nom du client est obligatoire",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      // Créer les objets Date pour les heures de début et de fin
      const startTime = new Date(selectedDate);
      startTime.setHours(parseInt(startHour) || 0, parseInt(startMinute) || 0);
      
      const endTime = new Date(selectedDate);
      endTime.setHours(parseInt(endHour) || 0, parseInt(endMinute) || 0);
      
      // Créer le payload
      const payload = {
        roomType,
        price: parseFloat(price),
        clientName,
        clientContact,
        date: selectedDate,
        startTime,
        endTime,
        paymentMethod,
        notes
      };
      
      console.log("Envoi de la location:", payload);
      
      // Envoyer la requête
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
      console.log("Location créée:", newRental);
      
      // Rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["/api/room-rentals"] });
      
      // Message de succès
      toast({
        title: "Location ajoutée",
        description: "La location a été enregistrée avec succès.",
      });
      
      // Réinitialiser le formulaire
      resetForm();
      
      // Fermer le formulaire
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erreur lors de la création:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Réinitialiser le formulaire
  const resetForm = () => {
    setRoomType("grande");
    setPrice("100");
    setClientName("");
    setClientContact("");
    setSelectedDate(new Date());
    setStartHour("9");
    setStartMinute("0");
    setEndHour("10");
    setEndMinute("0");
    setPaymentMethod("cash");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Nouvelle Location de Salle</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type de salle et prix */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roomType">Type de salle</Label>
              <Select 
                value={roomType}
                onValueChange={setRoomType}
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
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Prix (DH)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          
          {/* Informations client */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nom du client</Label>
              <Input 
                id="clientName" 
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientContact">Contact (tél/email)</Label>
              <Input 
                id="clientContact" 
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
              />
            </div>
          </div>
          
          {/* Date */}
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
                  onSelect={(date) => setSelectedDate(date || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Heures */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Heure de début</Label>
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  min="0" 
                  max="23" 
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  placeholder="Heure"
                  className="w-1/2"
                />
                <Input 
                  type="number" 
                  min="0" 
                  max="59" 
                  value={startMinute}
                  onChange={(e) => setStartMinute(e.target.value)}
                  placeholder="Min"
                  className="w-1/2"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Heure de fin</Label>
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  min="0" 
                  max="23" 
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  placeholder="Heure"
                  className="w-1/2"
                />
                <Input 
                  type="number" 
                  min="0" 
                  max="59" 
                  value={endMinute}
                  onChange={(e) => setEndMinute(e.target.value)}
                  placeholder="Min"
                  className="w-1/2"
                />
              </div>
            </div>
          </div>
          
          {/* Moyen de paiement et notes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Moyen de paiement</Label>
              <Select 
                value={paymentMethod}
                onValueChange={setPaymentMethod}
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
              <Textarea 
                id="notes" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes additionnelles" 
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enregistrement..." : "Enregistrer la location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}