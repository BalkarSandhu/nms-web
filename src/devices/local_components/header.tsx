import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Sheet, Smartphone } from "lucide-react";

import AddDeviceForm from "./AddDeviceForm";
import { AddDeviceTypeForm } from "./AddDeviceTypeForm";
import { PageHeader, ToolbarButton } from "@/components/page-header";

type HeaderProps = {
    onExport?: () => void;
    exportDisabled?: boolean;
};

export default function Header({ onExport, exportDisabled }: HeaderProps) {
    return (
        <PageHeader
            title="Devices"
            description="Reachability, types, and assignment across the network"
            icon={<Smartphone className="size-5" />}
            actions={
                <>
                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold transition-all duration-150"
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
                            <AddDeviceForm />
                            <AddDeviceTypeForm />
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
