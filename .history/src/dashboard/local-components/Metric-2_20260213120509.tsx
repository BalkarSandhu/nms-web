import BaseCard from "./Base-Card";
import "@/index.css";

export interface TableRow {
  id: string | number;
  col1: string | number; // Area name
  col2: string | number; // Duration (e.g., "36d 19h")
  link?: string;
  deviceCount?: number; // Optional: number of offline devices
}

export interface Metric2Props {
  title?: string;
  headers?: { col1: string; col2: string };
  data?: TableRow[];
  maxRows?: number;
  className?: string;
  menuGroups?: any[];
  onRowClick?: (row: TableRow) => void;
}

// Helper function to convert duration string to hours for comparison
function parseDurationToHours(duration: string | number): number {
  if (typeof duration === 'number') return duration;
  
  const str = duration.toString();
  let totalHours = 0;
  
  // Parse days
  const daysMatch = str.match(/(\d+)d/);
  if (daysMatch) {
    totalHours += parseInt(daysMatch[1]) * 24;
  }
  
  // Parse hours
  const hoursMatch = str.match(/(\d+)h/);
  if (hoursMatch) {
    totalHours += parseInt(hoursMatch[1]);
  }
  
  // Parse minutes
  const minutesMatch = str.match(/(\d+)m/);
  if (minutesMatch) {
    totalHours += parseInt(minutesMatch[1]) / 60;
  }
  
  return totalHours;
}

export default function Metric2({
  title = "Critical",
  data = [],
  maxRows = 5,
  className = "",
  menuGroups,
  onRowClick
}: Metric2Props) {
  const displayedRows = data.slice(0, maxRows);
  const remainingCount = data.length - maxRows;

  // Calculate the maximum duration for scaling bars
  const maxDuration = Math.max(
    ...displayedRows.map(row => parseDurationToHours(row.col2)),
    1
  );

  const handleRowClick = (row: TableRow) => {
    if (onRowClick) {
      onRowClick(row);
    } else if (row.link) {
      window.location.href = row.link;
    }
  };

  if (data.length === 0) {
    return (
      <BaseCard
        title={title}
        icon={
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        }
        variant="critical"
        className={className}
        menuGroups={menuGroups}
      >
        <div className="text-center py-8 text-(--contrast)/50">No data</div>
      </BaseCard>
    );
  }

  return (
    <BaseCard
      title={title}
      icon={
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      }
      variant="critical"
      className={className}
      menuGroups={menuGroups}
    >
      <div className="space-y-3 px-1">
        {displayedRows.map((row) => {
          const durationHours = parseDurationToHours(row.col2);
          const barWidth = (durationHours / maxDuration) * 100;
          
          return (
            <div
              key={row.id}
              onClick={() => handleRowClick(row)}
              className="group cursor-pointer"
            >
              {/* Area name and duration */}
              <div className="flex justify-between items-center mb-1.5 px-1">
                <span className="text-sm font-medium text-(--contrast) group-hover:text-(--critical) transition-colors">
                  {row.col1}
                </span>
                <span className="text-sm font-mono text-(--critical)">
                  {row.col2}
                </span>
              </div>
              
              {/* Bar chart */}
              <div className="relative h-8 bg-(--contrast)/5 rounded-md overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-(--critical) to-(--critical)/80 group-hover:from-(--critical)/90 group-hover:to-(--critical)/70 transition-all duration-300 rounded-md"
                  style={{ width: `${barWidth}%` }}
                >
                  {/* Optional: Show device count inside bar if available */}
                  {row.deviceCount && (
                    <div className="absolute inset-0 flex items-center justify-end pr-3">
                      <span className="text-xs font-semibold text-white/90">
                        {row.deviceCount} devices
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more indicator */}
      {remainingCount > 0 && (
        <div
          onClick={() => data[maxRows] && handleRowClick(data[maxRows])}
          className="py-2 mt-3 text-center text-sm text-(--contrast)/70 hover:text-(--contrast) hover:bg-(--contrast)/5 rounded-md transition-colors cursor-pointer"
        >
          + {remainingCount} more
        </div>
      )}
    </BaseCard>
  );
}