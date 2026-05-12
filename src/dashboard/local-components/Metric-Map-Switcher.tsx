import { Map, ChartPie } from "lucide-react";
import "@/index.css";

export type MetricMapSwitcherProps = {
    state?: boolean;
    state_changer?: (state: boolean) => void;
}

export default function MetricMapSwitcher({ state, state_changer }: MetricMapSwitcherProps) {
    return (
        <div
            className="w-9 h-[68px] flex flex-col rounded-lg overflow-hidden shrink-0"
            style={{
                background: 'rgba(15,23,42,0.7)',
                border: '1px solid var(--border-soft)',
            }}
        >
            <button
                aria-label="Show metrics"
                onClick={() => state_changer?.(false)}
                className="w-full flex-1 flex items-center justify-center transition-colors"
                style={{
                    background: !state ? 'linear-gradient(180deg, var(--brand) 0%, var(--brand-strong) 100%)' : 'transparent',
                    color: !state ? 'var(--bg-app)' : 'var(--text-mid)',
                }}
            >
                <ChartPie className="size-4" />
            </button>
            <div className="h-px" style={{ background: 'var(--border-soft)' }} />
            <button
                aria-label="Show map"
                onClick={() => state_changer?.(true)}
                className="w-full flex-1 flex items-center justify-center transition-colors"
                style={{
                    background: state ? 'linear-gradient(180deg, var(--brand) 0%, var(--brand-strong) 100%)' : 'transparent',
                    color: state ? 'var(--bg-app)' : 'var(--text-mid)',
                }}
            >
                <Map className="size-4" />
            </button>
        </div>
    );
}
