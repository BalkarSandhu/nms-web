"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DateTimePickerProps {
  date?: Date
  setDate: (date: Date | undefined) => void
  placeholder?: string
}

function DateTimePicker({ date, setDate, placeholder = "Pick a date and time" }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedDateTime, setSelectedDateTime] = React.useState<Date | undefined>(date)

  React.useEffect(() => {
    setSelectedDateTime(date)
  }, [date])

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Preserve the time if it exists
      if (selectedDateTime) {
        selectedDate.setHours(selectedDateTime.getHours())
        selectedDate.setMinutes(selectedDateTime.getMinutes())
      } else {
        selectedDate.setHours(0)
        selectedDate.setMinutes(0)
      }
      setSelectedDateTime(selectedDate)
    }
  }

  const handleTimeChange = (type: 'hour' | 'minute', value: string) => {
    const newDateTime = selectedDateTime ? new Date(selectedDateTime) : new Date()
    
    if (type === 'hour') {
      const hour = parseInt(value) || 0
      newDateTime.setHours(hour)
    } else {
      const minute = parseInt(value) || 0
      newDateTime.setMinutes(minute)
    }
    
    setSelectedDateTime(newDateTime)
  }

  const handleSet = () => {
    setDate(selectedDateTime)
    setIsOpen(false)
  }

  const handleClear = () => {
    setSelectedDateTime(undefined)
    setDate(undefined)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-white hover:bg-gray-50",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(date, "PPP HH:mm")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-3 flex">
          <Calendar
            mode="single"
            selected={selectedDateTime}
            onSelect={handleDateSelect}
            initialFocus
          />
          <div className="border-t pt-3 space-y-2">
            <Label className="text-sm font-medium">Time</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label htmlFor="hour" className="text-xs text-muted-foreground">Hour</Label>
                <Input
                  id="hour"
                  type="number"
                  min="0"
                  max="23"
                  value={selectedDateTime?.getHours() ?? 0}
                  onChange={(e) => handleTimeChange('hour', e.target.value)}
                  className="text-center"
                />
              </div>
              <span className="text-xl font-semibold pt-5">:</span>
              <div className="flex-1">
                <Label htmlFor="minute" className="text-xs text-muted-foreground">Minute</Label>
                <Input
                  id="minute"
                  type="number"
                  min="0"
                  max="59"
                  value={selectedDateTime?.getMinutes() ?? 0}
                  onChange={(e) => handleTimeChange('minute', e.target.value)}
                  className="text-center"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSet} className="flex-1 bg-red-700 hover:bg-red-800">
              Set
            </Button>
            <Button onClick={handleClear} variant="outline" className="flex-1">
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default function DateTimeInput({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value?: Date | string;
  onChange: (date: Date | string | undefined) => void;
  className?: string;
}) {
  // normalize incoming value to Date | undefined
  const dateValue = value instanceof Date ? value : (value ? new Date(value) : undefined);

  return (
    <div className={"flex flex-col gap-1 " + className}>
      <label className="text-sm text-gray-700 mb-1">{label}</label>
      <DateTimePicker
        date={dateValue}
        setDate={(d) => onChange(d as Date | string | undefined)}
        placeholder={label}
      />
    </div>
  );
}
