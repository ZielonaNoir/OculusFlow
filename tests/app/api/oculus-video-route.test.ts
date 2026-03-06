import { describe, expect, test } from "vitest";
import {
  extractProgress,
  extractStatus,
  extractTaskId,
  extractVideoUrl,
  isFailed,
  isFinished,
} from "@/app/api/oculus/video/route";

describe("oculus video task response parsing", () => {
  test("extractTaskId supports top-level and nested ids", () => {
    expect(extractTaskId({ id: "task-top" })).toBe("task-top");
    expect(extractTaskId({ data: { id: "task-nested" } })).toBe("task-nested");
    expect(extractTaskId({ task_id: "task-alt" })).toBe("task-alt");
    expect(extractTaskId({})).toBeNull();
  });

  test("extractStatus normalizes nested provider statuses", () => {
    expect(extractStatus({ status: "SUCCEEDED" })).toBe("succeeded");
    expect(extractStatus({ task_status: "RUNNING" })).toBe("running");
    expect(extractStatus({ data: { status: "Queued" } })).toBe("queued");
    expect(extractStatus({})).toBeNull();
  });

  test("extractVideoUrl walks nested payloads", () => {
    expect(extractVideoUrl({ video_url: "https://cdn.example.com/clip.mp4" })).toBe(
      "https://cdn.example.com/clip.mp4"
    );
    expect(
      extractVideoUrl({
        data: {
          outputs: [{ url: "https://cdn.example.com/render.webm?token=abc" }],
        },
      })
    ).toBe("https://cdn.example.com/render.webm?token=abc");
    expect(extractVideoUrl({ data: { outputs: [{ url: "https://cdn.example.com/image.png" }] } })).toBeNull();
  });

  test("extractProgress reads numeric and string progress", () => {
    expect(extractProgress({ progress: 42 })).toBe(42);
    expect(extractProgress({ data: { progress: "85" } })).toBe(85);
    expect(extractProgress({ percent: "not-a-number" })).toBeNull();
  });

  test("terminal status helpers classify provider states", () => {
    expect(isFinished("succeeded")).toBe(true);
    expect(isFinished("completed")).toBe(true);
    expect(isFinished("running")).toBe(false);

    expect(isFailed("failed")).toBe(true);
    expect(isFailed("expired")).toBe(true);
    expect(isFailed("queued")).toBe(false);
  });
});
