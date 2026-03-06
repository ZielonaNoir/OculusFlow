import { NextResponse } from "next/server";
import { generateScriptFromPrompt, requireAuthedSupabase } from "@/lib/oculus-video-server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireAuthedSupabase();
    const { id } = await params;

    const { data: project, error: projectError } = await supabase
      .from("video_projects")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const scriptText = await generateScriptFromPrompt({
      title: project.title,
      prompt: project.prompt,
      genre: project.genre,
      tone: project.tone,
      durationSeconds: project.duration_seconds,
      aspectRatio: project.aspect_ratio,
    });

    const { data, error } = await supabase
      .from("video_projects")
      .update({
        script_text: scriptText,
        current_stage: "script_ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("video_generation_tasks").insert({
      project_id: id,
      user_id: user.id,
      task_type: "prompt",
      step_key: "script",
      status: "succeeded",
      prompt: scriptText,
      result_payload: { script_text: scriptText },
    });

    return NextResponse.json({ project: data, script_text: scriptText });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "生成剧本失败" }, { status: 500 });
  }
}
