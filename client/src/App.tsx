import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

import Dashboard from "@/pages/dashboard";
import DailyEntries from "@/pages/daily-entries";
import Subscriptions from "@/pages/subscriptions";
import Cafe from "@/pages/cafe";
import Calendar from "@/pages/calendar";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import Expenses from "@/pages/expenses";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected routes */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/daily-entries" component={DailyEntries} />
      <ProtectedRoute path="/subscriptions" component={Subscriptions} />
      <ProtectedRoute path="/cafe" component={Cafe} />
      <ProtectedRoute path="/calendar" component={Calendar} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/expenses" component={Expenses} />
      
      {/* Admin-only routes */}
      <ProtectedRoute path="/users" component={Users} allowedRoles={["admin"]} />
      
      {/* 404 route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
