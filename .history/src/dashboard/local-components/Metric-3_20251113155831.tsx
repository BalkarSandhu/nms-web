
import BaseCard from "./Base-Card";
import "@/index.css";

export interface GaugeData {
    low: number;
    medium: number;
    high: number;
}

export interface GaugeLabels {
    low?: string;
    medium?: string;
    high?: string;
}

export interface GaugeLinks {
    low?: string;
    medium?: string;
    high?: string;
}

export interface Metric3Props {
    title?: string;
    data?: GaugeData;
    labels?: GaugeLabels;
    links?: GaugeLinks;
    className?: string;
    menuGroups?: any[];
}

export default function Metric3({
    title = "Metric 3",
    data = { low: 25, medium: 35, high: 40 },
    labels = { low: "Category 1", medium: "Category 2", high: "Category 3" },
    links = { low: "#", medium: "#", high: "#" },
    className = "",
    menuGroups
}: Metric3Props) {
    // Calculate total and percentages
    const total = data.low + data.medium + data.high;
    const lowPercent = (data.low / total) * 100;
    const mediumPercent = (data.medium / total) * 100;
    const highPercent = (data.high / total) * 100;

    const handleSegmentClick = (url?: string) => {
        if (url) {
            window.location.href = url;
        }
    };

    return (
        <BaseCard title={title} menuGroups={menuGroups} className={className}>
            <div className="flex flex-col w-full h-full justify-center gap-3">
                {/* Total Display */}
                <div className="flex flex-row items-center justify-center gap-1">
                    <span className="text-(--contrast) text-2xl font-bold">{total}</span>
                    <span className="text-(--contrast)/60 text-[10px]">Total</span>
                </div>

                {/* Linear Gauge Bar */}
                <div className="w-full h-8 flex rounded-[5px] overflow-hidden">
                    {/* Low segment */}
                    <button
                        onClick={() => handleSegmentClick(links.low)}
                        className="bg-(--green) flex items-center justify-center transition-all duration-300 
                                    hover:scale-120 hover:shadow-lg cursor-pointer"
                        style={{ width: `${lowPercent}%` }}
                    >
                        {lowPercent > 10 && (
                            <span className="text-white text-[10px] font-medium">
                                {Math.round(lowPercent)}%
                            </span>
                        )}
                    </button>

                    {/* Medium segment */}
                    <button
                        onClick={() => handleSegmentClick(links.medium)}
                        className="bg-(--azul) flex items-center justify-center transition-all duration-300
                                    hover:scale-120 hover:shadow-lg cursor-pointer"
                        style={{ width: `${mediumPercent}%` }}
                    >
                        {mediumPercent > 10 && (
                            <span className="text-white text-[10px] font-medium">
                                {Math.round(mediumPercent)}%
                            </span>
                        )}
                    </button>

                    {/* High segment */}
                    <button
                        onClick={() => handleSegmentClick(links.high)}
                        className="bg-(--red) flex items-center justify-center transition-all duration-300
                                    hover:scale-120 hover:shadow-lg cursor-pointer"
                        style={{ width: `${highPercent}%` }}
                    >
                        {highPercent > 10 && (
                            <span className="text-white text-[10px] font-medium">
                                {Math.round(highPercent)}%
                            </span>
                        )}
                    </button>
                </div>

                {/* Labels Section */}
                <div className="w-full flex justify-center gap-4 ">
                    <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-(--green)"></span>
                        <span className="text-(--contrast) text-[10px]">
                            {labels.low || "Low"}: {data.low}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-(--azul)"></span>
                        <span className="text-(--contrast) text-[10px]">
                            {labels.medium || "Medium"}: {data.medium}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-(--red)"></span>
                        <span className="text-(--contrast) text-[10px]">
                            {labels.high || "High"}: {data.high}
                        </span>
                    </div>
                </div>
            </div>
        </BaseCard>
    );
}