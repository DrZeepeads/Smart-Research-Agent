export enum AgentStatus {
  IDLE = 'IDLE',
  PLANNING = 'PLANNING',
  EXECUTING = 'EXECUTING',
  SYNTHESIZING = 'SYNTHESIZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface ResearchStep {
  id: string;
  query: string;
  rationale: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  result?: string;
}

export interface ResearchPlan {
  topic: string;
  steps: ResearchStep[];
}

export interface ReportSection {
  title: string;
  content: string;
}

export interface FinalReport {
  title: string;
  summary: string;
  sections: ReportSection[];
  conclusion: string;
}

export interface AgentLog {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}
