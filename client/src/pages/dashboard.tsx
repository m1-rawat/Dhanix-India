import { useOrganization } from "@/hooks/use-organizations";
import { useRoute } from "wouter";
import { LayoutShell } from "@/components/layout-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, CreditCard, Activity } from "lucide-react";

export default function DashboardPage() {
  const [match, params] = useRoute("/orgs/:orgId/dashboard");
  const orgId = params?.orgId ? parseInt(params.orgId) : 0;
  const { data: org, isLoading } = useOrganization(orgId);

  if (isLoading || !org) return null;

  return (
    <LayoutShell orgId={String(orgId)}>
      <PageHeader 
        title={`${org.name} Dashboard`} 
        description="Overview of your organization's activity and metrics."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Companies" 
          value="--" 
          icon={<Building2 className="w-5 h-5 text-blue-500" />}
          trend="+1 this month"
        />
        <StatsCard 
          title="Active Employees" 
          value="--" 
          icon={<Users className="w-5 h-5 text-green-500" />} 
          trend="Steady"
        />
        <StatsCard 
          title="Pending Payrolls" 
          value="--" 
          icon={<CreditCard className="w-5 h-5 text-amber-500" />} 
          trend="Needs attention"
        />
        <StatsCard 
          title="Total Payout" 
          value="₹ --" 
          icon={<Activity className="w-5 h-5 text-purple-500" />} 
          trend="Estimated"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-96">
          <CardHeader>
            <CardTitle>Payroll Trends</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-full pb-12 text-muted-foreground">
            Chart Visualization Placeholder
          </CardContent>
        </Card>
        <Card className="h-96">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-full pb-12 text-muted-foreground">
            Activity Log Placeholder
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}

function StatsCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend?: string }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="p-2 bg-muted rounded-full">
            {icon}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-2xl font-bold font-display">{value}</h3>
          {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
