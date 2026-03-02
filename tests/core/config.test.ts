import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  loadConfig,
  findConfigFile,
  mergeConfig,
  loadConfigFile,
  DEFAULT_CONFIG,
  clearConfigCache,
  initConfigFile,
} from '../../src/core/config';

describe('config', () => {
  const testDir = path.join(process.cwd(), 'test-config-workspace');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    clearConfigCache();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
    clearConfigCache();
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have default values', () => {
      expect(DEFAULT_CONFIG.events?.enabled).toBe(true);
      expect(DEFAULT_CONFIG.events?.logStepStarted).toBe(true);
      expect(DEFAULT_CONFIG.events?.logStepDone).toBe(true);
      expect(DEFAULT_CONFIG.clipboard?.autoCopy).toBe(false);
      expect(DEFAULT_CONFIG.prompt?.language).toBe('zh');
      expect(DEFAULT_CONFIG.validation?.strict).toBe(false);
      expect(DEFAULT_CONFIG.validation?.warnOnShortContent).toBe(true);
    });
  });

  describe('loadConfig', () => {
    it('should return default config when no config file', async () => {
      const config = await loadConfig(testDir);
      expect(config.events?.enabled).toBe(true);
      expect(config.clipboard?.autoCopy).toBe(false);
    });

    it('should load .agenthandoffrc json file', async () => {
      await fs.writeFile(
        path.join(testDir, '.agenthandoffrc'),
        JSON.stringify({ clipboard: { autoCopy: true } })
      );

      const config = await loadConfig(testDir);
      expect(config.clipboard?.autoCopy).toBe(true);
      expect(config.events?.enabled).toBe(true); // preserved default
    });

    it('should load .agenthandoffrc.json file', async () => {
      await fs.writeFile(
        path.join(testDir, '.agenthandoffrc.json'),
        JSON.stringify({ prompt: { language: 'en' } })
      );

      const config = await loadConfig(testDir);
      expect(config.prompt?.language).toBe('en');
    });

    it('should load .agenthandoffrc.yaml file', async () => {
      await fs.writeFile(
        path.join(testDir, '.agenthandoffrc.yaml'),
        'clipboard:\n  autoCopy: true'
      );

      const config = await loadConfig(testDir);
      expect(config.clipboard?.autoCopy).toBe(true);
    });

    it('should handle invalid json gracefully', async () => {
      await fs.writeFile(path.join(testDir, '.agenthandoffrc'), 'invalid json');

      const config = await loadConfig(testDir);
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should load config from package.json', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          agenthandoff: {
            clipboard: { autoCopy: true },
          },
        })
      );

      const config = await loadConfig(testDir);
      expect(config.clipboard?.autoCopy).toBe(true);
    });
  });

  describe('findConfigFile', () => {
    it('should find config file in current directory', async () => {
      await fs.writeFile(
        path.join(testDir, '.agenthandoffrc'),
        JSON.stringify({ clipboard: { autoCopy: true } })
      );

      const configFile = await findConfigFile(testDir);
      expect(configFile).toBe(path.join(testDir, '.agenthandoffrc'));
    });

    it('should find config file in parent directory', async () => {
      const subDir = path.join(testDir, 'subdir');
      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(
        path.join(testDir, '.agenthandoffrc'),
        JSON.stringify({ clipboard: { autoCopy: true } })
      );

      const configFile = await findConfigFile(subDir);
      expect(configFile).toBe(path.join(testDir, '.agenthandoffrc'));
    });

    it('should return null when no config file found', async () => {
      const configFile = await findConfigFile(testDir);
      expect(configFile).toBeNull();
    });

    it('should prefer .agenthandoffrc over .agenthandoffrc.json', async () => {
      await fs.writeFile(
        path.join(testDir, '.agenthandoffrc'),
        JSON.stringify({ clipboard: { autoCopy: true } })
      );
      await fs.writeFile(
        path.join(testDir, '.agenthandoffrc.json'),
        JSON.stringify({ clipboard: { autoCopy: false } })
      );

      const configFile = await findConfigFile(testDir);
      expect(configFile).toBe(path.join(testDir, '.agenthandoffrc'));
    });
  });

  describe('loadConfigFile', () => {
    it('should load json config file', async () => {
      const configPath = path.join(testDir, '.agenthandoffrc');
      await fs.writeFile(configPath, JSON.stringify({ clipboard: { autoCopy: true } }));

      const config = await loadConfigFile(configPath);
      expect(config.clipboard?.autoCopy).toBe(true);
    });

    it('should load yaml config file', async () => {
      const configPath = path.join(testDir, '.agenthandoffrc.yaml');
      await fs.writeFile(
        configPath,
        `
clipboard:
  autoCopy: true
events:
  enabled: false
`
      );

      const config = await loadConfigFile(configPath);
      expect(config.clipboard?.autoCopy).toBe(true);
      expect(config.events?.enabled).toBe(false);
    });

    it('should return empty object for invalid file', async () => {
      const configPath = path.join(testDir, '.agenthandoffrc');
      await fs.writeFile(configPath, 'not valid json');

      const config = await loadConfigFile(configPath);
      expect(config).toEqual({});
    });
  });

  describe('mergeConfig', () => {
    it('should merge configs correctly', () => {
      const base = DEFAULT_CONFIG;
      const override = {
        clipboard: { autoCopy: true },
      };

      const merged = mergeConfig(base, override);
      expect(merged.clipboard?.autoCopy).toBe(true);
      expect(merged.events?.enabled).toBe(true); // preserved default
    });

    it('should deep merge nested objects', () => {
      const base = DEFAULT_CONFIG;
      const override = {
        events: {
          enabled: false,
          logStepStarted: true,
          logStepDone: true,
        },
      };

      const merged = mergeConfig(base, override);
      expect(merged.events?.enabled).toBe(false);
      expect(merged.events?.logStepStarted).toBe(true);
    });

    it('should override arrays', () => {
      const base = { ...DEFAULT_CONFIG, defaultWorkspace: 'old' };
      const override = { defaultWorkspace: 'new' };

      const merged = mergeConfig(base, override);
      expect(merged.defaultWorkspace).toBe('new');
    });

    it('should handle undefined override values', () => {
      const base = DEFAULT_CONFIG;
      const override = { defaultWorkspace: undefined };

      const merged = mergeConfig(base, override);
      expect(merged.defaultWorkspace).toBeUndefined();
    });
  });

  describe('initConfigFile', () => {
    it('should create config file with default values', async () => {
      const configPath = await initConfigFile(testDir);
      expect(configPath).toBe(path.join(testDir, '.agenthandoffrc'));

      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      expect(config.events?.enabled).toBe(true);
    });

    it('should create global config file', async () => {
      const configPath = await initConfigFile(testDir, true);
      expect(configPath).toBe(path.join(os.homedir(), '.agenthandoffrc'));

      // Clean up
      try {
        await fs.unlink(configPath);
      } catch {}
    });
  });

  describe('clearConfigCache', () => {
    it('should clear cached config', async () => {
      await fs.writeFile(
        path.join(testDir, '.agenthandoffrc'),
        JSON.stringify({ clipboard: { autoCopy: true } })
      );

      const config1 = await loadConfig(testDir);
      expect(config1.clipboard?.autoCopy).toBe(true);

      await fs.writeFile(
        path.join(testDir, '.agenthandoffrc'),
        JSON.stringify({ clipboard: { autoCopy: false } })
      );

      clearConfigCache();

      const config2 = await loadConfig(testDir);
      expect(config2.clipboard?.autoCopy).toBe(false);
    });
  });
});
