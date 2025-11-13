// src/components/devices/EditDeviceForm.tsx

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Form, InputField } from "@/components/form-components";
import { editDevice } from "./edit-device-form";

const editableFields = ["ip", "displayName", "area", "protocol", "workerId"];

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

  const [selectedField, setSelectedField] = useState("");
  const [newValue, setNewValue] = useState("");
  const [deviceData, setDeviceData] = useState<Record<string, any> | null>(null);

  // ✅ Fetch current device details when modal opens
  useEffect(() => {
    const fetchDeviceDetails = async () => {
      if (!open) return;

      try {
        const token = document.cookie
          .split("; ")
          .find((row) => row.startsWith("token="))
          ?.split("=")[1];

        const res = await fetch(`${import.meta.env.VITE_NMS_HOST}/devices/${deviceId}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (!res.ok) throw new Error("Failed to fetch device details");
        const data = await res.json();

        setDeviceData(data);
      } catch (err) {
        console.error("Error fetching device details:", err);
        setDeviceData(null);
      }
    };

    fetchDeviceDetails();
  }, [deviceId, open]);

  // ✅ When a field is selected, show its current value
  useEffect(() => {
    if (selectedField && deviceData) {
      setNewValue(deviceData[selectedField] || "");
    }
  }, [selectedField, deviceData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedField || !newValue) {
      setStatus({
        message: "Please select a field and provide a new value.",
        type: "error",
      });
      return;
    }

    setStatus({ message: "Updating...", type: "info" });

    try {
      await editDevice({
        id: deviceId,
        field: selectedField,
        data: newValue,
      });

      setStatus({ message: "Device updated successfully!", type: "success" });

      setTimeout(() => {
        setOpen(false);
        setStatus(undefined);
        setSelectedField("");
        setNewValue("");
      }, 1500);
    } catch (error: any) {
      setStatus({
        message: error.message || "Failed to update device.",
        type: "error",
      });
    }
  };

  return (
    <Form
      title="Edit Device"
      open={open}
      setOpen={setOpen}
      onSubmit={handleSubmit}
      statusMessage={status}
    >
      <InputField
        label="Select Field"
        placeholder="Choose field to edit"
        type="combobox"
        comboboxOptions={editableFields}
        stateValue={selectedField}
        stateAction={setSelectedField}
      />

      {selectedField && (
        <InputField
          label="New Value"
          placeholder="Enter new value"
          type="input"
          stateValue={newValue}
          stateAction={setNewValue}
        />
      )}

      <Button type="submit" className="mt-2">
        Update
      </Button>
    </Form>
  );
};
