

export class ImageUtils {
  /**
   * Helper to convert ArrayBuffer or Buffer to Base64 string
   */
  public static arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Guess MIME type from filename extension
   */
  public static getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'png': return 'image/png';
      case 'webp': return 'image/webp';
      case 'gif': return 'image/gif';
      case 'bmp': return 'image/bmp';
      case 'jpg':
      case 'jpeg':
      default:
        return 'image/jpeg';
    }
  }

  /**
   * Optimizes base64 image by resizing it if width/height > maxDimension (1600px)
   * and converting to JPEG quality 0.85 to reduce payload size for Vision AI.
   */
  public static async compressImageBase64(
    base64Data: string,
    mimeType: string = 'image/jpeg',
    maxDimension: number = 1600
  ): Promise<{ base64: string; mimeType: string }> {
    if (typeof window === 'undefined') {
      return { base64: base64Data, mimeType };
    }

    const dataUrl = base64Data.startsWith('data:')
      ? base64Data
      : `data:${mimeType};base64,${base64Data}`;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

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
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const cleanBase64 = compressedDataUrl.replace(/^data:image\/jpeg;base64,/, '');
          resolve({ base64: cleanBase64, mimeType: 'image/jpeg' });
          return;
        }
        resolve({ base64: base64Data, mimeType });
      };
      img.onerror = () => {
        resolve({ base64: base64Data, mimeType });
      };
      img.src = dataUrl;
    });
  }
}
