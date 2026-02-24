"use client";

import React from "react";
import { useUser } from "@/components/UserProvider";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";

export function HeaderCreditDisplay() {
  const { credits, user } = useUser();

  if (!user) return null;

  return (
    <div className="sticky top-0 z-40 w-full border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 border border-emerald-500/20">
            <Icon icon="heroicons:bolt-20-solid" className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-100">
              积分余额: <span className="text-emerald-400 font-bold">{credits?.credit_balance ?? 0}</span>
            </span>
          </div>
          
          {credits?.is_pro ? (
            <Badge className="bg-linear-to-r from-amber-400 to-amber-600 text-zinc-950 border-none font-bold">
              PRO 会员
            </Badge>
          ) : (
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-white/5 transition-colors gap-2">
                <Icon icon="heroicons:star" className="h-4 w-4" />
                升级会员
              </Button>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-zinc-500 hidden md:block uppercase tracking-widest font-semibold">
            Picset Agency Model
          </div>
          <div className="h-4 w-px bg-white/10" />
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="h-8 w-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer"
          >
            {user?.email?.[0].toUpperCase()}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
