import { NextResponse } from "next/server";
import { extractEntitiesFromScript, requireAuthedSupabase } from "@/lib/oculus-video-server";
import { entityPayloadSchema } from "@/lib/oculus-video-workflow";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireAuthedSupabase();
    const { id } = await params;
    const body = await req.json();

    if (body?.mode === "extract") {
      const { data: project, error: projectError } = await supabase
        .from("video_projects")
        .select("script_text")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (projectError || !project) {
        return NextResponse.json({ error: "项目不存在" }, { status: 404 });
      }

      const extracted = await extractEntitiesFromScript(project.script_text);
      const records = [
        ...extracted.characters.map((item, index) => ({
          project_id: id,
          user_id: user.id,
          type: "character",
          name: String(item.name || `角色 ${index + 1}`),
          description: String(item.description || ""),
          sort_order: index,
          json_payload: item,
        })),
        ...extracted.assets.map((item, index) => ({
          project_id: id,
          user_id: user.id,
          type: "asset",
          name: String(item.name || `资产 ${index + 1}`),
          description: String(item.description || ""),
          sort_order: index,
          json_payload: item,
        })),
        ...extracted.backgrounds.map((item, index) => ({
          project_id: id,
          user_id: user.id,
          type: "background",
          name: String(item.name || `背景 ${index + 1}`),
          description: String(item.description || ""),
          sort_order: index,
          json_payload: item,
        })),
        ...extracted.dialogues.map((item, index) => ({
          project_id: id,
          user_id: user.id,
          type: "dialogue",
          name: String(item.name || `对话 ${index + 1}`),
          description: String(item.description || item.line || ""),
          sort_order: index,
          json_payload: item,
        })),
        ...extracted.actions.map((item, index) => ({
          project_id: id,
          user_id: user.id,
          type: "action",
          name: String(item.name || `动作 ${index + 1}`),
          description: String(item.description || item.beat || ""),
          sort_order: index,
          json_payload: item,
        })),
        ...extracted.emotions.map((item, index) => ({
          project_id: id,
          user_id: user.id,
          type: "emotion",
          name: String(item.name || `情绪 ${index + 1}`),
          description: String(item.description || item.intensity || ""),
          sort_order: index,
          json_payload: item,
        })),
        ...extracted.scenes.map((item, index) => ({
          project_id: id,
          user_id: user.id,
          type: "scene",
          name: String(item.name || `场景 ${index + 1}`),
          description: String(item.description || item.goal || ""),
          sort_order: index,
          json_payload: item,
        })),
      ];

      await supabase
        .from("video_project_entities")
        .delete()
        .eq("project_id", id)
        .eq("user_id", user.id);

      if (records.length > 0) {
        const { error: insertError } = await supabase
          .from("video_project_entities")
          .insert(records);
        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
      }

      await supabase.from("video_projects").update({
        current_stage: "metadata_ready",
        updated_at: new Date().toISOString(),
      }).eq("id", id).eq("user_id", user.id);

      const { data, error } = await supabase
        .from("video_project_entities")
        .select("*")
        .eq("project_id", id)
        .eq("user_id", user.id)
        .order("type", { ascending: true })
        .order("sort_order", { ascending: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ items: data ?? [] });
    }

    const parsed = entityPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const payload = parsed.data;
    const { data, error } = await supabase
      .from("video_project_entities")
      .insert({
        project_id: id,
        user_id: user.id,
        ...payload,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entity: data }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "保存实体失败" }, { status: 500 });
  }
}
