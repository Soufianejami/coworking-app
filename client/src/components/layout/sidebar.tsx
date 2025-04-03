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
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();

  const navItems = [
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
  ];

  return (
    <aside className="bg-white shadow-md border-r border-gray-200 hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 z-10">
      <div className="px-6 pt-8 pb-4 flex items-center border-b border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-800">CoworkCaisse</h1>
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
                  ? "text-white bg-primary"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <User className="h-10 w-10 p-1 rounded-full bg-gray-100 text-gray-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">Admin</p>
            <p className="text-xs font-medium text-gray-500">Paramètres</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
