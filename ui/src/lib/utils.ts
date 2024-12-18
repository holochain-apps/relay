import DOMPurify from "dompurify";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { shareText as sharesheetShareText } from "@buildyourwebapp/tauri-plugin-sharesheet";
import { platform } from "@tauri-apps/plugin-os";
import { setModeCurrent } from "@skeletonlabs/skeleton";
import { open } from "@tauri-apps/plugin-shell";
import linkifyStr from "linkify-string";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

export function sanitizeHTML(html: string) {
  return DOMPurify.sanitize(html);
}

/**
 * Search the provided text for URLs, replacing them with HTML link tags pointing to that URL
 *
 * @param text
 * @returns
 */
export const linkify = (text: string): string =>
  linkifyStr(text, {
    defaultProtocol: "https",
    rel: {
      url: "noopener noreferrer",
    },
    target: "_blank",
  });

export function shareText(text: string): Promise<void> {
  if (!isMobile()) throw Error("Sharesheet is only supported on mobile");

  const normalized = text.trim();
  if (normalized.length === 0) throw Error("Text is empty");

  return sharesheetShareText(normalized);
}

export async function copyToClipboard(text: string) {
  const normalized = text.trim();
  if (normalized.length === 0) throw Error("Text is empty");

  return writeText(text);
}

export async function enqueueNotification(title: string, body: string) {
  try {
    const hasPermission = await isPermissionGranted();
    if (!hasPermission) {
      const permission = await requestPermission();
      if (permission !== "granted") throw new Error("Permission to create notifications denied");
    }

    sendNotification({ title, body });
  } catch (e) {
    console.error("Failed to enqueue notification", e);
  }
}

export function isMobile(): boolean {
  const val = platform();
  return val === "android" || val === "ios";
}

export async function fileToDataUrl(file: File): Promise<string> {
  const reader = new FileReader();
  reader.readAsDataURL(file);

  return new Promise((resolve, reject) => {
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject("Failed to convert File to Image: File contents are not a string");
      }
    };
    reader.onerror = (e) => reject(`Failed to convert File to Image: ${e}`);
  });
}

// To change from light mode to dark mode based on system settings
// XXX: not using the built in skeleton autoModeWatcher() because it doesn't set modeCurrent in JS which we use
function setLightDarkMode(value: boolean) {
  const elemHtmlClasses = document.documentElement.classList;
  const classDark = `dark`;
  value === true ? elemHtmlClasses.remove(classDark) : elemHtmlClasses.add(classDark);
  setModeCurrent(value);
}

export function initLightDarkModeSwitcher() {
  const mql = window.matchMedia("(prefers-color-scheme: light)");

  setLightDarkMode(mql.matches);
  mql.onchange = () => {
    setLightDarkMode(mql.matches);
  };
}

/**
 * Ensure that external links are opened with the system default browser or mail client.
 *
 * @param e: click event
 * @returns
 */
export function handleLinkClick(e: MouseEvent) {
  // Abort if clicked element is not a link
  const anchor = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement;
  if (!anchor || anchor?.href.startsWith(window.location.origin)) return;

  // Handle external links using Tauri's API
  e.preventDefault();
  e.stopPropagation();
  open(anchor.getAttribute("href") as string);
}

export function convertDataURIToUint8Array(dataURI: string): Uint8Array {
  const BASE64_MARKER = ";base64,";
  const base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
  const base64 = dataURI.substring(base64Index);
  const raw = window.atob(base64);
  const array = new Uint8Array(new ArrayBuffer(raw.length));

  for (let i = 0; i < raw.length; i++) {
    array[i] = raw.charCodeAt(i);
  }

  return array;
}
