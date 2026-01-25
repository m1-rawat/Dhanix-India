import { useOrganizations, useCreateOrganization } from "@/hooks/use-organizations";
import { useUser } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight, Building2, Layout, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@shared/routes";
import { z } from "zod";
import { useState } from "react";
import { LayoutShell } from "@/components/layout-shell";
import { PageHeader } from "@/components/page-header";

export default function HomePage() {
  const { data: user } = useUser();
  const { data: orgs, isLoading } = useOrganizations();
  const { mutate: createOrg, isPending: isCreating } = useCreateOrganization();
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof api.organizations.create.input>>({
    resolver: zodResolver(api.organizations.create.input),
    defaultValues: { name: "" },
  });

  const onSubmit = (data: { name: string }) => {
    createOrg(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // If user has no orgs, show empty state or redirect logic could go here
  // For now, listing orgs is fine.

  return (
    <LayoutShell>
      <PageHeader 
        title="Your Organizations" 
        description="Select an organization to manage payroll and employees."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" />
                New Organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Organization</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Corp" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? "Creating..." : "Create Organization"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      {orgs?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border border-dashed border-border text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2">No Organizations Yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Get started by creating your first organization to manage companies and payroll.
          </p>
          <Button onClick={() => setOpen(true)} size="lg">Create Organization</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orgs?.map((org) => (
            <Link key={org.id} href={`/orgs/${org.id}/dashboard`}>
              <Card className="hover:shadow-xl hover:border-primary/50 transition-all duration-300 cursor-pointer group h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{org.name}</span>
                    <Building2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardTitle>
                  <CardDescription>Role: {org.role}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Manage companies, employees, and payroll cycles.
                  </p>
                </CardContent>
                <CardFooter className="bg-muted/30 p-4">
                  <span className="text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                    Open Dashboard <ArrowRight className="w-4 h-4" />
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </LayoutShell>
  );
}
