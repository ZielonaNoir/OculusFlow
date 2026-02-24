import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { SidebarLayout } from "@/components/SidebarLayout";
import { UserProvider } from "@/components/UserProvider";
import { createClient } from "@/utils/supabase/server";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  let credits = null;

  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = profileData;

    const { data: creditsData } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();
    credits = creditsData;
  }

  return (
    <html lang="zh-CN" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-foreground font-sans`}
      >
        <UserProvider user={user} profile={profile} credits={credits}>
          <SidebarLayout>{children}</SidebarLayout>
        </UserProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
