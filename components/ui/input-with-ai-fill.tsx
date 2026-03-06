"use client";

import * as React from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export interface FieldWithAIFillProps {
  value: string;
  onChange: (value: string) => void;
  onFill: () => Promise<string>;
  disabledWhen?: boolean;
  /** When true, disables both the field and the AI button (e.g. while form is submitting) */
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  variant?: "input" | "textarea";
  className?: string;
  id?: string;
  /** Optional hint when button is disabled (e.g. "请先上传图片") */
  disabledHint?: string;
  /** Optional class for the Input/Textarea (e.g. to match page theme) */
  inputClassName?: string;
  /** Optional left icon/content (e.g. lucide icon); input gets pl-9 when set */
  prefix?: React.ReactNode;
}

export function FieldWithAIFill({
  value,
  onChange,
  onFill,
  disabledWhen = false,
  disabled = false,
  placeholder,
  label,
  variant = "input",
  className,
  id,
  disabledHint,
  inputClassName,
  prefix,
}: FieldWithAIFillProps) {
  const [isFilling, setIsFilling] = React.useState(false);
  const handleFill = async () => {
    if (disabled || disabledWhen || isFilling) return;
    setIsFilling(true);
    try {
      const text = await onFill();
      onChange(text);
    } finally {
      setIsFilling(false);
    }
  };

  const fieldId = id ?? (label ? `field-${label.replace(/\s+/g, "-")}` : undefined);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={fieldId} className="text-sm font-medium">
          {label}
        </Label>
      )}
      <div className="flex gap-2">
        {variant === "textarea" ? (
          <div className="relative flex-1">
            {prefix && (
              <span className="absolute left-3 top-3 z-10 text-zinc-500 [&_svg]:h-4 [&_svg]:w-4">
                {prefix}
              </span>
            )}
            <Textarea
              id={fieldId}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className={cn(
                "min-h-[80px] flex-1 resize-y",
                prefix && "pl-9",
                inputClassName
              )}
              disabled={disabled || isFilling}
            />
          </div>
        ) : (
          <div className="relative flex-1">
            {prefix && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-zinc-500 [&_svg]:h-4 [&_svg]:w-4">
                {prefix}
              </span>
            )}
            <Input
              id={fieldId}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className={cn("flex-1", prefix && "pl-9", inputClassName)}
              disabled={disabled || isFilling}
            />
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={handleFill}
          disabled={disabled || disabledWhen || isFilling}
          title={disabledWhen ? disabledHint : "AI 填充"}
          className="shrink-0 border-violet-400/50 bg-violet-950/40 text-violet-200 hover:bg-violet-900/60 hover:text-violet-100 hover:border-violet-400/80 disabled:opacity-50"
        >
          {isFilling ? (
            <>
              <Icon icon="lucide:loader-2" className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">生成中…</span>
            </>
          ) : (
            <>
              <Icon icon="lucide:sparkles" className="h-4 w-4" />
              <span className="hidden sm:inline">AI 填充</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
