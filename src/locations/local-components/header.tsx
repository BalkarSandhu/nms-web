import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Sheet, MapPin } from "lucide-react";

import { AddLocationForm } from "./AddLocationForm";
import { AddLocationTypeForm } from "./AddLocationTypeForm";
import { PageHeader, ToolbarButton } from "@/components/page-header";

type HeaderProps = {
    onExport?: () => void;
    exportDisabled?: boolean;
};

export default function Header({ onExport, exportDisabled }: HeaderProps) {
    return (
        <PageHeader
            title="Locations"
            description="Sites, areas, projects, and on-site device counts"
            icon={<MapPin className="size-5" />}
            actions={
                <>
                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold"
                                style={{
                                    background:
                                        'linear-gradient(180deg, var(--status-online) 0%, #059669 100%)',
                                    color: '#fff',
                                    boxShadow: '0 6px 14px -8px rgba(16,185,129,0.7)',
                                }}
                            >
                                <Plus className="size-4" />
                                Add
                            </button>
                        </PopoverTrigger>
                        <PopoverContent>
                            <AddLocationForm />
                            <AddLocationTypeForm />
                        </PopoverContent>
                    </Popover>

                    <ToolbarButton
                        variant="primary"
                        onClick={onExport}
                        disabled={exportDisabled}
                        icon={<Sheet className="size-4" />}
                    >
                        Export
                    </ToolbarButton>
                </>
            }
        />
    );
}
