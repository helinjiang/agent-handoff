export interface VisualElement {
  id: string;
  imageTemplate: string;
  description: string;
  role: 'button' | 'input' | 'indicator';
}

export interface TraeOperation {
  type: 'click' | 'type' | 'hotkey' | 'wait' | 'screenshot' | 'activate';
  target?: string;
  value?: string;
  modifiers?: string[];
  timestamp: number;
}

export interface TraeSession {
  id: string;
  startedAt: string;
  workspacePath: string;
  stepId: string;
  operations: TraeOperation[];
  screenshots: string[];
}

