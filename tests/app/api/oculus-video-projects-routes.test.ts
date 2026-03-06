import { beforeEach, describe, expect, test, vi } from "vitest";

const requireAuthedSupabaseMock = vi.fn();
const extractEntitiesFromScriptMock = vi.fn();

vi.mock("@/lib/oculus-video-server", () => ({
  requireAuthedSupabase: (...args: unknown[]) => requireAuthedSupabaseMock(...args),
  extractEntitiesFromScript: (...args: unknown[]) => extractEntitiesFromScriptMock(...args),
}));

import { GET as listProjects, POST as createProject } from "@/app/api/oculus/video-projects/route";
import { POST as entitiesPost } from "@/app/api/oculus/video-projects/[id]/entities/route";
import { POST as storyboardPost } from "@/app/api/oculus/video-projects/[id]/storyboards/route";

function createMockContext() {
  const user = { id: "user-1" };
  const videoProjects = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(async () => ({
          data: [
            {
              id: "project-1",
              title: "项目 1",
            },
          ],
          error: null,
        })),
      })),
    })),
    insert: vi.fn((payload: Record<string, unknown>) => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: { id: "project-new", ...payload },
          error: null,
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(async () => ({ data: null, error: null })),
      })),
    })),
  };

  const videoProjectEntities = {
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
    })),
    insert: vi.fn((payload: unknown) => {
      const values = Array.isArray(payload) ? payload : [payload];
      return {
        select: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: values[0],
            error: null,
          })),
        })),
        then: undefined,
      };
    }),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn(async () => ({
              data: [
                {
                  id: "entity-1",
                  type: "character",
                  name: "主角",
                },
              ],
              error: null,
            })),
          })),
        })),
      })),
    })),
  };

  const projectSelectForScript = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: { script_text: "一段剧本" },
            error: null,
          })),
        })),
      })),
    })),
  };

  const videoStoryboards = {
    select: vi.fn(() => ({
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
    insert: vi.fn((payload: Record<string, unknown>) => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: { id: "storyboard-1", ...payload },
          error: null,
        })),
      })),
    })),
  };

  const supabase: { from: (...args: unknown[]) => unknown } = {
    from: vi.fn((table: string) => {
      if (table === "video_projects") {
        return videoProjects;
      }
      if (table === "video_project_entities") {
        return videoProjectEntities;
      }
      if (table === "video_storyboards") {
        return videoStoryboards;
      }
      throw new Error(`Unexpected table ${table}`);
    }) as unknown as (...args: unknown[]) => unknown,
  };

  return {
    user,
    supabase,
    videoProjects,
    videoProjectEntities,
    projectSelectForScript,
    videoStoryboards,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("video project routes", () => {
  test("GET lists authenticated projects", async () => {
    const { supabase, user, videoProjects } = createMockContext();
    requireAuthedSupabaseMock.mockResolvedValue({ supabase, user });

    const response = await listProjects();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.items).toHaveLength(1);
    expect(videoProjects.select).toHaveBeenCalled();
  });

  test("POST creates a project with defaults and user ownership", async () => {
    const { supabase, user, videoProjects } = createMockContext();
    requireAuthedSupabaseMock.mockResolvedValue({ supabase, user });

    const response = await createProject(
      new Request("http://localhost/api/oculus/video-projects", {
        method: "POST",
        body: JSON.stringify({
          title: "新品视频项目",
          prompt: "做一支新品发布短片",
        }),
      })
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.project.user_id).toBe(user.id);
    expect(videoProjects.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: user.id,
        title: "新品视频项目",
        prompt: "做一支新品发布短片",
        genre: "商业短片",
      })
    );
  });
});

describe("entity routes", () => {
  test("extract mode replaces entities from parsed script output", async () => {
    const { supabase, user, videoProjectEntities } = createMockContext();
    const projectTable = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: { script_text: "一段剧本" },
              error: null,
            })),
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    };

    supabase.from = vi.fn((table: string) => {
      if (table === "video_projects") return projectTable;
      if (table === "video_project_entities") return videoProjectEntities;
      throw new Error(`Unexpected table ${table}`);
    }) as unknown as (...args: unknown[]) => unknown;

    requireAuthedSupabaseMock.mockResolvedValue({ supabase, user });
    extractEntitiesFromScriptMock.mockResolvedValue({
      characters: [{ name: "主角", description: "角色描述" }],
      assets: [{ name: "产品", description: "资产描述" }],
      backgrounds: [],
      dialogues: [],
      actions: [],
      emotions: [],
      scenes: [],
    });

    const response = await entitiesPost(
      new Request("http://localhost/api/oculus/video-projects/project-1/entities", {
        method: "POST",
        body: JSON.stringify({ mode: "extract" }),
      }),
      { params: Promise.resolve({ id: "project-1" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(videoProjectEntities.delete).toHaveBeenCalled();
    expect(videoProjectEntities.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: "character", name: "主角" }),
        expect.objectContaining({ type: "asset", name: "产品" }),
      ])
    );
    expect(json.items).toEqual(expect.any(Array));
  });

  test("manual entity POST persists one entity", async () => {
    const { supabase, user, videoProjectEntities } = createMockContext();
    requireAuthedSupabaseMock.mockResolvedValue({ supabase, user });

    const response = await entitiesPost(
      new Request("http://localhost/api/oculus/video-projects/project-1/entities", {
        method: "POST",
        body: JSON.stringify({
          type: "scene",
          name: "雨夜街头",
          description: "高反差霓虹背景",
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(videoProjectEntities.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: "project-1",
        user_id: user.id,
        type: "scene",
        name: "雨夜街头",
      })
    );
    expect(json.entity.name).toBe("雨夜街头");
  });
});

describe("storyboard routes", () => {
  test("POST creates storyboard and advances project stage", async () => {
    const { supabase, user, videoStoryboards, videoProjects } = createMockContext();
    requireAuthedSupabaseMock.mockResolvedValue({ supabase, user });

    const response = await storyboardPost(
      new Request("http://localhost/api/oculus/video-projects/project-1/storyboards", {
        method: "POST",
        body: JSON.stringify({
          shot_count: 9,
          prompt: "九宫格故事板",
          grid_image_url: "https://cdn.example.com/grid.png",
          selected_row: 2,
          selected_col: 1,
          selected_index: 4,
          hd_prompt: "高清分镜提示词",
          hd_image_url: "https://cdn.example.com/hd.png",
          metadata_snapshot: { source: "test" },
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(videoStoryboards.insert).toHaveBeenCalled();
    expect(videoProjects.update).toHaveBeenCalledWith(
      expect.objectContaining({
        current_stage: "storyboard_hd_ready",
      })
    );
    expect(json.storyboard.selected_index).toBe(4);
  });
});
