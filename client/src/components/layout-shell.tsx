import { Link, useLocation } from "wouter";
import { useUser, useLogout } from "@/hooks/use-auth";
import { useOrganizations } from "@/hooks/use-organizations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Building2, 
  ChevronDown, 
  LogOut, 
  LayoutDashboard, 
  Users, 
  Settings, 
  Briefcase,
  Menu,
  X,
  FileBarChart
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface LayoutShellProps {
  children: React.ReactNode;
  orgId?: string; // Optional context
  companyId?: string; // Optional context
}

export function LayoutShell({ children, orgId, companyId }: LayoutShellProps) {
  const { data: user } = useUser();
  const { data: orgs } = useOrganizations();
  const { mutate: logout } = useLogout();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Derive current context names
  const currentOrg = orgId ? orgs?.find(o => o.id === parseInt(orgId)) : null;

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const navItems = orgId ? [
    { label: "Dashboard", href: `/orgs/${orgId}/dashboard`, icon: LayoutDashboard },
    { label: "Companies", href: `/orgs/${orgId}/companies`, icon: Building2 },
    // Only show these if inside a company context or generally available
    ...(companyId ? [
      { label: "Employees", href: `/companies/${companyId}/employees`, icon: Users },
      { label: "Payroll", href: `/companies/${companyId}/payroll`, icon: Briefcase },
      { label: "Reports", href: `/companies/${companyId}/reports`, icon: FileBarChart },
    ] : []),
    { label: "Settings", href: `/orgs/${orgId}/settings`, icon: Settings },
  ] : [];

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-background border-b border-border">
        <div className="flex items-center gap-2 font-display font-bold text-xl text-primary">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            D
          </div>
          Dhanix
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="h-16 flex items-center px-6 border-b border-border">
            <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl text-primary hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                D
              </div>
              Dhanix
            </Link>
          </div>

          {/* Org Switcher */}
          <div className="p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-12 bg-card hover:bg-muted/50 border-input">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary text-xs shrink-0">
                      {currentOrg ? getInitials(currentOrg.name) : <Building2 className="w-4 h-4" />}
                    </div>
                    <span className="truncate">{currentOrg ? currentOrg.name : "Select Organization"}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Organizations</DropdownMenuLabel>
                {orgs?.map(org => (
                  <Link key={org.id} href={`/orgs/${org.id}/dashboard`}>
                    <DropdownMenuItem className="cursor-pointer">
                      {org.name}
                    </DropdownMenuItem>
                  </Link>
                ))}
                <DropdownMenuSeparator />
                <Link href="/">
                  <DropdownMenuItem className="cursor-pointer font-medium text-primary">
                    View All Organizations
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location === item.href || location.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                    <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-border bg-muted/5">
            <div className="flex items-center gap-3 mb-4 px-2">
              <Avatar className="w-9 h-9 border border-border">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {user ? getInitials(user.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button 
              variant="destructive" 
              className="w-full justify-start gap-2 h-9 text-xs" 
              onClick={() => logout()}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen w-full">
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
