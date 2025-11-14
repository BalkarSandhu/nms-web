// import React from "react";
// src/components/locations/LocationModifier.tsx

import { useState } from "react";
import { EllipsisVertical, SquarePen, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EditLocationForm } from "./EditLocationForm";
import { DeleteLocationForm } from "./DeleteLocationForm";

type LocationModifierProps = {
  locationId: number;
};

export default function LocationModifier({ locationId }: LocationModifierProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
              onClick={() => setEditOpen(true)}
            >
              Edit <SquarePen className="size-3" />
            </button>
            <button
              className="text-red-600 flex items-center gap-1"
              onClick={() => setDeleteOpen(true)}
            >
              Delete <Trash2 className="size-3" />
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Edit Modal */}
      {editOpen && (
        <EditLocationForm
          locationId={locationId}
          open={editOpen}
          setOpen={setEditOpen}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteOpen && (
        <DeleteLocationForm
          locationId={locationId}
          open={deleteOpen}
          setOpen={setDeleteOpen}
        />
      )}
    </>
  );
}
