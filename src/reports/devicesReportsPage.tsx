import { useState } from "react";
import { Printer, Download } from "lucide-react";
import ReportsFilters from "./local-components/ReportsFilters";

export default function DevicesReportsPage() {
  const [lastFilters, setLastFilters] = useState(null as any);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generateTableHTML = (filters: any) => {
    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const tableRows = reportData?.devices?.map((device: any) => `
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
          <title>Devices Status Report</title>
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
              <h2>Devices Status Report</h2>
            </div>

            <div class="report-info">
              <div class="report-info-grid">
                <div class="report-info-item">
                  <span>Generated On:</span> ${generatedDate}
                </div>
                <div class="report-info-item">
                  <span>Report Type:</span> Devices
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
                  <div class="filter-item-label">Worker</div>
                  <div class="filter-item-value">${filters?.workerName || 'N/A'}</div>
                </div>
                <div>
                  <div class="filter-item-label">Location</div>
                  <div class="filter-item-value">${filters?.locationName || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div class="summary-section">
              <h3>Executive Summary</h3>
              <div class="summary-box">
                <p>This report contains detailed information about devices. Total Records: ${reportData?.devices?.length || 0}</p>
              </div>
            </div>
          </div>

          <!-- Page 2: Data Table -->
          <div class="page">
            <div class="page-header-2">
              <div>
                <h2>Devices Status Report</h2>
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
    if (!reportData) {
      alert("Please generate a report first");
      return;
    }
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!reportData) {
      alert("Please generate a report first");
      return;
    }
    const htmlContent = generateTableHTML(lastFilters);
    const element = document.createElement('a');
    const file = new Blob([htmlContent], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `devices-report-${Date.now()}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  const handleDevicesGenerate = async (filters: any) => {
    console.log('Generate report with', filters);
    setLastFilters(filters);
    setLoading(true);

    try {
      // Replace with your actual API call
      const response = await fetch('/api/reports/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDateTime: filters.startDateTime,
          endDateTime: filters.endDateTime,
          workerId: filters.workerId,
          locationId: filters.locationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          {/* <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Devices Report</h1> */}
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              disabled={!reportData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              <Printer size={12} />
              
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={!reportData}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              <Download size={12} />
            
            </button>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <ReportsFilters onGenerate={handleDevicesGenerate} />

      {/* Loading State */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-center">
          <p className="text-blue-700 font-medium flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading report data...
          </p>
        </div>
      )}

      {/* Report Data Table */}
      {reportData && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
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
                {reportData.devices && reportData.devices.length > 0 ? (
                  reportData.devices.map((device: any, index: number) => (
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No devices found for the selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Footer */}
          {reportData.devices && reportData.devices.length > 0 && (
            <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Total Records:</span> {reportData.devices.length}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!reportData && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-dashed p-12 text-center">
          <p className="text-gray-500 text-lg">
            Select filters and click "Generate Report" to view device data
          </p>
        </div>
      )}
    </div>
  );
}