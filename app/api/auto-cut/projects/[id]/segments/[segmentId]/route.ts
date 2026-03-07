import { NextResponse } from "next/server";
import { autocutSegmentInputSchema, reorderSegments } from "@/lib/autocut-workflow";
import { requireAuthedSupabase } from "@/lib/autocut-server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; segmentId: string }> }
) {
  try {
    const { supabase, user } = await requireAuthedSupabase();
    const { id, segmentId } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = autocutSegmentInputSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("autocut_segments")
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", segmentId)
      .eq("project_id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ segment: data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "更新片段失败" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; segmentId: string }> }
) {
  try {
    const { supabase, user } = await requireAuthedSupabase();
    const { id, segmentId } = await params;

    const { data: before, error: beforeError } = await supabase
      .from("autocut_segments")
      .select("*")
      .eq("project_id", id)
      .eq("user_id", user.id)
      .order("order_index", { ascending: true });
    if (beforeError) {
      return NextResponse.json({ error: beforeError.message }, { status: 500 });
    }

    const { error } = await supabase
      .from("autocut_segments")
      .delete()
      .eq("id", segmentId)
      .eq("project_id", id)
      .eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const reordered = reorderSegments((before ?? []).filter((item) => item.id !== segmentId));
    await Promise.all(
      reordered.map((segment) =>
        supabase
          .from("autocut_segments")
          .update({ order_index: segment.order_index, updated_at: new Date().toISOString() })
          .eq("id", segment.id)
          .eq("project_id", id)
          .eq("user_id", user.id)
      )
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "删除片段失败" }, { status: 500 });
  }
}
