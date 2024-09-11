import DOMPurify from 'dompurify';
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { shareText as sharesheetShareText } from "@buildyourwebapp/tauri-plugin-sharesheet";

export const MIN_TITLE_LENGTH = 3;

export function sanitizeHTML(html: string) {
  return DOMPurify.sanitize(html);
}

export function linkify(text: string) {
  const urlPattern = /(?:https?:(?:\/\/)?)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  return text.replace(urlPattern, (match) => {
      // XXX: not quite sure why this is needed, but if i dont do this sveltekit navigates internally and externally at the same time
    const href = match.includes('://') ? match : `https://${match}`
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>`
  })
}

export function shareText(text: string | Promise<string>) {
  if (typeof text === 'string') {
    if (text && text.trim().length > 0) {
      return sharesheetShareText(text);
    }
  } else {
    return text.then(t => sharesheetShareText(t));
  }
}

export function copyToClipboard(text: string | Promise<string>) {
  // @ts-ignore
  // if (window.__TAURI_PLUGIN_CLIPBOARD_MANAGER__) return window.__TAURI_PLUGIN_CLIPBOARD_MANAGER__.writeText(text);
  // return writeText(text);
  if (typeof text === 'string') {
    if (text && text.trim().length > 0) {
      console.log("Copying to clipboard", text);
      return navigator.clipboard.writeText(text);
    }
  } else {
    if (typeof ClipboardItem && navigator.clipboard.write) {
      const item = new ClipboardItem({ "text/plain": text.then(t => {
        console.log("Copying to clipboard", t)
        return new Blob([t], { type: "text/plain" })
      })})
      return navigator.clipboard.write([item])
    } else {
      console.log("Copying to clipboard", text);
      return text.then(t => navigator.clipboard.writeText(t));
    }
  }
}

// Crop avatar image and return a base64 bytes string of its content
export function resizeAndExportAvatar(img: HTMLImageElement) {
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

export function handleFileChange(event: Event, callback: (imageData:string)=> void) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>): void => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const imageData = resizeAndExportAvatar(img)
        callback(imageData)
      };
      img.src = e.target?.result as string;
    };

    reader.onerror = (e): void => {
      console.error('Error reading file:', e);
      reader.abort();
    };

    reader.readAsDataURL(file);
  }
}

async function checkPermission() {
  if (!(await isPermissionGranted())) {
    return (await requestPermission()) === 'granted';
  }
  return true;
}

export async function enqueueNotification(title: string, body: string) {
  if (!(await checkPermission())) {
    return;
  }
  sendNotification({ title, body });
}

export function isLinux(): boolean {
  return navigator.appVersion.includes('Linux')
}

export function isWindows(): boolean {
  return navigator.appVersion.includes('Win')
}

export function isMacOS(): boolean {
  return navigator.appVersion.includes('Mac')
}

export function isDesktop() : boolean {
  return isMacOS() || isLinux() || isWindows()
}

export function isAndroid() : boolean {
  return navigator.appVersion.includes('Android')
}
export function isIOS() : boolean {
  return navigator.appVersion.includes('IOS')
}

export function isMobile() : boolean {
  return isAndroid() || isIOS()
}