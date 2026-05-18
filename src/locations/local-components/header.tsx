import { MapPin } from "lucide-react";

import { PageHeader, type HeaderMetric } from "@/components/page-header";

type HeaderProps = {
    onBack?: () => void;
    metrics?: HeaderMetric[];
};

export default function Header({ onBack, metrics }: HeaderProps) {
    return (
        <PageHeader
            onBack={onBack}
            title="Locations"
            description="Sites, areas, projects, and on-site device counts"
            icon={<MapPin className="size-5" />}
            metrics={metrics}
        />
    );
}
