import { NextResponse } from "next/server";
import {
  autocutSegmentInputSchema,
  nextSegmentOrder,
} from "@/lib/autocut-workflow";
import { requireAuthedSupabase } from "@/lib/autocut-server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireAuthedSupabase();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const { data: segments, error: listError } = await supabase
      .from("autocut_segments")
      .select("order_index")
      .eq("project_id", id)
      .eq("user_id", user.id);
    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const parsed = autocutSegmentInputSchema.safeParse({
      order_index: nextSegmentOrder(segments ?? []),
      language: "zh-CN",
      enabled: true,
      metadata: {},
      ...body,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("autocut_segments")
      .insert({
        project_id: id,
        user_id: user.id,
        ...parsed.data,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase
      .from("autocut_projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({ segment: data }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "新增片段失败" }, { status: 500 });
  }
}
