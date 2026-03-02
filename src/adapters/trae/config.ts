export interface TraeConfig {
  enabled: boolean;
  timeout: number;
  retries: number;
  screenshot: boolean;
  screenshotDir: string;
  confidence: number;
  typingDelay: number;
  templateDir: string;
  appName: string;
}

export const DEFAULT_TRAE_CONFIG: TraeConfig = {
  enabled: false,
  timeout: 30000,
  retries: 3,
  screenshot: false,
  screenshotDir: 'screenshots',
  confidence: 0.8,
  typingDelay: 10,
  templateDir: 'templates/trae',
  appName: 'Trae',
};

