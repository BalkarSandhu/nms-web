// src/components/devices/EditDeviceForm.tsx

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/form-components";
import { editDevice } from "./edit-device-form";

export const EditDeviceForm = ({
  deviceId,
  open,
  setOpen,
}: {
  deviceId: number;
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
      await editDevice({ id: deviceId });
      setStatus({ message: "Device editd successfully!", type: "success" });

      setTimeout(() => {
        setOpen(false);
        setStatus(undefined);
      }, 1500);
    } catch (error: any) {
      setStatus({
        message: error.message || "Failed to edit device.",
        type: "error",
      });
    }
  };

  return (
    <Form
      title="Are you sure? This device will be permanently editd."
      open={open}
      setOpen={setOpen}
      onSubmit={handleSubmit}
      statusMessage={status}
    >
    </Form>
  );
};
