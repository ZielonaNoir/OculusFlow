import { NextResponse } from "next/server";
import { DEFAULT_PROJECT_FORM, videoProjectInputSchema } from "@/lib/oculus-video-workflow";
import { requireAuthedSupabase } from "@/lib/oculus-video-server";

export async function GET() {
  try {
    const { supabase, user } = await requireAuthedSupabase();
    const { data, error } = await supabase
      .from("video_projects")
      .select("id, title, genre, tone, duration_seconds, aspect_ratio, shot_count, image_model, video_model, current_stage, updated_at, created_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "获取项目失败" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireAuthedSupabase();
    const body = await req.json().catch(() => ({}));
    const parsed = videoProjectInputSchema.safeParse({
      ...DEFAULT_PROJECT_FORM,
      ...body,
      title: body?.title || "未命名视频项目",
      prompt: body?.prompt || "请围绕当前商品或创意需求生成一支短视频。",
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("video_projects")
      .insert({
        user_id: user.id,
        ...parsed.data,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project: data }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "创建项目失败" }, { status: 500 });
  }
}
