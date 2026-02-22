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
  );
}
