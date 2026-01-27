import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { LayoutShell } from "@/components/layout-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSpreadsheet, Building2, Calendar, Loader2, AlertCircle, FileText, Users } from "lucide-react";
import { useState, useMemo } from "react";
import type { Company, PayrollRun, PayrollItem, Employee } from "@shared/schema";

type PayrollItemWithEmployee = PayrollItem & { employee: Employee };

interface PayrollRunWithItems extends PayrollRun {
  items: PayrollItemWithEmployee[];
}

export default function ReportsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [selectedRunId, setSelectedRunId] = useState<string>("");

  const { data: company, isLoading: companyLoading } = useQuery<Company>({
    queryKey: ['/api/companies', companyId],
  });

  const { data: runs = [], isLoading: runsLoading } = useQuery<PayrollRun[]>({
    queryKey: ['/api/companies', companyId, 'payroll-runs'],
    enabled: !!companyId,
  });

  const completedRuns = useMemo(() => 
    runs.filter(r => r.status === "COMPLETED" || r.status === "LOCKED"),
    [runs]
  );

  const { data: selectedRunData, isLoading: runDataLoading } = useQuery<PayrollRunWithItems>({
    queryKey: ['/api/payroll-runs', selectedRunId],
    enabled: !!selectedRunId,
  });

  const items = selectedRunData?.items || [];

  const pfEligibleItems = useMemo(() => 
    items.filter(item => item.employee.isPfApplicable && item.employee.uan),
    [items]
  );

  const esiEligibleItems = useMemo(() => 
    items.filter(item => item.employee.isEsiApplicable && item.employee.esicIpNumber),
    [items]
  );

  const formatMonth = (month: string) => {
    const [year, m] = month.split("-");
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(num);
  };

  const calculatePfWages = (item: PayrollItemWithEmployee) => {
    const basicPlusDa = parseFloat(item.basicSalary);
    return Math.min(basicPlusDa, 15000);
  };

  const calculateEpsWages = (item: PayrollItemWithEmployee) => {
    const pfWages = calculatePfWages(item);
    return Math.min(pfWages, 15000);
  };

  const downloadPfEcrCsv = () => {
    if (!selectedRunData) return;

    const headers = [
      "UAN",
      "Member Name",
      "Gross Wages",
      "EPF Wages",
      "EPS Wages",
      "EDLI Wages",
      "EPF Contribution (EE)",
      "EPS Contribution",
      "EPF Contribution (ER)",
      "NCP Days",
      "Refund of Advances"
    ];

    const rows = pfEligibleItems.map(item => {
      const pfWages = calculatePfWages(item);
      const epsWages = calculateEpsWages(item);
      const grossWages = parseFloat(item.grossSalary);
      const eeContribution = parseFloat(item.pfEmployee);
      const erContribution = parseFloat(item.pfEmployer);
      const epsContribution = Math.round(epsWages * 0.0833);
      const epfErContribution = erContribution - epsContribution;
      const ncpDays = parseFloat(item.lopDays);

      return [
        item.employee.uan || "",
        `${item.employee.firstName} ${item.employee.lastName}`,
        Math.round(grossWages),
        Math.round(pfWages),
        Math.round(epsWages),
        Math.round(pfWages),
        Math.round(eeContribution),
        Math.round(epsContribution),
        Math.round(epfErContribution),
        ncpDays,
        0
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    downloadCsv(csvContent, `PF_ECR_${selectedRunData.month}.csv`);
  };

  const downloadEsiCsv = () => {
    if (!selectedRunData) return;

    const headers = [
      "IP Number",
      "IP Name",
      "No of Days",
      "Total Monthly Wages",
      "Reason Code for Zero Workings Days",
      "Last Working Day"
    ];

    const rows = esiEligibleItems.map(item => {
      const daysWorked = parseFloat(item.daysWorked);
      const totalWages = parseFloat(item.grossSalary);

      return [
        item.employee.esicIpNumber || "",
        `${item.employee.firstName} ${item.employee.lastName}`,
        Math.round(daysWorked),
        Math.round(totalWages),
        "",
        ""
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    downloadCsv(csvContent, `ESI_Contribution_${selectedRunData.month}.csv`);
  };

  const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (companyLoading || runsLoading) {
    return (
      <LayoutShell companyId={companyId} orgId={company?.organizationId?.toString()}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell companyId={companyId} orgId={company?.organizationId?.toString()}>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Building2 className="w-4 h-4" />
          <span>{company?.name}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Statutory Reports</h1>
        <p className="text-muted-foreground">Generate PF ECR and ESI contribution reports for filing</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Select Payroll Period
          </CardTitle>
          <CardDescription>
            Choose a completed payroll run to generate reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedRunId} onValueChange={setSelectedRunId}>
            <SelectTrigger className="w-full md:w-80" data-testid="select-payroll-run">
              <SelectValue placeholder="Select a payroll run..." />
            </SelectTrigger>
            <SelectContent>
              {completedRuns.length === 0 ? (
                <SelectItem value="none" disabled>No completed runs available</SelectItem>
              ) : (
                completedRuns.map(run => (
                  <SelectItem key={run.id} value={run.id.toString()}>
                    {formatMonth(run.month)} - {run.status}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {completedRuns.length === 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg flex items-center gap-3 text-muted-foreground">
              <AlertCircle className="w-5 h-5" />
              <span>No completed payroll runs found. Process a payroll run first to generate reports.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRunId && runDataLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {selectedRunData && !runDataLoading && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    PF ECR Report
                  </CardTitle>
                  <CardDescription>
                    EPF Electronic Challan cum Return format
                  </CardDescription>
                </div>
                <Badge variant="secondary">{pfEligibleItems.length} employees</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {pfEligibleItems.length > 0 ? (
                <>
                  <div className="max-h-64 overflow-auto rounded border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>UAN</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">EPF Wages</TableHead>
                          <TableHead className="text-right">EE Share</TableHead>
                          <TableHead className="text-right">ER Share</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pfEligibleItems.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-xs">{item.employee.uan}</TableCell>
                            <TableCell>{item.employee.firstName} {item.employee.lastName}</TableCell>
                            <TableCell className="text-right">{formatCurrency(calculatePfWages(item))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.pfEmployee)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.pfEmployer)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button 
                    onClick={downloadPfEcrCsv} 
                    className="w-full"
                    data-testid="button-download-pf-ecr"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export to CSV
                  </Button>
                </>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No PF-eligible employees with UAN found</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    ESI Contribution Report
                  </CardTitle>
                  <CardDescription>
                    ESIC monthly contribution format
                  </CardDescription>
                </div>
                <Badge variant="secondary">{esiEligibleItems.length} employees</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {esiEligibleItems.length > 0 ? (
                <>
                  <div className="max-h-64 overflow-auto rounded border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>IP Number</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Days</TableHead>
                          <TableHead className="text-right">Wages</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {esiEligibleItems.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-xs">{item.employee.esicIpNumber}</TableCell>
                            <TableCell>{item.employee.firstName} {item.employee.lastName}</TableCell>
                            <TableCell className="text-right">{Math.round(parseFloat(item.daysWorked))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.grossSalary)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button 
                    onClick={downloadEsiCsv} 
                    className="w-full"
                    data-testid="button-download-esi"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export to CSV
                  </Button>
                </>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No ESI-eligible employees with IP Number found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </LayoutShell>
  );
}
