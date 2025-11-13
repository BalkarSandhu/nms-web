import React, { useState } from "react";
import { EllipsisVertical, SquarePen, Trash2 } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { DeleteDeviceForm } from "./DeleteDeviceForm";
import { EditDeviceForm } from "./EditDeviceForm";

type DeviceModifierProps = {
    deviceId: number;
};

export default function DeviceModifier({ deviceId }: DeviceModifierProps) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    return (
        <>
            <Popover>
                <PopoverTrigger className="flex w-10 items-center justify-center">
                    <EllipsisVertical className="size-4 text-(--base)" />
                </PopoverTrigger>
                <PopoverContent>
                    <div className="flex flex-col gap-2">
                        <button 
                            className="text-(--base) flex items-center gap-1" 
                            onClick={() => setShowEditModal(true)}
                        >
                            Edit <SquarePen className="size-3"/>
                        </button>
                        <button 
                            className="text-(--base) flex items-center gap-1" 
                            onClick={() => setShowDeleteModal(true)}
                        >
                            Delete <Trash2 className="size-3"/>
                        </button>
                    </div>
                </PopoverContent>
            </Popover>

            {showDeleteModal && (
                <DeleteDeviceForm 
                    deviceId={deviceId} 
                    open={showDeleteModal} 
                    setOpen={setShowDeleteModal} 
                />
            )}

            {showEditModal && (
                <EditDeviceForm 
                    deviceId={deviceId} 
                    open={showEditModal} 
                    setOpen={setShowEditModal} 
                />
            )}
        </>
    );
}