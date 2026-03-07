// @vitest-environment jsdom

import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  AutoCutJobRow,
  AutoCutProjectRow,
  AutoCutSegmentRow,
} from "@/lib/autocut-workflow";

const { toast } = vi.hoisted(() => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("sonner", () => ({ toast }));
vi.mock("@/components/UserProvider", () => ({
  useUser: () => ({
    user: { id: "user-1", email: "demo@example.com" },
    profile: null,
    credits: null,
  }),
}));

import { AutoCutWorkspace } from "@/components/auto-cut/AutoCutWorkspace";

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

type WorkspaceState = {
  projects: AutoCutProjectRow[];
  bundle: {
    project: AutoCutProjectRow;
    segments: AutoCutSegmentRow[];
    assets: unknown[];
    jobs: AutoCutJobRow[];
  };
};

function createState(): WorkspaceState {
  const baseProject: AutoCutProjectRow = {
    id: "project-1",
    user_id: "user-1",
    title: "混剪项目 1",
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
    current_stage: "analyzed",
    final_video_url: null,
    final_subtitle_url: null,
    engine_job_id: null,
    created_at: "2026-03-06T00:00:00Z",
    updated_at: "2026-03-06T00:00:00Z",
  };

  return {
    projects: [baseProject],
    bundle: {
      project: { ...baseProject },
      segments: [
        {
          id: "segment-1",
          project_id: "project-1",
          user_id: "user-1",
          type: "movie_quote",
          order_index: 0,
          text: "我要找到你",
          language: "zh-CN",
          source_title: "",
          source_query: "",
          b_roll_query: "night street",
          retrieval_intent: "quote_scene",
          retrieval_subject: "Taken revenge scene",
          retrieval_mood: "determined",
          retrieval_queries: ["taken revenge scene", "i will find you scene"],
          retrieval_negative_terms: ["animation", "logo"],
          retrieval_visual_constraints: {},
          voice_emotion: "determined",
          voice_pace: "medium",
          voice_intensity: "medium",
          duration_ms: 3000,
          enabled: true,
          metadata: {},
          created_at: "",
          updated_at: "",
        },
      ],
      assets: [],
      jobs: [],
    },
  };
}

function installFetchMock(state: ReturnType<typeof createState>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/auto-cut/projects") && method === "GET") {
      return jsonResponse({ items: state.projects });
    }
    if (url.endsWith("/api/auto-cut/projects/project-1") && method === "GET") {
      return jsonResponse(state.bundle);
    }
    if (url.endsWith("/api/auto-cut/projects/project-1/segments") && method === "POST") {
      const body = JSON.parse(String(init?.body ?? "{}"));
      state.bundle.segments.push({
        id: `segment-${state.bundle.segments.length + 1}`,
        project_id: "project-1",
        user_id: "user-1",
        created_at: "",
        updated_at: "",
        ...body,
      });
      return jsonResponse({ segment: state.bundle.segments.at(-1) }, 201);
    }
    if (url.includes("/api/auto-cut/projects/project-1/segments/") && method === "PATCH") {
      const segmentId = url.split("/").pop()!;
      const body = JSON.parse(String(init?.body ?? "{}"));
      const segment = state.bundle.segments.find((item) => item.id === segmentId);
      if (segment) Object.assign(segment, body);
      return jsonResponse({ segment });
    }
    if (url.includes("/api/auto-cut/projects/project-1/segments/") && method === "DELETE") {
      const segmentId = url.split("/").pop()!;
      state.bundle.segments = state.bundle.segments.filter((item) => item.id !== segmentId);
      return jsonResponse({ ok: true });
    }
    if (url.endsWith("/api/auto-cut/projects/project-1/quote-map") && method === "POST") {
      state.bundle.segments[0].source_title = "Taken";
      state.bundle.segments[0].source_query = "I will find you and I will kill you";
      state.bundle.segments[0].metadata = { canonical_quote_en: "I will find you and I will kill you" };
      return jsonResponse({ segments: state.bundle.segments, mapped: [] });
    }
    if (url.endsWith("/api/auto-cut/projects/project-1/render") && method === "POST") {
      state.bundle.jobs = [
        {
          id: "job-1",
          project_id: "project-1",
          user_id: "user-1",
          job_type: "render",
          status: "queued",
          provider: "autocut-engine",
          error_message: null,
          provider_job_id: "engine-job-1",
          result_payload: {},
          created_at: "",
          updated_at: "",
        },
      ];
      return jsonResponse({ job: state.bundle.jobs[0] });
    }
    if (url.endsWith("/api/auto-cut/projects/project-1/jobs/job-1") && method === "GET") {
      state.bundle.jobs[0] = {
        ...state.bundle.jobs[0],
        status: "succeeded",
        result_payload: {
          stages: [{ stage: "render", status: "succeeded" }],
        },
      };
      state.bundle.project.final_video_url = "https://cdn.example.com/final.mp4";
      return jsonResponse({ job: state.bundle.jobs[0] });
    }

    return jsonResponse({ error: `Unhandled ${method} ${url}` }, 500);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("autocut_voice_provider", "fishaudio");
  localStorage.setItem("autocut_voice_model", "speech-1");
  localStorage.setItem("autocut_fish_voice_id", "anna");
  localStorage.setItem("autocut_subtitle_style", "word_highlight");
  localStorage.setItem("autocut_default_locale_mapping", "true");
  localStorage.setItem("autocut_clip_provider_priority", '["apify","yarn","playphrase","pexels"]');
  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

describe("AutoCutWorkspace interactions", () => {
  test("supports segment create, update and delete", async () => {
    const state = createState();
    const fetchMock = installFetchMock(state);
    const user = userEvent.setup();

    render(<AutoCutWorkspace />);

    await screen.findByDisplayValue("混剪项目 1");

    await user.click(screen.getByRole("button", { name: "旁白" }));
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            String(url).endsWith("/api/auto-cut/projects/project-1/segments") &&
            init?.method === "POST"
        )
      ).toBe(true);
    });

    const segmentTextarea = await screen.findByDisplayValue("我要找到你");
    fireEvent.change(segmentTextarea, { target: { value: "新的台词" } });
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            String(url).includes("/api/auto-cut/projects/project-1/segments/segment-1") &&
            init?.method === "PATCH"
        )
      ).toBe(true);
    });

    const firstCard = segmentTextarea.closest(".rounded-xl");
    await user.click(within(firstCard as HTMLElement).getByRole("button", { name: "删除片段" }));
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            String(url).includes("/api/auto-cut/projects/project-1/segments/segment-1") &&
            init?.method === "DELETE"
        )
      ).toBe(true);
    });
  });

  test("maps movie quote and polls render job to preview output", async () => {
    const state = createState();
    const fetchMock = installFetchMock(state);
    const user = userEvent.setup();

    const setIntervalMock = vi
      .spyOn(globalThis, "setInterval")
      .mockImplementation((((callback: TimerHandler) => {
        Promise.resolve().then(() => {
          if (typeof callback === "function") callback();
        });
        return 1 as unknown as ReturnType<typeof setInterval>;
      }) as unknown) as typeof setInterval);
    vi.spyOn(globalThis, "clearInterval").mockImplementation(() => {});

    render(<AutoCutWorkspace />);

    await screen.findByDisplayValue("混剪项目 1");
    const quoteSegment = await screen.findByDisplayValue("我要找到你");
    const quoteCard = quoteSegment.closest(".rounded-xl");
    await user.click(within(quoteCard as HTMLElement).getByRole("button", { name: "映射台词" }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            String(url).endsWith("/api/auto-cut/projects/project-1/quote-map") &&
            init?.method === "POST"
        )
      ).toBe(true);
    });

    await user.click(screen.getAllByRole("button", { name: /开始渲染/i })[0]);
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            String(url).endsWith("/api/auto-cut/projects/project-1/render") &&
            init?.method === "POST"
        )
      ).toBe(true);
    });

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).endsWith("/api/auto-cut/projects/project-1/jobs/job-1")
        )
      ).toBe(true);
    });

    setIntervalMock.mockRestore();
  });
});
