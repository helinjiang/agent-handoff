import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface AgentHandoffConfig {
  defaultWorkspace?: string;
  events?: {
    enabled: boolean;
    logStepStarted: boolean;
    logStepDone: boolean;
  };
  clipboard?: {
    autoCopy: boolean;
  };
  prompt?: {
    templatePath?: string;
    language: 'zh' | 'en';
  };
  validation?: {
    strict: boolean;
    warnOnShortContent: boolean;
  };
}

export const DEFAULT_CONFIG: AgentHandoffConfig = {
  events: {
    enabled: true,
    logStepStarted: true,
    logStepDone: true,
  },
  clipboard: {
    autoCopy: false,
  },
  prompt: {
    language: 'zh',
  },
  validation: {
    strict: false,
    warnOnShortContent: true,
  },
};

const CONFIG_FILES = [
  '.agenthandoffrc',
  '.agenthandoffrc.json',
  '.agenthandoffrc.yaml',
  '.agenthandoffrc.yml',
];

const configCache = new Map<string, AgentHandoffConfig>();

export async function findConfigFile(startPath: string): Promise<string | null> {
  let currentPath = path.resolve(startPath);
  const homePath = os.homedir();

  while (true) {
    for (const configFile of CONFIG_FILES) {
      const filePath = path.join(currentPath, configFile);
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        // File doesn't exist, continue
      }
    }

    const packageJsonPath = path.join(currentPath, 'package.json');
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      if (pkg.agenthandoff) {
        return packageJsonPath;
      }
    } catch {
      // File doesn't exist or invalid, continue
    }

    if (currentPath === homePath || currentPath === path.dirname(currentPath)) {
      break;
    }
    currentPath = path.dirname(currentPath);
  }

  return null;
}

export async function loadConfigFile(filePath: string): Promise<Partial<AgentHandoffConfig>> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath);

    if (ext === '.yaml' || ext === '.yml') {
      return parseYaml(content);
    }

    if (filePath.endsWith('package.json')) {
      const pkg = JSON.parse(content);
      return pkg.agenthandoff || {};
    }

    return JSON.parse(content);
  } catch {
    return {};
  }
}

function parseYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');
  let currentObj: Record<string, unknown> = result;
  const stack: Array<{ obj: Record<string, unknown> }> = [];

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    if (trimmed.includes(':')) {
      const colonIndex = trimmed.indexOf(':');
      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();

      if (value === '') {
        if (stack.length > 0) {
          const expectedIndent = stack.length * 2;
          if (indent < expectedIndent) {
            while (stack.length > 0 && indent < stack.length * 2) {
              stack.pop();
            }
            if (stack.length > 0) {
              currentObj = stack[stack.length - 1].obj as Record<string, unknown>;
            } else {
              currentObj = result;
            }
          }
        }

        const newObj: Record<string, unknown> = {};
        currentObj[key] = newObj;
        stack.push({ obj: currentObj });
        currentObj = newObj;
      } else {
        let parsedValue: unknown = value;
        if (value === 'true') parsedValue = true;
        else if (value === 'false') parsedValue = false;
        else if (value === 'null') parsedValue = null;
        else if (/^\d+$/.test(value)) parsedValue = parseInt(value, 10);
        else if (/^\d+\.\d+$/.test(value)) parsedValue = parseFloat(value);
        else if (value.startsWith('"') && value.endsWith('"')) {
          parsedValue = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          parsedValue = value.slice(1, -1);
        }

        currentObj[key] = parsedValue;
      }
    }
  }

  return result;
}

export function mergeConfig(
  base: AgentHandoffConfig,
  override: Partial<AgentHandoffConfig>
): AgentHandoffConfig {
  const result: AgentHandoffConfig = JSON.parse(JSON.stringify(base));

  for (const key of Object.keys(override) as Array<keyof AgentHandoffConfig>) {
    const overrideValue = override[key];
    if (overrideValue === undefined) continue;

    if (
      typeof overrideValue === 'object' &&
      overrideValue !== null &&
      !Array.isArray(overrideValue)
    ) {
      const baseValue = result[key];
      if (
        typeof baseValue === 'object' &&
        baseValue !== null &&
        !Array.isArray(baseValue)
      ) {
        // Deep merge for nested objects
        (result as Record<string, unknown>)[key] = mergeConfig(
          baseValue as AgentHandoffConfig,
          overrideValue as Partial<AgentHandoffConfig>
        );
      } else {
        (result as Record<string, unknown>)[key] = overrideValue;
      }
    } else {
      (result as Record<string, unknown>)[key] = overrideValue;
    }
  }

  return result;
}

export async function loadConfig(workspacePath?: string): Promise<AgentHandoffConfig> {
  const startPath = workspacePath ? path.resolve(workspacePath) : process.cwd();
  const cacheKey = startPath;

  if (configCache.has(cacheKey)) {
    return configCache.get(cacheKey)!;
  }

  let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as AgentHandoffConfig;

  const globalConfigPath = path.join(os.homedir(), '.agenthandoffrc');
  try {
    await fs.access(globalConfigPath);
    const globalConfig = await loadConfigFile(globalConfigPath);
    config = mergeConfig(config, globalConfig);
  } catch {
    // Global config doesn't exist
  }

  const localConfigFile = await findConfigFile(startPath);
  if (localConfigFile) {
    const localConfig = await loadConfigFile(localConfigFile);
    config = mergeConfig(config, localConfig);
  }

  configCache.set(cacheKey, config);
  return config;
}

export function clearConfigCache(): void {
  configCache.clear();
}

export async function initConfigFile(targetPath: string, global = false): Promise<string> {
  const configPath = global
    ? path.join(os.homedir(), '.agenthandoffrc')
    : path.join(targetPath, '.agenthandoffrc');

  const content = JSON.stringify(DEFAULT_CONFIG, null, 2);
  await fs.writeFile(configPath, content, 'utf-8');

  return configPath;
}
