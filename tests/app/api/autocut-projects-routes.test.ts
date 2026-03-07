import { beforeEach, describe, expect, test, vi } from "vitest";

const requireAuthedSupabaseMock = vi.fn();
const analyzeSourceTextMock = vi.fn();
const mapClassicQuotesMock = vi.fn();
const getAutoCutBundleMock = vi.fn();
const triggerAutoCutRenderMock = vi.fn();
const getAutoCutRenderJobMock = vi.fn();
const persistRemoteAssetMock = vi.fn();
const findExistingAutoCutAssetMock = vi.fn();

vi.mock("@/lib/autocut-server", () => ({
  requireAuthedSupabase: (...args: unknown[]) => requireAuthedSupabaseMock(...args),
  analyzeSourceText: (...args: unknown[]) => analyzeSourceTextMock(...args),
  mapClassicQuotes: (...args: unknown[]) => mapClassicQuotesMock(...args),
  getAutoCutBundle: (...args: unknown[]) => getAutoCutBundleMock(...args),
  persistRemoteAsset: (...args: unknown[]) => persistRemoteAssetMock(...args),
  findExistingAutoCutAsset: (...args: unknown[]) => findExistingAutoCutAssetMock(...args),
  buildSettingsSnapshot: (input: unknown) => input,
}));

vi.mock("@/lib/autocut-engine", () => ({
  triggerAutoCutRender: (...args: unknown[]) => triggerAutoCutRenderMock(...args),
  getAutoCutRenderJob: (...args: unknown[]) => getAutoCutRenderJobMock(...args),
}));

import { GET as listProjects, POST as createProject } from "@/app/api/auto-cut/projects/route";
import { POST as analyzePost } from "@/app/api/auto-cut/projects/[id]/analyze/route";
import { POST as quoteMapPost } from "@/app/api/auto-cut/projects/[id]/quote-map/route";
import { POST as renderPost } from "@/app/api/auto-cut/projects/[id]/render/route";
import { GET as jobGet } from "@/app/api/auto-cut/projects/[id]/jobs/[jobId]/route";

function createSupabaseMock() {
  const user = { id: "user-1" };
  const updateSingleMock = vi.fn(async () => ({
    data: {
      id: "job-1",
      status: "partial",
      result_payload: {},
    },
    error: null,
  }));
  const createUpdateChain = () => {
    const terminal = {
      data: null,
      error: null,
      select: vi.fn(() => ({
        single: updateSingleMock,
      })),
    };
    return {
      eq: vi.fn(() => ({
        eq: vi.fn(() => terminal),
      })),
    };
  };

  const projectsTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(async () => ({ data: [{ id: "project-1", title: "项目" }], error: null })),
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: {
              id: "project-1",
              title: "项目",
              source_text: "一段文案",
              aspect_ratio: "16:9",
              duration_seconds: 30,
              fish_voice_id: "anna",
              voice_character: "anna",
              voice_style: "cinematic_narration",
              subtitle_style: "word_highlight",
              locale_mapping_enabled: true,
              clip_provider_priority: ["apify", "yarn", "playphrase", "pexels"],
              voice_provider: "fishaudio",
              voice_model: "speech-1",
              settings_snapshot: {},
            },
            error: null,
          })),
        })),
      })),
    })),
    insert: vi.fn((payload: Record<string, unknown>) => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({ data: { id: "project-new", ...payload }, error: null })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { id: "project-1" }, error: null })),
          })),
          single: vi.fn(async () => ({ data: { id: "project-1" }, error: null })),
        })),
      })),
    })),
  };

  const segmentsTable = {
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
    })),
    insert: vi.fn((payload: Record<string, unknown>[]) => ({
      select: vi.fn(async () => ({ data: payload, error: null })),
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: {
              metadata: {},
              retrieval_queries: ["i will find you movie scene"],
              retrieval_intent: "quote_scene",
              retrieval_subject: "revenge dialogue scene",
              retrieval_mood: "determined",
              retrieval_negative_terms: ["animation", "logo"],
              retrieval_visual_constraints: {},
              voice_emotion: "determined",
              voice_pace: "medium",
              voice_intensity: "medium",
            },
            error: null,
          })),
          order: vi.fn(async () => ({
            data: [
              {
                id: "segment-1",
                type: "movie_quote",
                text: "我要找到你",
                language: "zh-CN",
                source_title: null,
                source_query: null,
                b_roll_query: "dramatic city night chase",
                duration_ms: 3000,
                enabled: true,
                retrieval_intent: "quote_scene",
                retrieval_subject: "revenge dialogue scene",
                retrieval_mood: "determined",
                retrieval_queries: ["revenge dialogue scene", "i will find you dialogue"],
                retrieval_negative_terms: ["animation", "logo"],
                retrieval_visual_constraints: {},
                voice_emotion: "determined",
                voice_pace: "medium",
                voice_intensity: "medium",
                metadata: {},
                order_index: 0,
              },
            ],
            error: null,
          })),
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    })),
  };

  const jobsTable = {
    insert: vi.fn((payload: Record<string, unknown>) => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({ data: { id: "job-1", ...payload }, error: null })),
      })),
    })),
    update: vi.fn(() => createUpdateChain()),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: {
                id: "job-1",
                project_id: "project-1",
                user_id: "user-1",
                provider_job_id: "engine-job-1",
                status: "running",
                result_payload: {},
              },
              error: null,
            })),
          })),
        })),
      })),
    })),
  };

  const assetsTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({ data: null, error: null })),
                })),
              })),
            })),
          })),
        })),
      })),
    })),
  };

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "autocut_projects") return projectsTable;
      if (table === "autocut_segments") return segmentsTable;
      if (table === "autocut_jobs") return jobsTable;
      if (table === "autocut_assets") return assetsTable;
      throw new Error(`Unexpected table ${table}`);
    }),
  };

  return { supabase, user, projectsTable, segmentsTable, jobsTable, assetsTable };
}

beforeEach(() => {
  vi.clearAllMocks();
  findExistingAutoCutAssetMock.mockResolvedValue(null);
});

describe("autocut project routes", () => {
  test("GET lists projects", async () => {
    const { supabase, user } = createSupabaseMock();
    requireAuthedSupabaseMock.mockResolvedValue({ supabase, user });

    const response = await listProjects();
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.items[0].id).toBe("project-1");
  });

  test("POST creates project with user ownership", async () => {
    const { supabase, user, projectsTable } = createSupabaseMock();
    requireAuthedSupabaseMock.mockResolvedValue({ supabase, user });

    const response = await createProject(
      new Request("http://localhost/api/auto-cut/projects", {
        method: "POST",
        body: JSON.stringify({ title: "新项目", source_text: "一段文案" }),
      })
    );
    const json = await response.json();
    expect(response.status).toBe(201);
    expect(projectsTable.insert).toHaveBeenCalled();
    expect(json.project.user_id).toBe(user.id);
  });
});

describe("autocut workflow routes", () => {
  test("analyze replaces segments and writes analyze job", async () => {
    const { supabase, user, segmentsTable, jobsTable } = createSupabaseMock();
    requireAuthedSupabaseMock.mockResolvedValue({ supabase, user });
    analyzeSourceTextMock.mockResolvedValue({
      voice_style: "cinematic_narration",
      segments: [
        {
          type: "voiceover",
          order_index: 0,
          text: "旁白段落",
          language: "zh-CN",
          duration_ms: 3000,
          enabled: true,
          metadata: {},
          source_title: null,
          source_query: null,
          b_roll_query: "city at night",
          retrieval_intent: "city_establishing",
          retrieval_subject: "city night chase",
          retrieval_mood: "tense",
          retrieval_queries: ["city night chase", "urban suspense"],
          retrieval_negative_terms: ["animation", "logo"],
          retrieval_visual_constraints: {},
          voice_emotion: "tense",
          voice_pace: "medium",
          voice_intensity: "medium",
        },
      ],
    });

    const response = await analyzePost(
      new Request("http://localhost/api/auto-cut/projects/project-1/analyze", { method: "POST" }),
      { params: Promise.resolve({ id: "project-1" }) }
    );
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(segmentsTable.delete).toHaveBeenCalled();
    expect(segmentsTable.insert).toHaveBeenCalled();
    expect(jobsTable.insert).toHaveBeenCalled();
    expect(json.segments).toHaveLength(1);
  });

  test("quote-map updates mapped metadata", async () => {
    const { supabase, user, segmentsTable, jobsTable } = createSupabaseMock();
    requireAuthedSupabaseMock.mockResolvedValue({ supabase, user });
    mapClassicQuotesMock.mockResolvedValue([
      {
        id: "segment-1",
        canonical_quote_en: "I will find you and I will kill you",
        source_title: "Taken",
        source_query: "I will find you and I will kill you",
        matched_language: "en",
        confidence: 0.96,
      },
    ]);

    const response = await quoteMapPost(
      new Request("http://localhost/api/auto-cut/projects/project-1/quote-map", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ id: "project-1" }) }
    );
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(segmentsTable.update).toHaveBeenCalled();
    expect(jobsTable.insert).toHaveBeenCalled();
    expect(json.mapped[0].source_title).toBe("Taken");
  });

  test("render creates local job and stores provider job id", async () => {
    const { supabase, user, jobsTable } = createSupabaseMock();
    requireAuthedSupabaseMock.mockResolvedValue({ supabase, user });
    getAutoCutBundleMock.mockResolvedValue({
      project: {
        id: "project-1",
        settings_snapshot: {},
        title: "项目",
        source_text: "一段文案",
        aspect_ratio: "16:9",
        duration_seconds: 30,
        fish_voice_id: "anna",
        voice_character: "anna",
        voice_style: "cinematic_narration",
        subtitle_style: "word_highlight",
        locale_mapping_enabled: true,
      },
      segments: [],
    });
    triggerAutoCutRenderMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { job_id: "engine-job-1", status: "queued", payload: {} },
    });

    const response = await renderPost(
      new Request("http://localhost/api/auto-cut/projects/project-1/render", { method: "POST" }),
      { params: Promise.resolve({ id: "project-1" }) }
    );
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(jobsTable.insert).toHaveBeenCalled();
    expect(json.job.provider_job_id).toBe("engine-job-1");
  });

  test("job polling persists partial outputs and assets", async () => {
    const { supabase, user, projectsTable } = createSupabaseMock();
    requireAuthedSupabaseMock.mockResolvedValue({ supabase, user });
    getAutoCutRenderJobMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        job_id: "engine-job-1",
        status: "partial",
        output_url: "https://engine.example/final.mp4",
        subtitle_url: "https://engine.example/subtitles.vtt",
        stages: [{ stage: "render", status: "partial" }],
        warnings: ["subtitle_burn_failed"],
        items: [
          {
            segment_id: "segment-1",
            segment_type: "movie_quote",
            provider: "pexels",
            asset_kind: "b_roll",
            status: "partial",
            source_query: "night street",
            fallback_reason: "quote_not_found",
            warning: "quote_not_found",
            local_path: "C:/work/clip.mp4",
            public_url: "https://engine.example/clip.mp4",
            duration_ms: 3000,
            metadata: {},
          },
        ],
        payload: {},
      },
    });
    persistRemoteAssetMock.mockResolvedValue({
      id: "asset-1",
      asset_type: "b_roll",
      source_url: "https://engine.example/clip.mp4",
      signed_url: "https://supabase.example/clip.mp4",
    });

    const response = await jobGet(
      new Request("http://localhost/api/auto-cut/projects/project-1/jobs/job-1"),
      { params: Promise.resolve({ id: "project-1", jobId: "job-1" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(getAutoCutRenderJobMock).toHaveBeenCalledWith("engine-job-1");
    expect(persistRemoteAssetMock).toHaveBeenCalled();
    expect(json.job.status).toBe("partial");
  });

  test("job polling does not persist large assets while engine is still running", async () => {
    const { supabase, user } = createSupabaseMock();
    requireAuthedSupabaseMock.mockResolvedValue({ supabase, user });
    getAutoCutRenderJobMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        job_id: "engine-job-1",
        status: "running",
        stages: [{ stage: "clips", status: "running" }],
        warnings: [],
        items: [
          {
            segment_id: "segment-1",
            segment_type: "movie_quote",
            provider: "apify",
            asset_kind: "clip",
            status: "running",
            source_query: "Taken movie I will find you and I will kill",
            fallback_reason: null,
            warning: null,
            local_path: "C:/work/clip.mp4",
            public_url: "http://127.0.0.1:8000/static/job/clip.mp4",
            duration_ms: 3000,
            metadata: {},
          },
        ],
        payload: {},
      },
    });

    const response = await jobGet(
      new Request("http://localhost/api/auto-cut/projects/project-1/jobs/job-1"),
      { params: Promise.resolve({ id: "project-1", jobId: "job-1" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(persistRemoteAssetMock).not.toHaveBeenCalled();
    expect(json.job.status).toBe("partial");
  });

  test("job polling keeps status update even when asset persistence fails", async () => {
    const { supabase, user } = createSupabaseMock();
    requireAuthedSupabaseMock.mockResolvedValue({ supabase, user });
    getAutoCutRenderJobMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        job_id: "engine-job-1",
        status: "partial",
        output_url: "https://engine.example/final.mp4",
        subtitle_url: null,
        stages: [{ stage: "render", status: "partial" }],
        warnings: [],
        items: [],
        payload: {},
      },
    });
    persistRemoteAssetMock.mockRejectedValue(new Error("download timeout"));

    const response = await jobGet(
      new Request("http://localhost/api/auto-cut/projects/project-1/jobs/job-1"),
      { params: Promise.resolve({ id: "project-1", jobId: "job-1" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.job.status).toBe("partial");
  });
});
