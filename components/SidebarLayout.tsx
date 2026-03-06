"use client";

import React, { useState, useCallback, useEffect } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "oculus_sidebar_collapsed";



export function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        // eslint-disable-next-line
        setCollapsed(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const onToggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <div className="flex min-h-screen">
      <AppSidebar collapsed={collapsed} onToggle={onToggle} />
      <div className="flex flex-col flex-1 min-w-0">

        <main
          className={cn(
            "flex-1 transition-[padding] duration-300 ease-out min-w-0",
            collapsed ? "pl-16" : "pl-64"
          )}
        >
          <div className="h-full w-full animate-in fade-in zoom-in duration-500">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Beta Feedback Button */}
      <a
        href="mailto:feedback@oculusflow.ai"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-all shadow-2xl hover:shadow-white/5"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
        Beta
      </a>
    </div>
  );
}
