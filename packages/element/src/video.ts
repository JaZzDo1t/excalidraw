import type { FileId } from "./types";

type VideoFrameCacheEntry = {
  image: HTMLImageElement;
  capturedAt: number;
};

export const videoFrameCache = new Map<FileId, VideoFrameCacheEntry>();

/**
 * Capture the current frame of an HTMLVideoElement as an HTMLImageElement.
 * Uses an offscreen canvas for synchronous pixel capture.
 */
export const captureVideoFrame = (
  videoEl: HTMLVideoElement,
): HTMLImageElement => {
  const canvas = document.createElement("canvas");
  canvas.width = videoEl.videoWidth || videoEl.width || 320;
  canvas.height = videoEl.videoHeight || videoEl.height || 240;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  const img = new Image();
  img.src = canvas.toDataURL("image/png");
  return img;
};

/**
 * Capture and store a frame into the videoFrameCache.
 */
export const captureAndCacheVideoFrame = (
  fileId: FileId,
  videoEl: HTMLVideoElement,
): HTMLImageElement => {
  const img = captureVideoFrame(videoEl);
  videoFrameCache.set(fileId, {
    image: img,
    capturedAt: videoEl.currentTime,
  });
  return img;
};

/**
 * Generate a thumbnail from a video dataURL at a specific time.
 * Creates a temporary <video>, seeks, captures, then destroys it.
 */
export const generateVideoThumbnail = (
  dataURL: string,
  timeSeconds: number = 0,
): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const blob = dataURLToBlob(dataURL);
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const cleanup = () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };

    video.addEventListener("loadedmetadata", () => {
      // Clamp seek time to valid range
      const seekTime = Math.min(timeSeconds, video.duration || 0);
      video.currentTime = seekTime;
    });

    video.addEventListener("seeked", () => {
      try {
        const img = captureVideoFrame(video);
        // Wait for the image to fully load from the data URL
        img.onload = () => {
          cleanup();
          resolve(img);
        };
        img.onerror = () => {
          cleanup();
          reject(new Error("Failed to load captured video frame"));
        };
      } catch (e) {
        cleanup();
        reject(e);
      }
    });

    video.addEventListener("error", () => {
      cleanup();
      reject(new Error("Failed to load video for thumbnail generation"));
    });
  });
};

/**
 * Get video metadata (duration, width, height) from a dataURL.
 */
export const getVideoMetadata = (
  dataURL: string,
): Promise<{ duration: number; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const blob = dataURLToBlob(dataURL);
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = url;

    video.addEventListener("loadedmetadata", () => {
      const result = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(result);
    });

    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video metadata"));
    });
  });
};

/**
 * Remove a cached frame for a video element.
 */
export const revokeVideoFrame = (fileId: FileId): void => {
  videoFrameCache.delete(fileId);
};

/**
 * Convert a base64 dataURL to a Blob.
 */
const dataURLToBlob = (dataURL: string): Blob => {
  const parts = dataURL.split(",");
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const byteString = atob(parts[1] || "");
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
};

/**
 * Create a Blob URL from a base64 dataURL (for video playback).
 */
export const dataURLToBlobURL = (dataURL: string): string => {
  const blob = dataURLToBlob(dataURL);
  return URL.createObjectURL(blob);
};
