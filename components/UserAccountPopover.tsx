"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { Icon } from "@iconify/react";
import { useUser } from "@/components/UserProvider";
import { createClient } from "@/utils/supabase/client";

interface UserAccountPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserAccountPopover({ isOpen, onClose }: UserAccountPopoverProps) {
  const { user, profile } = useUser();
  const supabase = createClient();
  const displayName = profile?.full_name || "User";
  const displayEmail = user?.email || profile?.email || "";
  const initials = displayName.charAt(0).toUpperCase();

  // Animation variants
  const popoverVariants: Variants = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring", stiffness: 400, damping: 30 }
    },
    exit: { 
      opacity: 0, 
      y: 10, 
      scale: 0.95,
      transition: { duration: 0.15 }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <motion.div
        variants={popoverVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className="fixed bottom-24 left-6 z-[70] w-72 origin-bottom-left overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0f]/95 p-1.5 shadow-2xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* User Info Header */}
        <div className="flex items-center gap-3 p-3">
          <div className="h-12 w-12 shrink-0 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-lg font-bold text-white">
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate text-sm font-semibold text-white">{displayName}</span>
            <span className="truncate text-xs text-zinc-500">{displayEmail}</span>
          </div>
        </div>

        {/* Manage Account Button */}
        <div className="px-1.5 mb-1.5">
          <button className="flex w-full items-center justify-center rounded-lg bg-zinc-800/80 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700/80">
            管理账号
          </button>
        </div>

        <div className="my-1.5 border-t border-white/5" />

        {/* Menu Items */}
        <div className="space-y-0.5 px-1.5">
          <button className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white">
            <Icon icon="lucide:settings" className="h-4 w-4" />
            <span>设置</span>
          </button>
          <button className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white">
            <Icon icon="lucide:users" className="h-4 w-4" />
            <span className="flex-1 text-left">邀请好友</span>
            <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-400">新</span>
          </button>
        </div>

        <div className="my-1.5 border-t border-white/5" />

        {/* Appearance Section */}
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
          外观
        </div>
        <div className="px-3 pb-3 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">主题色</span>
            <div className="flex gap-2">
              <div className="h-4 w-4 rounded-full bg-purple-500 ring-2 ring-purple-500/40 ring-offset-2 ring-offset-black cursor-pointer" />
              <div className="h-4 w-4 rounded-full bg-blue-500 cursor-pointer" />
              <div className="h-4 w-4 rounded-full bg-orange-500 cursor-pointer" />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-950/50 p-1">
            <button className="flex items-center justify-center rounded-lg bg-zinc-800 px-2 py-1.5 text-white">
              <Icon icon="lucide:moon" className="h-4 w-4" />
            </button>
            <button className="flex items-center justify-center rounded-lg px-2 py-1.5 text-zinc-600 hover:text-zinc-400">
              <Icon icon="lucide:sun" className="h-4 w-4" />
            </button>
            <button className="flex items-center justify-center rounded-lg px-2 py-1.5 text-zinc-600 hover:text-zinc-400">
              <Icon icon="lucide:monitor" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-1.5 space-y-0.5 pb-1.5">
          <button className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white">
            <Icon icon="lucide:languages" className="h-4 w-4" />
            <span className="flex-1 text-left">语言</span>
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              简体中文 <Icon icon="lucide:chevron-right" className="h-3.5 w-3.5" />
            </div>
          </button>
          
          <div className="my-1 border-t border-white/5" />
          
          <button className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white">
            <Icon icon="lucide:alert-circle" className="h-4 w-4" />
            <span>反馈问题</span>
          </button>
          
          <button 
            onClick={async () => { 
              await supabase.auth.signOut();
              onClose(); 
              window.location.reload();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-red-400/80 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <Icon icon="lucide:log-out" className="h-4 w-4" />
            <span>退出登录</span>
          </button>
        </div>
      </motion.div>
    </>
  );
}
