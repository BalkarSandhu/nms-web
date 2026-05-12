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
    <div className="p-6 fade-in">
      <div className="nms-panel-flat p-5 mb-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-hi)' }}>Area Report</h1>
            <p className="text-xs" style={{ color: 'var(--text-lo)' }}>Field worker breakdown across areas and uptime</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold"
              style={{
                background: 'rgba(15,23,42,0.6)',
                color: 'var(--text-mid)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <Printer size={14} /> Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold"
              style={{
                background: 'linear-gradient(180deg, var(--brand) 0%, var(--brand-strong) 100%)',
                color: 'var(--bg-app)',
                boxShadow: '0 6px 14px -8px rgba(6,182,212,0.7)',
              }}
            >
              <Download size={14} /> PDF
            </button>
          </div>
        </div>

        <ReportsFilters onGenerate={handleWorkersGenerate} />
      </div>

      {loading && (
        <div className="nms-panel-flat p-5 mb-5 text-center">
          <p className="text-sm" style={{ color: 'var(--text-mid)' }}>Loading report data…</p>
        </div>
      )}

      {reportData && (
        <div className="nms-panel-flat overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(15,23,42,0.8)' }}>
                  {['S.No','Area','Location','Device IP','Device Type','Downtime','Uptime'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-lo)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.workers?.map((device: any) => (
                  <tr key={device.sno} className="transition-colors hover:bg-white/[0.03]">
                    <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-soft)', color: 'var(--text-mid)' }}>{device.sno}</td>
                    <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-soft)', color: 'var(--text-hi)' }}>{device.area}</td>
                    <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-soft)', color: 'var(--text-hi)' }}>{device.location}</td>
                    <td className="px-4 py-3 border-b font-mono text-xs" style={{ borderColor: 'var(--border-soft)', color: 'var(--text-mid)' }}>{device.deviceIp}</td>
                    <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-soft)' }}>
                      <span className="badge-info">{device.deviceType}</span>
                    </td>
                    <td className="px-4 py-3 border-b font-medium tabular-nums" style={{ borderColor: 'var(--border-soft)', color: 'var(--status-offline)' }}>{device.downtime}</td>
                    <td className="px-4 py-3 border-b font-semibold tabular-nums" style={{
                      borderColor: 'var(--border-soft)',
                      color: parseFloat(device.uptime) >= 99.5 ? 'var(--status-online)' :
                             parseFloat(device.uptime) >= 98   ? 'var(--status-warning)' : 'var(--status-offline)',
                    }}>
                      {device.uptime}
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