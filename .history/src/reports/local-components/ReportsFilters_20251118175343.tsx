import React from "react";
import { useState, useEffect } from "react";
import DateTimeInput from "./DateTimeInput";
import { InputField } from "@/components/form-components";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/store/hooks";
import { getWorkerTypes } from '../../devices/local_components/add-device-form';
import { ChevronDown } from "lucide-react";

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
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Filter Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Report Filters</h3>
        
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Start Date & Time */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Start Date & Time</label>
          <div className="relative">
            <DateTimeInput
              label=""
              value={startDateTime}
              onChange={setStartDateTime}
              className="w-full"
            />
          </div>
        </div>

        {/* End Date & Time */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">End Date & Time</label>
          <div className="relative">
            <DateTimeInput
              label=""
              value={endDateTime}
              onChange={setEndDateTime}
              className="w-full"
            />
          </div>
        </div>

        {/* Worker Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Worker</label>
          <div className="relative">
            <InputField
              label=""
              placeholder="Select Worker"
              type="combobox"
              comboboxOptions={workerTypeOptions.map((w) => w.hostname)}
              stateValue={workerType}
              stateAction={setWorkerType}
              openState={workerTypeOpen}
              openStateAction={setWorkerTypeOpen}
            />
          </div>
        </div>

        {/* Location Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Location</label>
          <div className="relative">
            <InputField
              label=""
              placeholder={workerId ? "Select Location" : "Select worker first"}
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
              disabled={!workerId}
            />
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex flex-col justify-end">
          <Button
            onClick={handleGenerate}
            className="w-full h-10 px-6 bg-(--azul)/80 hover:bg-(--azul)/90 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
          >
            Generate Report
          </Button>
        </div>
      </div>

      {/* Info Message */}
      <div className="pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          .
        </p>
      </div>
    </div>
  );
}