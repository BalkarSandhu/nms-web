// src/components/devices/EditDeviceForm.tsx

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Form, InputField } from "@/components/form-components";
import { editDevice } from "./edit-device-form";

type DeviceData = {
  id: number;
  display?: string;
  ip?: string;
  port?: number;
  device_type_name?: string;
  checkinterval?: number;
  hostname?: string;
  username?: string;
  password?: string;
  area?: string;
  worker_hostname?: string;
  community?: string;
  snmp_version?: string;
  snmp_auth_protocol?: string;
  snmp_username?: string;
  snmp_password?: string;
  snmp_priv_protocol?: string;
  snmp_priv_password?: string;
};

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
  const [fields, setFields] = useState<string[]>([]);
  const [selectedField, setSelectedField] = useState<string>("");
  const [fieldValue, setFieldValue] = useState<string>("");
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [fieldOpen, setFieldOpen] = useState(false);

  // 🧠 Step 1: Fetch existing device details to prefill
  useEffect(() => {
    const fetchDevice = async () => {
      if (!deviceId) return;
      try {
        const token = (() => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; token=`);
          if (parts.length === 2) {
            return parts.pop()?.split(";").shift() || null;
          }
          return null;
        })();

        const res = await fetch(`${import.meta.env.VITE_NMS_HOST}/devices/${deviceId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) throw new Error("Failed to fetch device details");

        const data = await res.json();
        setDeviceData(data);

        // Dynamically list editable fields
        setFields([
          "display",
          "ip",
          "device_type_name",
          "hostname",
          "username",
          "password",
          "area",
          "worker_hostname",
        ]);
      } catch (error) {
        console.error("Error fetching device:", error);
        setDeviceData(null);
      }
    };

    if (open) fetchDevice();
  }, [deviceId, open]);

  // 🧩 Step 2: When a field is selected → prefill input value
  useEffect(() => {
    if (selectedField && deviceData) {
      const currentValue = (deviceData as any)[selectedField] ?? "";
      setFieldValue(currentValue);
    }
  }, [selectedField, deviceData]);

  // 🧩 Step 3: Submit only the changed field
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedField) {
      setStatus({ message: "Please select a field to edit.", type: "error" });
      return;
    }
    setStatus({ message: "Updating device...", type: "info" });

    try {
      await editDevice({
        id: deviceId,
        field: selectedField,
        value: fieldValue,
      });
      setStatus({ message: "Device updated successfully!", type: "success" });

      setTimeout(() => {
        setOpen(false);
        setStatus(undefined);
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
        label="Select Field to Edit"
        placeholder="Choose field"
        type="combobox"
        comboboxOptions={fields}
        stateValue={selectedField}
        stateAction={setSelectedField}
        openState={fieldOpen}
        openStateAction={setFieldOpen}
      />

      {selectedField && (
        <InputField
          label={`Edit ${selectedField}`}
          placeholder={`Enter new ${selectedField}`}
          type={selectedField.toLowerCase().includes("password") ? "password" : "input"}
          stateValue={fieldValue}
          stateAction={setFieldValue}
        />
      )}

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" type="button" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button variant="default" type="submit" disabled={!selectedField}>
          Update
        </Button>
      </div>
    </Form>
  );
};
