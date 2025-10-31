'use client';
import React from 'react';
import Image from 'next/image';
import map from '../assets/map.svg';
import tab from '../assets/tab.svg';
import { Check, ChevronsUpDown } from "lucide-react"
import type {Locations} from "@/app/api/locations/route"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

// export type optionsType = { value:string; label:string;}[];


// export type Locations = {
//     location: string,
//     lat: number,
//     lng: number,
//     source?: string, 
// }[];

type MapTabSwitchType = {
    currentTab?: string;
    setCurrentTab?: React.Dispatch<React.SetStateAction<string>>;
};
export function MapTabSwitch({ currentTab = "map", setCurrentTab = () => { } }: MapTabSwitchType) {
    return (
        <div className="absolute bottom-1 overflow-hidden">
            <div className="flex justify-center items-center w-[30vw] p- h-[8vh] rounded-full bg-[rgb(255,255,255)]">
                <div className={`flex items-center justify-center rounded-full ${currentTab == "map" ? "bg-black" : "bg-white"} size-[14vw]`} onClick={() => setCurrentTab("map")}>
                    <Image src={map} alt="map icon" className="size-9" style={currentTab == "map" ? { filter: 'brightness(0) invert(1)' } : { filter: 'brightness(0)' }} />
                </div>
                <div className={`flex items-center justify-center rounded-full ${currentTab == "tab" ? "bg-black" : "bg-white"} size-[14vw]`} onClick={() => setCurrentTab("tab")}>
                    <Image src={tab} alt="map icon" className="size-15" style={currentTab == "tab" ? { filter: 'brightness(0) invert(1)' } : { filter: 'brightness(0)' }} />
                </div>
            </div>
        </div>
    )
}

export function Name() {
    return (
        <div className="absolute top-20 overflow-hidden">
            <div className="bg-cyan-400 w-[40vw] h-[6vh] rounded-full flex justify-center items-center">
                <p>NMS™</p>
            </div>
        </div>
    )
}

type SearchLocationsType = {
    options?: Locations;
    value?: Locations[number];
    setValue?: React.Dispatch<React.SetStateAction<Locations[number] | undefined>>;
};
export function SearchLocations({options = [], value, setValue = () => { } }: SearchLocationsType) {
    const [open, setOpen] = React.useState(false)
    return (
        <div className="absolute top-2 px-10 items-center justify-center z-2 overflow-hidden">
            <div className="flex bg-[rgba(255,255,255,0.8)] w-[90vw] p-1 h-[9vh] rounded-full items-center justify-center">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-[85svw] justify-between bg-non border-0 shadow-none  rounded-full  h-full  mx-4 py-2"
                        >
                            {value
                                ? options.find((option) => option.location === value.location)?.location
                                : "Select a location..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-90" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[100vw] p-0">
                        <Command>
                            <CommandInput placeholder="Search location..." />
                            <CommandList>
                                <CommandEmpty>No option found.</CommandEmpty>
                                <CommandGroup>
                                    {options.map((option) => (
                                        <CommandItem
                                            key={option.location}
                                            value={option.location}
                                            onSelect={(currentValue) => {
                                                const selectedOption = options.find(option => option.location === currentValue);
                                                setValue(currentValue === value?.location ? undefined : selectedOption);
                                                setOpen(false)
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value?.location === option?.location ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {option.location}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    )
}
