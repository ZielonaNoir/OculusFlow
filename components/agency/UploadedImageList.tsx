"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

export interface UploadedImageListProps {
  /** 图片列表（data URL 或 远程 URL） */
  images: string[];
  /** 移除某张图片，不传则隐藏删除按钮 */
  onRemove?: (index: number) => void;
  /** 最多展示的缩略图数量，超出可滚动或折叠；默认 24 */
  maxDisplay?: number;
  /** 额外 class 用于网格容器 */
  className?: string;
  /** 缩略图网格项 class */
  itemClassName?: string;
}

function downloadImage(url: string, filename: string) {
  if (url.startsWith("data:")) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    return;
  }
  fetch(url, { mode: "cors" })
    .then((res) => res.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    })
    .catch(() => window.open(url, "_blank"));
}

export function UploadedImageList({
  images,
  onRemove,
  maxDisplay = 24,
  className,
  itemClassName,
}: UploadedImageListProps) {
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const list = images.slice(0, maxDisplay);
  const hasMore = images.length > maxDisplay;

  if (images.length === 0) return null;

  const openDetail = (index: number) => setDetailIndex(index);
  const closeDetail = () => setDetailIndex(null);

  const detailUrl = detailIndex !== null ? images[detailIndex] : null;

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2",
          className
        )}
      >
        {list.map((src, index) => (
          <div
            key={`${index}-${src.slice(0, 50)}`}
            className={cn(
              "relative aspect-square rounded-lg border border-white/10 bg-white/5 overflow-hidden group",
              itemClassName
            )}
          >
            <button
              type="button"
              className="absolute inset-0 w-full h-full block"
              onClick={() => openDetail(index)}
              aria-label="查看大图"
            >
              <Image
                src={src}
                fill
                unoptimized
                className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                alt=""
                sizes="(max-width: 640px) 25vw, 20vw"
              />
            </button>
            <div className="absolute inset-x-0 bottom-0 p-1.5 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-7 w-7 rounded bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={(e) => {
                  e.stopPropagation();
                  openDetail(index);
                }}
                aria-label="查看"
              >
                <Icon icon="lucide:zoom-in" className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-7 w-7 rounded bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage(src, `image-${index + 1}.png`);
                }}
                aria-label="下载"
              >
                <Icon icon="lucide:download" className="w-3.5 h-3.5" />
              </Button>
              {onRemove && (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 rounded bg-red-500/30 hover:bg-red-500/50 text-white border-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(index);
                  }}
                  aria-label="删除"
                >
                  <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <p className="text-xs text-zinc-500 mt-1">
          已显示前 {maxDisplay} 张，共 {images.length} 张
        </p>
      )}

      <Dialog open={detailIndex !== null} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] w-auto border-white/10 bg-zinc-950 p-2 flex flex-col items-center">
          <DialogTitle className="sr-only">图片详情</DialogTitle>
          {detailUrl && (
            <div className="relative w-full min-h-[200px] flex-1 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={detailUrl}
                alt="预览"
                className="max-w-full max-h-[80vh] w-auto h-auto object-contain rounded-lg"
              />
            </div>
          )}
          <DialogFooter className="shrink-0 gap-2 pt-2">
            {detailUrl && detailIndex !== null && (
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() =>
                  downloadImage(detailUrl, `image-${detailIndex + 1}.png`)
                }
              >
                <Icon icon="lucide:download" className="w-4 h-4 mr-2" />
                下载
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
