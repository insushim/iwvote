/**
 * Client-side image compression utility.
 * Resizes images and converts to JPEG data URL for direct Firestore storage.
 * Eliminates the need for Firebase Storage (and its bandwidth costs).
 */

const MAX_DIMENSION = 400; // px – enough for candidate thumbnails
const JPEG_QUALITY = 0.75;
const MAX_DATA_URL_SIZE = 80_000; // ~80KB as base64

/**
 * Compress an image file to a small JPEG data URL.
 * @returns base64 data URL string (e.g. "data:image/jpeg;base64,...")
 */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Resize keeping aspect ratio
        if (width > height) {
          if (width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas를 생성할 수 없습니다.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try with default quality first, then reduce if too large
        let quality = JPEG_QUALITY;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        while (dataUrl.length > MAX_DATA_URL_SIZE && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('이미지를 로드할 수 없습니다.'));

    reader.readAsDataURL(file);
  });
}
