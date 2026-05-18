import { Smartphone } from "lucide-react";

import { PageHeader, type HeaderMetric } from "@/components/page-header";

type HeaderProps = {
    onBack?: () => void;
    metrics?: HeaderMetric[];
};

export default function Header({ onBack, metrics }: HeaderProps) {
    return (
        <PageHeader
            onBack={onBack}
            title="Devices"
            description="Reachability, types, and assignment across the network"
            icon={<Smartphone className="size-5" />}
            metrics={metrics}
        />
    );
}
