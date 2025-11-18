import React from "react";
import { useState , useEffect } from "react";
import DateTimeInput from "./DateTimeInput";
import { InputField } from "@/components/form-components";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/store/hooks";
import { getWorkerTypes } from '../../devices/local_components/add-device-form';

type Filters = {
  start?: string;
  end?: string;
  area?: string;
  worker?: string;
};

type Props = {
  initial?: Filters;
  onGenerate?: (filters: Filters) => void;
};

export default function ReportsFilters({ initial = {}, onGenerate }: Props) {
  const locations = useAppSelector(s => s.locations.locations || []);
  const { workers = [] } = useAppSelector(s => s.workers as any);
  const [workerType, setWorkerType] = useState<string>("");
  const [workerTypeOptions, setWorkerTypeOptions] = useState<{ id: string; hostname: string }[]>([]);
  const [workerTypeOpen, setWorkerTypeOpen] = useState(false);

  const [startDateTime, setStartDateTime] = React.useState<Date | string | undefined>(initial.start ? new Date(initial.start) : undefined);
  const [endDateTime, setEndDateTime] = React.useState<Date | string | undefined>(initial.end ? new Date(initial.end) : undefined);
  const [area, setArea] = React.useState<string | undefined>(initial.area);
  const [worker, setWorker] = React.useState<string | undefined>(initial.worker);
  const [locationName, setLocationName] = React.useState<string>("");
  const [locationOpen, setLocationOpen] = React.useState(false);
  const selectedWorkerFromStore = (workers || []).find((w: any) => w.hostname === workerType);
  const selectedWorkerFromOptions = workerTypeOptions.find((w: any) => w.hostname === workerType);
  const workerId = selectedWorkerFromStore ? selectedWorkerFromStore.id : (selectedWorkerFromOptions ? selectedWorkerFromOptions.id : "");
  


  const handleGenerate = () => {
    const start = startDateTime ? new Date(startDateTime).toISOString() : undefined;
    const end = endDateTime ? new Date(endDateTime).toISOString() : undefined;
    const filters = { start, end, area, worker };
    onGenerate?.(filters);
  };
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

  const availableLocations = React.useMemo(() => {
    if (!workerId) return [];
    return locations.filter((loc: any) => String((loc as any).worker_id ?? "") === String(workerId));
  }, [locations, workerId]);


  React.useEffect(() => {
    if (workerId) setWorker(String(workerId));
    else setWorker(undefined);
  }, [workerId]);

  React.useEffect(() => {
    if (!workerId) {
      setLocationName("");
      setArea(undefined);
      setLocationOpen(false);
    }
  }, [workerId]);

  React.useEffect(() => {
    if (!area) return;
    const exists = availableLocations.some((loc: any) => String(loc.id) === String(area));
    if (!exists) setArea(undefined);
  }, [availableLocations, area]);

  return (
    <div className="p-4 bg-(--contrast) rounded-md shadow-sm w-full">
      <div className="flex flex-wrap gap-4 items-end justify-start">
        <DateTimeInput
          label="Start Date & Time"
          value={startDateTime}
          onChange={setStartDateTime}
          className="min-w-[220px]"
        />
        <DateTimeInput
          label="End Date & Time"
          value={endDateTime}
          onChange={setEndDateTime}
          className="min-w-[220px]"
        />
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-sm text-(--contrast) mb-1">Worker</label>
          <InputField
            label="Worker"
            placeholder="Select Worker"
            type="combobox"
            comboboxOptions={workerTypeOptions.map((w) => w.hostname)}
            stateValue={workerType}
            stateAction={setWorkerType}
            openState={workerTypeOpen}
            openStateAction={setWorkerTypeOpen}
          />
        </div>
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-sm text-(--contrast) mb-1">Location</label>
          <InputField
            label="Location"
            placeholder={workerId ? "Select Location" : "Select a worker first"}
            type="combobox"
            comboboxOptions={workerId ? availableLocations.map((loc: any) => loc.name) : []}
            stateValue={locationName}
            stateAction={(val: string) => {
              if (!workerId) return;
              setLocationName(val);
              const sel = availableLocations.find((l: any) => l.name === val);
              setArea(sel ? String(sel.id) : undefined);
            }}
            openState={workerId ? locationOpen : false}
            openStateAction={workerId ? setLocationOpen : () => {}}
          />
        </div>
    
        <div className="flex items-end">
          <Button onClick={handleGenerate} className="h-10 px-6 text-base font-semibold">Generate Report</Button>
        </div>
      </div>
    </div>
  );
}

