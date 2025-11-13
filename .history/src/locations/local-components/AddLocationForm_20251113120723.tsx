import React, { useEffect, useState } from "react";
import { Form, InputField } from "@/components/form-components";
import { Button } from "@/components/ui/button";
import { addLocation, getLocationTypes, getWorkerTypes } from "./add-location-form";

export const AddLocationForm = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [parentLocation, setParentLocation] = useState("");
  const [area, setArea] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [project, setProject] = useState("");
  const [statusI, setStatusI] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [locationTypeOpen, setLocationTypeOpen] = useState(false);
  const [workerTypeOpen, setWorkerTypeOpen] = useState(false);
  const [parentLocationOpen, setParentLocationOpen] = useState(false);
  const [locationTypeOptions, setLocationTypeOptions] = useState<{ id: number; name: string }[]>([]);
  const [workerTypeOptions, setWorkerTypeOptions] = useState<{ id: string; hostname: string }[]>([]);
  const [locationType, setLocationType] = useState<string>("");
  const [workerType, setWorkerType] = useState<string>("");
  const [status, setStatus] = useState<{ message: string; type: "error" | "success" | "info" } | undefined>(undefined);

  useEffect(() => {
    const fetchLocationTypes = async () => {
      try {
        const types = await getLocationTypes();
        setLocationTypeOptions(types);
        if (types.length > 0 && !locationType) {
          setLocationType(types[0].name);
        }
      } catch (error) {
        console.error("Error fetching location types:", error);
        setLocationTypeOptions([]);
      }
    };
    fetchLocationTypes();
  }, []);

  useEffect(() => {
    const fetchWorkersTypes = async () => {
      try {
        const types = await getWorkerTypes();
        setWorkerTypeOptions(types);
        if (types.length > 0 && !workerType) {
          setWorkerType(types[0].hostname);
        }
      } catch (error) {
        console.error("Error fetching workers:", error);
        setWorkerTypeOptions([]);
      }
    };
    fetchWorkersTypes();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus({ message: "Submitting...", type: "info" });
    if (!name || !locationType || !area || !lat || !lng) {
      setStatus({
        message: "Name, Location Type, and Area are required.",
        type: "error",
      });
      return;
    }

    const selectedLocationType = locationTypeOptions.find((t: any) => t.name === locationType);
    const locationTypeId = selectedLocationType ? selectedLocationType.id : null;

    if (!locationTypeId) {
      setStatus({
        message: "Invalid location type selected.",
        type: "error",
      });
      return;
    }

    const selectedWorker = workerTypeOptions.find((w: any) => w.hostname === workerType);
    const selectedWorkerId = selectedWorker ? selectedWorker.id : "";

    try {
      await addLocation({
        area,
        lat: Number(lat),
        lng: Number(lng),
        locationTypeId: locationTypeId,
        name,
        parentLocation,
        project,
        statusI,
        statusReason,
        workerId: selectedWorkerId,
      });
      setStatus({ message: "Location added successfully!", type: "success" });
    } catch (error: any) {
      setStatus({
        message: error.message || "Failed to add location.",
        type: "error",
      });
      return;
    }
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
        setProject("");
        setStatusI("");
        setStatusReason("");
        setWorkerType("");
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
      <InputField label="Area" placeholder="e.g. Zone 51" type="input" stateValue={area} stateAction={setArea} />
      <InputField label="Lat" placeholder="e.g. 23.45" type="input" stateValue={lat} stateAction={setLat} />
      <InputField label="Lng" placeholder="e.g. 85.32" type="input" stateValue={lng} stateAction={setLng} />
      <InputField
        label="Location Type"
        placeholder="Select Type"
        type="combobox"
        comboboxOptions={locationTypeOptions.map((t) => t.name)}
        stateValue={locationType}
        stateAction={setLocationType}
        openState={locationTypeOpen}
        openStateAction={setLocationTypeOpen}
      />
      <InputField label="Name" placeholder="e.g. Main Office" type="input" stateValue={name} stateAction={setName} />
      <InputField label="Project" placeholder="e.g. Project A" type="input" stateValue={project} stateAction={setProject} />
      <InputField label="Status" placeholder="Active/Inactive" type="input" stateValue={statusI} stateAction={setStatusI} />
      <InputField label="Status Reason" placeholder="Reason" type="input" stateValue={statusReason} stateAction={setStatusReason} />
      <InputField
        label="Worker Type"
        placeholder="Select Worker"
        type="combobox"
        comboboxOptions={workerTypeOptions.map((t) => t.hostname)}
        stateValue={workerType}
        stateAction={setWorkerType}
        openState={workerTypeOpen}
        openStateAction={setWorkerTypeOpen}
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