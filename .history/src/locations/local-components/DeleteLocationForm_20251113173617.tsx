// src/components/locations/DeleteLocationForm.tsx

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/form-components";
import { deleteLocation } from "./delete-location-form";

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus({ message: "Deleting...", type: "info" });

    try {
      await deleteLocation({ id: locationId });
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
      title="Are you sure? This location will be permanently deleted."
      open={open}
      setOpen={setOpen}
      onSubmit={handleSubmit}
      statusMessage={status}
    >
    </Form>
  );
};
