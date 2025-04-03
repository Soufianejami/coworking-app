import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

import MainLayout from "@/components/layout/main-layout";
import Dashboard from "@/pages/dashboard";
import DailyEntries from "@/pages/daily-entries";
import Subscriptions from "@/pages/subscriptions";
import Cafe from "@/pages/cafe";
import Calendar from "@/pages/calendar";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/daily-entries" component={DailyEntries} />
        <Route path="/subscriptions" component={Subscriptions} />
        <Route path="/cafe" component={Cafe} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/reports" component={Reports} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
