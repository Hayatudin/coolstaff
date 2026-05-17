import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getFileUrl(path: string | null | undefined) {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:4000').replace(/\/$/, '');
  
  // Ensure the path uses our new secure proxy route
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${baseUrl}/api/assets/${cleanPath}`;
}

export function generateId(): string {
  return `CND-${String(Math.floor(Math.random() * 900) + 100)}`;
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function compressImage(dataUrl: string, maxWidth = 1200, quality = 0.7): Promise<string> {
  return new Promise((resolve, _reject) => {
    if (!dataUrl) return resolve(dataUrl);
    // If it's already a hosted URL or a server-relative path, don't try to compress it
    if (dataUrl.startsWith('http') || dataUrl.startsWith('uploads/') || dataUrl.startsWith('/uploads/')) return resolve(dataUrl);

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (err) {
        console.error('Compression error:', err);
        resolve(dataUrl); // Fallback to original
      }
    };
    img.onerror = () => resolve(dataUrl); // Fallback to original on error
    img.src = dataUrl;
  });
}
