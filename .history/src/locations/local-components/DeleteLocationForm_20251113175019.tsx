// src/components/locations/DeleteLocationConfirm.tsx

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/form-components";
import { deleteLocation } from "./delete-location";

export const DeleteLocationConfirm = ({
  locationId,
  open,
  setOpen,
}: {
  locationId: number;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [status, setStatus] = useState<
    { message: string; type: "error" | "success" | "info" } | undefined
  >(undefined);

  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus({ message: "Deleting...", type: "info" });

    try {
      await deleteLocation(locationId);
      setStatus({ message: "Location deleted successfully!", type: "success" });

      setTimeout(() => {
        setOpen(false);
        setStatus(undefined);
      }, 1500);
    } catch (error: any) {
      setStatus({
        message: error.message || "Failed to delete location.",
        type: "error",
      });
    }
  };

  return (
    <Form
      title="Confirm Delete"
      open={open}
      setOpen={setOpen}
      onSubmit={handleDelete}
      statusMessage={status}
    >
      <p className="text-gray-700 mb-4">
        Are you sure you want to delete this location? This action cannot be undone.
      </p>

      <div className="flex justify-end gap-2 mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
        <Button type="submit" variant="destructive">
          Delete
        </Button>
      </div>
    </Form>
  );
};
