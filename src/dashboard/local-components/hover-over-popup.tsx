"use client";
import type { Dispatch, JSX, SetStateAction } from "react";
import {  Info } from "lucide-react";

type Link = {
  field: string;
  value: string;
};

export type FilterLink = Link;

type EventType = {
  indicatorColour: "red" | "blue" | "white" | "green";
  headerLeft: Link;
  headerRight: Link;
  sideLabel: Link;
  data: {
    field: string;
    value: string;
    colour: "red" | "blue" | "white" | "green";
  }[];
};

type PopOverContentProps = {
  EventData: EventType;
  setFilter: Dispatch<SetStateAction<FilterLink | null>>;
};

// Helper function to get the appropriate color class
const getColorClass = (color: "red" | "blue" | "white" | "green") => {
  const colorMap = {
    red: "bg-red-500",
    blue: "bg-blue-500",
    white: "bg-white",
    green: "bg-green-500"
  };
  return colorMap[color];
};

export default function PopOverContent({ EventData, setFilter }: PopOverContentProps): JSX.Element {
  // const [isOpened, setIsOpened] = useState<boolean>(true); // Default to expanded for hover popup

  return (
    <div className="border-2 border-[#8C8C8C] bg-[#0C0C0C] rounded-[10px] px-1 max-w-[200px]">
      <div className="h-5 flex flex-row justify-between items-center">
        {/* Circle Indicator */}
        <div className={`size-2.5 rounded-full border-none ${getColorClass(EventData.indicatorColour)} mr-1 shrink-0`} />

        {/* Header */}
        <div className="flex flex-row justify-between flex-1 gap-2">
          <button
            onClick={() => setFilter(EventData.headerLeft)}
            className="text-[8px] font-bold text-white hover:underline cursor-pointer"
          >
            {EventData.headerLeft.value}
          </button>
          <button
            onClick={() => setFilter(EventData.headerRight)}
            className="text-[8px] font-bold text-white hover:underline cursor-pointer truncate max-w-20"
          >
            {EventData.headerRight.value}
          </button>
        </div>

        {/* Chevron Icon - Toggle Button */}
        {/* <button
          onClick={() => setIsOpened(!isOpened)}
          className="text-white hover:text-gray-300 transition-colors cursor-pointer flex-shrink-0"
          aria-label={isOpened ? "Collapse" : "Expand"}
        >
          {isOpened ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button> */}
      </div>

      {/* Expandable Content */}
      
        <div className="mt-2 flex flex-row">
          {/* Side Label */}
          <button
            onClick={() => setFilter(EventData.sideLabel)}
            className="font-bold text-white text-[8px] writing-mode-vertical-rl transform -rotate-90 hover:underline cursor-pointer shrink-0"
          >
            {EventData.sideLabel.value}
          </button>

          {/* Data Entries */}
          <div className="flex-1 space-y-1">
            {EventData.data.map((entry, index) => (
              <div key={index} className="bg-[#1D1D1D] rounded px-2 py-1 flex flex-row justify-between items-center">
                <span className="text-[8px] text-gray-300">{entry.field}</span>
                <div className="flex flex-row items-center justify-end gap-1">
                  <span className={`text-white text-[8px] font-semibold overflow-ellipsis line-clamp-1 text-right mr-0.5`}>
                    {entry.value}
                  </span>
                  <button
                    onClick={() => setFilter({ field: entry.field, value: entry.value })}
                    className={`${entry.colour === 'white' ? 'text-white' : entry.colour === 'red' 
                                ? 'text-red-500' : entry.colour === 'blue' ? 
                                'text-blue-500' : 'text-green-500'}
                                text-gray-400 hover:text-white transition-colors cursor-pointer`}
                    aria-label={`Filter by ${entry.field}`}
                  >
                    <Info className="h-3 w-3 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      
    </div>
  );
}