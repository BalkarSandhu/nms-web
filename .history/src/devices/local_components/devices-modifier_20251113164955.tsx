// src/components/devices/devices-modifier.tsx

import React from "react";
import { EllipsisVertical, SquarePen, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type DevicesModifierProps = {
  deviceId: number;
  onEdit?: (deviceId: number) => void;
  onDelete?: (deviceId: number) => void;
};

export default function DevicesModifier({
  deviceId,
  onEdit,
  onDelete,
}: DevicesModifierProps) {
  const handleEdit = () => {
    console.log("Edit device:", deviceId);
    onEdit?.(deviceId);
  };

  const handleDelete = () => {
    console.log("Delete device:", deviceId);
    onDelete?.(deviceId);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex w-8 h-8 items-center justify-center rounded hover:bg-gray-100"
          aria-label="Options"
        >
          <EllipsisVertical className="size-4 text-gray-600" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-32 p-2 flex flex-col gap-2">
        <button
          className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
          onClick={handleEdit}
        >
          <SquarePen className="size-3" /> Edit
        </button>
        <button
          className="flex items-center gap-2 text-gray-700 hover:text-red-600"
          onClick={handleDelete}
        >
          <Trash2 className="size-3" /> Delete
        </button>
      </PopoverContent>
    </Popover>
  );
}
