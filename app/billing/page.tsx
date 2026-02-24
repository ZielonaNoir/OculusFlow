"use client";

import React, { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { toast } from "sonner";

function BillingContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (success) {
      toast.success("支付成功！您的账户信用额度已更新。", {
        description: sessionId ? `订单 ID: ${sessionId.substring(0, 15)}...` : undefined,
      });
    } else if (canceled) {
      toast.error("支付已取消", {
        description: "您可以随时返回定价页面重新选择。",
      });
    }
  }, [success, canceled, sessionId]);

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 p-8 backdrop-blur-xl"
      >
        {/* Decorative Background */}
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 text-center">
          <div className="mb-6 flex justify-center">
            <div className={`flex h-20 w-20 items-center justify-center rounded-full border-2 ${
              success ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : 
              canceled ? "border-amber-500/50 bg-amber-500/10 text-amber-400" :
              "border-white/20 bg-white/5 text-zinc-400"
            }`}>
              <Icon 
                icon={success ? "lucide:check-circle" : canceled ? "lucide:alert-circle" : "lucide:credit-card"} 
                className="h-10 w-10" 
              />
            </div>
          </div>

          <h1 className="mb-2 text-2xl font-bold text-white">
            {success ? "支付成功" : canceled ? "支付已取消" : "账单详情"}
          </h1>
          <p className="mb-8 text-sm text-zinc-400">
            {success 
              ? "感谢您的购买！系统正在处理您的订阅或信用积分，通常在几秒钟内完成。" 
              : canceled 
              ? "未能完成支付流程。如果您遇到了技术问题，请随时联系我们。"
              : "查看您的充值记录和订阅状态。"
            }
          </p>

          <div className="space-y-3">
            <Link
              href="/"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-zinc-200 active:scale-95"
            >
              <Icon icon="lucide:layout-dashboard" className="h-4 w-4" />
              返回控制台
            </Link>
            <Link
              href="/pricing"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-white/10 active:scale-95"
            >
              <Icon icon="lucide:credit-card" className="h-4 w-4" />
              再次查看定价
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}
