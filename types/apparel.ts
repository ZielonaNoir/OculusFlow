export type MultiAgentPhase = 
  | "idle"
  | "vision_analysis"
  | "psychological_insight"
  | "copywriting"
  | "quality_review"
  | "completed"
  | "failed";

export interface SellingPoint {
  title: string;
  description: string;
}

export interface MainImageSuggestion {
  index: number;
  concept: string;
  suggestion: string;
}

export interface PageSection {
  section: string;
  content: string;
}

export interface BuyerReview {
  persona: string;
  content: string;
}

export interface QnAItem {
  question: string;
  answer: string;
}

export interface ApparelResponse {
  sellingPoints: SellingPoint[];
  scenarios: string[];
  mainImages: MainImageSuggestion[];
  longPageStructure: PageSection[];
  reviews: BuyerReview[];
  qna: QnAItem[];
}
