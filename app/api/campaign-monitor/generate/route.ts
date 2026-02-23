import { NextResponse } from "next/server";
import { type CampaignMetric, type ActionLog } from "@/types/campaign-monitor";

export async function POST(req: Request) {
  try {
    const { currentMetrics } = await req.json();
    const lastMetric: CampaignMetric = currentMetrics[currentMetrics.length - 1];

    // Simulate AI decision delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Dynamic Mock: generate the next tick based on the last one
    const newSpend = lastMetric.spend + Math.floor(Math.random() * 50 + 10);
    // Introduce random spikes
    const isAnomaly = Math.random() > 0.85; 
    const newRevenue = lastMetric.revenue + (isAnomaly ? 0 : Math.floor(Math.random() * 150 + 20));
    const newRoi = Number((newRevenue / (newSpend || 1)).toFixed(2));
    const newCpc = Number((lastMetric.cpc + (isAnomaly ? Math.random() * 2 : (Math.random() * 0.4 - 0.2))).toFixed(2));

    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const newMetric: CampaignMetric = {
      timestamp: timeString,
      spend: newSpend,
      revenue: newRevenue,
      roi: newRoi,
      cpc: newCpc,
      status: "running"
    };

    let log: ActionLog | null = null;
    const logId = Math.random().toString(36).substring(7);

    if (newRoi < 1.0 && newSpend > 500) {
      newMetric.status = "paused";
      log = {
        id: logId,
        timestamp: timeString,
        level: "critical",
        message: `检测到连续低转化，当前 ROI 跌破基准线 (1.0)，累计消耗 ¥${newSpend}。`,
        actionTaken: "已触发熔断机制，强制关停极速推流计划。"
      };
    } else if (newCpc > lastMetric.cpc * 1.5) {
      newMetric.status = "warning";
      log = {
        id: logId,
        timestamp: timeString,
        level: "warning",
        message: `大盘竞价波动异常，CPC 瞬间飙升至 ¥${newCpc}。`,
        actionTaken: "已收紧出价上限限制 15% 观察 5 分钟。"
      };
    } else if (newRoi > 3.5) {
      log = {
        id: logId,
        timestamp: timeString,
        level: "success",
        message: `发现高爆量潜质趋势，当前 ROI 突破 3.5 (行业均值 2.0)。`,
        actionTaken: "已自动按 20% 幅度梯度放量，抢占核心流量位。"
      };
    } else {
      // Normal tick, sometimes log info
      if (Math.random() > 0.7) {
        log = {
          id: logId,
          timestamp: timeString,
          level: "info",
          message: `计划平稳运行中，各项指标符合预期。`,
          actionTaken: "保持当前模型出价出价与定向。"
        };
      }
    }

    return NextResponse.json({ metric: newMetric, log });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to process tick" }, { status: 500 });
  }
}
