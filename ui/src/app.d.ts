// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
  // interface Locals {}
  // interface PageData {}
  // interface Error {}
  // interface Platform {}
}

declare global {
  interface Window {
    __HC_LAUNCHER_ENV__: any;
    __APP_VERSION__: string;
  }
}

export type OutsideClickEventDetail = {
  target: EventTarget | null;
  pointerType: string;
};

declare module "svelte/elements" {
  // allows for more granular control over what element to add the typings to
  export interface DOMAttributes<T> {
    "on:outsideClick"?: (event: CustomEvent<OutsideClickEventDetail>) => void;
  }
}

export {};
