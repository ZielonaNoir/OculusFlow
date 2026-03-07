import { NextResponse } from "next/server";
import { getAutoCutRenderJob } from "@/lib/autocut-engine";
import {
  findExistingAutoCutAsset,
  persistRemoteAsset,
  requireAuthedSupabase,
} from "@/lib/autocut-server";
import type { AutoCutSegmentResult } from "@/lib/autocut-workflow";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { supabase, user } = await requireAuthedSupabase();
    const { id, jobId } = await params;

    const { data: job, error } = await supabase
      .from("autocut_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("project_id", id)
      .eq("user_id", user.id)
      .single();
    if (error || !job) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    if (!job.provider_job_id || !["queued", "running"].includes(job.status)) {
      return NextResponse.json({ job });
    }

    const engine = await getAutoCutRenderJob(job.provider_job_id);
    if (!engine.ok) {
      await supabase
        .from("autocut_projects")
        .update({
          current_stage: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id);
      await supabase
        .from("autocut_jobs")
        .update({
          status: "failed",
          error_message: engine.data.error || "查询引擎任务失败",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId)
        .eq("user_id", user.id);
      return NextResponse.json({ error: engine.data.error || "查询引擎任务失败" }, { status: engine.status || 502 });
    }

    let finalVideoUrl = (job.result_payload?.output_url as string | null | undefined) || null;
    let subtitleUrl = (job.result_payload?.subtitle_url as string | null | undefined) || null;
    const engineWarnings = [...(engine.data.warnings || [])];
    const segmentResults = (engine.data.items ||
      engine.data.payload?.segment_results ||
      []) as AutoCutSegmentResult[];
    const shouldPersistIntermediateAssets = ["succeeded", "partial"].includes(engine.data.status || "");
    const persistWarnings: string[] = [];

    async function persistAssetReference(
      persistInput: Parameters<typeof persistRemoteAsset>[0]
    ) {
      const { data, error } = await supabase
        .from("autocut_assets")
        .insert({
          project_id: persistInput.projectId,
          segment_id: persistInput.segmentId ?? null,
          user_id: persistInput.userId,
          asset_type: persistInput.type,
          provider: persistInput.provider ?? null,
          source_url: persistInput.sourceUrl,
          storage_path: null,
          signed_url: persistInput.sourceUrl,
          duration_ms: persistInput.durationMs ?? null,
          metadata: {
            ...(persistInput.metadata || {}),
            persisted_mode: "remote_reference",
            storage_skipped_reason: "object_size_limit",
          },
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    }

    async function persistAssetSafe(
      persistInput: Parameters<typeof persistRemoteAsset>[0],
      warningLabel: string
    ) {
      try {
        return await persistRemoteAsset(persistInput);
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown_error";
        const isObjectTooLarge =
          message.toLowerCase().includes("maximum allowed size") ||
          message.toLowerCase().includes("object exceeded") ||
          message.toLowerCase().includes("payload too large");
        if (isObjectTooLarge) {
          try {
            return await persistAssetReference(persistInput);
          } catch (referenceError) {
            const refMessage = referenceError instanceof Error ? referenceError.message : "unknown_error";
            persistWarnings.push(`${warningLabel}: ${refMessage}`);
            return null;
          }
        }
        persistWarnings.push(`${warningLabel}: ${message}`);
        return null;
      }
    }

    const persistedSegmentAssets = shouldPersistIntermediateAssets
      ? await Promise.all(
          segmentResults
            .filter((item) => item.public_url && item.asset_kind !== "subtitle")
            .map(async (item) => {
              const existing = await findExistingAutoCutAsset({
                userId: user.id,
                projectId: id,
                segmentId: item.segment_id === "project" ? null : item.segment_id,
                type: item.asset_kind === "audio" ? "audio" : item.asset_kind === "clip" ? "clip" : "b_roll",
                sourceUrl: item.public_url,
              });
              if (existing) return existing;
              const created = await persistAssetSafe(
                {
                userId: user.id,
                projectId: id,
                segmentId: item.segment_id === "project" ? null : item.segment_id,
                type: item.asset_kind === "audio" ? "audio" : item.asset_kind === "clip" ? "clip" : "b_roll",
                provider: item.provider,
                sourceUrl: item.public_url!,
                durationMs: item.duration_ms,
                metadata: {
                  provider: item.provider,
                  kind: item.asset_kind,
                  segment_type: item.segment_type,
                  fallback_reason: item.fallback_reason,
                  source_query: item.source_query,
                  status: item.status,
                  warning: item.warning,
                  ...(item.metadata || {}),
                },
              },
                `segment_asset_persist_failed:${item.segment_id}:${item.asset_kind}`
              );
              return created;
            })
        )
      : [];

    if (engine.data.status === "succeeded" && engine.data.output_url) {
      const { data: project } = await supabase
        .from("autocut_projects")
        .select("final_video_url, final_subtitle_url")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (!project?.final_video_url) {
        const existingFinalAsset = await findExistingAutoCutAsset({
          userId: user.id,
          projectId: id,
          type: "final_video",
          sourceUrl: engine.data.output_url,
        });
        if (existingFinalAsset?.signed_url) {
          finalVideoUrl = existingFinalAsset.signed_url;
        } else {
          const finalAsset = await persistAssetSafe(
            {
          userId: user.id,
          projectId: id,
          type: "final_video",
          provider: "autocut-engine",
          sourceUrl: engine.data.output_url,
          durationMs: null,
          metadata: engine.data.payload || {},
        },
            "final_video_persist_failed"
          );
          finalVideoUrl = finalAsset?.signed_url || engine.data.output_url || null;
        }
      } else {
        finalVideoUrl = project.final_video_url;
      }

      if (engine.data.subtitle_url && !project?.final_subtitle_url) {
        const existingSubtitleAsset = await findExistingAutoCutAsset({
          userId: user.id,
          projectId: id,
          type: "subtitle",
          sourceUrl: engine.data.subtitle_url,
        });
        if (existingSubtitleAsset?.signed_url) {
          subtitleUrl = existingSubtitleAsset.signed_url;
        } else {
          const subtitleAsset = await persistAssetSafe(
            {
          userId: user.id,
          projectId: id,
          type: "subtitle",
          provider: "autocut-engine",
          sourceUrl: engine.data.subtitle_url,
          durationMs: null,
          metadata: engine.data.payload || {},
        },
            "subtitle_persist_failed"
          );
          subtitleUrl = subtitleAsset?.signed_url || engine.data.subtitle_url || null;
        }
      } else {
        subtitleUrl = project?.final_subtitle_url || engine.data.subtitle_url || null;
      }

      await supabase
        .from("autocut_projects")
        .update({
          final_video_url: finalVideoUrl,
          final_subtitle_url: subtitleUrl,
          current_stage: "rendered",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id);
    } else if (engine.data.status === "partial") {
      const { data: project } = await supabase
        .from("autocut_projects")
        .select("final_video_url, final_subtitle_url")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (engine.data.output_url && !project?.final_video_url) {
        const existingFinalAsset = await findExistingAutoCutAsset({
          userId: user.id,
          projectId: id,
          type: "final_video",
          sourceUrl: engine.data.output_url,
        });
        if (existingFinalAsset?.signed_url) {
          finalVideoUrl = existingFinalAsset.signed_url;
        } else {
          const finalAsset = await persistAssetSafe(
            {
          userId: user.id,
          projectId: id,
          type: "final_video",
          provider: "autocut-engine",
          sourceUrl: engine.data.output_url,
          durationMs: null,
          metadata: engine.data.payload || {},
        },
            "final_video_persist_failed"
          );
          finalVideoUrl = finalAsset?.signed_url || engine.data.output_url || null;
        }
      } else {
        finalVideoUrl = project?.final_video_url || engine.data.output_url || null;
      }

      if (engine.data.subtitle_url && !project?.final_subtitle_url) {
        const existingSubtitleAsset = await findExistingAutoCutAsset({
          userId: user.id,
          projectId: id,
          type: "subtitle",
          sourceUrl: engine.data.subtitle_url,
        });
        if (existingSubtitleAsset?.signed_url) {
          subtitleUrl = existingSubtitleAsset.signed_url;
        } else {
          const subtitleAsset = await persistAssetSafe(
            {
          userId: user.id,
          projectId: id,
          type: "subtitle",
          provider: "autocut-engine",
          sourceUrl: engine.data.subtitle_url,
          durationMs: null,
          metadata: engine.data.payload || {},
        },
            "subtitle_persist_failed"
          );
          subtitleUrl = subtitleAsset?.signed_url || engine.data.subtitle_url || null;
        }
      } else {
        subtitleUrl = project?.final_subtitle_url || engine.data.subtitle_url || null;
      }

      await supabase
        .from("autocut_projects")
        .update({
          final_video_url: finalVideoUrl,
          final_subtitle_url: subtitleUrl,
          current_stage: "rendered",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id);
    } else if (engine.data.status === "failed") {
      await supabase
        .from("autocut_projects")
        .update({
          current_stage: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id);
    } else if (engine.data.status === "running") {
      await supabase
        .from("autocut_projects")
        .update({
          current_stage: "rendering",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id);
    }

    const nextPayload = {
      ...(engine.data.payload || {}),
      segment_results: segmentResults,
      persisted_segment_assets: persistedSegmentAssets
        .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
        .map((asset) => ({
          id: asset.id,
          asset_type: asset.asset_type,
          source_url: asset.source_url,
          signed_url: asset.signed_url,
        })),
      output_url: finalVideoUrl || engine.data.output_url || null,
      subtitle_url: subtitleUrl || engine.data.subtitle_url || null,
      stages: engine.data.stages || [],
      warnings: [...engineWarnings, ...persistWarnings],
    };

    const { data: updated } = await supabase
      .from("autocut_jobs")
      .update({
        status: engine.data.status || job.status,
        error_message: engine.data.error || null,
        result_payload: nextPayload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    return NextResponse.json({ job: updated || job });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("autocut job polling failed", error);
    return NextResponse.json({ error: "查询任务失败" }, { status: 500 });
  }
}
