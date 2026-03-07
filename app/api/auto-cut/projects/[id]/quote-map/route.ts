import { NextResponse } from "next/server";
import { mapClassicQuotes, requireAuthedSupabase } from "@/lib/autocut-server";
import { quoteMapInputSchema } from "@/lib/autocut-workflow";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireAuthedSupabase();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = quoteMapInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { data: segments, error: segmentError } = await supabase
      .from("autocut_segments")
      .select("*")
      .eq("project_id", id)
      .eq("user_id", user.id)
      .order("order_index", { ascending: true });
    if (segmentError) {
      return NextResponse.json({ error: segmentError.message }, { status: 500 });
    }

    const targetSegments = parsed.data.segment_id
      ? (segments ?? []).filter((segment) => segment.id === parsed.data.segment_id)
      : (segments ?? []).filter((segment) => segment.type === "movie_quote");

    const mapped = await mapClassicQuotes({
      sourceText: parsed.data.text_override || "",
      segments: targetSegments,
    });

    await Promise.all(
      mapped.map((item) => {
        const current = (segments ?? []).find((segment) => segment.id === item.id);
        const retrievalQueries = Array.isArray(current?.retrieval_queries)
          ? current.retrieval_queries
          : [];
        const nextQueries = [
          item.source_query,
          item.canonical_quote_en,
          ...retrievalQueries,
        ].filter((value): value is string => Boolean(value));

        return supabase
          .from("autocut_segments")
          .update({
            source_title: item.source_title,
            source_query: item.source_query,
            retrieval_intent: current?.retrieval_intent || "quote_scene",
            retrieval_subject: current?.retrieval_subject || item.source_title || item.canonical_quote_en,
            retrieval_mood: current?.retrieval_mood || "determined",
            retrieval_queries: [...new Set(nextQueries)].slice(0, 4),
            retrieval_negative_terms: Array.isArray(current?.retrieval_negative_terms)
              ? current.retrieval_negative_terms
              : ["animation", "logo", "vertical"],
            retrieval_visual_constraints:
              (current?.retrieval_visual_constraints as Record<string, unknown> | null) || {},
            voice_emotion: current?.voice_emotion || "determined",
            voice_pace: current?.voice_pace || "medium",
            voice_intensity: current?.voice_intensity || "medium",
            metadata: {
              ...((current?.metadata as Record<string, unknown> | null) || {}),
              canonical_quote_en: item.canonical_quote_en,
              matched_language: item.matched_language,
              confidence: item.confidence,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id)
          .eq("project_id", id)
          .eq("user_id", user.id);
      })
    );

    const { data: nextSegments } = await supabase
      .from("autocut_segments")
      .select("*")
      .eq("project_id", id)
      .eq("user_id", user.id)
      .order("order_index", { ascending: true });

    await supabase
      .from("autocut_projects")
      .update({
        current_stage: "quote_mapped",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    const { data: job } = await supabase
      .from("autocut_jobs")
      .insert({
        project_id: id,
        user_id: user.id,
        job_type: "quote_map",
        status: "succeeded",
        provider: "doubao",
        result_payload: { items: mapped },
      })
      .select("*")
      .single();

    return NextResponse.json({ segments: nextSegments ?? [], mapped, job });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "经典台词映射失败" }, { status: 500 });
  }
}
