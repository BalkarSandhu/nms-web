# Filters Component Usage Guide

The `Filters` component provides a comprehensive filtering interface with combobox-based selections for dates, device types, and location types. All filter states are managed **externally** by the parent component.

## Features

- **From Date & To Date**: Date range selection with native date pickers
- **Device Type**: Searchable combobox dropdown for device type selection
- **Location Type**: Searchable combobox dropdown for location type selection
- **Clear Filters**: Button to reset all filters at once
- **External State Management**: All filter values and handlers are passed as props

## Props Interface

```typescript
type FilterOption = {
  value: string;
  label: string;
};

type FiltersProps = {
  // Date filters
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
```

## Usage Example

### Basic Implementation

```tsx
import { useState, useMemo } from "react";
import Filters from "./local-components/Filters";
import { useAPIs } from "@/contexts/API-Context";

function Dashboard() {
  // Filter states
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedDeviceType, setSelectedDeviceType] = useState("");
  const [selectedLocationType, setSelectedLocationType] = useState("");

  // Get data from API context
  const apiData = useAPIs();
  const { devices, locations } = apiData || {};

  // Extract unique device types from devices
  const deviceTypes = useMemo(() => {
    if (!devices) return [];
    const uniqueTypes = new Set(
      devices.map((device) => device.device_type_id.toString())
    );
    return Array.from(uniqueTypes).map((type) => ({
      value: type,
      label: `Device Type ${type}`,
    }));
  }, [devices]);

  // Extract unique location types from locations
  const locationTypes = useMemo(() => {
    if (!locations) return [];
    const uniqueTypes = new Set(
      locations.map((location) => location.location_type_id.toString())
    );
    return Array.from(uniqueTypes).map((type) => ({
      value: type,
      label: `Location Type ${type}`,
    }));
  }, [locations]);

  // Filter the data based on selected filters
  const filteredDevices = useMemo(() => {
    if (!devices) return [];

    return devices.filter((device) => {
      // Filter by date range
      if (fromDate && device.created_at < fromDate) return false;
      if (toDate && device.created_at > toDate) return false;

      // Filter by device type
      if (
        selectedDeviceType &&
        device.device_type_id.toString() !== selectedDeviceType
      )
        return false;

      // Filter by location type
      if (selectedLocationType) {
        const deviceLocation = locations?.find(
          (loc) => loc.id === device.location_id
        );
        if (
          !deviceLocation ||
          deviceLocation.location_type_id.toString() !== selectedLocationType
        )
          return false;
      }

      return true;
    });
  }, [devices, locations, fromDate, toDate, selectedDeviceType, selectedLocationType]);

  return (
    <div>
      <Filters
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        deviceTypes={deviceTypes}
        selectedDeviceType={selectedDeviceType}
        onDeviceTypeChange={setSelectedDeviceType}
        locationTypes={locationTypes}
        selectedLocationType={selectedLocationType}
        onLocationTypeChange={setSelectedLocationType}
      />

      {/* Your filtered data display here */}
      <div>
        <h2>Filtered Devices: {filteredDevices.length}</h2>
        {/* Render your filtered devices */}
      </div>
    </div>
  );
}
```

### Advanced Example with Custom Options

```tsx
import { useState } from "react";
import Filters from "./local-components/Filters";

function AdvancedDashboard() {
  // States
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedDeviceType, setSelectedDeviceType] = useState("");
  const [selectedLocationType, setSelectedLocationType] = useState("");

  // Custom device type options
  const deviceTypes = [
    { value: "router", label: "Router" },
    { value: "switch", label: "Switch" },
    { value: "firewall", label: "Firewall" },
    { value: "access-point", label: "Access Point" },
    { value: "server", label: "Server" },
  ];

  // Custom location type options
  const locationTypes = [
    { value: "datacenter", label: "Data Center" },
    { value: "office", label: "Office" },
    { value: "branch", label: "Branch Office" },
    { value: "remote", label: "Remote Site" },
  ];

  // Handle filter changes with additional logic
  const handleDeviceTypeChange = (value: string) => {
    setSelectedDeviceType(value);
    console.log("Device type changed to:", value);
    // Add any additional logic here
  };

  const handleLocationTypeChange = (value: string) => {
    setSelectedLocationType(value);
    console.log("Location type changed to:", value);
    // Add any additional logic here
  };

  return (
    <div>
      <Filters
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        deviceTypes={deviceTypes}
        selectedDeviceType={selectedDeviceType}
        onDeviceTypeChange={handleDeviceTypeChange}
        locationTypes={locationTypes}
        selectedLocationType={selectedLocationType}
        onLocationTypeChange={handleLocationTypeChange}
      />
    </div>
  );
}
```

## Key Features Explained

### 1. Date Filtering
- Uses native HTML5 date inputs for better browser compatibility
- From date automatically sets `max` attribute to prevent selecting dates after the "To" date
- To date automatically sets `min` attribute to prevent selecting dates before the "From" date

### 2. Combobox Filtering
- Built with Radix UI Popover and cmdk Command components
- Searchable dropdown with real-time filtering
- Shows checkmark for currently selected option
- Can be cleared by clicking the same option again
- Clicking outside closes the dropdown

### 3. External State Management
- **IMPORTANT**: All state is managed by the parent component
- The Filters component is completely controlled
- This allows you to:
  - Sync filters with URL parameters
  - Store filters in context or global state
  - Apply filters to multiple data sources
  - Implement complex filter logic in the parent

### 4. Clear Filters Button
- Resets all filters to empty strings
- Located on the right side for easy access
- Calls all the `onChange` handlers with empty values

## Styling Notes

- Component uses sticky positioning (`sticky top-0`) to remain visible while scrolling
- Responsive layout with flexbox wrapping
- Integrates with your existing Tailwind/shadcn theme
- Maintains consistent spacing and styling with other UI components

## TypeScript Support

The component is fully typed with TypeScript. The `FilterOption` type ensures type safety for dropdown options:

```typescript
type FilterOption = {
  value: string;  // The actual value used for filtering
  label: string;  // The display text shown to users
};
```

## Best Practices

1. **Use `useMemo` for derived data**: When extracting filter options from large datasets, wrap the logic in `useMemo` to prevent unnecessary recalculations.

2. **Debounce filter applications**: For very large datasets, consider debouncing the filter application to improve performance.

3. **Provide meaningful labels**: Make sure your filter option labels are clear and user-friendly.

4. **Handle empty states**: Check if `deviceTypes` or `locationTypes` arrays are empty and provide appropriate feedback.

5. **URL synchronization**: Consider syncing filter state with URL query parameters for shareable filtered views.
