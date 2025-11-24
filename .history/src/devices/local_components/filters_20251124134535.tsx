import React from "react"


//-- icons
import { ChevronsUpDown, Check, X, FilterX } from "lucide-react"


// If you have a utility for classNames, import it. Otherwise, use 'classnames' package.
import { cn } from "@/lib/utils" // Adjust path if needed


//-- import ShadCN components
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";


// Filter configuration type
export type FilterConfig = {
    label: string,
    key: string, // unique identifier for the filter
    options: { label: string, value: string }[]
};

// Props type for LocationsFilters
export type LocationsFiltersProps = {
    filterConfigs?: FilterConfig[],
    onFiltersChange?: (filters: Record<string, string>) => void,
    initialFilters?: Record<string, string>
};

// Sample data for demonstration
const sampleFilterConfigs: FilterConfig[] = [
    {
        label: "Status",
        key: "status",
        options: [
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
            { label: "Pending", value: "pending" },
            { label: "Maintenance", value: "maintenance" },
        ],
    },
    {
        label: "Type",
        key: "type",
        options: [
            { label: "Router", value: "router" },
            { label: "Switch", value: "switch" },
            { label: "Firewall", value: "firewall" },
            { label: "Access Point", value: "access_point" },
        ],
    },
    {
        label: "Region",
        key: "region",
        options: [
            { label: "North America", value: "na" },
            { label: "Europe", value: "eu" },
            { label: "Asia Pacific", value: "apac" },
            { label: "South America", value: "sa" },
        ],
    },
];

export default function LocationsFilters({ 
    filterConfigs = sampleFilterConfigs, 
    onFiltersChange,
    initialFilters = {}
}: LocationsFiltersProps) {
    // State to manage all filter values
    const [filters, setFilters] = React.useState<Record<string, string>>(initialFilters);

    // Update parent component when filters change
    React.useEffect(() => {
        if (onFiltersChange) {
            onFiltersChange(filters);
        }
    }, [filters, onFiltersChange]);

    // Update a specific filter
    const updateFilter = (key: string, value: string) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Clear all filters
    const clearAllFilters = () => {
        setFilters({});
    };

    // Check if any filters are active
    const hasActiveFilters = Object.values(filters).some(value => value !== "");

    return (
        <div className="flex items-center gap-2 px-2 flex-wrap">
            {filterConfigs.map((config) => (
                <FilterComboBox
                    key={config.key}
                    label={config.label}
                    filterValue={filters[config.key] || ""}
                    setFilterValue={(value) => updateFilter(config.key, value)}
                    filterOptions={config.options}
                />
            ))}
            
            {/* Clear all filters button */}
            {hasActiveFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-8 px-2 text-sm text-gray-600 hover:text-gray-900"
                >
                    <FilterX className="size-4 mr-1" />
                    Clear All
                </Button>
            )}
            
            {/* Active filters count */}
            {hasActiveFilters && (
                <span className="text-sm text-gray-500 ml-2">
                    {Object.values(filters).filter(v => v).length} filter{Object.values(filters).filter(v => v).length !== 1 ? 's' : ''} active
                </span>
            )}
        </div>
    );
}

// FilterComboBox as a React component
type FilterComboBoxProps = {
    label: string,
    filterValue: string,
    setFilterValue: (value: string) => void,
    filterOptions: { label: string, value: string }[]
};

function FilterComboBox({ label, filterValue, setFilterValue, filterOptions }: FilterComboBoxProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    
    const filteredOptions = filterOptions.filter(option =>
        option.label?.toLowerCase().includes(search.toLowerCase())
    );
    
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "flex items-center px-3 gap-2 border-2 rounded-[20px] min-w-[120px] h-8 transition-all duration-200",
                        filterValue
                            ? "bg-blue-50 border-blue-400 text-blue-700"
                            : "bg-white border-gray-300 text-gray-700 hover:border-gray-400",
                        open && "ring-2 ring-blue-200 border-blue-500"
                    )}
                    type="button"
                    aria-label={`Filter by ${label}`}
                    tabIndex={0}
                >
                    <span className="truncate text-[14px] font-medium flex-1 text-left">
                        {filterValue
                            ? filterOptions.find(o => o.value === filterValue)?.label
                            : label}
                    </span>
                    {filterValue ? (
                        <span
                            role="button"
                            tabIndex={0}
                            aria-label={`Clear ${label} filter`}
                            className="flex items-center justify-center rounded-full hover:bg-blue-200 focus:bg-blue-300 transition-colors p-0.5"
                            onClick={e => {
                                e.stopPropagation();
                                setFilterValue("");
                            }}
                            onKeyDown={e => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setFilterValue("");
                                }
                            }}
                        >
                            <X className="size-3.5 cursor-pointer" />
                        </span>
                    ) : (
                        <ChevronsUpDown className="size-4 text-gray-500" />
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0" align="start">
                <Command>
                    <CommandInput
                        placeholder={`Search ${label.toLowerCase()}...`}
                        className="h-9"
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty>No options found.</CommandEmpty>
                        <CommandGroup>
                            {filteredOptions.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={() => {
                                        setFilterValue(option.value);
                                        setOpen(false);
                                        setSearch("");
                                    }}
                                    className={cn(
                                        "flex items-center cursor-pointer",
                                        filterValue === option.value && "bg-blue-50 text-blue-700"
                                    )}
                                >
                                    <span className="truncate flex-1">{option.label}</span>
                                    <Check
                                        className={cn(
                                            "ml-2 size-4",
                                            filterValue === option.value ? "opacity-100 text-blue-600" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}