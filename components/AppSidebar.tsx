"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/components/UserProvider";

const sidebarItems = [
  { title: "Overview", href: "/", icon: "lucide:layout-dashboard" },
  { title: "风格复刻 (Style)", href: "/agency/style-replication", icon: "lucide:copy" },
  { title: "智能组图 (Set Gen)", href: "/agency/set-generation", icon: "lucide:layers" },
  { title: "图片精修 (Retouch)", href: "/agency/retouch", icon: "lucide:sparkles" },
  { title: "服装智能体", href: "/apparel-agent", icon: "lucide:bot" },
  { title: "保健品智能体", href: "/supplement-agent", icon: "lucide:flask-conical" },
  { title: "主播排班", href: "/host-scheduling", icon: "lucide:calendar-clock" },
  { title: "AI 盯盘", href: "/campaign-monitor", icon: "lucide:radar" },
  { title: "Oculus Flow", href: "/oculus-flow", icon: "lucide:zap" },
  { title: "Pricing", href: "/pricing", icon: "lucide:credit-card" },
  { title: "Settings", href: "/settings", icon: "lucide:settings-2" },
];


const SIDEBAR_WIDTH_EXPANDED = 256; // w-64
const SIDEBAR_WIDTH_COLLAPSED = 64;  // w-16

export function AppSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const { user, profile, credits } = useUser();

  const displayName = profile?.full_name || "User";
  const displayEmail = user?.email || profile?.email || "";
  const initials = displayName.charAt(0).toUpperCase();
  const isPro = credits?.is_pro ?? false;
  const creditsCount = credits?.credit_balance ?? 0;

  return (
    <motion.aside
      initial={false}
      animate={{
        width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 35,
      }}
      className="fixed left-0 top-0 z-40 h-screen shrink-0 overflow-hidden border-r border-white/10 bg-black/40 backdrop-blur-xl"
    >
      <div className="flex h-full flex-col py-6 transition-[padding] duration-200">
        {/* Header */}
        <div
          className={cn(
            "flex items-center px-3 pt-2",
            collapsed ? "mb-6 justify-center" : "mb-8 gap-4"
          )}
        >
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-[#0a0a0c] shadow-[0_0_15px_rgba(100,150,255,0.1)] transition-all duration-300 overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-br from-indigo-500/20 to-purple-500/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
               {/* Outer Diamond/Eye Shape */}
               <path d="M12 2L2 12L12 22L22 12L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
               {/* Inner Flow Lines */}
               <path d="M7 12C7 12 9 8 12 8C15 8 17 12 17 12C17 12 15 16 12 16C9 16 7 12 7 12Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
               {/* Center Node/Pupil */}
               <circle cx="12" cy="12" r="2" fill="currentColor" />
               <path d="M12 2V5M12 19V22M2 12H5M19 12H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40" />
            </svg>
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 35 }}
                className="flex flex-col overflow-hidden"
              >
                <span className="whitespace-nowrap text-lg font-bold leading-none tracking-tight text-white">
                  Oculus Flow
                </span>
                <span className="mt-1 whitespace-nowrap text-[10px] font-medium uppercase tracking-widest text-indigo-400">
                  全视之流 • 智能引擎
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 px-3">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.title : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors hover:bg-white/5",
                  collapsed ? "justify-center px-0" : "px-3",
                  isActive ? "text-white" : "text-zinc-400 hover:text-white"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg border border-white/5 bg-white/10"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon icon={item.icon} className="relative z-10 h-5 w-5 shrink-0" />
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 35 }}
                      className="relative z-10 truncate"
                    >
                      {item.title}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Toggle + Footer */}
        <div className="mt-auto flex flex-col gap-2 border-t border-white/10 pt-4 px-3 pb-4">
          <motion.button
            type="button"
            onClick={onToggle}
            title={collapsed ? "展开侧边栏" : "收起侧边栏"}
            className={cn(
              "flex w-full items-center rounded-lg py-2.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
              collapsed ? "justify-center px-0" : "gap-3 px-3"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Icon
              icon={collapsed ? "lucide:panel-left-open" : "lucide:panel-left-close"}
              className="h-5 w-5 shrink-0"
            />
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 35 }}
                  className="truncate text-sm"
                >
                  {collapsed ? "展开" : "收起"}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <div
            className={cn(
              "flex w-full items-center rounded-lg border border-white/5 bg-white/5 py-2 transition-colors hover:bg-white/10 cursor-pointer overflow-hidden",
              collapsed ? "justify-center px-0" : "gap-3 px-3"
            )}
          >
            <div className="h-8 w-8 shrink-0 rounded-full bg-linear-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
              {initials}
            </div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 35 }}
                  className="flex min-w-0 flex-col overflow-hidden ml-1"
                >
                  <span className="truncate text-xs font-medium text-white">
                    {displayName}
                  </span>
                  <span className="truncate text-[10px] text-zinc-400">
                    {displayEmail}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-sm font-medium tracking-wide",
                      isPro ? "bg-indigo-500/20 text-indigo-300" : "bg-white/10 text-zinc-400"
                    )}>
                      {isPro ? "PRO" : "FREE"}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium flex items-center">
                      <Icon icon="lucide:coins" className="w-3 h-3 mr-1" />
                      {creditsCount}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && (
              <Icon icon="lucide:chevron-right" className="ml-auto h-4 w-4 shrink-0 text-zinc-500" />
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
