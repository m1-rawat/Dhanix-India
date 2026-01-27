import { useOrganization } from "@/hooks/use-organizations";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { LayoutShell } from "@/components/layout-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Building2, Clock, TrendingUp, ArrowRight, Loader2, Calendar } from "lucide-react";

interface DashboardStats {
  totalCompanies: number;
  totalEmployees: number;
  pendingPayrolls: number;
  currentMonth: string;
}

export default function DashboardPage() {
  const [match, params] = useRoute("/orgs/:orgId/dashboard");
  const orgId = params?.orgId ? parseInt(params.orgId) : 0;
  const { data: org, isLoading: orgLoading } = useOrganization(orgId);
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/orgs', orgId, 'dashboard-stats'],
    enabled: !!orgId,
  });

  if (orgLoading || !org) {
    return (
      <LayoutShell orgId={String(orgId)}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell orgId={String(orgId)}>
      <PageHeader 
        title={`Welcome to ${org.name}`} 
        description="Your organization's payroll management dashboard"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard 
          title="Total Companies" 
          value={statsLoading ? "..." : String(stats?.totalCompanies ?? 0)}
          icon={<Building2 className="w-5 h-5" />}
          description="Companies under management"
          color="blue"
        />
        <StatsCard 
          title="Total Employees Managed" 
          value={statsLoading ? "..." : String(stats?.totalEmployees ?? 0)}
          icon={<Users className="w-5 h-5" />} 
          description="Active employees across all companies"
          color="green"
        />
        <StatsCard 
          title={`Pending Payrolls`}
          value={statsLoading ? "..." : String(stats?.pendingPayrolls ?? 0)}
          icon={<Clock className="w-5 h-5" />} 
          description={stats?.currentMonth ? `For ${stats.currentMonth}` : "Current month"}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Get started with common payroll tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/orgs/${orgId}/companies`}>
              <Button variant="outline" className="w-full justify-between h-12" data-testid="button-manage-companies">
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Manage Companies
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
              Select a company to manage employees, run payroll, and generate reports.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Payroll Calendar
            </CardTitle>
            <CardDescription>
              Monthly payroll processing status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a company to view payroll schedule</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}

function StatsCard({ 
  title, 
  value, 
  icon, 
  description,
  color 
}: { 
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
  color: "blue" | "green" | "amber" | "purple";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  };

  return (
    <Card className="glass-card" data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={`p-2.5 rounded-full ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-3xl font-bold font-display">{value}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
