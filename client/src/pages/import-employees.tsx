import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import Papa from "papaparse";
import { Download, Upload, ArrowLeft, Table as TableIcon, AlertCircle, CheckCircle2, XCircle, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { api } from "@shared/routes";
import type { Company } from "@shared/schema";

const TEMPLATE_HEADER = [
  "employeeCode",
  "firstName",
  "lastName",
  "email",
  "phone",
  "dateOfJoining",
  "designation",
  "bankAccountNumber",
  "ifscCode",
  "uan",
  "esicIpNumber",
  "isPfApplicable",
  "isEsiApplicable",
  "fixedBasic",
  "fixedHra",
  "fixedSpecialAllowance"
].join(",");

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  data: any;
}

export default function ImportEmployees() {
  const [, params] = useRoute("/companies/:companyId/employees/import");
  const companyId = parseInt(params?.companyId || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [rawData, setRawData] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    failedCount: number;
    failedRows: any[];
  } | null>(null);

  const { data: company } = useQuery<Company>({
    queryKey: [`/api/companies/${companyId}`],
  });

  const importMutation = useMutation({
    mutationFn: async (rows: any[]) => {
      const res = await apiRequest("POST", `/api/companies/${companyId}/employees/import`, { rows });
      return res.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: [api.employees.list.path, companyId] });
      toast({
        title: "Employees imported successfully",
        description: `Created ${data.created}, Updated ${data.updated}, Failed ${data.failedCount}`,
      });
      if (data.failedCount === 0) {
        setTimeout(() => {
          setLocation(`/companies/${companyId}/employees`);
        }, 1500);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const validateRow = (row: any): ValidationResult => {
    const errors: string[] = [];
    
    if (!row.employeeCode) errors.push("Employee Code is required");
    if (!row.firstName) errors.push("First Name is required");
    if (!row.dateOfJoining) errors.push("Date of Joining is required");
    if (!row.fixedBasic) errors.push("Basic Salary is required");

    const parseBoolean = (val: any) => {
      if (typeof val === 'boolean') return val;
      if (!val) return false;
      const s = String(val).toLowerCase().trim();
      return ['true', '1', 'yes', 'y'].includes(s);
    };

    const parseNumber = (val: any) => {
      if (!val) return 0;
      const n = parseFloat(String(val).replace(/,/g, ''));
      return isNaN(n) ? 0 : n;
    };

    return {
      isValid: errors.length === 0,
      errors,
      data: {
        ...row,
        fixedBasicSalary: parseNumber(row.fixedBasic),
        fixedHra: parseNumber(row.fixedHra),
        fixedSpecialAllowance: parseNumber(row.fixedSpecialAllowance),
        isPfApplicable: parseBoolean(row.isPfApplicable),
        isEsiApplicable: parseBoolean(row.isEsiApplicable),
      }
    };
  };

  const processedData = useMemo(() => {
    return rawData.map(row => validateRow(row));
  }, [rawData]);

  const hasFatalErrors = useMemo(() => {
    return processedData.some(res => !res.isValid);
  }, [processedData]);

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_HEADER], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee_import_template.csv";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setImportResult(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<any>) => {
        setRawData(results.data);
        setIsParsing(false);
        toast({
          title: "File parsed",
          description: `Found ${results.data.length} rows to import.`,
        });
      },
      error: (error: Error) => {
        setIsParsing(false);
        toast({
          title: "Error parsing file",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleImport = () => {
    if (hasFatalErrors) return;
    const rows = processedData.map(res => res.data);
    importMutation.mutate(rows);
  };

  const downloadFailedRows = () => {
    if (!importResult?.failedRows.length) return;
    
    const csv = Papa.unparse(importResult.failedRows.map(f => ({
      ...f.row,
      import_error: f.error
    })));

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "failed_import_rows.csv";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setLocation(`/companies/${companyId}/employees`)}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Import Employees</h1>
          <p className="text-muted-foreground">
            {company?.name} - Bulk upload employee records
          </p>
        </div>
      </div>

      {!importResult ? (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-primary/10 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">1. Download Template</CardTitle>
                <CardDescription>
                  Use our standardized CSV template for correct formatting.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full border-primary/20 hover:bg-primary/5" 
                  onClick={downloadTemplate}
                  data-testid="button-download-template"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template CSV
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">2. Upload Data</CardTitle>
                <CardDescription>
                  Upload your CSV file to preview and validate.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isParsing || importMutation.isPending}
                  className="border-primary/20"
                  data-testid="input-csv-file"
                />
              </CardContent>
            </Card>
          </div>

          {processedData.length > 0 && (
            <Card className="border-primary/10 shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-muted/30">
                <div>
                  <CardTitle className="text-lg">Data Preview & Validation</CardTitle>
                  <CardDescription>
                    {hasFatalErrors ? (
                      <span className="text-destructive font-medium flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> Please fix validation errors before importing.
                      </span>
                    ) : (
                      "All rows validated. Ready to import."
                    )}
                  </CardDescription>
                </div>
                <TableIcon className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-auto">
                  <Table className="table-dense">
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-[50px]">Status</TableHead>
                        {Object.keys(rawData[0]).slice(0, 8).map((header) => (
                          <TableHead key={header} className="whitespace-nowrap">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedData.slice(0, 20).map((res, i) => (
                        <TableRow key={i} className={!res.isValid ? "bg-destructive/5" : ""}>
                          <TableCell>
                            {!res.isValid ? (
                              <div className="flex items-center" title={res.errors.join(", ")}>
                                <XCircle className="w-4 h-4 text-destructive" />
                              </div>
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                          </TableCell>
                          {Object.values(rawData[i]).slice(0, 8).map((value: any, j) => (
                            <TableCell key={j} className="whitespace-nowrap text-sm">
                              {value}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="p-6 border-t bg-muted/10 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing first 20 of {rawData.length} rows.
                  </p>
                  <Button 
                    onClick={handleImport}
                    disabled={hasFatalErrors || importMutation.isPending}
                    className="shadow-md"
                    data-testid="button-start-import"
                  >
                    {importMutation.isPending ? "Importing..." : `Import ${rawData.length} Rows Now`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>
              Processing completed for {importResult.created + importResult.updated + importResult.failedCount} records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-center">
                <div className="text-2xl font-bold text-blue-700">{importResult.created}</div>
                <div className="text-xs text-blue-600 uppercase tracking-wider font-semibold">New Records</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-100 text-center">
                <div className="text-2xl font-bold text-green-700">{importResult.updated}</div>
                <div className="text-xs text-green-600 uppercase tracking-wider font-semibold">Updated</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-100 text-center">
                <div className="text-2xl font-bold text-red-700">{importResult.failedCount}</div>
                <div className="text-xs text-red-600 uppercase tracking-wider font-semibold">Failed</div>
              </div>
            </div>

            {importResult.failedCount > 0 && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errors Detected</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>{importResult.failedCount} rows could not be imported due to validation or server errors.</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={downloadFailedRows}
                    className="ml-4 bg-white hover:bg-red-50"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Download Failed Rows
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-center pt-4">
              <Button onClick={() => setLocation(`/companies/${companyId}/employees`)}>
                Back to Employee List
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
