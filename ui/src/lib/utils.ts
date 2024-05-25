import { writeText } from '@tauri-apps/api/clipboard';

export function copyToClipboard(text: string) {
  console.log("copying to clipboard2", text, window.__TAURI__);
  // @ts-ignore
  if (window.__TAURI__) return writeText(text);
  return navigator.clipboard.writeText(text);
}
