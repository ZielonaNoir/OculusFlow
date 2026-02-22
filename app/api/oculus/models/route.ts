import { NextResponse } from "next/server";

const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY || "";
const BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";

// Fallback model list when API key is not configured
const FALLBACK_MODELS = [
  {
    id: "ep-your-endpoint-id",
    object: "model",
    display_name: "Doubao-pro-32k (请配置 Endpoint ID)",
    type: "text",
    owned_by: "volcengine",
  },
];

export async function GET() {
  if (!VOLCENGINE_API_KEY) {
    return NextResponse.json({
      models: FALLBACK_MODELS,
      configured: false,
      message: "VOLCENGINE_API_KEY not configured",
    });
  }

  try {
    const response = await fetch(`${BASE_URL}/models`, {
      headers: {
        Authorization: `Bearer ${VOLCENGINE_API_KEY}`,
        "Content-Type": "application/json",
      },
      // Cache for 5 minutes
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Models API error:", err);
      return NextResponse.json({
        models: FALLBACK_MODELS,
        configured: true,
        error: `API error: ${response.status}`,
      });
    }

    const data = await response.json();
    // Ark API returns { data: [...models] }
    const rawModels = data.data || data.models || [];

    // Filter and format models
    const models = rawModels.map((m: Record<string, string>) => ({
      id: m.id,
      object: m.object || "model",
      display_name: m.id,
      owned_by: m.owned_by || "volcengine",
    }));

    return NextResponse.json({
      models: models.length > 0 ? models : FALLBACK_MODELS,
      configured: true,
      total: models.length,
    });
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json({
      models: FALLBACK_MODELS,
      configured: true,
      error: "Failed to fetch models",
    });
  }
}
