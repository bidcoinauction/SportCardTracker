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
import Import from "@/pages/Import";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/collection" component={Collection} />
      <Route path="/add-card" component={AddCard} />
      <Route path="/card/:id" component={CardDetail} />
      <Route path="/value-tracker" component={ValueTracker} />
      <Route path="/import" component={Import} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Layout>
          <Router />
        </Layout>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
