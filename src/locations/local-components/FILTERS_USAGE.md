# LocationsFilters Component Usage Guide

## Overview
The `LocationsFilters` component is a flexible, reusable filter system that allows users to filter data based on multiple criteria with a clean, intuitive UI.

## Features
- ✅ Multiple filter support with individual comboboxes
- ✅ Search within filter options
- ✅ Visual feedback for active filters
- ✅ "Clear All" button when filters are active
- ✅ Active filter count display
- ✅ Keyboard accessible
- ✅ Fully controlled or uncontrolled mode
- ✅ Sample data included for quick testing

## Basic Usage (with sample data)

```tsx
import LocationsFilters from './local-components/filters'

function MyPage() {
    return (
        <div>
            <LocationsFilters />
        </div>
    )
}
```

## Advanced Usage (with custom filters and callback)

```tsx
import LocationsFilters, { FilterConfig } from './local-components/filters'
import { useState } from 'react'

function MyPage() {
    const [activeFilters, setActiveFilters] = useState({})
    
    // Define your custom filters
    const customFilters: FilterConfig[] = [
        {
            label: "Status",
            key: "status",
            options: [
                { label: "Online", value: "online" },
                { label: "Offline", value: "offline" },
                { label: "Maintenance", value: "maintenance" },
            ],
        },
        {
            label: "Priority",
            key: "priority",
            options: [
                { label: "High", value: "high" },
                { label: "Medium", value: "medium" },
                { label: "Low", value: "low" },
            ],
        },
    ]
    
    // Handle filter changes
    const handleFiltersChange = (filters: Record<string, string>) => {
        console.log('Active filters:', filters)
        setActiveFilters(filters)
        // Use filters to update your data/API calls
        // Example: fetchData(filters)
    }
    
    return (
        <div>
            <LocationsFilters 
                filterConfigs={customFilters}
                onFiltersChange={handleFiltersChange}
                initialFilters={{ status: 'online' }}
            />
            
            {/* Your filtered data display */}
            <div>
                {JSON.stringify(activeFilters)}
            </div>
        </div>
    )
}
```

## Props

### `filterConfigs` (optional)
- Type: `FilterConfig[]`
- Default: Sample data with Status, Type, and Region filters
- Description: Array of filter configurations

### `onFiltersChange` (optional)
- Type: `(filters: Record<string, string>) => void`
- Description: Callback function that receives the current filter state whenever it changes

### `initialFilters` (optional)
- Type: `Record<string, string>`
- Default: `{}`
- Description: Initial filter values (e.g., `{ status: 'active', type: 'router' }`)

## FilterConfig Type

```typescript
type FilterConfig = {
    label: string,        // Display label (e.g., "Status")
    key: string,          // Unique identifier (e.g., "status")
    options: {            // Available options for this filter
        label: string,    // Option display text
        value: string     // Option value
    }[]
}
```

## Integration with Data Fetching

```tsx
import { useEffect, useState } from 'react'
import LocationsFilters from './local-components/filters'

function LocationsPage() {
    const [locations, setLocations] = useState([])
    const [filters, setFilters] = useState({})
    
    // Fetch data when filters change
    useEffect(() => {
        const fetchLocations = async () => {
            const params = new URLSearchParams(filters)
            const response = await fetch(`/api/locations?${params}`)
            const data = await response.json()
            setLocations(data)
        }
        
        fetchLocations()
    }, [filters])
    
    return (
        <div>
            <LocationsFilters onFiltersChange={setFilters} />
            
            <div>
                {locations.map(location => (
                    <div key={location.id}>{location.name}</div>
                ))}
            </div>
        </div>
    )
}
```

## Styling
The component uses Tailwind CSS classes and can be customized by:
1. Modifying the className props in the component
2. Adjusting colors in the `cn()` utility calls
3. Overriding styles through parent components

## Accessibility
- All interactive elements are keyboard accessible (Tab, Enter, Space)
- ARIA labels provided for screen readers
- Focus states clearly visible
- Semantic HTML structure
