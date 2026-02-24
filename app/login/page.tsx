"use client";

import { login, signup } from './actions'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { SparklesCore } from '@/components/ui/sparkles'
import { BackgroundNoise } from '@/components/ui/background-noise'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { cn } from '@/lib/utils'

function LoginForm() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const type = searchParams.get('type') || 'error'

  return (
    <form className="relative z-10 space-y-5">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', scale: 1, marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, scale: 0.95, marginBottom: 0 }}
            className={cn(
              "p-4 rounded-2xl text-center backdrop-blur-xl border transition-all duration-500",
              type === 'success' 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <Icon 
                icon={type === 'success' ? "lucide:check-circle" : "lucide:alert-circle"} 
                className="w-4 h-4" 
              />
              <p className="text-xs font-medium tracking-wide">
                {message}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-white/60 tracking-wider uppercase ml-1" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-white/10 transition-all duration-300 font-light"
          placeholder="you@example.com"
        />
      </div>
      
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-white/60 tracking-wider uppercase ml-1" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-white/10 transition-all duration-300 font-light"
          placeholder="••••••••"
        />
      </div>

      <div className="pt-2 flex flex-col gap-3">
        <button
          formAction={login}
          className="w-full bg-white text-black rounded-2xl py-3.5 text-sm font-medium tracking-wide hover:bg-white/90 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
        >
          Sign In
        </button>
        <button
          formAction={signup}
          className="w-full bg-transparent text-white border border-white/20 rounded-2xl py-3.5 text-sm font-medium tracking-wide hover:bg-white/10 active:scale-[0.98] transition-all duration-300"
        >
          Create Account
        </button>
      </div>
    </form>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-white/20 relative overflow-hidden flex flex-col">
      {/* Background Effects */}
      <BackgroundNoise opacity={0.04} />
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={50}
          className="w-full h-full"
          particleColor="#FFFFFF"
          speed={0.5}
        />
      </div>

      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-white/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-white/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] md:w-[40vw] md:h-[40vw] bg-white/3 rounded-full blur-[120px]" />
      </div>

      <div className="absolute top-6 left-6 z-20">
        <Link 
          href="/"
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors duration-300 text-sm tracking-wide font-light"
        >
          <Icon icon="lucide:arrow-left" className="w-4 h-4" />
          Back
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 z-10 relative mt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm rounded-3xl p-8 bg-white/3 backdrop-blur-2xl border border-white/10 shadow-2xl relative overflow-hidden group"
        >
          {/* Subtle gradient hover effect inside the card */}
          <div className="absolute inset-0 bg-linear-to-tr from-white/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          <div className="text-center mb-8 relative z-10">
            <h1 className="text-3xl tracking-tight text-white mb-2 font-light">Access <span className="font-semibold italic font-serif">OculusFlow</span></h1>
            <p className="text-sm text-white/50 tracking-wide font-light">Sign in to sync your creativity</p>
          </div>

          <Suspense fallback={<div className="h-64 flex items-center justify-center"><Icon icon="lucide:loader-2" className="w-6 h-6 animate-spin text-white/50" /></div>}>
            <LoginForm />
          </Suspense>
        </motion.div>
      </div>
    </main>
  )
}
