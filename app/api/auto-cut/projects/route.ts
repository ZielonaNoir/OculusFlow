import { NextResponse } from "next/server";
import {
  autocutProjectInputSchema,
  DEFAULT_AUTOCUT_PROJECT_FORM,
} from "@/lib/autocut-workflow";
import { buildSettingsSnapshot, requireAuthedSupabase } from "@/lib/autocut-server";

export async function GET() {
  try {
    const { supabase, user } = await requireAuthedSupabase();
    const { data, error } = await supabase
      .from("autocut_projects")
      .select("*")
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
    const parsed = autocutProjectInputSchema.safeParse({
      ...DEFAULT_AUTOCUT_PROJECT_FORM,
      ...body,
      title: body?.title || "未命名混剪项目",
      source_text: body?.source_text || body?.sourceText || "请输入一段文案或剧本。",
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const payload = {
      user_id: user.id,
      ...parsed.data,
      settings_snapshot: buildSettingsSnapshot({
        ...parsed.data,
        ...(parsed.data.settings_snapshot || {}),
      }),
    };

    const { data, error } = await supabase
      .from("autocut_projects")
      .insert(payload)
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
