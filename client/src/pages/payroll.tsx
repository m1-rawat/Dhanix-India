import { useRoute, Link } from "wouter";
import { useCompany } from "@/hooks/use-companies";
import { usePayrollRuns, useCreatePayrollRun } from "@/hooks/use-payroll";
import { LayoutShell } from "@/components/layout-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@shared/routes";
import { z } from "zod";
import { useState } from "react";
import { Plus, Calendar, ArrowRight, Lock, FileEdit } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function PayrollPage() {
  const [match, params] = useRoute("/companies/:companyId/payroll");
  const companyId = params?.companyId ? parseInt(params.companyId) : 0;
  
  const { data: company } = useCompany(companyId);
  const { data: runs, isLoading } = usePayrollRuns(companyId);
  const { mutate: createRun, isPending: isCreating } = useCreatePayrollRun();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof api.payroll.createRun.input>>({
    resolver: zodResolver(api.payroll.createRun.input.omit({ companyId: true, status: true })),
    defaultValues: { month: format(new Date(), 'yyyy-MM') },
  });

  const onSubmit = (data: any) => {
    createRun({ companyId, ...data }, {
      onSuccess: () => {
        setOpen(false);
      }
    });
  };

  if (!company) return null;

  return (
    <LayoutShell orgId={String(company.organizationId)} companyId={String(companyId)}>
      <PageHeader
        title="Payroll Runs"
        description="Process salaries and generate payslips."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" />
                New Payroll Run
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Payroll Run</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Month (YYYY-MM)</FormLabel>
                        <FormControl>
                          <Input type="month" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? "Creating..." : "Start Run"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="overflow-hidden border border-border shadow-sm">
        <Table className="table-dense">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No payroll runs yet.
                </TableCell>
              </TableRow>
            ) : (
              runs?.map((run) => (
                <TableRow key={run.id} className="hover:bg-muted/5">
                  <TableCell className="font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {run.month}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ring-1 ring-inset",
                      run.status === "DRAFT" 
                        ? "bg-yellow-50 text-yellow-800 ring-yellow-600/20" 
                        : "bg-blue-50 text-blue-700 ring-blue-700/10"
                    )}>
                      {run.status === "LOCKED" && <Lock className="w-3 h-3 mr-1" />}
                      {run.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {run.createdAt ? format(new Date(run.createdAt), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/payroll-runs/${run.id}`}>
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                        {run.status === "DRAFT" ? "Manage" : "View"} <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </LayoutShell>
  );
}
