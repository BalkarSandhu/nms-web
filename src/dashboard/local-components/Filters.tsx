


import { useState } from "react";
import { Check, ChevronsUpDown, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// Types for filter props
type FilterOption = {
  value: string;
  label: string;
};

type FiltersProps = {
  // Date filters (ISO string format: YYYY-MM-DD)
  fromDate: string;
  toDate: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;

  // Device Type filter
  deviceTypes: FilterOption[];
  selectedDeviceType: string;
  onDeviceTypeChange: (value: string) => void;

  // Location Type filter
  locationTypes: FilterOption[];
  selectedLocationType: string;
  onLocationTypeChange: (value: string) => void;
};

export default function Filters({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  deviceTypes,
  selectedDeviceType,
  onDeviceTypeChange,
  locationTypes,
  selectedLocationType,
  onLocationTypeChange,
}: FiltersProps) {
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);
  const [deviceTypeOpen, setDeviceTypeOpen] = useState(false);
  const [locationTypeOpen, setLocationTypeOpen] = useState(false);

  // Convert string dates to Date objects
  const fromDateObj = fromDate ? new Date(fromDate) : undefined;
  const toDateObj = toDate ? new Date(toDate) : undefined;

  // Find selected labels for display
  const selectedDeviceTypeLabel = deviceTypes?.find(
    (dt) => dt.value === selectedDeviceType
  )?.label || "Select device type...";

  const selectedLocationTypeLabel = locationTypes?.find(
    (lt) => lt.value === selectedLocationType
  )?.label || "Select location type...";

  return (
    <div className="w-full bg-(--dark) border-(--dark) border rounded-[10px] p-4 sticky top-0 z-10 shadow-md">
      <div className="flex flex-wrap items-end gap-4">
        {/* From Date Filter */}
        <div className="flex flex-col gap-2 min-w-[200px]">
          <Label className="text-[10px] font-medium text-(--contrast)">
            From Date
          </Label>
          <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-(--base) border-(--dark) text-(--contrast) hover:bg-(--base) hover:text-(--contrast)",
                  !fromDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 size-4" />
                {fromDate ? format(fromDateObj!, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-(--contrast) border-(--dark)" align="start">
              <Calendar
                mode="single"
                selected={fromDateObj}
                onSelect={(date) => {
                  if (date) {
                    onFromDateChange(format(date, "yyyy-MM-dd"));
                    setFromDateOpen(false);
                  }
                }}
                disabled={(date) =>
                  toDateObj ? date > toDateObj : false
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* To Date Filter */}
        <div className="flex flex-col gap-2 min-w-[200px]">
          <Label className="text-[10px] font-medium text-(--contrast)">
            To Date
          </Label>
          <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-(--base) border-(--dark) text-(--contrast) hover:bg-(--base) hover:text-(--contrast)",
                  !toDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 size-4" />
                {toDate ? format(toDateObj!, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-(--contrast)" align="start">
              <Calendar
                mode="single"
                selected={toDateObj}
                onSelect={(date) => {
                  if (date) {
                    onToDateChange(format(date, "yyyy-MM-dd"));
                    setToDateOpen(false);
                  }
                }}
                disabled={(date) =>
                  fromDateObj ? date < fromDateObj : false
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Device Type Filter */}
        <div className="flex flex-col gap-2 min-w-[200px]">
          <Label className="text-[10px] font-medium text-(--contrast)">Device Type</Label>
          <Popover open={deviceTypeOpen} onOpenChange={setDeviceTypeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={deviceTypeOpen}
                className={cn(
                  "w-full justify-between bg-(--base)/80 border-(--dark) hover:bg-(--base) hover:text-(--contrast)",
                  selectedDeviceType ? "text-(--contrast)" : "text-(--contrast)/50"
                )}
              >
                <span className="truncate text-sm">{selectedDeviceTypeLabel}</span>
                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-0 border-(--dark)" align="start">
              <Command className="bg-(--dark)/90 border-(--dark)">
                <CommandInput placeholder="Search device type..." className="text-(--contrast) h-9 text-sm border-b border-(--dark)/50" />
                <CommandList className="max-h-[200px]">
                  <CommandEmpty className="px-3 py-4 text-(--contrast)/70 text-sm">No device type found.</CommandEmpty>
                  <CommandGroup className="p-1.5">
                    {deviceTypes?.map((deviceType) => (
                      <CommandItem
                        key={deviceType.value}
                        value={deviceType.value}
                        onSelect={(currentValue) => {
                          onDeviceTypeChange(
                            currentValue === selectedDeviceType ? "" : currentValue
                          );
                          setDeviceTypeOpen(false);
                        }}
                        className="text-(--contrast) text-sm data-[selected=true]:bg-(--dark)/50 data-[selected=true]:text-(--contrast) px-2 py-0.5 h-6 rounded-sm mb-0.5 last:mb-0 cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-1.5 size-3.5",
                            selectedDeviceType === deviceType.value
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {deviceType.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Location Type Filter */}
        <div className="flex flex-col gap-2 min-w-[200px]">
          <Label className="text-[10px] font-medium text-(--contrast)">Location Type</Label>
          <Popover open={locationTypeOpen} onOpenChange={setLocationTypeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={locationTypeOpen}
                className={cn(
                  "w-full justify-between bg-(--base)/80 border-(--dark) hover:bg-(--base) hover:text-(--contrast)",
                  selectedLocationType ? "text-(--contrast)" : "text-(--contrast)/50"
                )}
              >
                <span className="truncate text-sm">{selectedLocationTypeLabel}</span>
                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-0 border-(--dark)" align="start">
              <Command className="bg-(--dark)/90 border-(--dark)">
                <CommandInput placeholder="Search location type..." className="text-(--contrast) h-9 text-sm border-b border-(--dark)/50" />
                <CommandList className="max-h-[200px]">
                  <CommandEmpty className="px-3 py-4 text-(--contrast)/70 text-sm">No location type found.</CommandEmpty>
                  <CommandGroup className="p-1.5">
                    {locationTypes?.map((locationType) => (
                      <CommandItem
                        key={locationType.value}
                        value={locationType.value}
                        onSelect={(currentValue) => {
                          onLocationTypeChange(
                            currentValue === selectedLocationType
                              ? ""
                              : currentValue
                          );
                          setLocationTypeOpen(false);
                        }}
                        className="text-(--contrast) text-sm data-[selected=true]:bg-(--dark)/50 data-[selected=true]:text-(--contrast) px-2 py-0.5 h-6 rounded-sm mb-0.5 last:mb-0 cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-1.5 size-3.5",
                            selectedLocationType === locationType.value
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {locationType.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Clear Filters Button */}
        <Button
          variant="ghost"
          onClick={() => {
            onFromDateChange("");
            onToDateChange("");
            onDeviceTypeChange("");
            onLocationTypeChange("");
          }}
          className=" text-[12px] ml-auto bg-(--base) text-(--contrast) hover:bg-(--base) hover:text-(--contrast) border border-(--dark)"
        >
          Clear
        </Button>
      </div>
    </div>
  );
}