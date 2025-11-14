// src/components/locations/EditLocationForm.tsx

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, InputField } from "@/components/form-components";
import { editLocation } from "./edit-location-form";
import { useAppSelector } from "@/store/hooks";

const editableFields = ["name", "area", "project", "status", "worker_id"];

export const EditLocationForm = ({
  locationId,
  open,
  setOpen,
}: {
  locationId: number;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { locations } = useAppSelector((state) => state.locations);
  const location = locations.find((l) => l.id === locationId);

  const [status, setStatus] = useState<
    { message: string; type: "error" | "success" | "info" } | undefined
  >(undefined);

  const [selectedField, setSelectedField] = useState("");
  const [newValue, setNewValue] = useState("");

  // Automatically fill old value when field selected
  React.useEffect(() => {
    if (selectedField && location) {
      setNewValue(String(location[selectedField as keyof typeof location] || ""));
    }
  }, [selectedField, location]);

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

      <Button type="submit" className="mt-2">
        Update
      </Button>
    </Form>
  );
};
