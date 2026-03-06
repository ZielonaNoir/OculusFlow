import { NextResponse } from "next/server";
import { requireAuthedSupabase } from "@/lib/oculus-video-server";
import { storyboardSelectionSchema } from "@/lib/oculus-video-workflow";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireAuthedSupabase();
    const { id } = await params;
    const body = await req.json();
    const parsed = storyboardSelectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await supabase
      .from("video_storyboards")
      .select("id")
      .eq("project_id", id)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload = {
      project_id: id,
      user_id: user.id,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    };

    const query = existing.data?.id
      ? supabase.from("video_storyboards").update(payload).eq("id", existing.data.id)
      : supabase.from("video_storyboards").insert(payload);

    const { data, error } = await query.select("*").single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("video_projects").update({
      current_stage: parsed.data.hd_image_url ? "storyboard_hd_ready" : "storyboard_ready",
      updated_at: new Date().toISOString(),
    }).eq("id", id).eq("user_id", user.id);

    return NextResponse.json({ storyboard: data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "保存分镜失败" }, { status: 500 });
  }
}
