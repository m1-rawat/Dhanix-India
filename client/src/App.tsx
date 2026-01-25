import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUser } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import HomePage from "@/pages/home";
import DashboardPage from "@/pages/dashboard";
import CompaniesPage from "@/pages/companies";
import EmployeesPage from "@/pages/employees";
import PayrollPage from "@/pages/payroll";
import RunDetailsPage from "@/pages/run-details";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Redirect handled by AuthPage rendering or manual redirect if preferred
    // For now, let's just return AuthPage if not logged in for simplicity in this flow,
    // or use wouter redirect. A cleaner way is rendering AuthPage directly.
    return <AuthPage />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      <Route path="/">
        <ProtectedRoute component={HomePage} />
      </Route>
      
      <Route path="/orgs/:orgId/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      
      <Route path="/orgs/:orgId/companies">
        <ProtectedRoute component={CompaniesPage} />
      </Route>

      <Route path="/companies/:companyId/employees">
        <ProtectedRoute component={EmployeesPage} />
      </Route>

      <Route path="/companies/:companyId/payroll">
        <ProtectedRoute component={PayrollPage} />
      </Route>

      <Route path="/payroll-runs/:id">
        <ProtectedRoute component={RunDetailsPage} />
      </Route>

      <Route component={NotFound} />
    </Switch>
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
