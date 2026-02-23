export interface CampaignMetric {
  timestamp: string;
  spend: number;
  revenue: number;
  roi: number;
  cpc: number;
  status: "running" | "paused" | "warning";
}

export interface ActionLog {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "critical" | "success";
  message: string;
  actionTaken: string;
}

export interface CampaignSimulationState {
  metrics: CampaignMetric[];
  logs: ActionLog[];
  currentROI: number;
  isSimulating: boolean;
}
