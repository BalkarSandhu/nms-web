import React from "react";

//-- lucide
import { EllipsisVertical, SquarePen, Trash2 } from "lucide-react";


//-- ShadCN Components
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"


//-- Locaiton Modifier Types




type LocationModifierProps = {
    locationId: number;
}

export default function LocationModifier({ locationId }: LocationModifierProps) {
    // Example handlers for edit/delete
    const handleEdit = () => {
        // Implement edit logic using locationId
        console.log('Edit location', locationId);
    };
    const handleDelete = () => {
        // Implement delete logic using locationId
        console.log('Delete location', locationId);
    };

    return (
        <Popover>
            <PopoverTrigger className="flex w-10 items-center justify-center">
                <EllipsisVertical className="size-4 text-(--base)" />
            </PopoverTrigger>
            <PopoverContent>
                <div className="flex flex-col gap-2">
                    <button className="text-(--base) flex items-center gap-1" onClick={handleEdit}>
                        Edit <SquarePen className="size-3"/>
                    </button>
                    <button className="text-(--base) flex items-center gap-1" onClick={handleDelete}>
                        Delete <Trash2 className="size-3"/>
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    )
}