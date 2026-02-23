import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { SidebarLayout } from "@/components/SidebarLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OculusFlow — AI 电商智能运营平台",
  description: "由 AI 驱动的电商全链路智能体矩阵，涵盖服装详情页包装、主播排班优化与投流盯盘监控。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-foreground font-sans`}
      >
        <SidebarLayout>{children}</SidebarLayout>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
