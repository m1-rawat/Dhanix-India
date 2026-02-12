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
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useMemo } from "react";
import { Search, UserPlus, Upload } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const employeeFormSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  employeeCode: z.string().min(1, "Required"),
  designation: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  dateOfJoining: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  uan: z.string().optional(),
  esicIpNumber: z.string().optional(),
  fixedBasicSalary: z.string().default("0"),
  fixedHra: z.string().default("0"),
  fixedSpecialAllowance: z.string().default("0"),
  isPfApplicable: z.boolean().default(false),
  isEsiApplicable: z.boolean().default(false),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

function TotalGrossDisplay({ control }: { control: any }) {
  const basic = useWatch({ control, name: "fixedBasicSalary" }) || "0";
  const hra = useWatch({ control, name: "fixedHra" }) || "0";
  const special = useWatch({ control, name: "fixedSpecialAllowance" }) || "0";
  
  const total = useMemo(() => {
    return (parseFloat(basic) || 0) + (parseFloat(hra) || 0) + (parseFloat(special) || 0);
  }, [basic, hra, special]);
  
  return (
    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
      <div className="text-sm text-muted-foreground">Total Gross Salary (Monthly)</div>
      <div className="text-2xl font-bold text-primary" data-testid="text-total-gross">
        ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const [match, params] = useRoute("/companies/:companyId/employees");
  const companyId = params?.companyId ? parseInt(params.companyId) : 0;
  
  const { data: company } = useCompany(companyId);
  const { data: employees, isLoading } = useEmployees(companyId);
  const { mutate: createEmployee, isPending: isCreating } = useCreateEmployee();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      employeeCode: "",
      designation: "",
      email: "",
      phone: "",
      dateOfJoining: "",
      bankAccountNumber: "",
      ifscCode: "",
      uan: "",
      esicIpNumber: "",
      fixedBasicSalary: "0",
      fixedHra: "0",
      fixedSpecialAllowance: "0",
      isPfApplicable: false,
      isEsiApplicable: false,
    },
  });

  const onSubmit = (data: EmployeeFormValues) => {
    const payload = {
      ...data,
      fixedBasicSalary: String(data.fixedBasicSalary),
      fixedHra: String(data.fixedHra),
      fixedSpecialAllowance: String(data.fixedSpecialAllowance),
      dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : undefined,
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
    e.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
    (e.designation?.toLowerCase().includes(search.toLowerCase()))
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
                 placeholder="Search by name..." 
                 className="pl-9 bg-background" 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 data-testid="input-search-employees"
               />
             </div>
             <Button 
               variant="outline" 
               onClick={() => setLocation(`/companies/${companyId}/employees/import`)}
               data-testid="button-import-employees"
             >
               <Upload className="w-4 h-4 mr-2" />
               Import Employees
             </Button>
             <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-lg shadow-primary/20" data-testid="button-add-employee">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Basic Information</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name *</FormLabel>
                              <FormControl><Input {...field} data-testid="input-first-name" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name *</FormLabel>
                              <FormControl><Input {...field} data-testid="input-last-name" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="employeeCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Employee Code *</FormLabel>
                              <FormControl><Input {...field} data-testid="input-employee-code" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="designation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Designation</FormLabel>
                              <FormControl><Input placeholder="e.g. Software Engineer" {...field} data-testid="input-designation" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl><Input type="email" {...field} value={field.value || ''} data-testid="input-email" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="dateOfJoining"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date of Joining</FormLabel>
                              <FormControl><Input type="date" {...field} data-testid="input-doj" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 border-t pt-6">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Bank Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="bankAccountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bank Account Number</FormLabel>
                              <FormControl><Input {...field} data-testid="input-bank-account" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="ifscCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IFSC Code</FormLabel>
                              <FormControl><Input placeholder="e.g. HDFC0001234" {...field} data-testid="input-ifsc" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 border-t pt-6">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Statutory Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="uan"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>UAN (PF Number)</FormLabel>
                              <FormControl><Input placeholder="12 digit UAN" {...field} data-testid="input-uan" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="esicIpNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ESIC IP Number</FormLabel>
                              <FormControl><Input placeholder="17 digit ESIC IP" {...field} data-testid="input-esic" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex gap-6">
                         <FormField
                          control={form.control}
                          name="isPfApplicable"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-pf" />
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
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-esi" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">ESI Applicable</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 border-t pt-6">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Salary Structure (Monthly)</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="fixedBasicSalary"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Basic Salary</FormLabel>
                              <FormControl><Input type="number" min="0" {...field} data-testid="input-basic-salary" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="fixedHra"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>HRA</FormLabel>
                              <FormControl><Input type="number" min="0" {...field} data-testid="input-hra" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="fixedSpecialAllowance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Special Allowance</FormLabel>
                              <FormControl><Input type="number" min="0" {...field} data-testid="input-special-allowance" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <TotalGrossDisplay control={form.control} />
                    </div>

                    <DialogFooter className="mt-6">
                      <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={isCreating} data-testid="button-save-employee">
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
              <TableHead className="w-[100px]">Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Date of Joining</TableHead>
              <TableHead className="text-center w-[100px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No employees found.
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees?.map((employee) => (
                <TableRow key={employee.id} className="hover:bg-muted/5" data-testid={`row-employee-${employee.id}`}>
                  <TableCell className="font-mono text-xs">{employee.employeeCode}</TableCell>
                  <TableCell className="font-medium">{employee.firstName} {employee.lastName}</TableCell>
                  <TableCell className="text-muted-foreground">{employee.designation || "-"}</TableCell>
                  <TableCell>
                    {employee.dateOfJoining ? format(new Date(employee.dateOfJoining), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {employee.isActive !== false ? (
                      <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">Inactive</Badge>
                    )}
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
