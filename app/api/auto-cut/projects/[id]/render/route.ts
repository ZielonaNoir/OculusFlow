import { NextResponse } from "next/server";
import { triggerAutoCutRender } from "@/lib/autocut-engine";
import { getAutoCutBundle, requireAuthedSupabase } from "@/lib/autocut-server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireAuthedSupabase();
    const { id } = await params;
    const bundle = await getAutoCutBundle(id, user.id);

    const { data: localJob, error: jobError } = await supabase
      .from("autocut_jobs")
      .insert({
        project_id: id,
        user_id: user.id,
        job_type: "render",
        status: "queued",
        provider: "autocut-engine",
        result_payload: { stages: ["analyze", "voice", "clips", "subtitles", "render"] },
      })
      .select("*")
      .single();

    if (jobError || !localJob) {
      return NextResponse.json({ error: jobError?.message || "创建任务失败" }, { status: 500 });
    }

    try {
      const engine = await triggerAutoCutRender({
        project: bundle.project,
        segments: bundle.segments,
        settings: {
          ...(bundle.project.settings_snapshot || {}),
          project_title: bundle.project.title,
          source_text: bundle.project.source_text,
          aspect_ratio: bundle.project.aspect_ratio,
          duration_seconds: bundle.project.duration_seconds,
          fish_voice_id: bundle.project.fish_voice_id,
          voice_character: bundle.project.voice_character,
          voice_style: bundle.project.voice_style,
          subtitle_style: bundle.project.subtitle_style,
          locale_mapping_enabled: bundle.project.locale_mapping_enabled,
        },
      });

      if (!engine.ok) {
        await supabase
          .from("autocut_jobs")
          .update({
            status: "failed",
            error_message: engine.data.error || "引擎任务创建失败",
            result_payload: engine.data.payload || {},
            updated_at: new Date().toISOString(),
          })
          .eq("id", localJob.id)
          .eq("user_id", user.id);
        return NextResponse.json(
          { error: engine.data.error || "引擎任务创建失败" },
          { status: engine.status || 502 }
        );
      }

      await supabase
        .from("autocut_jobs")
        .update({
          status: engine.data.status || "queued",
          provider_job_id: engine.data.job_id,
          result_payload: {
            ...(engine.data.payload || {}),
            stages: engine.data.stages || [],
            warnings: engine.data.warnings || [],
            segment_results: engine.data.items || [],
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", localJob.id)
        .eq("user_id", user.id);

      await supabase
        .from("autocut_projects")
        .update({
          current_stage: "render_queued",
          engine_job_id: engine.data.job_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id);

      return NextResponse.json({
        job: {
          ...localJob,
          provider_job_id: engine.data.job_id,
          status: engine.data.status || "queued",
        },
      });
    } catch (engineError) {
      await supabase
        .from("autocut_jobs")
        .update({
          status: "failed",
          error_message: engineError instanceof Error ? engineError.message : "引擎不可用",
          updated_at: new Date().toISOString(),
        })
        .eq("id", localJob.id)
        .eq("user_id", user.id);
      return NextResponse.json(
        { error: engineError instanceof Error ? engineError.message : "引擎不可用" },
        { status: 502 }
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "提交渲染失败" }, { status: 500 });
  }
}
