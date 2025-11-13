import React, { useEffect, useState } from "react";
import { Form, InputField } from "@/components/form-components";
import { Button } from "@/components/ui/button";
import { addLocation, getLocationTypes } from "./add-location-form";

export const AddLocationForm = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [locationType, setLocationType] = useState("");
  const [parentLocation, setParentLocation] = useState("");
  const [area, setArea] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [project, setProject] = useState("");
  const [statusI, setStatusI] = useState("");
  const [statusReason, setStatusReason] = useState("");
    const [workerId, setWorkerId] = useState("");


  const [locationTypeOpen, setLocationTypeOpen] = useState(false);
  const [parentLocationOpen, setParentLocationOpen] = useState(false);

  const [locationTypeOptions, setLocationTypeOptions] = useState<{ id: number; name: string }[]>([]);
  const [locationType, setLocationType] = useState(""); // still store the name selected

  const [status, setStatus] = useState<
    { message: string; type: "error" | "success" | "info" } | undefined
  >(undefined);

  // ✅ Fetch location type options from backend
  useEffect(() => {
  const fetchLocationTypes = async () => {
    try {
      const types = await getLocationTypes();

      // ✅ Store the full objects (id + name)
      setLocationTypeOptions(types);

      // ✅ Optionally auto-select the first type
      if (types.length > 0 && !locationType) {
        setLocationType(types[0].name);
      }
    } catch (error) {
      console.error("Error fetching location types:", error);
      setLocationTypeOptions([]); // fallback empty
    }
  };

  fetchLocationTypes();
}, [locationType]);


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus({ message: "Submitting...", type: "info" });

    if (!name || !locationType || !area ||!lat || !lng) {
      setStatus({
        message: "Name, Location Type, and Area are required.",
        type: "error",
      });
      return;
    }

    try {
      await addLocation({ name, locationType, parentLocation, area });
      setStatus({ message: "Location added successfully!", type: "success" });
    } catch (error: any) {
      setStatus({
        message: error.message || "Failed to add location.",
        type: "error",
      });
      return;
    }

    // Close modal and reset form after a delay
    setTimeout(() => {
      setOpen(false);
      setTimeout(() => {
        setStatus(undefined);
        setName("");
        setLat("");
        setLng("");
        setLocationType("");
        setParentLocation("");
        setArea("");
      }, 500);
    }, 2000);
  };

  return (
    <Form
      title="Add : Location"
      open={open}
      setOpen={setOpen}
      onSubmit={handleSubmit}
      statusMessage={status}
      trigger={<Button variant="outline">Add Location</Button>}
    >
        <InputField
        label="Area"
        placeholder="e.g. Zone 51"
        type="input"
        stateValue={area}
        stateAction={setArea}
      />
      <InputField
        label="Lat"
        placeholder="e.g. Zone 51"
        type="input"
        stateValue={lat}
        stateAction={setLat}
      />
      <InputField
        label="Lng"
        placeholder="e.g. Zone 51"
        type="input"
        stateValue={lng}
        stateAction={setLng}
      />
      <InputField
        label="Location Type"
        placeholder="Select Type"
        type="combobox"
        comboboxOptions={locationTypeOptions.map((t) => t.name)} // display names
        stateValue={locationType}
        stateAction={setLocationType}
        openState={locationTypeOpen}
        openStateAction={setLocationTypeOpen}
        />


      <InputField
        label="Name"
        placeholder="e.g. Main Office"
        type="input"
        stateValue={name}
        stateAction={setName}
      />
      <InputField
        label="Project"
        placeholder="e.g. Main Office"
        type="input"
        stateValue={project}
        stateAction={setProject}
      />
      <InputField
        label="status"
        placeholder="e.g. Main Office"
        type="input"
        stateValue={statusI}
        stateAction={setStatusI}
      />

        <InputField
        label="statusReason"
        placeholder="e.g. Main Office"
        type="input"
        stateValue={statusReason}
        stateAction={setStatusReason}
      />
        <InputField
        label="workerId"
        placeholder="e.g. Main Office"
        type="input"
        stateValue={workerId}
        stateAction={setWorkerId}
      />

      <div className="flex flex-col sm:flex-row gap-4">
        
        <InputField
          label="Parent Location (Optional)"
          placeholder="Select Parent"
          type="combobox"
          comboboxOptions={[""]}
          stateValue={parentLocation}
          stateAction={setParentLocation}
          openState={parentLocationOpen}
          openStateAction={setParentLocationOpen}
        />
      </div>

      
    </Form>
  );
};
