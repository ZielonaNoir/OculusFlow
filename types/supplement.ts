export type SupplementAgentPhase =
  | "idle"
  | "ingredient_analysis"
  | "audience_insight"
  | "benefit_translation"
  | "compliance_review"
  | "completed"
  | "failed";

export interface EfficacyClaim {
  title: string;
  description: string;
}

export interface ComplianceNote {
  claim: string;
  compliantVersion: string;
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

export interface SupplementResponse {
  /** 核心成分 → 消费者利益转化 */
  efficacyClaims: EfficacyClaim[];
  /** 使用场景 */
  scenarios: string[];
  /** 包装图/场景图设计建议 */
  mainImages: MainImageSuggestion[];
  /** 详情页长图板块结构 */
  longPageStructure: PageSection[];
  /** 买家秀/评价库素材 */
  reviews: BuyerReview[];
  /** 问大家·Q&A */
  qna: QnAItem[];
  /** 合规替换建议（禁止绝对化用语的替换版本） */
  complianceNotes: ComplianceNote[];
}
