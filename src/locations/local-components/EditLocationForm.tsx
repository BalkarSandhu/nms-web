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

  const [openStates, setOpenStates] = useState({
    status: false,
    locationType: false,
    parentLocation: false,
  });

  // Form fields state
  const [formData, setFormData] = useState({
    name: "",
    area: "",
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
        status: location.status || "",
        location_type_id: String(location.location_type_id || ""),
        parent_id: (location as any).parent_id ? String((location as any).parent_id) : "",
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

  // Parent options — exclude the location itself AND all of its descendants,
  // otherwise the backend rejects it as a circular reference. Options are
  // keyed by id (label = name) so duplicate names can't map to the wrong row.
  const forbiddenParentIds = useMemo(() => {
    const childrenByParent = new Map<number, number[]>();
    for (const l of locations) {
      const pid = (l as any).parent_id;
      if (pid != null) {
        const arr = childrenByParent.get(Number(pid)) ?? [];
        arr.push(l.id);
        childrenByParent.set(Number(pid), arr);
      }
    }
    const forbidden = new Set<number>([locationId]);
    const stack = [locationId];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const childId of childrenByParent.get(cur) ?? []) {
        if (!forbidden.has(childId)) {
          forbidden.add(childId);
          stack.push(childId);
        }
      }
    }
    return forbidden;
  }, [locations, locationId]);

  const parentLocationOptions = useMemo(() => {
    const opts = locations
      .filter((l) => !forbiddenParentIds.has(l.id))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      .map((l) => ({ label: l.name, value: String(l.id) }));
    return [{ label: "— None (top level) —", value: "" }, ...opts];
  }, [locations, forbiddenParentIds]);

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

  const handleOpenChange = (field: string, value: boolean) => {
    setOpenStates((prev) => ({
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

    
    setStatus({ message: "Updating location...", type: "info" });

    try {
      // Resolve parent by id and guard against circular references.
      let parentId: number | null = null;
      if (formData.parent_id && formData.parent_id.trim()) {
        const pid = parseInt(formData.parent_id, 10);
        if (Number.isNaN(pid) || forbiddenParentIds.has(pid)) {
          setStatus({
            message:
              "That parent would create a circular reference. Pick a different location.",
            type: "error",
          });
          return;
        }
        parentId = pid;
      }

      const updates: any = {
        name: formData.name.trim(),
        area: formData.area.trim(),
        status: formData.status || undefined,
        location_type_id: formData.location_type_id
          ? parseInt(formData.location_type_id)
          : undefined,
        // null clears the parent (top-level); a number sets it.
        parent_id: parentId,
      };

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
      {/* <InputField
        label="Project"
        placeholder="Enter project"
        type="input"
        stateValue={formData.project}
        stateAction={(value) => handleInputChange("project", value)}
      /> */}

      {/* Status */}
      <InputField
        label="Status"
        placeholder="Select status"
        type="selectbox"
        selectBoxOptions={statusOptions}
        stateValue={formData.status}
        stateAction={(value) => handleInputChange("status", value)}
        openState={openStates.status}
        openStateAction={(value) => handleOpenChange("status", value)}
      />

      {/* Location Type */}
      <InputField
        label="Location Type"
        placeholder="Select location type"
        type="selectbox"
        selectBoxOptions={locationTypeOptions}
        stateValue={formData.location_type_id}
        stateAction={(value) => handleInputChange("location_type_id", value)}
        openState={openStates.locationType}
        openStateAction={(value) => handleOpenChange("locationType", value)}
      />

      {/* Parent Location — id-keyed; self + descendants excluded */}
      <InputField
        label="Parent Location (Optional)"
        placeholder="Select parent location"
        type="selectbox"
        selectBoxOptions={parentLocationOptions}
        stateValue={formData.parent_id || ""}
        stateAction={(value) => handleInputChange("parent_id", value)}
        openState={openStates.parentLocation}
        openStateAction={(value) => handleOpenChange("parentLocation", value)}
      />
    </Form>
  );
};