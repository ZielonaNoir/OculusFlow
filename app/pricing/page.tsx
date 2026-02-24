"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { cn } from "@/lib/utils";
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import MagneticButton from '@/app/components/MagneticButton';

const PRICING_PLANS = [
  {
    id: 'entry-30-days',
    name: '入门版',
    description: '适合个人创作者与小型电商试水。',
    price: '5',
    period: '30 天',
    priceId: 'price_1T4HvjJLcYyEZtDuTEzHeXtZ',
    mode: 'payment',
    features: [
      '250 积分',
      '直接到账 250 积分',
      '约 83 张标准模型图片',
      '智能提取 USP 逻辑',
      '基础 4K 导出',
      '有效期 30 天',
    ],
    highlight: false,
  },
  {
    id: 'pro-30-days',
    name: '专业版',
    description: '最受欢迎，赋能专业电商团队实现视觉自由。',
    price: '20',
    period: '30 天',
    priceId: 'price_1T4HvkJLcYyEZtDuMIo6Fap9',
    mode: 'payment',
    features: [
      '1200 积分',
      '风格复刻引擎 (Style Replication)',
      '动态布局排版引擎',
      '为 Amazon/TikTok 量身定制',
      '直接到账 1200 积分',
      '旗舰级 AI 模型加速',
      '有效期 30 天',
    ],
    highlight: true,
  },
  {
    id: 'enterprise-30-days',
    name: '企业版',
    description: '为规模化生产与品牌视觉平权量身打造。',
    price: '100',
    period: '30 天',
    priceId: 'price_1T4HvlJLcYyEZtDui2TOMSvc',
    mode: 'payment',
    features: [
      '7000 积分',
      '批量生产套件 (50+ 张并发)',
      '专属 AI 视觉策略顾问',
      'API 访问权限 (Beta)',
      '首优 GPU 渲染队列',
      '双倍历史记录云存储',
      '有效期 30 天',
    ],
    highlight: false,
  }
];

export default function PricingPage() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const handleCheckout = async (priceId: string, mode: string, planId: string) => {
    setLoadingId(priceId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, mode, planId }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Checkout failed';
      console.error(err);
      toast.error(msg);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 sm:p-24 overflow-hidden relative">
      {/* Back Button with Magnetic effect */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-8 left-8 z-20"
      >
        <MagneticButton
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
        >
          <Icon icon="lucide:chevron-left" className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Back</span>
        </MagneticButton>
      </motion.div>

      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] -z-10" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl mb-16"
      >
        <span className="text-blue-500 font-bold tracking-[0.2em] text-[10px] uppercase mb-4 block">Pricing & Tiers</span>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6 bg-linear-to-b from-white to-white/40 bg-clip-text text-transparent italic leading-[1.1]">
          Powering the Next Generation of Creative Intelligence
        </h1>
        <p className="text-zinc-400 text-lg">
          Flexible plans designed to scale with your imagination. Choose between sustainable growth or on-demand power.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-7xl">
        {PRICING_PLANS.map((plan, idx) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, x: idx === 0 ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + idx * 0.1 }}
            className={cn(
              "relative p-8 rounded-[2.5rem] border backdrop-blur-3xl transition-all duration-700 group",
              plan.highlight 
                ? "bg-white/3 border-white/20 shadow-[0_0_80px_-20px_rgba(59,130,246,0.3)]" 
                : "bg-white/1 border-white/10"
            )}
          >
            {plan.highlight && (
              <div className="absolute -top-4 left-8 px-4 py-1.5 bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/50">
                Most Powerful
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{plan.description}</p>
            </div>

            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-5xl font-bold tracking-tighter">${plan.price}</span>
              <span className="text-zinc-600 text-sm uppercase tracking-widest font-medium">/{plan.period}</span>
            </div>

            <ul className="space-y-4 mb-10">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                  <div className="p-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                    <Icon icon="lucide:check" className="w-3 h-3 text-blue-400" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(plan.priceId, plan.mode, plan.id)}
              disabled={loadingId !== null}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-sm transition-all duration-500 flex items-center justify-center gap-2",
                plan.highlight
                  ? "bg-white text-zinc-950 hover:bg-zinc-200"
                  : "bg-zinc-800 text-white hover:bg-zinc-700 border border-white/5"
              )}
            >
              {loadingId === plan.priceId ? (
                <Icon icon="lucide:loader-2" className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Get Started Now
                  <Icon icon="lucide:arrow-right" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      <p className="mt-16 text-[10px] text-zinc-600 uppercase tracking-[0.3em] font-black">
        Secure checkout powered by Stripe Enterprise
      </p>
    </div>
  );
}
