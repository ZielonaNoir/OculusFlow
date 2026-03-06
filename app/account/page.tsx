"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useUser } from "@/components/UserProvider";
import { createClient } from "@/utils/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AccountPage() {
  const router = useRouter();
  const { user, profile } = useUser();
  const supabase = createClient();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    setFullName(profile?.full_name ?? "");
  }, [user, profile, router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("资料已保存");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleSendResetPassword = async () => {
    const email = user?.email;
    if (!email) {
      toast.error("未获取到邮箱");
      return;
    }
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/login?type=recovery`,
      });
      if (error) throw error;
      toast.success("重置密码邮件已发送，请查收");
      setResetDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "发送失败");
    } finally {
      setResetting(false);
    }
  };

  if (!user) {
    return null;
  }

  const displayEmail = user.email ?? profile?.email ?? "";

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">账号管理</h1>
          <p className="mt-1.5 text-sm text-zinc-500">查看与编辑您的账号资料、修改密码</p>
        </div>

        <Card className="border-white/10 bg-black/20">
          <CardHeader>
            <CardTitle className="text-base text-white">账号信息</CardTitle>
            <CardDescription>当前登录账号的基本信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">邮箱</Label>
              <Input
                value={displayEmail}
                readOnly
                className="border-white/10 bg-white/5 text-zinc-400"
              />
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-zinc-300">显示名称</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="输入显示名称"
                  className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                />
              </div>
              <Button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-700">
                {saving ? (
                  <>
                    <Icon icon="lucide:loader-2" className="mr-2 h-4 w-4 animate-spin" />
                    保存中…
                  </>
                ) : (
                  "保存资料"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-black/20">
          <CardHeader>
            <CardTitle className="text-base text-white">修改密码</CardTitle>
            <CardDescription>我们将向您的邮箱发送重置链接，在邮件中设置新密码</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-white/10 text-zinc-300 hover:bg-white/5">
                  <Icon icon="lucide:mail" className="mr-2 h-4 w-4" />
                  发送重置密码邮件
                </Button>
              </DialogTrigger>
              <DialogContent className="border-white/10 bg-zinc-900 text-white">
                <DialogHeader>
                  <DialogTitle>确认发送</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    将向 {displayEmail} 发送重置密码链接，请查收邮件并点击链接设置新密码。
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    onClick={handleSendResetPassword}
                    disabled={resetting}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    {resetting ? (
                      <>
                        <Icon icon="lucide:loader-2" className="mr-2 h-4 w-4 animate-spin" />
                        发送中…
                      </>
                    ) : (
                      "发送邮件"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
