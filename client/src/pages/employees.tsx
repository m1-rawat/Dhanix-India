import { useRoute } from "wouter";
import { useCompany } from "@/hooks/use-companies";
import { useEmployees, useCreateEmployee } from "@/hooks/use-employees";
import { LayoutShell } from "@/components/layout-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@shared/routes";
import { z } from "zod";
import { useState } from "react";
import { Plus, Search, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";

export default function EmployeesPage() {
  const [match, params] = useRoute("/companies/:companyId/employees");
  const companyId = params?.companyId ? parseInt(params.companyId) : 0;
  
  const { data: company } = useCompany(companyId);
  const { data: employees, isLoading } = useEmployees(companyId);
  const { mutate: createEmployee, isPending: isCreating } = useCreateEmployee();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const form = useForm<z.infer<typeof api.employees.create.input>>({
    resolver: zodResolver(api.employees.create.input.omit({ companyId: true })),
    defaultValues: {
      firstName: "",
      lastName: "",
      employeeCode: "",
      email: "",
      basicSalary: "0",
      otherAllowances: "0",
      isPfApplicable: false,
      isEsiApplicable: false,
    },
  });

  const onSubmit = (data: any) => {
    // Ensure numeric strings for salary fields
    const payload = {
      ...data,
      basicSalary: String(data.basicSalary),
      otherAllowances: String(data.otherAllowances),
    };
    
    createEmployee({ companyId, ...payload }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      }
    });
  };

  if (!company) return null;

  const filteredEmployees = employees?.filter(e => 
    e.firstName.toLowerCase().includes(search.toLowerCase()) || 
    e.lastName.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <LayoutShell orgId={String(company.organizationId)} companyId={String(companyId)}>
      <PageHeader
        title="Employees"
        description={`Manage staff for ${company.name}`}
        actions={
          <div className="flex gap-3">
             <div className="relative w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
               <Input 
                 placeholder="Search employees..." 
                 className="pl-9 bg-background" 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
               />
             </div>
             <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-lg shadow-primary/20">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="employeeCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employee Code</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email (Optional)</FormLabel>
                            <FormControl><Input type="email" {...field} value={field.value || ''} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <h3 className="font-semibold mb-3">Compensation Structure</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="basicSalary"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Basic Salary (Monthly)</FormLabel>
                              <FormControl><Input type="number" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="otherAllowances"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Other Allowances</FormLabel>
                              <FormControl><Input type="number" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex gap-6 pt-2">
                       <FormField
                        control={form.control}
                        name="isPfApplicable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">PF Applicable</FormLabel>
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="isEsiApplicable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">ESI Applicable</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    <DialogFooter className="mt-6">
                      <Button type="submit" disabled={isCreating}>
                        {isCreating ? "Adding..." : "Save Employee"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Card className="overflow-hidden border border-border shadow-sm">
        <Table className="table-dense">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Joining Date</TableHead>
              <TableHead className="text-right">Basic Salary</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No employees found.
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees?.map((employee) => (
                <TableRow key={employee.id} className="hover:bg-muted/5">
                  <TableCell className="font-mono text-xs">{employee.employeeCode}</TableCell>
                  <TableCell className="font-medium">{employee.firstName} {employee.lastName}</TableCell>
                  <TableCell>{employee.email || "-"}</TableCell>
                  <TableCell>
                    {employee.dateOfJoining ? format(new Date(employee.dateOfJoining), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono">₹{employee.basicSalary}</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                      Active
                    </span>
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
