import { NextResponse } from "next/server";
import { requireAuthedSupabase } from "@/lib/oculus-video-server";
import { entityPayloadSchema } from "@/lib/oculus-video-workflow";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; entityId: string }> }
) {
  try {
    const { supabase, user } = await requireAuthedSupabase();
    const { id, entityId } = await params;
    const body = await req.json();
    const parsed = entityPayloadSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("video_project_entities")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", entityId)
      .eq("project_id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entity: data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "更新实体失败" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; entityId: string }> }
) {
  try {
    const { supabase, user } = await requireAuthedSupabase();
    const { id, entityId } = await params;
    const { error } = await supabase
      .from("video_project_entities")
      .delete()
      .eq("id", entityId)
      .eq("project_id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "删除实体失败" }, { status: 500 });
  }
}
