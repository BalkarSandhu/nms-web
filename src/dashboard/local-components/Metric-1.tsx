
import BaseCard from "./Base-Card";

export default function Metric1() {
    return (
        <BaseCard title="Metric 1">
            <div className="flex flex-1 items-center justify-center h-full w-full">
                <span className="text-(--contrast) text-2xl">Metric 1 Content</span>
            </div>
        </BaseCard>
    );
}