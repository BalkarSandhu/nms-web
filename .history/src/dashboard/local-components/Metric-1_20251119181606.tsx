import BaseCard from "./Base-Card";
import "@/index.css";

export interface MetricData {
  low: number;
  medium: number;
  high: number;
}

export interface MetricLabels {
  low?: string;
  medium?: string;
  high?: string;
}

export interface Metric1Props {
  title?: string;
  data?: MetricData;
  labels?: MetricLabels;
  className?: string;
  showLabels?: boolean;
  menuGroups?: any;
  onStatusClick?: (status: "online" | "offline" | "unknown") => void;
}

export default function Metric1({
  title = "Metric 1",
  data = { low: 25, medium: 35, high: 40 },
  labels = { low: "Online", medium: "Supervised", high: "Offline" },
  className = "",
  showLabels = true,
  menuGroups,
  onStatusClick,
}: Metric1Props) {
  return (
    <BaseCard
      title={title}
      className={className}
      menuGroups={menuGroups}
    >
      <div className="p-3 flex flex-col gap-2 text-(--contrast) text-sm">

        {labels.low && (
          <button
            onClick={() => onStatusClick?.("online")}
            className="flex items-center gap-2 bg-transparent border-0 p-0"
          >
            <span className="w-3 h-3 rounded-full bg-(--green)"></span>
            <span>{labels.low}: {data.low}</span>
          </button>
        )}

        {labels.medium && (
          <button
            onClick={() => onStatusClick?.("unknown")}
            className="flex items-center gap-2 bg-transparent border-0 p-0"
          >
            <span className="w-3 h-3 rounded-full bg-(--azul)"></span>
            <span>{labels.medium}: {data.medium}</span>
          </button>
        )}

        {labels.high && (
          <button
            onClick={() => onStatusClick?.("offline")}
            className="flex items-center gap-2 bg-transparent border-0 p-0"
          >
            <span className="w-3 h-3 rounded-full bg-(--red)"></span>
            <span>{labels.high}: {data.high}</span>
          </button>
        )}

      </div>
    </BaseCard>
  );
}
