import { NextResponse } from "next/server";
import { type HostSchedulingResponse, type StreamerProfile } from "@/types/host-scheduling";

// API constants removed for mock implementation

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { streamers } = body;

    // To simulate AI thinking time
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Dynamic Mock based on input streamers
    const activeStreamers: StreamerProfile[] = streamers || [];
    
    // Sort streamers by conversion rate to find the "best" one for peak hour
    const sortedStreamers = [...activeStreamers].sort((a, b) => b.conversionRate - a.conversionRate);
    const topStreamer = sortedStreamers[0];
    const midStreamer = sortedStreamers[1] || topStreamer;
    const nightStreamer = sortedStreamers[2] || topStreamer;
    const morningStreamer = sortedStreamers[3] || nightStreamer;

    const mockResponse: HostSchedulingResponse = {
      overallStrategy: "根据大盘数据预测与各主播历史转化模型，系统采取【田忌赛马】策略：将客单价与转化率双高的头部主播配置在晚间20:00-24:00流量极峰段；中腰部表现稳定的主播覆盖下午场；而具有较强抗疲劳能力的新星主播负责拉通凌晨及早间长尾流量。确保流量高峰期GMV最大化，低谷期维持场观热度。",
      estimatedGMVBoost: "+24.5%",
      schedule: [
        {
          timeSlot: "08:00 - 14:00",
          trafficLevel: "Low",
          streamerId: morningStreamer?.id || "s4",
          streamerName: morningStreamer?.name || "破晓主播",
          reasoning: "该时段流量处于爬坡期，适合亲和力强、语速平稳的主播进行福利款宣导，拉升停留数据。"
        },
        {
          timeSlot: "14:00 - 20:00",
          trafficLevel: "Medium",
          streamerId: midStreamer?.id || "s2",
          streamerName: midStreamer?.name || "午后主播",
          reasoning: "承接下午自然流量，该主播各项素质均衡，能够稳定转化家庭主妇及学生群体。"
        },
        {
          timeSlot: "20:00 - 24:00",
          trafficLevel: "Peak",
          streamerId: topStreamer?.id || "s1",
          streamerName: topStreamer?.name || "王牌主播",
          reasoning: "全站流量峰值时段！该主播历史转化率最高，将其安排在此刻主推高客单利润款，实现单日GMV冲顶。"
        },
        {
          timeSlot: "00:00 - 08:00",
          trafficLevel: "Low",
          streamerId: nightStreamer?.id || "s3",
          streamerName: nightStreamer?.name || "夜猫主播",
          reasoning: "该时段为夜猫子流量，该主播擅长制造情绪互动，能有效打透深夜冲动消费客群，并承接早间红利。"
        }
      ]
    };

    return NextResponse.json({ result: mockResponse });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate schedule" }, { status: 500 });
  }
}
