import { useRoute, Link } from "wouter";
import { usePayrollRun, useProcessPayrollRun, useLockPayrollRun, useUpdatePayrollItem } from "@/hooks/use-payroll";
import { LayoutShell } from "@/components/layout-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Lock, ArrowLeft, Loader2, Play, Users, IndianRupee, Calculator, FileText } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Payslip, PayslipData } from "@/components/payslip";

interface PayrollItemWithEmployee {
  id: number;
  employeeId: number;
  daysWorked: string;
  totalDays: string;
  lopDays: string;
  basicSalary: string;
  hra: string;
  specialAllowance: string;
  grossSalary: string;
  netSalary: string;
  pfEmployee: string;
  pfEmployer: string;
  esiEmployee: string;
  esiEmployer: string;
  otherDeductions: string;
  employee?: {
    id: number;
    firstName: string;
    lastName: string;
    employeeCode: string;
    designation?: string;
    isPfApplicable?: boolean;
    isEsiApplicable?: boolean;
    fixedBasicSalary?: string;
    fixedHra?: string;
    fixedSpecialAllowance?: string;
    uan?: string;
    esicIpNumber?: string;
    bankAccountNumber?: string;
    ifscCode?: string;
  };
}

function calculatePayroll(item: PayrollItemWithEmployee, paidDays: number) {
  const totalDays = parseFloat(item.totalDays) || 30;
  const fixedBasic = parseFloat(item.basicSalary) || 0;
  const fixedHra = parseFloat(item.hra) || 0;
  const fixedSpecialAllowance = parseFloat(item.specialAllowance) || 0;
  
  const payoutRatio = totalDays > 0 ? paidDays / totalDays : 0;
  
  const earnedBasic = fixedBasic * payoutRatio;
  const earnedHra = fixedHra * payoutRatio;
  const earnedSpecialAllowance = fixedSpecialAllowance * payoutRatio;
  const gross = earnedBasic + earnedHra + earnedSpecialAllowance;
  
  let pfAmount = 0;
  if (item.employee?.isPfApplicable) {
    const pfWages = Math.min(earnedBasic, 15000 * payoutRatio);
    pfAmount = pfWages * 0.12;
  }
  
  let esiAmount = 0;
  if (item.employee?.isEsiApplicable && gross < 21000) {
    esiAmount = gross * 0.0075;
  }
  
  const netPay = gross - pfAmount - esiAmount;
  
  return {
    earnedBasic,
    earnedHra,
    earnedSpecialAllowance,
    gross,
    pfAmount,
    esiAmount,
    netPay,
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function PayrollRow({ 
  item, 
  paidDays, 
  onPaidDaysChange, 
  isLocked,
  isCompleted,
  onViewPayslip
}: { 
  item: PayrollItemWithEmployee; 
  paidDays: number;
  onPaidDaysChange: (days: number) => void;
  isLocked: boolean;
  isCompleted: boolean;
  onViewPayslip: () => void;
}) {
  const calc = useMemo(() => calculatePayroll(item, paidDays), [item, paidDays]);
  
  return (
    <TableRow className="hover:bg-muted/5" data-testid={`row-payroll-item-${item.id}`}>
      <TableCell className="font-medium">
        <div>{item.employee?.firstName} {item.employee?.lastName}</div>
        <div className="text-xs text-muted-foreground">{item.employee?.employeeCode}</div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex flex-col items-center gap-1">
          {item.employee?.isPfApplicable && <Badge variant="outline" className="text-xs">PF</Badge>}
          {item.employee?.isEsiApplicable && <Badge variant="outline" className="text-xs">ESI</Badge>}
          {!item.employee?.isPfApplicable && !item.employee?.isEsiApplicable && <span className="text-muted-foreground text-xs">-</span>}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          min="0"
          max="31"
          value={paidDays}
          onChange={(e) => onPaidDaysChange(Math.max(0, Math.min(31, parseInt(e.target.value) || 0)))}
          disabled={isLocked}
          className="h-8 w-20 text-right"
          data-testid={`input-paid-days-${item.id}`}
        />
      </TableCell>
      <TableCell className="text-right font-mono text-sm">{formatCurrency(calc.earnedBasic)}</TableCell>
      <TableCell className="text-right font-mono text-sm">{formatCurrency(calc.earnedHra)}</TableCell>
      <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(calc.gross)}</TableCell>
      <TableCell className="text-right font-mono text-sm text-muted-foreground">
        {calc.pfAmount > 0 ? formatCurrency(calc.pfAmount) : '-'}
      </TableCell>
      <TableCell className="text-right font-mono text-sm text-muted-foreground">
        {calc.esiAmount > 0 ? formatCurrency(calc.esiAmount) : '-'}
      </TableCell>
      <TableCell className="text-right font-mono font-bold text-primary bg-primary/5">
        {formatCurrency(calc.netPay)}
      </TableCell>
      <TableCell className="text-center">
        {(isCompleted || isLocked) && (
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={onViewPayslip}
            data-testid={`button-view-payslip-${item.id}`}
          >
            <FileText className="w-4 h-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function RunDetailsPage() {
  const [match, params] = useRoute("/payroll-runs/:id");
  const runId = params?.id ? parseInt(params.id) : 0;
  
  const { data: run, isLoading } = usePayrollRun(runId);
  const { mutate: processRun, isPending: isProcessing } = useProcessPayrollRun();
  const { mutate: lockRun, isPending: isLocking } = useLockPayrollRun();
  const { mutate: updateItem } = useUpdatePayrollItem();
  
  const [paidDaysMap, setPaidDaysMap] = useState<Record<number, number>>({});
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipData | null>(null);
  
  const items = useMemo(() => {
    return (run?.items || []) as PayrollItemWithEmployee[];
  }, [run?.items]);

  const totals = useMemo(() => {
    let totalGross = 0;
    let totalPf = 0;
    let totalEsi = 0;
    let totalNet = 0;
    
    items.forEach((item) => {
      const paidDays = paidDaysMap[item.id] ?? 30;
      const calc = calculatePayroll(item, paidDays);
      totalGross += calc.gross;
      totalPf += calc.pfAmount;
      totalEsi += calc.esiAmount;
      totalNet += calc.netPay;
    });
    
    return { totalGross, totalPf, totalEsi, totalNet };
  }, [items, paidDaysMap]);

  useEffect(() => {
    if (run?.items) {
      const initialMap: Record<number, number> = {};
      run.items.forEach((item: PayrollItemWithEmployee) => {
        initialMap[item.id] = parseFloat(item.daysWorked) || 30;
      });
      setPaidDaysMap(initialMap);
    }
  }, [run?.items]);

  const isLocked = run?.status === "LOCKED" || run?.status === "COMPLETED";
  const isCompleted = run?.status === "COMPLETED";
  const company = (run as any)?.company;

  if (isLoading || !run) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const handlePaidDaysChange = (itemId: number, days: number) => {
    setPaidDaysMap(prev => ({ ...prev, [itemId]: days }));
  };

  const handleViewPayslip = (item: PayrollItemWithEmployee) => {
    const paidDays = paidDaysMap[item.id] ?? (parseFloat(item.daysWorked) || 30);
    const calc = calculatePayroll(item, paidDays);
    
    const payslipData: PayslipData = {
      companyName: company?.name || 'Company Name',
      companyAddress: '',
      month: run.month,
      employee: {
        name: `${item.employee?.firstName || ''} ${item.employee?.lastName || ''}`,
        employeeCode: item.employee?.employeeCode || '',
        designation: item.employee?.designation,
        uan: item.employee?.uan,
        esicIpNumber: item.employee?.esicIpNumber,
        bankAccountNumber: item.employee?.bankAccountNumber,
        ifscCode: item.employee?.ifscCode,
      },
      attendance: {
        totalDays: parseFloat(item.totalDays) || 30,
        daysWorked: paidDays,
        lopDays: (parseFloat(item.totalDays) || 30) - paidDays,
      },
      earnings: {
        basicSalary: calc.earnedBasic,
        hra: calc.earnedHra,
        specialAllowance: calc.earnedSpecialAllowance,
        grossSalary: calc.gross,
      },
      deductions: {
        pfEmployee: calc.pfAmount,
        esiEmployee: calc.esiAmount,
        professionalTax: 0,
        otherDeductions: parseFloat(item.otherDeductions) || 0,
        totalDeductions: calc.pfAmount + calc.esiAmount + (parseFloat(item.otherDeductions) || 0),
      },
      netPay: calc.netPay,
    };
    
    setSelectedPayslip(payslipData);
  };

  const handleProcessPayroll = () => {
    items.forEach((item) => {
      const days = paidDaysMap[item.id] ?? 30;
      if (days !== parseFloat(item.daysWorked)) {
        updateItem({ id: item.id, daysWorked: days });
      }
    });
    
    setTimeout(() => {
      processRun(runId);
    }, 500);
  };
  
  return (
    <LayoutShell orgId={String(company?.organizationId || 1)} companyId={String(run.companyId)}>
      <div className="mb-4">
        <Link href={`/companies/${run.companyId}/payroll`}>
          <Button variant="ghost" className="px-0 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Runs
          </Button>
        </Link>
      </div>
      
      <PageHeader
        title={`Payroll for ${run.month}`}
        description={
          isCompleted 
            ? "This payroll run has been processed and completed."
            : isLocked 
              ? "This run is locked and cannot be edited." 
              : "Enter paid days for each employee. Calculations update in real-time."
        }
        actions={
          <div className="flex gap-2 items-center">
            {run.status === "DRAFT" && (
              <Button 
                onClick={handleProcessPayroll} 
                disabled={isProcessing}
                className="shadow-lg shadow-primary/20"
                data-testid="button-process-payroll"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Process Payroll
              </Button>
            )}
            {isCompleted && !isLocked && (
              <Button 
                variant="outline"
                onClick={() => lockRun(runId)} 
                disabled={isLocking}
              >
                {isLocking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                Lock Run
              </Button>
            )}
            {run.status === "COMPLETED" && (
              <Badge variant="secondary" className="bg-green-50 text-green-700">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            )}
            {run.status === "LOCKED" && (
              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                <Lock className="w-3 h-3 mr-1" />
                Locked
              </Badge>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <IndianRupee className="w-4 h-4" />
              Total Gross
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalGross)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Total Deductions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totals.totalPf + totals.totalEsi)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              PF: {formatCurrency(totals.totalPf)} | ESI: {formatCurrency(totals.totalEsi)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
              <IndianRupee className="w-4 h-4" />
              Net Payable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totals.totalNet)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border border-border shadow-sm">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[180px]">Employee</TableHead>
                <TableHead className="text-center w-[80px]">Statutory</TableHead>
                <TableHead className="text-right w-[100px]">Paid Days</TableHead>
                <TableHead className="text-right">Earned Basic</TableHead>
                <TableHead className="text-right">Earned HRA</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">PF (12%)</TableHead>
                <TableHead className="text-right">ESI (0.75%)</TableHead>
                <TableHead className="text-right bg-primary/5 font-bold">Net Pay</TableHead>
                <TableHead className="text-center w-[60px]">Payslip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <PayrollRow
                  key={item.id}
                  item={item}
                  paidDays={paidDaysMap[item.id] ?? 30}
                  onPaidDaysChange={(days) => handlePaidDaysChange(item.id, days)}
                  isLocked={isLocked}
                  isCompleted={isCompleted}
                  onViewPayslip={() => handleViewPayslip(item)}
                />
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No employees found for this run.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {run.status === "DRAFT" && items.length > 0 && (
        <div className="mt-6 flex justify-end">
          <Button 
            size="lg"
            onClick={handleProcessPayroll} 
            disabled={isProcessing}
            className="shadow-lg shadow-primary/20"
            data-testid="button-process-payroll-bottom"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Process Payroll for {items.length} Employees
          </Button>
        </div>
      )}

      <Dialog open={!!selectedPayslip} onOpenChange={(open) => !open && setSelectedPayslip(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto p-4">
          <DialogTitle className="sr-only">Employee Payslip</DialogTitle>
          {selectedPayslip && (
            <Payslip 
              data={selectedPayslip} 
              onClose={() => setSelectedPayslip(null)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </LayoutShell>
  );
}
