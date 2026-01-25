import { useRoute, Link } from "wouter";
import { useOrganization } from "@/hooks/use-organizations";
import { useCompanies, useCreateCompany } from "@/hooks/use-companies";
import { LayoutShell } from "@/components/layout-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus, ArrowRight, Building } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@shared/routes";
import { z } from "zod";
import { useState } from "react";

export default function CompaniesPage() {
  const [match, params] = useRoute("/orgs/:orgId/companies");
  const orgId = params?.orgId ? parseInt(params.orgId) : 0;
  const { data: org } = useOrganization(orgId);
  const { data: companies, isLoading } = useCompanies(orgId);
  const { mutate: createCompany, isPending: isCreating } = useCreateCompany();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof api.companies.create.input>>({
    resolver: zodResolver(api.companies.create.input.omit({ organizationId: true })),
    defaultValues: { name: "", code: "" },
  });

  const onSubmit = (data: any) => {
    createCompany({ orgId, ...data }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      }
    });
  };

  if (!org) return null;

  return (
    <LayoutShell orgId={String(orgId)}>
      <PageHeader 
        title="Companies" 
        description={`Manage legal entities under ${org.name}.`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Company</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Retail Ltd" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Code (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="ARL001" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? "Creating..." : "Create Company"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies?.map((company) => (
          <Link key={company.id} href={`/companies/${company.id}/employees`}>
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{company.name}</span>
                  <Building className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardTitle>
                <CardDescription>{company.code || "No code assigned"}</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="text-sm text-muted-foreground">
                   Click to manage employees and payroll runs.
                 </div>
              </CardContent>
              <CardFooter className="bg-muted/20 p-4 border-t border-border/50">
                 <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
                   Manage <ArrowRight className="w-3 h-3" />
                 </span>
              </CardFooter>
            </Card>
          </Link>
        ))}
        {companies?.length === 0 && (
          <div className="col-span-full py-12 text-center bg-muted/20 rounded-xl border border-dashed border-border">
            <p className="text-muted-foreground">No companies found. Create one to get started.</p>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
