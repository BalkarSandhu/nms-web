// src/components/locations/EditLocationForm.tsx

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Form, InputField } from "@/components/form-components";
import { editLocation } from "./edit-location-form";

const editableFields = ["ip", "display", "location", "protocol", "worker_id"];

export const EditLocationForm = ({
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

  const [selectedField, setSelectedField] = useState("");
  const [newValue, setNewValue] = useState("");
  const [locationData, setLocationData] = useState<Record<string, any> | null>(null);

  // ✅ Fetch current location details when modal opens
  useEffect(() => {
    const fetchLocationDetails = async () => {
      if (!open) return;

      try {
        const token = document.cookie
          .split("; ")
          .find((row) => row.startsWith("token="))
          ?.split("=")[1];

        const res = await fetch(`${import.meta.env.VITE_NMS_HOST}/locations/${locationId}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (!res.ok) throw new Error("Failed to fetch location details");
        const data = await res.json();

        setLocationData(data);
      } catch (err) {
        console.error("Error fetching location details:", err);
        setLocationData(null);
      }
    };

    fetchLocationDetails();
  }, [locationId, open]);

  // ✅ When a field is selected, show its current value
  useEffect(() => {
    if (selectedField && locationData) {
      setNewValue(locationData[selectedField] || "");
    }
  }, [selectedField, locationData]);

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
      await editLocation({
        id: locationId,
        field: selectedField,
        data: newValue,
      });

      setStatus({ message: "Location updated successfully!", type: "success" });

      setTimeout(() => {
        setOpen(false);
        setStatus(undefined);
        setSelectedField("");
        setNewValue("");
      }, 1500);
    } catch (error: any) {
      setStatus({
        message: error.message || "Failed to update location.",
        type: "error",
      });
    }
  };

  return (
    <Form
      title="Edit Location"
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

    </Form>
  );
};
