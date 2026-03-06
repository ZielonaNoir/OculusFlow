// @vitest-environment jsdom

import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

import { OculusVideoWorkspace } from "@/components/oculus-flow/OculusVideoWorkspace";

type TestState = ReturnType<typeof createState>;
type ComponentTask = {
  id: string;
  task_type: "image" | "video" | "prompt";
  step_key: string;
  provider_task_id: string | null;
  status: string;
  model_id: string | null;
  prompt: string;
  result_url: string | null;
  result_payload: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
};

function createState() {
  return {
    projects: [
      {
        id: "project-1",
        title: "视频项目 1",
        genre: "商业短片",
        tone: "电影感写实",
        duration_seconds: 5,
        aspect_ratio: "16:9",
        shot_count: 9,
        image_model: "doubao-seedream-5-0-lite",
        video_model: "doubao-seedance-1-5-pro",
        current_stage: "metadata_ready",
        updated_at: "2026-03-06T00:00:00Z",
        created_at: "2026-03-06T00:00:00Z",
      },
    ],
    bundle: {
      project: {
        id: "project-1",
        title: "视频项目 1",
        prompt: "做一支新品发布短片",
        genre: "商业短片",
        tone: "电影感写实",
        duration_seconds: 5,
        aspect_ratio: "16:9",
        shot_count: 9,
        image_model: "doubao-seedream-5-0-lite",
        video_model: "doubao-seedance-1-5-pro",
        script_text: "主角在雨夜街头拿起产品，情绪从压抑转为释放。",
        current_stage: "metadata_ready",
        reference_images: [],
        extra_context: {},
      },
      entities: [
        {
          id: "entity-1",
          type: "character",
          name: "主角",
          description: "青年女性，湿发，电影感特写",
          enabled: true,
          sort_order: 0,
          json_payload: {},
        },
      ],
      storyboards: [
        {
          id: "storyboard-1",
          shot_count: 9,
          prompt: "九宫格故事板提示词",
          grid_image_url: "https://cdn.example.com/grid.png",
          selected_row: null,
          selected_col: null,
          selected_index: null,
          hd_prompt: "高清分镜提示词",
          hd_image_url: "https://cdn.example.com/hd.png",
          metadata_snapshot: {},
        },
      ],
      tasks: [] as ComponentTask[],
    },
    pendingVideoTaskId: "task-1",
    finalVideoUrl: "https://cdn.example.com/final.mp4",
  };
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function installFetchMock(state: TestState) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/oculus/video-projects") && method === "GET") {
      return jsonResponse({ items: state.projects });
    }

    if (url.endsWith("/api/oculus/video-projects/project-1") && method === "GET") {
      return jsonResponse(state.bundle);
    }

    if (url.endsWith("/api/oculus/video-projects/project-1/entities") && method === "POST") {
      const body = JSON.parse(String(init?.body ?? "{}"));
      const next = {
        id: `entity-${state.bundle.entities.length + 1}`,
        enabled: true,
        sort_order: state.bundle.entities.filter((item) => item.type === body.type).length,
        json_payload: {},
        ...body,
      };
      state.bundle.entities.push(next);
      return jsonResponse({ entity: next }, 201);
    }

    if (url.includes("/api/oculus/video-projects/project-1/entities/") && method === "PATCH") {
      const entityId = url.split("/").pop()!;
      const body = JSON.parse(String(init?.body ?? "{}"));
      const entity = state.bundle.entities.find((item) => item.id === entityId);
      if (entity) Object.assign(entity, body);
      return jsonResponse({ entity });
    }

    if (url.includes("/api/oculus/video-projects/project-1/entities/") && method === "DELETE") {
      const entityId = url.split("/").pop()!;
      state.bundle.entities = state.bundle.entities.filter((item) => item.id !== entityId);
      return jsonResponse({ ok: true });
    }

    if (url.endsWith("/api/oculus/video-projects/project-1/storyboards") && method === "POST") {
      const body = JSON.parse(String(init?.body ?? "{}"));
      state.bundle.storyboards[0] = { ...state.bundle.storyboards[0], ...body };
      return jsonResponse({ storyboard: state.bundle.storyboards[0] });
    }

    if (url.endsWith("/api/oculus/video-projects/project-1/prompts") && method === "POST") {
      const body = JSON.parse(String(init?.body ?? "{}"));
      return jsonResponse({ prompt: `prompt-for-${body.step}` });
    }

    if (url.endsWith("/api/oculus/video") && method === "POST") {
      state.bundle.tasks = [
        {
          id: "video-task-1",
          task_type: "video",
          step_key: "final_video",
          provider_task_id: state.pendingVideoTaskId,
          status: "queued",
          model_id: "doubao-seedance-1-5-pro",
          prompt: "prompt-for-final_video",
          result_url: null,
          result_payload: {},
          error_message: null,
          created_at: "2026-03-06T00:00:00Z",
        },
      ];
      return jsonResponse({ taskId: "video-task-1", providerTaskId: state.pendingVideoTaskId });
    }

    if (url.includes("/api/oculus/video?taskId=video-task-1") && method === "GET") {
      state.bundle.tasks = [
        {
          ...state.bundle.tasks[0],
          status: "succeeded",
          result_url: state.finalVideoUrl,
        },
      ];
      return jsonResponse({
        taskId: "video-task-1",
        status: "succeeded",
        result: { video_url: state.finalVideoUrl },
      });
    }

    return jsonResponse({ error: `Unhandled ${method} ${url}` }, 500);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  localStorage.setItem("oculus_image_model", "doubao-seedream-5-0-lite");
  localStorage.setItem("oculus_video_model", "doubao-seedance-1-5-pro");
  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

describe("OculusVideoWorkspace interactions", () => {
  test("supports entity create, update, and delete interactions", async () => {
    const state = createState();
    const fetchMock = installFetchMock(state);
    const user = userEvent.setup();

    render(<OculusVideoWorkspace />);

    await screen.findByDisplayValue("视频项目 1");

    const addButtons = screen.getAllByRole("button", { name: "新增" });
    await user.click(addButtons[0]);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            String(url).endsWith("/api/oculus/video-projects/project-1/entities") &&
            init?.method === "POST"
        )
      ).toBe(true);
    });

    const protagonistInput = await screen.findByDisplayValue("主角");
    fireEvent.change(protagonistInput, { target: { value: "主角A" } });

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            String(url).includes("/api/oculus/video-projects/project-1/entities/entity-1") &&
            init?.method === "PATCH" &&
            String(init?.body).includes("主角A")
        )
      ).toBe(true);
    });

    const characterCard = protagonistInput.closest(".rounded-lg");
    const buttons = within(characterCard as HTMLElement).getAllByRole("button");
    await user.click(buttons[2]);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            String(url).includes("/api/oculus/video-projects/project-1/entities/entity-1") &&
            init?.method === "DELETE"
        )
      ).toBe(true);
    });
  });

  test("persists storyboard cell selection with computed row and col", async () => {
    const state = createState();
    const fetchMock = installFetchMock(state);
    const user = userEvent.setup();

    render(<OculusVideoWorkspace />);

    await screen.findAllByRole("button", { name: "选第 4 格" });
    await user.click(screen.getAllByRole("button", { name: "选第 4 格" })[0]);

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).endsWith("/api/oculus/video-projects/project-1/storyboards") &&
          init?.method === "POST" &&
          String(init?.body).includes('"selected_index":4')
      );
      expect(call).toBeTruthy();
      expect(String(call?.[1]?.body)).toContain('"selected_row":2');
      expect(String(call?.[1]?.body)).toContain('"selected_col":1');
    });
  });

  test("polls video task until completion and renders final video state", async () => {
    const state = createState();
    const fetchMock = installFetchMock(state);
    const setIntervalMock = vi
      .spyOn(globalThis, "setInterval")
      .mockImplementation((((callback: TimerHandler) => {
        Promise.resolve().then(() => {
          if (typeof callback === "function") callback();
        });
        return 1 as unknown as ReturnType<typeof setInterval>;
      }) as unknown) as typeof setInterval);
    vi.spyOn(globalThis, "clearInterval").mockImplementation(() => {});

    render(<OculusVideoWorkspace />);

    await screen.findAllByRole("button", { name: "生成视频" });
    fireEvent.click(screen.getAllByRole("button", { name: "生成视频" })[0]);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            String(url).endsWith("/api/oculus/video") && init?.method === "POST"
        )
      ).toBe(true);
    });

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).includes("/api/oculus/video?taskId=video-task-1")
        )
      ).toBe(true);
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("视频生成完成");
    });

    setIntervalMock.mockRestore();
  }, 10000);
});
