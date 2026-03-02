export class AppManager {
  private nutjs: any;
  private appName: string;

  constructor(nutjs: any, appName: string) {
    this.nutjs = nutjs;
    this.appName = appName;
  }

  async activateApp(): Promise<boolean> {
    const { keyboard, Key } = this.nutjs;
    const isMac = process.platform === 'darwin';

    try {
      if (isMac) {
        await keyboard.pressKey(Key.LeftCmd, Key.Space);
        await keyboard.releaseKey(Key.LeftCmd, Key.Space);
        await new Promise(r => setTimeout(r, 500));

        await keyboard.type(this.appName);
        await new Promise(r => setTimeout(r, 500));

        await keyboard.pressKey(Key.Enter);
        await keyboard.releaseKey(Key.Enter);
      } else {
        await keyboard.pressKey(Key.LeftSuper);
        await keyboard.releaseKey(Key.LeftSuper);
        await new Promise(r => setTimeout(r, 500));

        await keyboard.type(this.appName);
        await new Promise(r => setTimeout(r, 500));

        await keyboard.pressKey(Key.Enter);
        await keyboard.releaseKey(Key.Enter);
      }

      await new Promise(r => setTimeout(r, 2000));
      return true;
    } catch {
      return false;
    }
  }
}

