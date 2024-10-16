import { get, writable, type Writable } from "svelte/store";
import { platform } from "@tauri-apps/plugin-os";
import { goto } from "$app/navigation";
import { page } from '$app/stores';

class ScanStore {
  public isSupported: Writable<boolean>;
  public value: Writable<string | null>;
  public onCompleteGoto: Writable<string | null>;

  constructor() {
    const currentPlatform = platform();
    this.isSupported = writable(Boolean(currentPlatform === "ios" || currentPlatform === "android"));
    this.value = writable(null);
    this.onCompleteGoto = writable(null);
  }

  scan() {
    if(!get(this.isSupported)) return;

    // Save current path so we can navigate there upon completion
    const currentPath = get(page).url.pathname;
    this.onCompleteGoto.set(currentPath);

    // Goto scan page
    goto('/scan', { replaceState: true });
  }

  complete() {
    const onCompleteGoto = get(scanStore.onCompleteGoto);
    if(onCompleteGoto) {
      goto(onCompleteGoto, {replaceState: true});
    }
  }

  reset() {
    this.value.set(null);
    this.onCompleteGoto.set(null);
  }

  readResult() {
    if(get(scanStore.onCompleteGoto) !== get(page).url.pathname) return null;

    const result = get(scanStore.value);
    scanStore.reset();
    return result;
  }
}

export const scanStore = new ScanStore();