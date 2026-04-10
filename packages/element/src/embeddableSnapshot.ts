import html2canvas from "html2canvas";

type EmbeddableFrameCacheEntry = {
  image: HTMLImageElement;
  capturedAt: number;
};

export const embeddableFrameCache = new Map<string, EmbeddableFrameCacheEntry>();

/**
 * Capture an iframe's visible content as an HTMLImageElement
 * using html2canvas to rasterize the DOM.
 */
export const captureEmbeddableFrame = async (
  iframeEl: HTMLIFrameElement,
  width: number,
  height: number,
): Promise<HTMLImageElement> => {
  const doc = iframeEl.contentDocument;
  if (!doc?.documentElement) {
    throw new Error("Cannot access iframe document (cross-origin?)");
  }

  const canvas = await html2canvas(doc.documentElement, {
    width: Math.round(width),
    height: Math.round(height),
    scale: 2,
    useCORS: true,
    logging: false,
    allowTaint: true,
  });

  const img = new Image();
  img.src = canvas.toDataURL("image/png");

  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load embeddable snapshot"));
  });
};

/**
 * Capture snapshot and store in cache.
 */
export const captureAndCacheEmbeddableFrame = async (
  elementId: string,
  iframeEl: HTMLIFrameElement,
  width: number,
  height: number,
): Promise<HTMLImageElement | null> => {
  try {
    const img = await captureEmbeddableFrame(iframeEl, width, height);
    embeddableFrameCache.set(elementId, {
      image: img,
      capturedAt: Date.now(),
    });
    return img;
  } catch (e) {
    console.warn("Failed to capture embeddable snapshot:", e);
    return null;
  }
};

/**
 * Generate initial snapshot from raw HTML string by creating
 * a temporary hidden iframe, rendering it, and capturing.
 */
export const generateEmbeddableSnapshot = async (
  elementId: string,
  html: string,
  width: number,
  height: number,
): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.top = "-9999px";
    iframe.style.width = `${width}px`;
    iframe.style.height = `${height}px`;
    iframe.style.border = "none";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.sandbox.add(
      "allow-scripts",
      "allow-same-origin",
    );
    iframe.srcdoc = html;

    const cleanup = () => {
      try {
        document.body.removeChild(iframe);
      } catch {}
    };

    iframe.onload = async () => {
      // Small delay for CSS/fonts to settle
      await new Promise((r) => setTimeout(r, 200));
      try {
        const img = await captureEmbeddableFrame(iframe, width, height);
        embeddableFrameCache.set(elementId, {
          image: img,
          capturedAt: Date.now(),
        });
        cleanup();
        resolve(img);
      } catch (e) {
        console.warn("Failed to generate embeddable snapshot:", e);
        cleanup();
        resolve(null);
      }
    };

    iframe.onerror = () => {
      cleanup();
      resolve(null);
    };

    document.body.appendChild(iframe);
  });
};
