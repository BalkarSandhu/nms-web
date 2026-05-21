import React, { useState, useEffect } from "react";
import { Form, InputField } from "@/components/form-components";
import { editDevice } from "./edit-device-form";
import { useRefresh } from "@/contexts/RefreshContext";

const editableFields = ["ip", "display", "location", "protocol", "worker_id"];

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
  const { triggerRefresh } = useRefresh();

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
        setDeviceData(await res.json());
      } catch (err) {
        console.error("Error fetching device details:", err);
        setDeviceData(null);
      }
    };
    fetchDeviceDetails();
  }, [deviceId, open]);

  useEffect(() => {
    if (selectedField && deviceData) {
      setNewValue(deviceData[selectedField] || "");
    }
  }, [selectedField, deviceData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedField || !newValue) {
      setStatus({ message: "Please select a field and provide a new value.", type: "error" });
      return;
    }
    setStatus({ message: "Updating...", type: "info" });
    try {
      await editDevice({ id: deviceId, field: selectedField, data: newValue });
      setStatus({ message: "Device updated successfully!", type: "success" });
      triggerRefresh(); // ← re-fetch the table
      setTimeout(() => {
        setOpen(false);
        setStatus(undefined);
        setSelectedField("");
        setNewValue("");
      }, 1500);
    } catch (error: any) {
      setStatus({ message: error.message || "Failed to update device.", type: "error" });
    }
  };

  return (
    <Form
      title="Edit Device"
      open={open}
      setOpen={setOpen}
      onSubmit={handleSubmit}
      statusMessage={status}
      trigger={<></>}
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
    </Form>
  );
};