export interface StreamerProfile {
  id: string;
  name: string;
  avatar?: string;
  tags: string[];
  conversionRate: number; // e.g., 0.05 for 5%
  avgTicketSize: number; // e.g., 150
  maxHours: number;
}

export interface TimeSlot {
  startTime: string; // e.g., "08:00"
  endTime: string;   // e.g., "12:00"
  predictedTraffic: "Low" | "Medium" | "High" | "Peak";
}

export interface AssignedSlot {
  timeSlot: string;      // e.g., "08:00 - 12:00"
  trafficLevel: string;
  streamerId: string;
  streamerName: string;
  reasoning: string;
}

export interface HostSchedulingResponse {
  schedule: AssignedSlot[];
  overallStrategy: string;
  estimatedGMVBoost: string;
}
