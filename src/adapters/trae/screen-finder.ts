import path from 'path';
import { TraeConfig } from './config';
import { TRAE_VISUAL_ELEMENTS, VisualElementKey } from './visual-elements';

export interface FindElementResult {
  found: boolean;
  region?: unknown;
  center?: unknown;
  confidence?: number;
  error?: string;
}

export class ScreenFinder {
  private nutjs: any;
  private config: TraeConfig;

  constructor(nutjs: any, config: TraeConfig) {
    this.nutjs = nutjs;
    this.config = config;
  }

  async findElement(key: VisualElementKey): Promise<FindElementResult> {
    const element = TRAE_VISUAL_ELEMENTS[key];
    if (!element) {
      return { found: false, error: `Unknown element: ${String(key)}` };
    }

    const templatePath = path.join(this.config.templateDir, element.imageTemplate);

    try {
      const region = await this.nutjs.screen.find(this.nutjs.imageResource(templatePath), {
        confidence: this.config.confidence,
      });

      const center = await this.nutjs.centerOf(region);

      return {
        found: true,
        region,
        center,
      };
    } catch (error) {
      return {
        found: false,
        error: `Element not found: ${String(key)} (${(error as Error).message})`,
      };
    }
  }

  async waitForElement(key: VisualElementKey, timeoutMs: number = 5000): Promise<FindElementResult> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const result = await this.findElement(key);
      if (result.found) {
        return result;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return { found: false, error: `Timeout waiting for element: ${String(key)}` };
  }
}

