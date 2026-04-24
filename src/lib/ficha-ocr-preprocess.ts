/**
 * ficha-ocr-preprocess.ts
 *
 * Canvas-based image preprocessing applied BEFORE tesseract.js. Runs in
 * the browser only — the image never leaves the device.
 *
 * The Spanish ficha técnica is printed on a pale-green background with a
 * repeating watermark pattern and grey body text. Stock tesseract.js
 * picks up the background as noise and mangles the actual text
 * ("SEAT" → "SERT", "SENT", etc). Converting to high-contrast black &
 * white dramatically cleans up the input.
 *
 * Pipeline:
 *   1. Draw the uploaded image onto a canvas at its natural size.
 *   2. If wider than 2000px, downscale to 2000px (OCR doesn't benefit
 *      much past that and processing time grows fast).
 *   3. Convert to greyscale using the standard luminance formula.
 *   4. Apply Otsu's method to pick a threshold that separates text
 *      from background automatically.
 *   5. Threshold to pure black / white.
 *   6. Return the processed canvas as a Blob tesseract can ingest.
 */

const MAX_WIDTH = 2400;
/**
 * Small images get upscaled. Tesseract accuracy drops sharply below ~20px
 * character height; a 1200px-wide photo of a ficha has body text around
 * 15px tall, which is in the fail zone. Upscaling to ~2400px roughly
 * doubles the character height and reliably improves recognition.
 */
const TARGET_MIN_WIDTH = 2000;

/**
 * Otsu's method — computes an optimal binarization threshold from a
 * greyscale luminance histogram. Standard textbook algorithm.
 */
function otsuThreshold(histogram: Uint32Array, totalPixels: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumB = 0;
  let wB = 0;
  let maxVariance = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    const wF = totalPixels - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return threshold;
}

/** Read a File / Blob into an HTMLImageElement. */
function fileToImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("canvas.toBlob returned null"));
    }, type);
  });
}

/**
 * Preprocess an image file for OCR. Returns a Blob that can be passed
 * directly to `worker.recognize(...)`.
 *
 * If anything fails, returns the original file unchanged so OCR can still
 * run on the raw image — preprocessing is best-effort, not mandatory.
 */
export async function preprocessForOcr(file: File): Promise<Blob> {
  try {
    const img = await fileToImage(file);
    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;
    if (!naturalWidth || !naturalHeight) return file;

    // Decide the target width:
    //   - above MAX_WIDTH → downscale.
    //   - between TARGET_MIN_WIDTH and MAX_WIDTH → keep as-is.
    //   - below TARGET_MIN_WIDTH → upscale to at least TARGET_MIN_WIDTH.
    let scale = 1;
    if (naturalWidth > MAX_WIDTH) scale = MAX_WIDTH / naturalWidth;
    else if (naturalWidth < TARGET_MIN_WIDTH) scale = TARGET_MIN_WIDTH / naturalWidth;
    const targetWidth = Math.round(naturalWidth * scale);
    const targetHeight = Math.round(naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return file;
    // "high" quality resampling on upscale keeps edges cleaner than the
    // default bilinear and pays dividends for OCR on small source photos.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const pixels = imageData.data;
    const total = targetWidth * targetHeight;

    // Build greyscale histogram in one pass; overwrite R in place with the
    // luminance so we don't need a second allocation.
    const histogram = new Uint32Array(256);
    for (let i = 0; i < pixels.length; i += 4) {
      const luminance = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      const lum = luminance | 0; // to int
      histogram[lum]++;
      pixels[i] = lum;
    }

    // Pick threshold via Otsu, bias slightly darker to kill the green
    // watermark on Spanish fichas técnicas.
    const rawThreshold = otsuThreshold(histogram, total);
    const threshold = Math.max(80, rawThreshold - 20);

    // Binarise using the R channel we stored above.
    for (let i = 0; i < pixels.length; i += 4) {
      const value = pixels[i] < threshold ? 0 : 255;
      pixels[i] = value;
      pixels[i + 1] = value;
      pixels[i + 2] = value;
      // leave alpha alone
    }
    ctx.putImageData(imageData, 0, 0);

    return await canvasToBlob(canvas, "image/png");
  } catch {
    // Any failure → fall back to the original. OCR will still run, just
    // with less-than-ideal input.
    return file;
  }
}
