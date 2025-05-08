import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Collection from "@/pages/Collection";
import AddCard from "@/pages/AddCard";
import CardDetail from "@/pages/CardDetail";
import ValueTracker from "@/pages/ValueTracker";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/collection" component={Collection} />
        <Route path="/add-card" component={AddCard} />
        <Route path="/card/:id" component={CardDetail} />
        <Route path="/value-tracker" component={ValueTracker} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
