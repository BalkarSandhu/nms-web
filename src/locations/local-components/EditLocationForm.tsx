// src/components/locations/EditLocationForm.tsx

import React, { useState, useMemo } from "react";
import { Form, InputField } from "@/components/form-components";
import { editLocationBulk } from "./edit-location-form";
import { useAppSelector } from "@/store/hooks";

export const EditLocationForm = ({
  locationId,
  open,
  setOpen,
}: {
  locationId: number;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { locations, locationTypes } = useAppSelector((state) => state.locations);
  const location = locations.find((l) => l.id === locationId);

  const [status, setStatus] = useState<
    { message: string; type: "error" | "success" | "info" } | undefined
  >(undefined);

  // Form fields state
  const [formData, setFormData] = useState({
    name: "",
    area: "",
    project: "",
    status: "",
    location_type_id: "",
    parent_id: "" as string | null,
  });

  // Initialize form when location changes or dialog opens
  React.useEffect(() => {
    if (location && open) {
      setFormData({
        name: location.name || "",
        area: location.area || "",
        project: location.project || "",
        status: location.status || "",
        location_type_id: String(location.location_type_id || ""),
        parent_id: location && (location as any).parent_id ? String((location as any).parent_id) : null,
      });
    }
  }, [location, open, locationId]);

  // Get location types for dropdown
  const locationTypeOptions = useMemo(() => {
    return locationTypes.map((lt) => ({
      label: lt.name || lt.location_type || "Unknown",
      value: String(lt.id),
    }));
  }, [locationTypes]);

  // Get parent locations (exclude current location)
  const parentLocationOptions = useMemo(() => {
    return locations
      .filter((l) => l.id !== locationId) // Exclude the current location
      .map((l) => ({
        label: l.name,
        value: String(l.id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [locations, locationId]);

  // Get status options from existing locations
  const statusOptions = useMemo(() => {
    const statuses = [...new Set(locations.map((l) => l.status))].filter(Boolean);
    return statuses.map((s) => ({ label: s, value: s }));
  }, [locations]);

  const handleInputChange = (field: string, value: string | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name.trim()) {
      setStatus({
        message: "Location name is required.",
        type: "error",
      });
      return;
    }

    if (!formData.area.trim()) {
      setStatus({
        message: "Area is required.",
        type: "error",
      });
      return;
    }

    if (!formData.project.trim()) {
      setStatus({
        message: "Project is required.",
        type: "error",
      });
      return;
    }

    setStatus({ message: "Updating location...", type: "info" });

    try {
      const updates: any = {
        name: formData.name.trim(),
        area: formData.area.trim(),
        project: formData.project.trim(),
        status: formData.status || undefined,
        location_type_id: formData.location_type_id
          ? parseInt(formData.location_type_id)
          : undefined,
      };

      // Add parent_id if selected
      if (formData.parent_id) {
        updates.parent_id = parseInt(formData.parent_id);
      } else if (formData.parent_id === null) {
        updates.parent_id = null;
      }

      await editLocationBulk(locationId, updates);
      setStatus({
        message: "Location updated successfully!",
        type: "success",
      });

      setTimeout(() => {
        setOpen(false);
        setStatus(undefined);
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
      trigger={<></>}
    >
      {/* Location Name */}
      <InputField
        label="Location Name"
        placeholder="Enter location name"
        type="input"
        stateValue={formData.name}
        stateAction={(value) => handleInputChange("name", value)}
      />

      {/* Area */}
      <InputField
        label="Area"
        placeholder="Enter area"
        type="input"
        stateValue={formData.area}
        stateAction={(value) => handleInputChange("area", value)}
      />

      {/* Project */}
      <InputField
        label="Project"
        placeholder="Enter project"
        type="input"
        stateValue={formData.project}
        stateAction={(value) => handleInputChange("project", value)}
      />

      {/* Status */}
      <InputField
        label="Status"
        placeholder="Select status"
        type="selectbox"
        selectBoxOptions={statusOptions}
        stateValue={formData.status}
        stateAction={(value) => handleInputChange("status", value)}
      />

      {/* Location Type */}
      <InputField
        label="Location Type"
        placeholder="Select location type"
        type="selectbox"
        selectBoxOptions={locationTypeOptions}
        stateValue={formData.location_type_id}
        stateAction={(value) => handleInputChange("location_type_id", value)}
      />

      {/* Parent Location with Search */}
      <InputField
        label="Parent Location (Optional)"
        placeholder="Search and select parent location"
        type="selectbox"
        selectBoxOptions={parentLocationOptions}
        stateValue={formData.parent_id || ""}
        stateAction={(value) => handleInputChange("parent_id", value)}
      />
    </Form>
  );
};
