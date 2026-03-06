import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const BUCKET = "user-generated";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { data: row, error: fetchError } = await supabase
      .from("user_generated_assets")
      .select("id, storage_path, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !row) {
      return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    }
    if (row.user_id !== user.id) {
      return NextResponse.json({ error: "无权限删除" }, { status: 403 });
    }

    await supabase.storage.from(BUCKET).remove([row.storage_path]);
    const { error: deleteError } = await supabase
      .from("user_generated_assets")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[assets] delete row error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[assets] delete", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "删除失败" },
      { status: 500 }
    );
  }
}
