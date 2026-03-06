"use client";

import { useUser } from "./UserProvider";
import { useEffect, useState } from "react";

export default function DashboardHeader() {
  const { profile } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const greeting = mounted ? (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })() : "Hello";

  const displayName = profile?.full_name || "Creator";

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 mb-12 text-center">
      <h1 className="text-4xl md:text-5xl font-light text-white mb-4 tracking-tight">
        {greeting}, <span className="font-semibold">{displayName}</span>
      </h1>
      <p className="text-lg text-zinc-400 font-light">
        Feeling inspired... but don&apos;t have any files yet?
      </p>
    </div>
  );
}
