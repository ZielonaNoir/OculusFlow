import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const BUCKET = "user-generated";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB

function getExtFromDataUrl(dataUrl: string): { ext: string; mime: string } {
  const match = dataUrl.match(/^data:(image|video)\/(\w+);base64,/);
  if (match) {
    const mime = `${match[1]}/${match[2]}`;
    const ext = match[2].toLowerCase() === "jpeg" ? "jpg" : match[2].toLowerCase();
    return { ext, mime };
  }
  return { ext: "png", mime: "image/png" };
}

function getExtFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split(".").pop()?.toLowerCase() || "png";
    return ["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm"].includes(ext) ? ext : "png";
  } catch {
    return "png";
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = (await req.json()) as {
      url?: string;
      data_url?: string;
      type: "image" | "video";
      source?: string;
      project_id?: string | null;
      step_key?: string | null;
      prompt?: string | null;
      params_snapshot?: Record<string, unknown>;
      metadata_snapshot?: Record<string, unknown>;
      selected_cell?: Record<string, unknown>;
    };
    const {
      url,
      data_url,
      type,
      source = "retouch",
      project_id = null,
      step_key = null,
      prompt = null,
      params_snapshot = {},
      metadata_snapshot = {},
      selected_cell = {},
    } = body;

    if (!url && !data_url) {
      return NextResponse.json(
        { error: "请提供 url 或 data_url" },
        { status: 400 }
      );
    }
    if (!["image", "video"].includes(type)) {
      return NextResponse.json({ error: "type 须为 image 或 video" }, { status: 400 });
    }

    let buffer: ArrayBuffer;
    let ext: string;
    let contentType: string;

    if (data_url) {
      const { ext: e, mime } = getExtFromDataUrl(data_url);
      ext = e;
      contentType = mime;
      const base64 = data_url.replace(/^data:[\w/]+;base64,/, "");
      buffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;
    } else if (url) {
      ext = getExtFromUrl(url);
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error("Fetch image failed");
      buffer = await res.arrayBuffer();
      contentType = res.headers.get("content-type") || (type === "video" ? "video/mp4" : "image/png");
    } else {
      return NextResponse.json({ error: "请提供 url 或 data_url" }, { status: 400 });
    }

    const maxBytes = type === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (buffer.byteLength > maxBytes) {
      return NextResponse.json(
        { error: `文件大小超过限制（${type === "video" ? "100" : "10"}MB）` },
        { status: 400 }
      );
    }

    const assetId = crypto.randomUUID();
    const storagePath = `${user.id}/${type}/${assetId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: contentType || (type === "image" ? "image/png" : "video/mp4"),
        upsert: false,
      });

    if (uploadError) {
      console.error("[assets/save] upload error:", uploadError);
      return NextResponse.json(
        { error: uploadError.message || "上传失败" },
        { status: 500 }
      );
    }

    const { data: row, error: insertError } = await supabase
      .from("user_generated_assets")
      .insert({
        user_id: user.id,
        type,
        storage_path: storagePath,
        source: ["retouch", "oculus", "style", "setgen"].includes(source) ? source : "retouch",
        project_id,
        step_key,
        prompt,
        params_snapshot,
        metadata_snapshot,
        selected_cell,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[assets/save] insert error:", insertError);
      await supabase.storage.from(BUCKET).remove([storagePath]);
      return NextResponse.json(
        { error: insertError.message || "保存元数据失败" },
        { status: 500 }
      );
    }

    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 3600);

    return NextResponse.json({
      id: row.id,
      storage_path: storagePath,
      url: signed?.signedUrl ?? null,
    });
  } catch (e) {
    console.error("[assets/save]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "保存失败" },
      { status: 500 }
    );
  }
}
