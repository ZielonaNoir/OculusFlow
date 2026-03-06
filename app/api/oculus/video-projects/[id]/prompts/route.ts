import { NextResponse } from "next/server";
import { getVideoProjectBundle, regenerateWorkflowPrompt, requireAuthedSupabase } from "@/lib/oculus-video-server";
import { regeneratePromptSchema } from "@/lib/oculus-video-workflow";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await requireAuthedSupabase();
    const { id } = await params;
    const body = await req.json();
    const parsed = regeneratePromptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const bundle = await getVideoProjectBundle(id, user.id);
    const entitySet = parsed.data.entity_ids.length
      ? bundle.entities.filter((item) => parsed.data.entity_ids.includes(item.id))
      : bundle.entities;
    const storyboard = bundle.storyboards[0] ?? null;

    const prompt = await regenerateWorkflowPrompt({
      project: bundle.project,
      entities: entitySet,
      step: parsed.data.step,
      promptOverride: parsed.data.prompt_override,
      shotCount: parsed.data.shot_count,
      selectedRow: parsed.data.selected_row,
      selectedCol: parsed.data.selected_col,
      selectedIndex: parsed.data.selected_index,
      imageOptions: parsed.data.image_options,
      storyboard,
    });

    const { data: task } = await supabase
      .from("video_generation_tasks")
      .insert({
        project_id: id,
        user_id: user.id,
        task_type: "prompt",
        step_key: parsed.data.step,
        status: "succeeded",
        prompt,
        params_snapshot: parsed.data,
        result_payload: { entity_ids: parsed.data.entity_ids },
      })
      .select("*")
      .single();

    return NextResponse.json({ prompt, task });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "生成提示词失败" }, { status: 500 });
  }
}
