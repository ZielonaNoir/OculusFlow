"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useUser } from "@/components/UserProvider";
import { createClient } from "@/utils/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function InviteFriendButton({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const { user } = useUser();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const inviteUrl =
    typeof window !== "undefined" && user
      ? `${window.location.origin}/login?ref=${encodeURIComponent(user.id)}`
      : "";

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("邀请链接已复制");
    } catch {
      toast.error("复制失败");
    }
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        setDialogOpen(open);
        if (open) onOpenChange?.(false);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Icon icon="lucide:users" className="h-4 w-4" />
          <span className="flex-1 text-left">邀请好友</span>
          <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-400">
            新
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-zinc-900 text-white">
        <DialogHeader>
          <DialogTitle>邀请好友</DialogTitle>
          <DialogDescription className="text-zinc-400">
            复制下方链接发送给好友，好友通过链接注册或登录后即可与您一起使用。
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={inviteUrl}
            aria-label="邀请链接"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300"
          />
          <Button onClick={handleCopy} className="shrink-0 bg-violet-600 hover:bg-violet-700">
            <Icon icon="lucide:copy" className="mr-2 h-4 w-4" />
            复制
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface UserAccountPopoverProps {
  /** Avatar card (trigger) content */
  children: React.ReactNode;
  /** Optional: class for the trigger wrapper */
  triggerClassName?: string;
}

export function UserAccountPopover({ children, triggerClassName }: UserAccountPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const { user, profile } = useUser();
  const supabase = createClient();
  const displayName = profile?.full_name || "User";
  const displayEmail = user?.email || profile?.email || "";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("outline-none", triggerClassName)}>{children}</div>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={10}
        className="w-72 rounded-2xl border border-white/10 bg-[#0d0d0f]/95 p-1.5 shadow-2xl backdrop-blur-2xl text-white"
      >
        <div className="flex items-center gap-3 p-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-500 text-lg font-bold text-white">
            {initials}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-white">{displayName}</span>
            <span className="truncate text-xs text-zinc-500">{displayEmail}</span>
          </div>
        </div>

        <div className="mb-1.5 px-1.5">
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center rounded-lg bg-zinc-800/80 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700/80"
          >
            管理账号
          </Link>
        </div>

        <div className="my-1.5 border-t border-white/5" />

        <div className="space-y-0.5 px-1.5">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Icon icon="lucide:settings" className="h-4 w-4" />
            <span>设置</span>
          </Link>
          <InviteFriendButton onOpenChange={setOpen} />
        </div>

        <div className="my-1.5 border-t border-white/5" />

        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
          外观
        </div>
        <div className="space-y-4 px-3 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">主题色</span>
            <div className="flex gap-2">
              <div className="h-4 w-4 cursor-pointer rounded-full bg-purple-500 ring-2 ring-purple-500/40 ring-offset-2 ring-offset-black" title="紫色主题" />
              <div className="h-4 w-4 cursor-pointer rounded-full bg-blue-500" title="蓝色主题" />
              <div className="h-4 w-4 cursor-pointer rounded-full bg-orange-500" title="橙色主题" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-950/50 p-1">
            <button type="button" title="深色模式" className="flex items-center justify-center rounded-lg bg-zinc-800 px-2 py-1.5 text-white">
              <Icon icon="lucide:moon" className="h-4 w-4" />
            </button>
            <button type="button" title="浅色模式" className="flex items-center justify-center rounded-lg px-2 py-1.5 text-zinc-600 hover:text-zinc-400">
              <Icon icon="lucide:sun" className="h-4 w-4" />
            </button>
            <button type="button" title="跟随系统" className="flex items-center justify-center rounded-lg px-2 py-1.5 text-zinc-600 hover:text-zinc-400">
              <Icon icon="lucide:monitor" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-0.5 px-1.5 pb-1.5">
          <button className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white">
            <Icon icon="lucide:languages" className="h-4 w-4" />
            <span className="flex-1 text-left">语言</span>
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              简体中文 <Icon icon="lucide:chevron-right" className="h-3.5 w-3.5" />
            </div>
          </button>

          <div className="my-1 border-t border-white/5" />

          <a
            href="mailto:feedback@oculusflow.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Icon icon="lucide:alert-circle" className="h-4 w-4" />
            <span>反馈问题</span>
          </a>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              setOpen(false);
              window.location.reload();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-red-400/80 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <Icon icon="lucide:log-out" className="h-4 w-4" />
            <span>退出登录</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
