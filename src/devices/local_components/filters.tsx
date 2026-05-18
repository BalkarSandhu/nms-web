import React from "react"

import { ChevronsUpDown, Check, X, FilterX, Search } from "lucide-react"

import { cn } from "@/lib/utils"

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

export type LocationsFiltersProps = {
    filterConfigs?: FilterConfig[],
    onFiltersChange?: (filters: Record<string, string>) => void,
    initialFilters?: Record<string, string>,
    searchPlaceholder?: string,
    trailing?: React.ReactNode,
};

// Reserved key for the free-text search box.
const SEARCH_KEY = "search";

export default function TableFilters({
    filterConfigs = [],
    onFiltersChange,
    initialFilters = {},
    searchPlaceholder = "Search…",
    trailing,
}: LocationsFiltersProps) {
    const [filters, setFilters] = React.useState<Record<string, string>>(initialFilters);

    React.useEffect(() => {
        onFiltersChange?.(filters);
    }, [filters, onFiltersChange]);

    const updateFilter = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Clear only the user-facing dropdown filters and the search box.
    // Structural keys (e.g. the area scope coming from the URL) are kept,
    // so clearing never re-surfaces an "area" filter.
    const clearAllFilters = () => {
        setFilters(prev => {
            const next = { ...prev };
            filterConfigs.forEach(c => { delete next[c.key]; });
            delete next[SEARCH_KEY];
            return next;
        });
    };

    const activeCount = filterConfigs.filter(c => filters[c.key]).length;
    const searchValue = filters[SEARCH_KEY] || "";
    const showClear = activeCount > 0 || searchValue !== "";

    return (
        <div className="flex items-center gap-2 px-2 flex-wrap">
            {/* Free-text search */}
            <div
                className="flex items-center gap-2 h-8 px-3 rounded-md"
                style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-soft)' }}
            >
                <Search className="size-3.5" style={{ color: 'var(--text-dim)' }} />
                <input
                    type="text"
                    value={searchValue}
                    onChange={e => updateFilter(SEARCH_KEY, e.target.value)}
                    placeholder={searchPlaceholder}
                    className="bg-transparent outline-none text-sm w-44 md:w-56 placeholder:text-[var(--text-dim)]"
                    style={{ color: 'var(--text-hi)' }}
                />
                {searchValue && (
                    <button
                        type="button"
                        onClick={() => updateFilter(SEARCH_KEY, "")}
                        aria-label="Clear search"
                        className="flex items-center justify-center rounded-full p-0.5 transition-colors"
                        style={{ color: 'var(--text-lo)' }}
                    >
                        <X className="size-3.5" />
                    </button>
                )}
            </div>

            {filterConfigs.map((config) => (
                <FilterComboBox
                    key={config.key}
                    label={config.label}
                    filterValue={filters[config.key] || ""}
                    setFilterValue={(value) => updateFilter(config.key, value)}
                    filterOptions={config.options}
                />
            ))}

            {showClear && (
                <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-sm transition-colors"
                    style={{
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-soft)',
                        color: 'var(--text-mid)',
                    }}
                >
                    <FilterX className="size-4" />
                    Clear
                </button>
            )}

            {activeCount > 0 && (
                <span className="text-xs" style={{ color: 'var(--text-lo)' }}>
                    {activeCount} filter{activeCount !== 1 ? 's' : ''} active
                </span>
            )}

            {trailing && (
                <div className="ml-auto flex items-center gap-2">{trailing}</div>
            )}
        </div>
    );
}

type FilterComboBoxProps = {
    label: string,
    filterValue: string,
    setFilterValue: (value: string) => void,
    filterOptions: { label: string, value: string }[]
};

function FilterComboBox({ label, filterValue, setFilterValue, filterOptions }: FilterComboBoxProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const active = !!filterValue;

    const filteredOptions = filterOptions.filter(option =>
        option.label?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label={`Filter by ${label}`}
                    className="flex items-center px-3 gap-2 rounded-md min-w-[120px] h-8 text-sm font-medium transition-colors"
                    style={{
                        background: active ? 'var(--brand-soft)' : 'var(--bg-panel)',
                        border: `1px solid ${active ? 'var(--border-brand)' : 'var(--border-soft)'}`,
                        color: active ? 'var(--brand)' : 'var(--text-mid)',
                    }}
                >
                    <span className="truncate flex-1 text-left">
                        {active
                            ? filterOptions.find(o => o.value === filterValue)?.label
                            : label}
                    </span>
                    {active ? (
                        <span
                            role="button"
                            tabIndex={0}
                            aria-label={`Clear ${label} filter`}
                            className="flex items-center justify-center rounded-full p-0.5"
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
                        <ChevronsUpDown className="size-4" style={{ color: 'var(--text-dim)' }} />
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[220px] p-0"
                align="start"
                style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--text-hi)',
                }}
            >
                <Command style={{ background: 'transparent', color: 'var(--text-hi)' }}>
                    <CommandInput
                        placeholder={`Search ${label.toLowerCase()}…`}
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
                                    className="flex items-center cursor-pointer"
                                >
                                    <span className="truncate flex-1">{option.label}</span>
                                    <Check
                                        className={cn(
                                            "ml-2 size-4",
                                            filterValue === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                        style={{ color: 'var(--brand)' }}
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
