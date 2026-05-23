// src/components/locations/DeleteLocationConfirm.tsx

import React, { useState } from "react";
// import { Button } from "@/components/ui/button";
import { Form } from "@/components/form-components";
import { deleteLocation } from "./delete-location-form";
import { useRefresh } from "@/contexts/RefreshContext";

export const DeleteLocationForm = ({
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
  const { triggerRefresh } = useRefresh();

  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus({ message: "Deleting...", type: "info" });

    try {
      await deleteLocation(locationId);
      setStatus({ message: "Location deleted successfully!", type: "success" });
      triggerRefresh(); // ← re-fetch the table

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
      trigger={<></>}
    >
      <p className="text-gray-700 mb-4">
        Are you sure you want to delete this location? This action cannot be undone.
      </p>
      <button className="text-white-700 mb-4">
        X</button>

      
    </Form>
  );
};
