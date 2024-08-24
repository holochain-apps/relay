import DOMPurify from 'dompurify';
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

export const MIN_TITLE_LENGTH = 3;

export function sanitizeHTML(html: string) {
  return DOMPurify.sanitize(html);
}

export function linkify(text: string) {
  const urlPattern = /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
  return text.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

export function copyToClipboard(text: string) {
  // @ts-ignore
  console.log("Copying to clipboard", text, window.__TAURI__);
  // @ts-ignore
  if (window.__TAURI__) return writeText(text);
  return navigator.clipboard.writeText(text);
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