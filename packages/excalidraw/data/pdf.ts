import * as pdfjsLib from "pdfjs-dist";

// Use local bundled worker (works offline, no CDN needed)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const MAX_PDF_PAGE_SIZE = 2000;

export const renderPDFToImageFiles = async (
  file: File,
  onProgress?: (current: number, total: number) => void,
): Promise<{ pageFiles: File[]; pdfName: string }> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  });
  const pdf = await loadingTask.promise;

  const pdfName = file.name;
  const pageFiles: File[] = [];
  const total = pdf.numPages;

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    // Report progress before rendering each page
    onProgress?.(pageNum, total);

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });

    // Scale so the longest side = MAX_PDF_PAGE_SIZE (2000px)
    const scale =
      MAX_PDF_PAGE_SIZE / Math.max(viewport.width, viewport.height);
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(scaledViewport.width);
    canvas.height = Math.round(scaledViewport.height);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      continue;
    }

    // White background so transparent PDFs look clean
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: scaledViewport,
    }).promise;

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(new Error("Canvas toBlob returned null")),
        "image/jpeg",
        0.92,
      ),
    );

    pageFiles.push(
      new File([blob], `${pdfName}_p${pageNum}.jpg`, { type: "image/jpeg" }),
    );
  }

  return { pageFiles, pdfName };
};
