// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
  // interface Locals {}
  // interface PageData {}
  // interface Error {}
  // interface Platform {}
}

declare const __APP_VERSION__: string;

// For tauri
declare global {
  interface Window {
    __TAURI_PLUGIN_SHELL__: {
      Command: {
        create: (command: string, url: string) => Promise<void>;
      };
      open: (url: string) => Promise<void>;
    };
    __TAURI_PLUGIN_CLIPBOARD_MANAGER__: {
      writeText: (text: string) => Promise<void>;
    };
  }
}

export {};
