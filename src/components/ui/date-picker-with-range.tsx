"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  startDate?: Date | null;
  endDate?: Date | null;
  onDateChange?: (start: Date | null, end: Date | null) => void;
}

export default function DatePickerWithRange({
  className,
  startDate: controlledStartDate,
  endDate: controlledEndDate,
  onDateChange,
}: DatePickerWithRangeProps) {
  const [internalStartDate, setInternalStartDate] = React.useState<Date | null>(
    new Date()
  );
  const [internalEndDate, setInternalEndDate] = React.useState<Date | null>(
    addDays(new Date(), 20)
  );

  const startDate = controlledStartDate !== undefined ? controlledStartDate : internalStartDate;
  const endDate = controlledEndDate !== undefined ? controlledEndDate : internalEndDate;

  const handleChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    if (onDateChange) {
      onDateChange(start, end);
    } else {
      setInternalStartDate(start);
      setInternalEndDate(end);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !startDate && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate ? (
              endDate ? (
                <>
                  {format(startDate, "LLL dd, y")} -{" "}
                  {format(endDate, "LLL dd, y")}
                </>
              ) : (
                format(startDate, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <DatePicker
            selected={startDate}
            onChange={handleChange}
            startDate={startDate}
            endDate={endDate}
            selectsRange
            inline
            monthsShown={2}
            calendarClassName="!bg-background !border-border !font-sans"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
