import React from "react"

import { ChevronsUpDown, Check, X, Search } from "lucide-react"

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
    PopoverAnchor,
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
    searchOptions?: { label: string, value: string }[],
    trailing?: React.ReactNode,
};

// Reserved key for the free-text search box.
const SEARCH_KEY = "search";
const SEARCH_SELECTION_KEY = "searchSelection";

export default function TableFilters({
    filterConfigs = [],
    onFiltersChange,
    initialFilters = {},
    searchPlaceholder = "Search…",
    searchOptions,
    trailing,
}: LocationsFiltersProps) {
    const [filters, setFilters] = React.useState<Record<string, string>>(initialFilters);
    const [searchOpen, setSearchOpen] = React.useState(false);
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        onFiltersChange?.(filters);
    }, [filters, onFiltersChange]);

    const updateFilter = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };
    const updateSearch = (value: string) => {
        setFilters(prev => {
            const next: Record<string, string> = { ...prev, [SEARCH_KEY]: value };
            delete next[SEARCH_SELECTION_KEY];
            return next;
        });
    };
    const selectSearchOption = (option: { label: string, value: string }) => {
        setFilters(prev => ({
            ...prev,
            [SEARCH_KEY]: option.label,
            [SEARCH_SELECTION_KEY]: option.value,
        }));
        setSearchOpen(false);
    };

    const activeCount = filterConfigs.filter(c => filters[c.key]).length;
    const searchValue = filters[SEARCH_KEY] || "";
    const filteredSearchOptions = (searchOptions ?? []).filter(option =>
        option.label.toLowerCase().includes(
            (filters[SEARCH_SELECTION_KEY] ? "" : searchValue.trim()).toLowerCase()
        )
    );
    return (
        <div className="flex items-center gap-2 px-2 flex-nowrap overflow-x-auto">
            {/* Free-text search */}
            {searchOptions ? (
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                    <PopoverAnchor asChild>
                        <div
                            className="flex items-center gap-2 h-8 px-3 rounded-md w-[250px] shrink-0"
                            style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-soft)' }}
                        >
                            <Search className="size-3.5" style={{ color: 'var(--text-dim)' }} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchValue}
                                onFocus={() => setSearchOpen(true)}
                                onChange={e => updateSearch(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Escape") setSearchOpen(false);
                                }}
                                placeholder={searchPlaceholder}
                                aria-label={searchPlaceholder}
                                aria-expanded={searchOpen}
                                className="bg-transparent outline-none text-sm min-w-0 flex-1 placeholder:text-[var(--text-dim)]"
                                style={{ color: 'var(--text-hi)' }}
                            />
                            <button
                                type="button"
                                onClick={() => updateSearch("")}
                                aria-label="Clear search"
                                disabled={!searchValue}
                                className="flex items-center justify-center rounded-full p-0.5 transition-colors"
                                style={{ color: 'var(--text-lo)', visibility: searchValue ? 'visible' : 'hidden' }}
                            >
                                <X className="size-3.5" />
                            </button>
                        </div>
                    </PopoverAnchor>
                    <PopoverContent
                        className="w-[280px] p-0"
                        align="start"
                        onOpenAutoFocus={e => e.preventDefault()}
                        onInteractOutside={e => {
                            if (searchInputRef.current?.contains(e.target as Node)) {
                                e.preventDefault();
                            }
                        }}
                        style={{
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border-soft)',
                            color: 'var(--text-hi)',
                        }}
                    >
                        <Command shouldFilter={false} style={{ background: 'transparent', color: 'var(--text-hi)' }}>
                            <CommandList className="max-h-64 overflow-y-auto">
                                {filteredSearchOptions.length === 0 ? (
                                    <CommandEmpty>No matching locations.</CommandEmpty>
                                ) : (
                                    <CommandGroup>
                                        {filteredSearchOptions.map(option => (
                                            <CommandItem
                                                key={option.value}
                                                value={option.value}
                                                onSelect={() => selectSearchOption(option)}
                                                className="cursor-pointer text-[var(--text-hi)] data-[selected=true]:text-black"
                                            >
                                                <span className="truncate">{option.label}</span>
                                                {filters[SEARCH_SELECTION_KEY] === option.value && (
                                                    <Check className="ml-auto size-4" style={{ color: 'var(--brand)' }} />
                                                )}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            ) : (
                <div
                    className="flex items-center gap-2 h-8 px-3 rounded-md w-56 md:w-64 shrink-0"
                    style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-soft)' }}
                >
                    <Search className="size-3.5" style={{ color: 'var(--text-dim)' }} />
                    <input
                        type="text"
                        value={searchValue}
                        onChange={e => updateSearch(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="bg-transparent outline-none text-sm min-w-0 flex-1 placeholder:text-[var(--text-dim)]"
                        style={{ color: 'var(--text-hi)' }}
                    />
                    <button
                        type="button"
                        onClick={() => updateSearch("")}
                        aria-label="Clear search"
                        disabled={!searchValue}
                        className="flex items-center justify-center rounded-full p-0.5 transition-colors"
                        style={{ color: 'var(--text-lo)', visibility: searchValue ? 'visible' : 'hidden' }}
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            )}

            {filterConfigs.map((config) => (
                <FilterComboBox
                    key={config.key}
                    label={config.label}
                    filterValue={filters[config.key] || ""}
                    setFilterValue={(value) => updateFilter(config.key, value)}
                    filterOptions={config.options}
                />
            ))}

            {activeCount > 0 && (
                <span className="text-xs shrink-0" style={{ color: 'var(--text-lo)' }}>
                    {activeCount} filter{activeCount !== 1 ? 's' : ''} active
                </span>
            )}

            {trailing && (
                <div className="ml-auto flex items-center gap-2 shrink-0">{trailing}</div>
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
                    className="flex items-center px-3 gap-2 rounded-md min-w-[120px] h-8 text-sm font-medium transition-colors shrink-0"
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
                <Command shouldFilter={false} style={{ background: 'transparent', color: 'var(--text-hi)' }}>
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
                                    className="flex items-center cursor-pointer text-[var(--text-hi)] data-[selected=true]:text-black"
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
