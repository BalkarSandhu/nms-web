// src/components/locations/LocationModifier.tsx

import React, { useState } from "react";
import { EllipsisVertical, SquarePen, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EditLocationForm } from "./EditLocationForm";

type LocationModifierProps = {
  locationId: number;
};

export default function LocationModifier({ locationId }: LocationModifierProps) {
  const [editOpen, setEditOpen] = useState(false);

  const handleEdit = () => {
    setEditOpen(true);
  };

  const handleDelete = () => {
    console.log("Delete location", locationId);
  };

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
              onClick={handleEdit}
            >
              Edit <SquarePen className="size-3" />
            </button>
            <button
              className="text-(--base) flex items-center gap-1"
              onClick={handleDelete}
            >
              Delete <Trash2 className="size-3" />
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {editOpen && (
        <EditLocationForm
          locationId={locationId}
          open={editOpen}
          setOpen={setEditOpen}
        />
      )}
    </>
  );
}
