"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useUser } from "@/components/UserProvider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type AssetItem = {
  id: string;
  type: "image" | "video";
  storage_path: string;
  source: string;
  created_at: string;
  url: string | null;
};

const SOURCE_LABELS: Record<string, string> = {
  retouch: "图片精修",
  oculus: "Oculus Flow",
  style: "风格复刻",
  setgen: "智能组图",
};

export default function MyWorksPage() {
  const { user } = useUser();
  const [items, setItems] = useState<AssetItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const limit = 24;

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (sourceFilter !== "all") params.set("source", sourceFilter);
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setLoading(true); });
    fetch(`/api/assets?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("获取列表失败");
        return res.json();
      })
      .then((data: { items: AssetItem[]; total: number }) => {
        if (!cancelled) {
          setItems(data.items);
          setTotal(data.total);
        }
      })
      .catch(() => { if (!cancelled) toast.error("加载我的作品失败"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, page, typeFilter, sourceFilter]);

  const handleDownload = (item: AssetItem) => {
    if (!item.url) {
      toast.error("链接已失效，请刷新页面");
      return;
    }
    const ext = item.type === "video" ? "mp4" : "png";
    const name = `works-${item.id.slice(0, 8)}.${ext}`;
    const a = document.createElement("a");
    a.href = item.url;
    a.download = name;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
    toast.success("已触发下载");
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "删除失败");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      toast.success("已删除");
    } catch {
      toast.error("删除请求失败");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white p-8 lg:p-12 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Icon icon="lucide:log-in" className="w-16 h-16 mx-auto text-zinc-500" />
          <p className="text-zinc-400">请先登录后查看我的作品</p>
          <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Link href="/login">去登录</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 lg:p-12 overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-light tracking-tight mb-2">
            我的 <span className="font-semibold italic font-serif">作品</span>
          </h1>
          <p className="text-zinc-500 text-sm tracking-wide">
            在此查看与下载你保存的图片与视频
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              类型
            </Label>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px] rounded-xl border-white/10 bg-zinc-900/80 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-zinc-950/95">
                <SelectItem value="all" className="text-white">全部</SelectItem>
                <SelectItem value="image" className="text-white">图片</SelectItem>
                <SelectItem value="video" className="text-white">视频</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              来源
            </Label>
            <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px] rounded-xl border-white/10 bg-zinc-900/80 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-zinc-950/95">
                <SelectItem value="all" className="text-white">全部</SelectItem>
                {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value} className="text-white">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Icon icon="lucide:loader-2" className="w-10 h-10 animate-spin text-zinc-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 opacity-60">
            <Icon icon="lucide:folder-heart" className="w-16 h-16 text-zinc-500" />
            <p className="text-zinc-400">暂无作品，在图片精修或 Oculus Flow 中生成后点击「保存到我的作品」即可在此查看</p>
            <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <Link href="/agency/retouch">去图片精修</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="aspect-square rounded-xl bg-white/5 border border-white/10 overflow-hidden relative group"
                >
                  {item.type === "image" && item.url ? (
                    <Image
                      src={item.url}
                      fill
                      unoptimized
                      className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      alt=""
                      sizes="(max-width: 640px) 50vw, 20vw"
                    />
                  ) : item.type === "video" && item.url ? (
                    <video
                      src={item.url}
                      className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                      <Icon icon="lucide:image-off" className="w-8 h-8 text-zinc-600" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-linear-to-t from-black/80 to-transparent flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">
                      {SOURCE_LABELS[item.source] || item.source}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-white hover:bg-white/20"
                        onClick={() => handleDownload(item)}
                      >
                        <Icon icon="lucide:download" className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-white hover:bg-red-500/30"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <Icon icon="lucide:chevron-left" className="w-4 h-4" />
                </Button>
                <span className="text-sm text-zinc-500 px-2">
                  {page} / {totalPages}（共 {total} 项）
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <Icon icon="lucide:chevron-right" className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
