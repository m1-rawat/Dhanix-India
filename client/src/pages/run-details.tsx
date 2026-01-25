import { useRoute, Link } from "wouter";
import { usePayrollRun, useCalculatePayrollRun, useLockPayrollRun, useUpdatePayrollItem } from "@/hooks/use-payroll";
import { LayoutShell } from "@/components/layout-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Calculator, Lock, ArrowLeft, Loader2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Editable Cell Component for seamless updates
function EditableCell({ value, onSave, disabled, type = "number" }: { value: string | number, onSave: (val: string) => void, disabled?: boolean, type?: string }) {
  const [localValue, setLocalValue] = useState(value);
  const [isChanged, setIsChanged] = useState(false);

  useEffect(() => {
    setLocalValue(value);
    setIsChanged(false);
  }, [value]);

  const handleBlur = () => {
    if (isChanged) {
      onSave(String(localValue));
      setIsChanged(false);
    }
  };

  return (
    <div className="relative">
      <Input
        type={type}
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          setIsChanged(true);
        }}
        onBlur={handleBlur}
        disabled={disabled}
        className={cn("h-8 w-24 text-right pr-2", isChanged && "border-amber-400 bg-amber-50")}
      />
    </div>
  );
}

export default function RunDetailsPage() {
  const [match, params] = useRoute("/payroll-runs/:id");
  const runId = params?.id ? parseInt(params.id) : 0;
  
  const { data: run, isLoading } = usePayrollRun(runId);
  const { mutate: calculate, isPending: isCalculating } = useCalculatePayrollRun();
  const { mutate: lock, isPending: isLocking } = useLockPayrollRun();
  const { mutate: updateItem } = useUpdatePayrollItem();

  if (isLoading || !run) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const isLocked = run.status === "LOCKED";

  const handleUpdate = (itemId: number, field: string, value: string) => {
    updateItem({ id: itemId, [field]: value });
  };

  return (
    <LayoutShell orgId={String(run.company?.organizationId)} companyId={String(run.companyId)}>
      <div className="mb-4">
        <Link href={`/companies/${run.companyId}/payroll`}>
          <Button variant="link" className="px-0 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Runs
          </Button>
        </Link>
      </div>
      
      <PageHeader
        title={`Payroll for ${run.month}`}
        description={isLocked ? "This run is locked and cannot be edited." : "Enter attendance data and calculate payouts."}
        actions={
          <div className="flex gap-2">
            {!isLocked && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => calculate(runId)} 
                  disabled={isCalculating}
                >
                  {isCalculating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
                  Calculate All
                </Button>
                <Button 
                  onClick={() => lock(runId)} 
                  disabled={isLocking}
                  className="bg-slate-900 hover:bg-slate-800"
                >
                  {isLocking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                  Finalize & Lock
                </Button>
              </>
            )}
            {isLocked && (
              <Button variant="secondary" disabled>
                <Lock className="w-4 h-4 mr-2" />
                Locked
              </Button>
            )}
          </div>
        }
      />

      <Card className="overflow-hidden border border-border shadow-sm">
        <div className="overflow-x-auto">
          <Table className="table-dense w-full">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[200px]">Employee</TableHead>
                <TableHead className="text-right">Worked Days</TableHead>
                <TableHead className="text-right">LOP Days</TableHead>
                <TableHead className="text-right">Gross Salary</TableHead>
                <TableHead className="text-right">PF (Emp)</TableHead>
                <TableHead className="text-right">ESI (Emp)</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right bg-slate-50 font-bold text-slate-900">Net Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.items?.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/5">
                  <TableCell className="font-medium">
                    {item.employee?.firstName} {item.employee?.lastName}
                    <div className="text-xs text-muted-foreground">{item.employee?.employeeCode}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <EditableCell 
                        value={item.daysWorked} 
                        disabled={isLocked}
                        onSave={(val) => handleUpdate(item.id, 'daysWorked', val)} 
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                     <div className="flex justify-end">
                      <EditableCell 
                        value={item.lopDays} 
                        disabled={isLocked}
                        onSave={(val) => handleUpdate(item.id, 'lopDays', val)} 
                      />
                     </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">₹{item.grossSalary}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{item.pfEmployee}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{item.esiEmployee}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <EditableCell 
                        value={item.otherDeductions} 
                        disabled={isLocked}
                        onSave={(val) => handleUpdate(item.id, 'otherDeductions', val)} 
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold bg-slate-50 text-primary">
                    ₹{item.netSalary}
                  </TableCell>
                </TableRow>
              ))}
              {(!run.items || run.items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No employees found for this run.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </LayoutShell>
  );
}
