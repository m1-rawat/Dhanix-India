import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Papa from "papaparse";
import { Download, Upload, ArrowLeft, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
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

export default function ImportEmployees() {
  const [, params] = useRoute("/companies/:companyId/employees/import");
  const companyId = parseInt(params?.companyId || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const { data: company } = useQuery<Company>({
    queryKey: [`/api/companies/${companyId}`],
  });

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
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreviewData(results.data.slice(0, 20));
        setIsParsing(false);
        toast({
          title: "File parsed successfully",
          description: `Showing preview of ${Math.min(results.data.length, 20)} rows.`,
        });
      },
      error: (error) => {
        setIsParsing(false);
        toast({
          title: "Error parsing file",
          description: error.message,
          variant: "destructive",
        });
      }
    });
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
          <h1 className="text-3xl font-bold tracking-tight">Import Employees</h1>
          <p className="text-muted-foreground">
            {company?.name} - Bulk upload employee records
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Download Template</CardTitle>
            <CardDescription>
              Use our standardized CSV template to ensure your data is formatted correctly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={downloadTemplate}
              data-testid="button-download-template"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Upload Data</CardTitle>
            <CardDescription>
              Upload your completed CSV file to preview the data before importing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full items-center gap-1.5">
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isParsing}
                data-testid="input-csv-file"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {previewData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Data Preview</CardTitle>
              <CardDescription>
                First 20 rows of your file. Verify the data looks correct.
              </CardDescription>
            </div>
            <TableIcon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(previewData[0]).map((header) => (
                      <TableHead key={header} className="whitespace-nowrap">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).map((value: any, j) => (
                        <TableCell key={j} className="whitespace-nowrap">
                          {value}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-6 flex justify-end">
              <Button disabled data-testid="button-start-import">
                Start Import (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
