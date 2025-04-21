import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, Redirect } from "wouter";
import { UserRole } from "@shared/schema";
import MainLayout from "@/components/layout/main-layout";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({
  path,
  component: Component,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        if (!user) {
          return <Redirect to="/auth" />;
        }

        // If specific roles are required, check if user has one of them
        console.log("Checking role access:", {
          userRole: user.role,
          allowedRoles: allowedRoles,
          path: path
        });
        
        if (allowedRoles && !allowedRoles.includes(user.role)) {
          console.log("Access denied - role mismatch!");
          return (
            <div className="flex flex-col items-center justify-center min-h-screen">
              <h1 className="text-2xl font-bold text-destructive mb-2">Accès refusé</h1>
              <p className="text-muted-foreground">
                Vous n'avez pas les permissions nécessaires pour accéder à cette page.
              </p>
            </div>
          );
        }

        return (
          <MainLayout>
            <Component />
          </MainLayout>
        );
      }}
    </Route>
  );
}