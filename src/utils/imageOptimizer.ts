/**
 * Image resizing and optimization utility for mobile camera uploads.
 * Downscales high-resolution camera photos (e.g. 48MP/12MP) to safe ~1024px
 * using memory-efficient offscreen canvas / createImageBitmap to prevent
 * mobile browser memory pressure, QuotaExceeded errors, and OOM page reloads.
 */

export async function optimizeImageFile(file: File, maxDimension = 1024): Promise<string> {
  // Method 1: Try modern, memory-efficient createImageBitmap if supported
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      let { width, height } = bitmap;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close(); // Immediately release GPU / bitmap memory
        const dataUrl = canvas.toDataURL('image/jpeg', 0.80);
        return dataUrl;
      }
      bitmap.close();
    } catch (bitmapErr) {
      console.warn('createImageBitmap downsample fallback to FileReader:', bitmapErr);
    }
  }

  // Method 2: Standard FileReader + Image with downscaling
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };

    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        reject(new Error('Empty image data'));
        return;
      }

      const img = new Image();
      img.onerror = () => {
        reject(new Error('Failed to parse image element'));
      };

      img.onload = () => {
        try {
          let { width, height } = img;

          // Downscale if larger than maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(src);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Output compressed JPEG to keep memory usage very low (< 200KB)
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.80);
          resolve(optimizedDataUrl);
        } catch (err) {
          console.warn('Canvas optimization fallback:', err);
          resolve(src);
        }
      };

      img.src = src;
    };

    reader.readAsDataURL(file);
  });
}
