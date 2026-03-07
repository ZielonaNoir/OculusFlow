import { NextResponse } from "next/server";
import { analyzeSourceText, requireAuthedSupabase } from "@/lib/autocut-server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireAuthedSupabase();
    const { id } = await params;

    const { data: project, error: projectError } = await supabase
      .from("autocut_projects")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (projectError || !project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const result = await analyzeSourceText({
      title: project.title,
      sourceText: project.source_text,
      aspectRatio: project.aspect_ratio,
      durationSeconds: project.duration_seconds,
      localeMappingEnabled: project.locale_mapping_enabled,
      voiceStyle: project.voice_style,
    });

    await supabase
      .from("autocut_segments")
      .delete()
      .eq("project_id", id)
      .eq("user_id", user.id);

    const inserts = result.segments.map((segment, index) => ({
      project_id: id,
      user_id: user.id,
      ...segment,
      order_index: index,
    }));

    const { data: segments, error: insertError } = await supabase
      .from("autocut_segments")
      .insert(inserts)
      .select("*");

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await supabase
      .from("autocut_projects")
      .update({
        current_stage: "analyzed",
        voice_style: result.voice_style,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    const { data: job } = await supabase
      .from("autocut_jobs")
      .insert({
        project_id: id,
        user_id: user.id,
        job_type: "analyze",
        status: "succeeded",
        provider: "doubao",
        result_payload: { segment_count: segments?.length ?? 0 },
      })
      .select("*")
      .single();

    return NextResponse.json({ segments: segments ?? [], job });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "智能解析失败" }, { status: 500 });
  }
}
