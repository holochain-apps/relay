// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
	// interface Locals {}
	// interface PageData {}
	// interface Error {}
	// interface Platform {}
}

export interface User {
  name: string;
}

// For tauri
declare global {
  interface Window {
    __TAURI__: {
      shell: {
        open: (url: string) => Promise<void>;
      };
      clipboard: {
        writeText: (text: string) => Promise<void>;
      };
    };
  }
}
