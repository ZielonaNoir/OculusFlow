---
name: using-shadcn-date-picker
description: Enforce using shadcn/ui Date Picker for all calendar/date selection components in the project
---

# Using shadcn/ui Date Picker

## Rule

**All calendar and date selection components MUST use shadcn/ui Date Picker.** Never create custom date pickers or use other date picker libraries.

## Why

1. **Consistent UX**: Unified date selection experience across the entire application
2. **Accessibility**: Built on Radix UI with ARIA compliance
3. **Customizable**: Highly themeable with Tailwind CSS
4. **Maintained**: Part of shadcn/ui ecosystem, actively maintained
5. **Type-safe**: Full TypeScript support
6. **Locale Support**: Built-in internationalization

## Installation

### 1. Install Dependencies

```bash
bun add react-day-picker date-fns
```

### 2. Add Calendar Component

```bash
npx shadcn@latest add calendar
```

### 3. Add Popover Component (Required)

```bash
npx shadcn@latest add popover
```

### 4. Add Button Component (If not exists)

```bash
npx shadcn@latest add button
```

## Basic Usage

### Simple Date Picker

```tsx
"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DatePickerDemo() {
  const [date, setDate] = React.useState<Date>();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
```

## Common Use Cases

### 1. Date Range Picker

```tsx
import { DateRange } from "react-day-picker";

export function DateRangePicker({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const [date, setDate] = React.useState<DateRange | undefined>();

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

### 2. With Presets (Common Date Ranges)

```tsx
import { addDays, format } from "date-fns";

export function DatePickerWithPresets() {
  const [date, setDate] = React.useState<Date>();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto flex-col space-y-2 p-2">
        <Select
          onValueChange={(value) =>
            setDate(addDays(new Date(), parseInt(value)))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="0">Today</SelectItem>
            <SelectItem value="1">Tomorrow</SelectItem>
            <SelectItem value="3">In 3 days</SelectItem>
            <SelectItem value="7">In a week</SelectItem>
          </SelectContent>
        </Select>
        <div className="rounded-md border">
          <Calendar mode="single" selected={date} onSelect={setDate} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### 3. With Form Integration

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  dob: z.date({
    required_error: "A date of birth is required.",
  }),
});

export function DatePickerForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    console.log(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="dob"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of birth</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                Your date of birth is used to calculate your age.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

## Advanced Features

### Disable Dates

```tsx
<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
  initialFocus
/>
```

### Custom Modifiers

```tsx
const modifiers = {
  booked: [new Date(2024, 5, 8), new Date(2024, 5, 9)],
}

const modifiersClassNames = {
  booked: "line-through text-gray-400",
}

<Calendar
  mode="single"
  modifiers={modifiers}
  modifiersClassNames={modifiersClassNames}
/>
```

### Locale Support

```tsx
import { zhCN } from "date-fns/locale";

<Calendar mode="single" selected={date} onSelect={setDate} locale={zhCN} />;
```

## Best Practices

### 1. Always Use with Form Validation

```tsx
// Good - with Zod validation
const schema = z.object({
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date().optional(),
});
```

### 2. Provide Clear Labels

```tsx
// Good
<FormLabel>宠物出生日期</FormLabel>

// Bad
<FormLabel>Date</FormLabel>
```

### 3. Set Appropriate Constraints

```tsx
// For birth date - disable future dates
disabled={(date) => date > new Date()}

// For appointment - disable past dates
disabled={(date) => date < new Date()}
```

### 4. Use Consistent Date Formatting

```tsx
import { format } from "date-fns";

// Good - consistent format across app
format(date, "yyyy-MM-dd"); // For API
format(date, "PPP"); // For display (e.g., "December 25, 2024")
```

### 5. Handle Timezone Correctly

```tsx
// Store dates in UTC for consistency
const utcDate = new Date(date.toISOString());
```

## Project-Specific Guidelines (OculusFlow)

### Date Picker Use Cases in OculusFlow

| Feature                         | Component            | Constraint                    |
| ------------------------------- | -------------------- | ----------------------------- |
| 主播排班日期 (Host Scheduling)  | `HostInputPanel.tsx` | 禁用过去日期 (`date < today`) |
| 投流盯盘时段 (Campaign Monitor) | 未来扩展             | 允许过去日期（查询历史）      |

### Example: Host Scheduling Date Picker

```tsx
<Calendar
  mode="single"
  selected={targetDate}
  onSelect={(d) => {
    if (d) {
      setTargetDate(d);
      setCalendarOpen(false);
    }
  }}
  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
  locale={zhCN}
  initialFocus
/>
```

### Dark Mode Styling (Required)

All Popover containers in OculusFlow must use dark theme classes:

```tsx
<PopoverContent className="w-auto p-0 bg-zinc-900 border-white/10" align="start">
```

The trigger button should follow:

```tsx
<Button
  variant="outline"
  className="w-full justify-start text-left font-normal bg-black/30 border-white/10 text-white hover:bg-white/5 hover:text-white"
>
```

## Common Pitfalls

### ❌ Don't Use HTML Input Type="date"

```tsx
// Bad
<input type="date" />

// Good
<DatePicker />
```

### ❌ Don't Create Custom Date Pickers

```tsx
// Bad - custom implementation
<CustomDatePicker />

// Good - use shadcn
<Calendar />
```

### ❌ Don't Mix Date Libraries

```tsx
// Bad - mixing libraries
import DatePicker from "react-datepicker";

// Good - stick to shadcn
import { Calendar } from "@/components/ui/calendar";
```

## Resources

- [shadcn/ui Date Picker Documentation](https://ui.shadcn.com/docs/components/radix/date-picker)
- [react-day-picker Documentation](https://react-day-picker.js.org/)
- [date-fns Documentation](https://date-fns.org/docs/Getting-Started)

## Related Skills

- `using-shadcn-components` - General shadcn/ui component guidelines
- `form-validation` - Integrating date pickers with form validation
