import DOMPurify from "dompurify";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { shareText as sharesheetShareText } from "@buildyourwebapp/tauri-plugin-sharesheet";
import { platform } from "@tauri-apps/plugin-os";
import { setModeCurrent } from "@skeletonlabs/skeleton";
import { goto } from "$app/navigation";
import { open } from "@tauri-apps/plugin-shell";

/**
 * Sanitize user-inputted HTML before we render it to prevent XSS attacks
 * 
 * @param html 
 * @returns 
 */
export function sanitizeHTML(html: string) {
  return DOMPurify.sanitize(html);
}

/**
 * Search the provided text for URLs, replacing them with HTML link tags pointing to that URL
 * 
 * @param text 
 * @returns 
 */
export function linkify(text: string) {
  const urlPattern =
    /(?:https?:(?:\/\/)?)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  return text.replace(urlPattern, (match) => {
    // XXX: not quite sure why this is needed, but if i dont do this sveltekit navigates internally and externally at the same time
    const href = match.includes("://") ? match : `https://${match}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>`;
  });
}

/**
 * Share text via sharesheet
 * 
 * @param text 
 * @returns 
 */
export function shareText(text: string): Promise<void> {
  if(!isMobile()) throw Error("Sharesheet is only supported on mobile");

  const normalized = text.trim();
  if (normalized.length === 0) throw Error("Text is empty");
  
  return sharesheetShareText(normalized);
}

/**
 * Copy text to clipboard
 * 
 * @param text 
 * @returns 
 */
export function copyToClipboard(text: string): Promise<void> {
  const normalized = text.trim();
  if (normalized.length === 0) throw Error("Text is empty");
  
  return navigator.clipboard.writeText(text);
}

/**
 * Crop avatar image and return a data url of its content

 * @param img 
 * @returns 
 */
export function resizeAndExportAvatar(img: HTMLImageElement): string {
  const MAX_WIDTH = 300;
  const MAX_HEIGHT = 300;

  let width = img.width;
  let height = img.height;

  // Change the resizing logic
  if (width > height) {
    if (width > MAX_WIDTH) {
      height = height * (MAX_WIDTH / width);
      width = MAX_WIDTH;
    }
  } else {
    if (height > MAX_HEIGHT) {
      width = width * (MAX_HEIGHT / height);
      height = MAX_HEIGHT;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.drawImage(img, 0, 0, width, height);

  // return the .toDataURL of the temp canvas
  return canvas.toDataURL();
}

export function handleFileChange(event: Event, callback: (imageData: string) => void) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>): void => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const imageData = resizeAndExportAvatar(img);
        callback(imageData);
      };
      img.src = e.target?.result as string;
    };

    reader.onerror = (e): void => {
      console.error("Error reading file:", e);
      reader.abort();
    };

    reader.readAsDataURL(file);
  }
}

/**
 * Send a system notification
 * If permissions have not been granted for sending notifications, request them.
 * 
 * @param title 
 * @param body 
 */
export async function enqueueNotification(title: string, body: string) {
  try {
    const hasPermission = await isPermissionGranted();
    if (!hasPermission) {
      const permission = await requestPermission();

      if(permission !== "granted") 
        throw new Error("Permission to create notifications denied");
    }

    sendNotification({ title, body });
  } catch(e) {
    console.error("Failed to enqueue notification");
  }
}

export function isMobile(): boolean {
  const p = platform();
  return p === "android" || p === "ios";
}

/**
 * Convert file to data url
 * 
 * @param file file
 * @returns 
 */
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

// Prevent internal links from opening in the browser when using Tauri
export function handleLinkClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  // Ensure the clicked element is an anchor and has a href attribute
  if (target.closest("a[href]")) {
    // Prevent default action
    event.preventDefault();
    event.stopPropagation();

    const anchor = target.closest("a") as HTMLAnchorElement;
    let link = anchor.getAttribute("href");
    if (
      anchor &&
      anchor.href.startsWith(window.location.origin) &&
      !anchor.getAttribute("rel")?.includes("noopener")
    ) {
      return goto(anchor.pathname); // Navigate internally using SvelteKit's goto
    } else if (anchor && link) {
      // Handle external links using Tauri's API
      if (!link.includes("://")) {
        link = `https://${link}`;
      }
      open(link);
    }
  }
}
