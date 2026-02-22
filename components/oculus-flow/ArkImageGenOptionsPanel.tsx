"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArkImageGenOptions,
  DEFAULT_ARK_IMAGE_GEN_OPTIONS,
} from "@/components/oculus-flow/types";
import { cn } from "@/lib/utils";

const SIZE_OPTIONS = [
  { value: "1K", label: "1K" },
  { value: "2K", label: "2K" },
  { value: "4K", label: "4K" },
  { value: "2048x2048", label: "2048×2048" },
  { value: "1280x720", label: "1280×720" },
  { value: "1920x1080", label: "1920×1080" },
];

const RESPONSE_FORMAT_OPTIONS = [
  { value: "url", label: "URL（24h 有效）" },
  { value: "b64_json", label: "Base64" },
];

const SEQUENTIAL_OPTIONS = [
  { value: "disabled", label: "单张" },
  { value: "auto", label: "连续多张" },
];

const MAX_IMAGES_OPTIONS = [4, 6, 8, 10, 12, 15].map((n) => ({
  value: String(n),
  label: `${n} 张`,
}));

const OPTIMIZE_MODE_OPTIONS = [
  { value: "standard", label: "标准（质量优先）" },
  { value: "fast", label: "快速" },
];

const GUIDANCE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
  value: String(n),
  label: String(n),
}));

const menuContentClass =
  "min-w-[12rem] border-zinc-700 bg-zinc-900 text-zinc-100";
const subContentClass =
  "border-zinc-700 bg-zinc-900 text-zinc-100";
const itemFocusClass = "focus:bg-zinc-800 focus:text-white";
const labelClass = "text-zinc-500 font-semibold";

interface ArkImageGenOptionsPanelProps {
  value: ArkImageGenOptions;
  onChange: (options: ArkImageGenOptions) => void;
  className?: string;
}

export function ArkImageGenOptionsPanel({
  value,
  onChange,
  className,
}: ArkImageGenOptionsPanelProps) {
  const update = (patch: Partial<ArkImageGenOptions>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between border-zinc-600 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700 hover:text-white",
            className
          )}
        >
          <span className="flex items-center gap-2">
            <Icon icon="lucide:sliders-horizontal" className="h-4 w-4 text-violet-400" />
            图片生成参数
            <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
              Ark 4.5
            </span>
          </span>
          <Icon icon="lucide:chevron-down" className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className={menuContentClass} align="start">
        {/* 一级：输出 */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className={labelClass}>输出</DropdownMenuLabel>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={itemFocusClass}>
              <Icon icon="lucide:maximize-2" className="h-4 w-4" />
              输出尺寸
              <span className="ml-auto text-xs text-zinc-500">
                {SIZE_OPTIONS.find((o) => o.value === value.size)?.label ?? value.size}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className={subContentClass}>
                <DropdownMenuRadioGroup
                  value={value.size}
                  onValueChange={(v) => update({ size: v })}
                >
                  {SIZE_OPTIONS.map((o) => (
                    <DropdownMenuRadioItem
                      key={o.value}
                      value={o.value}
                      className={itemFocusClass}
                    >
                      {o.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={itemFocusClass}>
              <Icon icon="lucide:file-output" className="h-4 w-4" />
              返回格式
              <span className="ml-auto text-xs text-zinc-500">
                {value.responseFormat === "url" ? "URL" : "Base64"}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className={subContentClass}>
                <DropdownMenuRadioGroup
                  value={value.responseFormat}
                  onValueChange={(v) =>
                    update({ responseFormat: v as "url" | "b64_json" })
                  }
                >
                  {RESPONSE_FORMAT_OPTIONS.map((o) => (
                    <DropdownMenuRadioItem
                      key={o.value}
                      value={o.value}
                      className={itemFocusClass}
                    >
                      {o.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-zinc-700" />

        {/* 一级：生成控制 */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className={labelClass}>生成控制</DropdownMenuLabel>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={itemFocusClass}>
              <Icon icon="lucide:layers" className="h-4 w-4" />
              生成模式
              <span className="ml-auto text-xs text-zinc-500">
                {value.sequentialImageGeneration === "auto" ? "连续多张" : "单张"}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className={subContentClass}>
                <DropdownMenuRadioGroup
                  value={value.sequentialImageGeneration}
                  onValueChange={(v) =>
                    update({
                      sequentialImageGeneration: v as "auto" | "disabled",
                    })
                  }
                >
                  {SEQUENTIAL_OPTIONS.map((o) => (
                    <DropdownMenuRadioItem
                      key={o.value}
                      value={o.value}
                      className={itemFocusClass}
                    >
                      {o.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          {value.sequentialImageGeneration === "auto" && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className={itemFocusClass}>
                <Icon icon="lucide:hash" className="h-4 w-4" />
                最大张数
                <span className="ml-auto text-xs text-zinc-500">
                  {value.maxImages}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className={subContentClass}>
                  <DropdownMenuRadioGroup
                    value={String(value.maxImages)}
                    onValueChange={(v) => update({ maxImages: Number(v) })}
                  >
                    {MAX_IMAGES_OPTIONS.map((o) => (
                      <DropdownMenuRadioItem
                        key={o.value}
                        value={o.value}
                        className={itemFocusClass}
                      >
                        {o.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={itemFocusClass}>
              <Icon icon="lucide:sparkles" className="h-4 w-4" />
              提示词优化
              <span className="ml-auto text-xs text-zinc-500">
                {value.optimizePromptMode === "standard" ? "标准" : "快速"}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className={subContentClass}>
                <DropdownMenuRadioGroup
                  value={value.optimizePromptMode}
                  onValueChange={(v) =>
                    update({ optimizePromptMode: v as "standard" | "fast" })
                  }
                >
                  {OPTIMIZE_MODE_OPTIONS.map((o) => (
                    <DropdownMenuRadioItem
                      key={o.value}
                      value={o.value}
                      className={itemFocusClass}
                    >
                      {o.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={itemFocusClass}>
              <Icon icon="lucide:scale" className="h-4 w-4" />
              文本权重
              <span className="ml-auto text-xs text-zinc-500">
                {value.guidanceScale}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className={subContentClass}>
                <DropdownMenuRadioGroup
                  value={String(value.guidanceScale)}
                  onValueChange={(v) => update({ guidanceScale: Number(v) })}
                >
                  {GUIDANCE_OPTIONS.map((o) => (
                    <DropdownMenuRadioItem
                      key={o.value}
                      value={o.value}
                      className={itemFocusClass}
                    >
                      {o.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={itemFocusClass}>
              <Icon icon="lucide:dices" className="h-4 w-4" />
              随机种子
              <span className="ml-auto text-xs text-zinc-500">
                {value.seed === -1 ? "随机" : value.seed}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className={subContentClass}>
                <DropdownMenuItem
                  className={itemFocusClass}
                  onSelect={(e) => {
                    e.preventDefault();
                    update({ seed: -1 });
                  }}
                >
                  随机（−1）
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-zinc-700" />

        {/* 一级：其他 */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className={labelClass}>其他</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={value.watermark}
            onCheckedChange={(checked) =>
              update({ watermark: checked === true })
            }
            className={itemFocusClass}
          >
            <Icon icon="lucide:badge-check" className="h-4 w-4" />
            添加「AI 生成」水印
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-zinc-700" />

        <DropdownMenuItem
          className={cn("text-zinc-400", itemFocusClass)}
          onSelect={(e) => {
            e.preventDefault();
            onChange(DEFAULT_ARK_IMAGE_GEN_OPTIONS);
          }}
        >
          <Icon icon="lucide:rotate-ccw" className="h-4 w-4" />
          恢复默认
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
