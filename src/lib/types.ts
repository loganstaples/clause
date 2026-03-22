export interface Clause {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  originalText: string;
  location: string;
  explanation: string;
  corporateBenchmark: string;
  suggestedReplacement: string;
}

export interface ContractAnalysis {
  riskScore: number;
  summary: string;
  counts: {
    critical: number;
    warning: number;
    info: number;
  };
  clauses: Clause[];
}

export interface Contract {
  id: string;
  name: string;
  uploadedAt: string;
  rawText: string;
  contractType?: string;
  analysis: ContractAnalysis | null;
  chatHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Case {
  id: string;
  name: string;
  contractIds: string[];
}
