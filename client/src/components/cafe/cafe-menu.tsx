import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PlusIcon, MinusIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  isActive: boolean;
}

interface CafeMenuItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface CafeMenuProps {
  products: Product[];
  selectedItems: CafeMenuItem[];
  setSelectedItems: React.Dispatch<React.SetStateAction<CafeMenuItem[]>>;
}

export default function CafeMenu({ products, selectedItems, setSelectedItems }: CafeMenuProps) {
  // Filter only active products
  const activeProducts = products.filter(product => product.isActive);

  // Check if a product is selected
  const isSelected = (productId: number) => {
    return selectedItems.some(item => item.id === productId);
  };

  // Get quantity of a selected product
  const getQuantity = (productId: number) => {
    const item = selectedItems.find(item => item.id === productId);
    return item ? item.quantity : 0;
  };

  // Handle product selection
  const handleProductSelection = (product: Product, checked: boolean) => {
    if (checked) {
      // Add item if not already in the list
      if (!isSelected(product.id)) {
        setSelectedItems(prev => [
          ...prev,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
          }
        ]);
      }
    } else {
      // Remove item
      setSelectedItems(prev => prev.filter(item => item.id !== product.id));
    }
  };

  // Increase quantity
  const increaseQuantity = (productId: number) => {
    setSelectedItems(prev => 
      prev.map(item => 
        item.id === productId 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      )
    );
  };

  // Decrease quantity
  const decreaseQuantity = (productId: number) => {
    setSelectedItems(prev => 
      prev.map(item => 
        item.id === productId && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 } 
          : item
      )
    );
  };

  return (
    <ScrollArea className="max-h-64 border border-gray-200 rounded-md">
      <div className="space-y-3 p-2">
        {activeProducts.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            Aucun produit disponible
          </div>
        ) : (
          activeProducts.map(product => (
            <div key={product.id} className="flex items-center justify-between">
              <div className="flex items-center">
                <Checkbox 
                  id={`product-${product.id}`}
                  checked={isSelected(product.id)}
                  onCheckedChange={(checked) => 
                    handleProductSelection(product, checked === true)
                  }
                />
                <Label 
                  htmlFor={`product-${product.id}`} 
                  className="ml-3 block text-sm font-medium text-gray-700"
                >
                  {product.name}
                </Label>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500">{product.price} DH</span>
                {isSelected(product.id) && (
                  <div className="ml-3 flex items-center">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      className="h-7 w-7 text-gray-500 hover:text-gray-600 p-1"
                      onClick={() => decreaseQuantity(product.id)}
                    >
                      <MinusIcon className="h-4 w-4" />
                    </Button>
                    <span className="mx-2 text-sm">{getQuantity(product.id)}</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      className="h-7 w-7 text-gray-500 hover:text-gray-600 p-1"
                      onClick={() => increaseQuantity(product.id)}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}
