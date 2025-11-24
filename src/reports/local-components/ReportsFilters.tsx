import React from "react";
import { useState, useEffect } from "react";
import { InputField } from "@/components/form-components";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/store/hooks";
import { getWorkerTypes } from '../../devices/local_components/add-device-form';
import { format } from "date-fns";

type ReportFilters = {
  startDateTime?: string;
  endDateTime?: string;
  locationId?: string;
  locationName?: string;
  workerId?: string;
  workerName?: string;
};

type Props = {
  onGenerate?: (filters: ReportFilters) => void;
};

export default function ReportsFilters({ onGenerate }: Props) {
  const locations = useAppSelector(s => s.locations.locations || []);
  const { workers = [] } = useAppSelector(s => s.workers as any);
  
  const [workerType, setWorkerType] = useState<string>("");
  const [workerTypeOptions, setWorkerTypeOptions] = useState<{ id: string; hostname: string }[]>([]);
  const [workerTypeOpen, setWorkerTypeOpen] = useState(false);

  const [startDate, setStartDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("00:00");
  const [endDate, setEndDate] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("23:59");
  
  const [locationName, setLocationName] = useState<string>("");
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationId, setLocationId] = useState<string>("");
  
  const selectedWorkerFromStore = (workers || []).find((w: any) => w.hostname === workerType);
  const selectedWorkerFromOptions = workerTypeOptions.find((w: any) => w.hostname === workerType);
  const workerId = selectedWorkerFromStore ? selectedWorkerFromStore.id : (selectedWorkerFromOptions ? selectedWorkerFromOptions.id : "");

  // Fetch worker types on mount
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

  // Get available locations for selected worker
  const availableLocations = React.useMemo(() => {
    if (!workerId) return [];
    return locations.filter((loc: any) => String((loc as any).worker_id ?? "") === String(workerId));
  }, [locations, workerId]);

  // Reset location when worker changes
  React.useEffect(() => {
    setLocationName("");
    setLocationId("");
    setLocationOpen(false);
  }, [workerId]);

  // Validate location exists in available locations
  React.useEffect(() => {
    if (!locationId) return;
    const exists = availableLocations.some((loc: any) => String(loc.id) === String(locationId));
    if (!exists) {
      setLocationId("");
      setLocationName("");
    }
  }, [availableLocations, locationId]);

  const handleGenerate = () => {
    // Validate required fields
    if (!startDate) {
      alert("Please select start date");
      return;
    }
    if (!endDate) {
      alert("Please select end date");
      return;
    }
    if (!workerId) {
      alert("Please select a worker");
      return;
    }
    if (!locationId) {
      alert("Please select a location");
      return;
    }

    // Combine date and time
    const startDateTime = new Date(`${startDate}T${startTime}:00`).toISOString();
    const endDateTime = new Date(`${endDate}T${endTime}:00`).toISOString();
    
    const workerName = selectedWorkerFromStore?.hostname || selectedWorkerFromOptions?.hostname || "";
    const selectedLocationObj = availableLocations.find((loc: any) => String(loc.id) === String(locationId));

    const filters: ReportFilters = {
      startDateTime,
      endDateTime,
      workerId: workerId,
      workerName: workerName,
      locationId: locationId,
      locationName: selectedLocationObj?.name || locationName,
    };

    console.log("Report Filters:", filters);
    onGenerate?.(filters);
  };

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      {/* Filter Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Report Filters</h3>
      </div>

      {/* Filters Grid - 6 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        
        {/* Start Date */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={today}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Start Time */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Start Time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            max={today}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* End Time */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">End Time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Worker Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Worker</label>
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

        {/* Location Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Location</label>
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
              setLocationId(sel ? String(sel.id) : "");
            }}
            openState={workerId ? locationOpen : false}
            openStateAction={workerId ? setLocationOpen : () => {}}
          />
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleGenerate}
          className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
        >
          Generate Report
        </Button>
      </div>
    </div>
  );
}