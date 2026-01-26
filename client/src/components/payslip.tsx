import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface PayslipData {
  companyName: string;
  companyAddress?: string;
  month: string;
  employee: {
    name: string;
    employeeCode: string;
    designation?: string;
    uan?: string;
    esicIpNumber?: string;
    bankAccountNumber?: string;
    ifscCode?: string;
  };
  attendance: {
    totalDays: number;
    daysWorked: number;
    lopDays: number;
  };
  earnings: {
    basicSalary: number;
    hra: number;
    specialAllowance: number;
    grossSalary: number;
  };
  deductions: {
    pfEmployee: number;
    esiEmployee: number;
    professionalTax: number;
    otherDeductions: number;
    totalDeductions: number;
  };
  netPay: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMonth(month: string) {
  const [year, mon] = month.split('-');
  const date = new Date(parseInt(year), parseInt(mon) - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';
  
  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };

  return convert(Math.round(num)) + ' Rupees Only';
}

export function Payslip({ data, onClose }: { data: PayslipData; onClose?: () => void }) {
  const payslipRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!payslipRef.current) return;

    const canvas = await html2canvas(payslipRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 0;

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save(`Payslip_${data.employee.employeeCode}_${data.month}.pdf`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" onClick={() => window.print()} data-testid="button-print-payslip">
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
        <Button onClick={handleDownloadPDF} data-testid="button-download-pdf">
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      <div
        ref={payslipRef}
        className="bg-white text-black mx-auto shadow-lg print:shadow-none"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '15mm',
          fontFamily: 'Arial, sans-serif',
          fontSize: '11px',
          lineHeight: '1.4',
        }}
      >
        <div style={{ border: '2px solid #1a1a1a', padding: '20px' }}>
          <div className="text-center mb-6" style={{ borderBottom: '2px solid #1a1a1a', paddingBottom: '15px' }}>
            <div
              className="mx-auto mb-3 flex items-center justify-center"
              style={{
                width: '60px',
                height: '60px',
                border: '2px solid #666',
                borderRadius: '8px',
                backgroundColor: '#f5f5f5',
              }}
            >
              <span style={{ color: '#666', fontSize: '10px' }}>LOGO</span>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '5px' }}>
              {data.companyName}
            </h1>
            {data.companyAddress && (
              <p style={{ color: '#666', fontSize: '11px' }}>{data.companyAddress}</p>
            )}
            <h2
              style={{
                marginTop: '15px',
                fontSize: '14px',
                fontWeight: 'bold',
                backgroundColor: '#1a1a1a',
                color: 'white',
                padding: '8px',
              }}
            >
              PAYSLIP FOR {formatMonth(data.month).toUpperCase()}
            </h2>
          </div>

          <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '5px 10px', width: '25%', fontWeight: 'bold' }}>Employee Name</td>
                <td style={{ padding: '5px 10px', width: '25%' }}>{data.employee.name}</td>
                <td style={{ padding: '5px 10px', width: '25%', fontWeight: 'bold' }}>Employee Code</td>
                <td style={{ padding: '5px 10px', width: '25%' }}>{data.employee.employeeCode}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px 10px', fontWeight: 'bold' }}>Designation</td>
                <td style={{ padding: '5px 10px' }}>{data.employee.designation || '-'}</td>
                <td style={{ padding: '5px 10px', fontWeight: 'bold' }}>Days Worked</td>
                <td style={{ padding: '5px 10px' }}>{data.attendance.daysWorked} / {data.attendance.totalDays}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px 10px', fontWeight: 'bold' }}>UAN</td>
                <td style={{ padding: '5px 10px' }}>{data.employee.uan || '-'}</td>
                <td style={{ padding: '5px 10px', fontWeight: 'bold' }}>LOP Days</td>
                <td style={{ padding: '5px 10px' }}>{data.attendance.lopDays}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px 10px', fontWeight: 'bold' }}>ESIC IP No.</td>
                <td style={{ padding: '5px 10px' }}>{data.employee.esicIpNumber || '-'}</td>
                <td style={{ padding: '5px 10px', fontWeight: 'bold' }}>Bank A/c</td>
                <td style={{ padding: '5px 10px' }}>
                  {data.employee.bankAccountNumber ? `${data.employee.bankAccountNumber}` : '-'}
                </td>
              </tr>
              {data.employee.ifscCode && (
                <tr>
                  <td style={{ padding: '5px 10px', fontWeight: 'bold' }}>IFSC Code</td>
                  <td style={{ padding: '5px 10px' }}>{data.employee.ifscCode}</td>
                  <td></td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0' }}>
                    <th colSpan={2} style={{ padding: '10px', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #ccc' }}>
                      EARNINGS
                    </th>
                  </tr>
                  <tr style={{ backgroundColor: '#f9f9f9' }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ccc', width: '60%' }}>Particulars</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ccc' }}>Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Basic Salary</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                      {formatCurrency(data.earnings.basicSalary)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>House Rent Allowance (HRA)</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                      {formatCurrency(data.earnings.hra)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Special Allowance</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                      {formatCurrency(data.earnings.specialAllowance)}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                    <td style={{ padding: '10px' }}>Total Gross Earnings</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(data.earnings.grossSalary)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0' }}>
                    <th colSpan={2} style={{ padding: '10px', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #ccc' }}>
                      DEDUCTIONS
                    </th>
                  </tr>
                  <tr style={{ backgroundColor: '#f9f9f9' }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ccc', width: '60%' }}>Particulars</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ccc' }}>Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Provident Fund (PF)</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                      {data.deductions.pfEmployee > 0 ? formatCurrency(data.deductions.pfEmployee) : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>ESI (Employee)</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                      {data.deductions.esiEmployee > 0 ? formatCurrency(data.deductions.esiEmployee) : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Professional Tax (PT)</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                      {data.deductions.professionalTax > 0 ? formatCurrency(data.deductions.professionalTax) : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Other Deductions</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                      {data.deductions.otherDeductions > 0 ? formatCurrency(data.deductions.otherDeductions) : '-'}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                    <td style={{ padding: '10px' }}>Total Deductions</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(data.deductions.totalDeductions)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #1a1a1a', marginBottom: '20px' }}>
            <tbody>
              <tr style={{ backgroundColor: '#1a1a1a', color: 'white' }}>
                <td style={{ padding: '15px', fontSize: '14px', fontWeight: 'bold' }}>NET PAY</td>
                <td style={{ padding: '15px', textAlign: 'right', fontSize: '18px', fontWeight: 'bold' }}>
                  {formatCurrency(data.netPay)}
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ padding: '10px', fontSize: '11px', fontStyle: 'italic', backgroundColor: '#f9f9f9' }}>
                  Amount in words: {numberToWords(data.netPay)}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', paddingTop: '40px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #666', width: '150px', paddingTop: '5px' }}>
                Employee Signature
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #666', width: '150px', paddingTop: '5px' }}>
                Authorized Signatory
              </div>
            </div>
          </div>

          <div style={{ marginTop: '30px', fontSize: '9px', color: '#666', textAlign: 'center' }}>
            This is a system-generated payslip and does not require a signature.
          </div>
        </div>
      </div>
    </div>
  );
}

export type { PayslipData };
