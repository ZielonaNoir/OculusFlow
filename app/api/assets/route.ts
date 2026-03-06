import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 48;

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // image | video
    const source = searchParams.get("source"); // retouch | oculus | ...
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10)));
    const offset = (page - 1) * limit;

    let query = supabase
      .from("user_generated_assets")
      .select("id, type, storage_path, source, created_at", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (type && ["image", "video"].includes(type)) {
      query = query.eq("type", type);
    }
    if (source && ["retouch", "oculus", "style", "setgen"].includes(source)) {
      query = query.eq("source", source);
    }

    const { data: rows, error, count } = await query;

    if (error) {
      console.error("[assets] list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = rows || [];
    const signedUrls = await Promise.all(
      items.map(async (row) => {
        const { data } = await supabase.storage
          .from("user-generated")
          .createSignedUrl(row.storage_path, 3600);
        return { ...row, url: data?.signedUrl ?? null };
      })
    );

    return NextResponse.json({
      items: signedUrls,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (e) {
    console.error("[assets]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "获取列表失败" },
      { status: 500 }
    );
  }
}
