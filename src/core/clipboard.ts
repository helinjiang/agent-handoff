import clipboard from 'clipboardy';

export interface ClipboardResult {
  success: boolean;
  error?: string;
}

let clipboardSupported: boolean | null = null;

export function isClipboardSupported(): boolean {
  if (clipboardSupported !== null) {
    return clipboardSupported;
  }

  try {
    clipboardSupported = true;
    return true;
  } catch {
    clipboardSupported = false;
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<ClipboardResult> {
  try {
    await clipboard.write(text);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function readFromClipboard(): Promise<string> {
  try {
    return await clipboard.read();
  } catch {
    return '';
  }
}
