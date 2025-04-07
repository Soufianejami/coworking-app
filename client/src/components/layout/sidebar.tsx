import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  HomeIcon,
  ClockIcon,
  BellIcon,
  BookOpenIcon,
  CalendarIcon,
  BarChart3,
  User,
  LogOut,
  Users,
  DollarSign,
  Loader2,
  CakeSlice,
  ShoppingCart
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Fragment } from "react";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";

  const cashierNavItems = [
    {
      name: "Tableau de bord",
      href: "/",
      icon: HomeIcon,
    },
    {
      name: "Entrées journalières",
      href: "/daily-entries",
      icon: ClockIcon,
    },
    {
      name: "Abonnements",
      href: "/subscriptions",
      icon: BellIcon,
    },
    {
      name: "Café & Boissons",
      href: "/cafe",
      icon: BookOpenIcon,
    },
  ];
  
  // Admin-only navigation items
  const adminNavItems = [
    {
      name: "Tableau de bord",
      href: "/",
      icon: HomeIcon,
    },
    {
      name: "Entrées journalières",
      href: "/daily-entries",
      icon: ClockIcon,
    },
    {
      name: "Abonnements",
      href: "/subscriptions",
      icon: BellIcon,
    },
    {
      name: "Café & Boissons",
      href: "/cafe",
      icon: BookOpenIcon,
    },
    {
      name: "Calendrier",
      href: "/calendar",
      icon: CalendarIcon,
    },
    {
      name: "Rapports",
      href: "/reports",
      icon: BarChart3,
    },
    {
      name: "Dépenses",
      href: "/expenses",
      icon: DollarSign,
    },
    {
      name: "Gestion des Produits",
      href: "/products",
      icon: ShoppingCart,
    },
    {
      name: "Gestion du Stock",
      href: "/stock",
      icon: CakeSlice,
    },
    {
      name: "Utilisateurs",
      href: "/users",
      icon: Users,
    },
  ];
  
  // Use the appropriate navigation items based on user role
  const navItems = isAdmin ? adminNavItems : cashierNavItems;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <aside className="bg-background shadow-md border-r border-border hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 z-10">
      <div className="px-6 pt-8 pb-4 flex items-center border-b border-border">
        <h1 className="text-2xl font-semibold">CoworkCaisse</h1>
      </div>
      <nav className="flex-1 px-4 pt-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-md",
                isActive
                  ? "text-primary-foreground bg-primary"
                  : "text-foreground hover:bg-accent"
              )}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-4 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-start p-0 hover:bg-transparent">
              <div className="flex items-center w-full">
                <div className="flex-shrink-0 h-10 w-10">
                  <User className="h-10 w-10 p-1 rounded-full bg-muted text-muted-foreground" />
                </div>
                <div className="ml-3 text-left">
                  <p className="text-sm font-medium">{user?.fullName || user?.username}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending}>
              {logoutMutation.isPending ? (
                <Fragment>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Déconnexion en cours...</span>
                </Fragment>
              ) : (
                <Fragment>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Se déconnecter</span>
                </Fragment>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
