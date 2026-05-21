import React, { useEffect, useMemo, useState } from "react";
import { Form, InputField } from "@/components/form-components";
import { Button } from "@/components/ui/button";
import { addLocation, getLocationTypes, getWorkerTypes, getLocations } from "./add-location-form";
import { useRefresh } from "@/contexts/RefreshContext";

export const AddLocationForm = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState(""); // location id as string ("" = none)
  const [area, setArea] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [project, setProject] = useState("");
  const [statusI, setStatusI] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [workerId, setWorkerId] = useState(""); // worker id — what the payload sends
  const [locationTypeOpen, setLocationTypeOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [parentLocationOpen, setParentLocationOpen] = useState(false);
  const [locationTypeOptions, setLocationTypeOptions] = useState<{ id: number; name: string }[]>([]);
  const [workerOptions, setWorkerOptions] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: number; name: string; area: string }[]>([]);
  const [locationType, setLocationType] = useState<string>("");
  const [workersLoading, setWorkersLoading] = useState(true);
  const [workersError, setWorkersError] = useState<string | null>(null);
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
    const fetchWorkers = async () => {
      setWorkersLoading(true);
      setWorkersError(null);
      try {
        const workers = await getWorkerTypes();
        console.log("[AddLocationForm] Workers loaded:", workers);
        setWorkerOptions(workers);
        setWorkersLoading(false);
      } catch (error) {
        console.error("[AddLocationForm] Error fetching workers:", error);
        setWorkersError(error instanceof Error ? error.message : "Failed to load workers");
        setWorkerOptions([]);
        setWorkersLoading(false);
      }
    };
    fetchWorkers();
  }, []);

  useEffect(() => {
    const fetchExistingLocations = async () => {
      try {
        const locs = await getLocations();
        setLocations(locs);
      } catch (error) {
        console.error("Error fetching locations:", error);
        setLocations([]);
      }
    };
    fetchExistingLocations();
  }, []);

  // Unique, sorted area names pulled from existing locations.
  const areaOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of locations) {
      const a = (l.area || "").trim();
      if (a) set.add(a);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [locations]);

  // Each Area has exactly one Worker whose name == the area name. Derive the
  // worker_id automatically from the selected Area (no manual picker), and
  // re-derive if workers load after the area was chosen.
  useEffect(() => {
    if (!area.trim()) {
      setWorkerId("");
      return;
    }
    
    // Try exact match first (case-insensitive)
    let match = workerOptions.find(
      (w) => (w.name || "").trim().toLowerCase() === area.trim().toLowerCase()
    );
    
    // If no match found, log for debugging
    if (!match) {
      console.warn(
        `[AddLocationForm] No worker found for area "${area}". Available workers:`,
        workerOptions.map(w => w.name)
      );
    }
    
    setWorkerId(match ? match.id : "");
  }, [area, workerOptions]);

  const mappedWorkerName = useMemo(
    () => workerOptions.find((w) => w.id === workerId)?.name ?? "",
    [workerOptions, workerId]
  );

  // Parent options are scoped to the chosen area. "— None —" keeps it optional.
  const parentLocationOptions = useMemo(() => {
    const opts = locations
      .filter((l) => area && (l.area || "").trim() === area.trim())
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      .map((l) => ({ label: l.name, value: String(l.id) }));
    return [{ label: "— None (top level) —", value: "" }, ...opts];
  }, [locations, area]);

  // Changing the area invalidates a parent picked from a different area.
  const handleAreaChange = (value: string) => {
    setArea(value);
    setParentId("");
  };

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

    if (!workerId) {
      const errorMsg = workersError
        ? `Worker loading failed: ${workersError}`
        : workerOptions.length === 0
        ? "No workers available. Please check worker configuration."
        : `No worker is mapped to area "${area}". Pick an area that has a worker. Available workers: ${workerOptions.map(w => w.name).join(", ")}`;
      setStatus({
        message: errorMsg,
        type: "error",
      });
      return;
    }

    try {
      await addLocation({
        area,
        lat: Number(lat),
        lng: Number(lng),
        locationTypeId: locationTypeId,
        name,
        parentId: parentId ? Number(parentId) : null,
        project,
        statusI,
        statusReason,
        workerId,
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
        setParentId("");
        setArea("");
        setProject("");
        setStatusI("");
        setStatusReason("");
        setWorkerId("");
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
      <InputField label="Name" placeholder="e.g. Main Office" type="input" stateValue={name} stateAction={setName} />


      <div className="grid grid-cols-1 md:grid-cols-2 w-full h-full gap-2">
        <InputField label="Lat" placeholder="e.g. 23.45" type="input" stateValue={lat} stateAction={setLat} />
        <InputField label="Lng" placeholder="e.g. 85.32" type="input" stateValue={lng} stateAction={setLng} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 w-full h-full gap-2">
        <InputField
          label="Area"
          placeholder="Select Area"
          type="combobox"
          comboboxOptions={areaOptions}
          stateValue={area}
          stateAction={handleAreaChange}
          openState={areaOpen}
          openStateAction={setAreaOpen}
        />
        <InputField label="Project" placeholder="e.g. Project A" type="input" stateValue={project} stateAction={setProject} />
      </div>
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

      {/* Worker is derived from the Area (1 worker per area). */}
      <div className="flex flex-col w-full gap-2">
        <label className="text-(--contrast) text-[12px] text-left">Worker (auto from Area)</label>
        <div
          className="px-4 py-1 rounded-[4px] w-full text-sm bg-(--contrast)/40 text-(--base)/90"
          style={{ minHeight: 28, lineHeight: "26px" }}
        >
          {workersLoading
            ? "Loading workers..."
            : workersError
            ? `Error loading workers: ${workersError}`
            : !area
            ? "Select an area first"
            : mappedWorkerName
            ? mappedWorkerName
            : `No worker mapped for area "${area}". Available workers: ${workerOptions.map(w => w.name).join(", ") || "None loaded"}`}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <InputField
          label="Parent Location (Optional)"
          placeholder={area ? "Search location in area…" : "Select an area first"}
          type="selectbox"
          selectBoxOptions={parentLocationOptions}
          stateValue={parentId}
          stateAction={setParentId}
          openState={parentLocationOpen}
          openStateAction={setParentLocationOpen}
        />
      </div>
    </Form>
  );
};
