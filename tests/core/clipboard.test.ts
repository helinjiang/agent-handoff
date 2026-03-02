import { describe, it, expect, beforeEach } from 'vitest';
import {
  copyToClipboard,
  readFromClipboard,
  isClipboardSupported,
} from '../../src/core/clipboard';

describe('clipboard', () => {
  beforeEach(() => {
  });

  it('should detect clipboard support', () => {
    const supported = isClipboardSupported();
    expect(typeof supported).toBe('boolean');
  });

  it('should copy text successfully', async () => {
    if (!isClipboardSupported()) {
      return;
    }

    const testText = 'Hello, AgentHandoff!';
    const result = await copyToClipboard(testText);
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should read text from clipboard', async () => {
    if (!isClipboardSupported()) {
      return;
    }

    const testText = 'Test content for reading';
    await copyToClipboard(testText);
    const readText = await readFromClipboard();
    expect(readText).toBe(testText);
  });

  it('should handle empty text', async () => {
    if (!isClipboardSupported()) {
      return;
    }

    const result = await copyToClipboard('');
    expect(result.success).toBe(true);
  });

  it('should handle long text', async () => {
    if (!isClipboardSupported()) {
      return;
    }

    const longText = 'x'.repeat(10000);
    const result = await copyToClipboard(longText);
    expect(result.success).toBe(true);

    const readText = await readFromClipboard();
    expect(readText).toBe(longText);
  });

  it('should handle multiline text', async () => {
    if (!isClipboardSupported()) {
      return;
    }

    const multilineText = `Line 1
Line 2
Line 3`;
    const result = await copyToClipboard(multilineText);
    expect(result.success).toBe(true);

    const readText = await readFromClipboard();
    expect(readText).toBe(multilineText);
  });

  it('should handle unicode text', async () => {
    if (!isClipboardSupported()) {
      return;
    }

    const unicodeText = '你好世界 🌍 Hello 世界';
    const result = await copyToClipboard(unicodeText);
    expect(result.success).toBe(true);

    const readText = await readFromClipboard();
    expect(readText).toBe(unicodeText);
  });
});
