import ReportsFilters from "./local-components/ReportsFilters";
import { useState } from "react";
import { Printer, Download } from "lucide-react";

export default function WorkersReportsPage() {
  const [lastFilters, setLastFilters] = useState(null as any);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  

  const generateTableHTML = (filters: any) => {
    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const tableRows = reportData?.workers?.map((device: any) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${device.sno}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${device.area}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${device.location}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-family: monospace;">${device.deviceIp}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${device.deviceType}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">${device.downtime}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #16a34a; font-weight: 600;">${device.uptime}</td>
      </tr>
    `).join('') || '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Workers Status Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #333; }
            .page { page-break-after: always; padding: 48px; min-height: 1000px; display: flex; flex-direction: column; }
            .header { border-bottom: 4px solid #2563eb; padding-bottom: 24px; margin-bottom: 32px; }
            .header h1 { font-size: 32px; font-weight: bold; color: #111; margin-bottom: 8px; }
            .header h2 { font-size: 20px; color: #666; }
            .report-info { margin-bottom: 48px; }
            .report-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px; }
            .report-info-item span { font-weight: 600; color: #375a7f; }
            .filters-section { margin-bottom: 48px; background: #f3f4f6; padding: 24px; border-radius: 8px; }
            .filters-section h3 { font-size: 18px; font-weight: 600; color: #111; margin-bottom: 16px; }
            .filters-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .filter-item-label { font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px; }
            .filter-item-value { color: #111; }
            .summary-section { flex-grow: 1; }
            .summary-section h3 { font-size: 20px; font-weight: 600; color: #111; margin-bottom: 24px; }
            .summary-box { background: #dbeafe; border-left: 4px solid #2563eb; padding: 24px; border-radius: 0 8px 8px 0; }
            .summary-box p { color: #333; }
            .footer { margin-top: auto; padding-top: 32px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 14px; color: #999; }
            .page-header-2 { border-bottom: 2px solid #d1d5db; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
            .page-header-2 h2 { font-size: 20px; font-weight: bold; color: #111; }
            .page-header-2 p { font-size: 14px; color: #666; margin-top: 4px; }
            .page-indicator { text-align: right; font-size: 14px; color: #666; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; }
            thead tr { background: #111; color: white; }
            th { padding: 12px 16px; text-align: left; font-weight: 600; }
            @media print {
              body { margin: 0; padding: 0; }
              .page { page-break-after: always; }
            }
          </style>
        </head>
        <body>
          <!-- Page 1: Cover Page -->
          <div class="page">
            <div class="header">
              <h1>Report System</h1>
              <h2>Workers Status Report</h2>
            </div>

            <div class="report-info">
              <div class="report-info-grid">
                <div class="report-info-item">
                  <span>Generated On:</span> ${generatedDate}
                </div>
                <div class="report-info-item">
                  <span>Report Type:</span> Workers
                </div>
              </div>
            </div>

            <div class="filters-section">
              <h3>Applied Filters</h3>
              <div class="filters-grid">
                <div>
                  <div class="filter-item-label">Start Date & Time</div>
                  <div class="filter-item-value">${filters?.startDateTime || 'N/A'}</div>
                </div>
                <div>
                  <div class="filter-item-label">End Date & Time</div>
                  <div class="filter-item-value">${filters?.endDateTime || 'N/A'}</div>
                </div>
                <div>
                  <div class="filter-item-label">Block</div>
                  <div class="filter-item-value">${filters?.block || 'N/A'}</div>
                </div>
                <div>
                  <div class="filter-item-label">Location</div>
                  <div class="filter-item-value">${filters?.location || 'N/A'}</div>
                </div>
              </div>
            </div>

            

          
          </div>

          <!-- Page 2: Data Table -->
          <div class="page">
            <div class="page-header-2">
              <div>
                <h2>Workers Status Report</h2>
                <p>${generatedDate}</p>
              </div>
              <div class="page-indicator">Page 2 of 2</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Area</th>
                  <th>Location</th>
                  <th>Device IP</th>
                  <th>Device Type</th>
                  <th>Downtime</th>
                  <th>Uptime</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>

            
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const htmlContent = generateTableHTML(lastFilters);
    const element = document.createElement('a');
    const file = new Blob([htmlContent], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `workers-report-${Date.now()}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  const handleWorkersGenerate = (filters: any) => {
    console.log('Generate report with', filters);
    setLastFilters(filters);
    setLoading(true);

    // Simulate API call - replace with actual API
    setTimeout(() => {
      const mockData = {
        workers: [
          
        ]
      };
      setReportData(mockData);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="p-4">
      <div className="p-4">
  {/* HEADER ROW */}
  <div className="flex justify-between items-center mb-4">
    <label className="text-lg font-semibold">Area Report</label>

    <div className="flex gap-3">
      <button
        onClick={handlePrint}
        className="w-fit h-fit py-1 px-3 text-white flex bg-(--azul) rounded-[10px] items-center hover:bg-(--azul)/90"
      >
        <Printer size={18} />
      </button>

      <button
        onClick={handleDownloadPDF}
        className="w-fit h-fit py-1 px-3 text-white flex bg-(--green)/90 rounded-[10px] items-center hover:bg-(--green)"
      >
        <Download size={18} />
      </button>
    </div>
  </div>

  <ReportsFilters onGenerate={handleWorkersGenerate} />
</div>


      {loading && (
        <div className="p-4 text-center">
          <p className="text-gray-600">Loading report data...</p>
        </div>
      )}

      {reportData && (
        <div className="p-2">
          
          


          {/* Data Table */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="px-4 py-3 text-left font-semibold">S.No</th>
                  <th className="px-4 py-3 text-left font-semibold">Area</th>
                  <th className="px-4 py-3 text-left font-semibold">Location</th>
                  <th className="px-4 py-3 text-left font-semibold">Device IP</th>
                  <th className="px-4 py-3 text-left font-semibold">Device Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Downtime</th>
                  <th className="px-4 py-3 text-left font-semibold">Uptime</th>
                </tr>
              </thead>
              <tbody>
                {reportData.workers?.map((device: any, index: number) => (
                  <tr key={device.sno} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-3 border-b border-gray-200">{device.sno}</td>
                    <td className="px-4 py-3 border-b border-gray-200">{device.area}</td>
                    <td className="px-4 py-3 border-b border-gray-200">{device.location}</td>
                    <td className="px-4 py-3 border-b border-gray-200 font-mono text-xs">{device.deviceIp}</td>
                    <td className="px-4 py-3 border-b border-gray-200">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {device.deviceType}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-200 text-red-600 font-medium">{device.downtime}</td>
                    <td className="px-4 py-3 border-b border-gray-200">
                      <span className={`font-semibold ${
                        parseFloat(device.uptime) >= 99.5 ? 'text-green-600' :
                        parseFloat(device.uptime) >= 98 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {device.uptime}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          
        </div>
      )}
    </div>
  );
}