/**
 * Image and video upload rules, shown to the admin and enforced before
 * uploading — a port of dristi-admin-app/lib/services/image_upload_service.dart.
 *
 * These mirror the server rules in backend/app/core/storage.py. The backend
 * re-validates every upload, so treat these as a fast local check, not the
 * source of truth. Keep both sides in step when changing a limit.
 */
import * as api from './api';
import { errorMessage } from './apiClient';

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const IMAGE_ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const IMAGE_MIN_WIDTH = 600;
export const IMAGE_MIN_HEIGHT = 400;

export const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
export const VIDEO_ALLOWED_EXTS = ['mp4', 'webm', 'mov'] as const;

/** S3 folder an image is stored under. Must match storage.IMAGE_PREFIXES. */
export const ImageFolder = {
  banners: 'banners',
  products: 'products',
  categories: 'categories',
} as const;

/**
 * Per-entity guidance shown in the specs box. Only the recommendation varies;
 * the hard limits above apply everywhere.
 */
export interface ImageSpecs {
  recWidth: number;
  recHeight: number;
  ratioLabel: string;
  folder: string;
}

export const IMAGE_SPECS: Record<'banner' | 'product' | 'category', ImageSpecs> = {
  banner: { recWidth: 1920, recHeight: 1080, ratioLabel: '16:9', folder: ImageFolder.banners },
  product: { recWidth: 1200, recHeight: 1600, ratioLabel: '3:4', folder: ImageFolder.products },
  category: { recWidth: 800, recHeight: 800, ratioLabel: '1:1', folder: ImageFolder.categories },
};

/** A rule violation or upload failure, carrying a message fit to show an admin. */
export class UploadRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadRejected';
  }
}

const extensionOf = (name: string): string =>
  name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';

const megabytes = (bytes: number): string => (bytes / (1024 * 1024)).toFixed(1);

/** Reads an image file's real pixel size, the way the Dart codec does. */
function decodeDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new UploadRejected('That file could not be read as an image.'));
    };
    img.src = url;
  });
}

/**
 * Validates the chosen image and uploads it to `specs.folder`.
 *
 * Returns the public URL. Throws `UploadRejected` with a readable message on
 * any rule violation or upload failure.
 */
export async function validateAndUploadImage(file: File, specs: ImageSpecs): Promise<string> {
  const ext = extensionOf(file.name);
  if (!(IMAGE_ALLOWED_EXTS as readonly string[]).includes(ext)) {
    throw new UploadRejected('Unsupported format. Allowed: JPG, PNG, WebP.');
  }

  if (file.size > IMAGE_MAX_BYTES) {
    throw new UploadRejected(`Image is too large (${megabytes(file.size)} MB). Maximum size is 5 MB.`);
  }

  const { width, height } = await decodeDimensions(file);
  if (width < IMAGE_MIN_WIDTH || height < IMAGE_MIN_HEIGHT) {
    throw new UploadRejected(
      `Image too small (${width}×${height}). Minimum is ${IMAGE_MIN_WIDTH}×${IMAGE_MIN_HEIGHT} px.`,
    );
  }

  try {
    const { url } = await api.uploadImage(file, specs.folder);
    return url;
  } catch (e) {
    throw new UploadRejected(`Upload failed: ${errorMessage(e)}`);
  }
}

/**
 * Validates the chosen video and uploads it under the products videos folder.
 *
 * Returns the public URL. Throws `UploadRejected` on any rule violation.
 */
export async function validateAndUploadVideo(file: File): Promise<string> {
  const ext = extensionOf(file.name);
  if (!(VIDEO_ALLOWED_EXTS as readonly string[]).includes(ext)) {
    throw new UploadRejected('Unsupported format. Allowed: MP4, WebM, MOV.');
  }

  if (file.size > VIDEO_MAX_BYTES) {
    throw new UploadRejected(`Video is too large (${megabytes(file.size)} MB). Maximum size is 50 MB.`);
  }

  try {
    const { url } = await api.uploadVideo(file);
    return url;
  } catch (e) {
    throw new UploadRejected(`Upload failed: ${errorMessage(e)}`);
  }
}

/** `accept` attributes for the two file pickers, derived from the rules above. */
export const IMAGE_ACCEPT = IMAGE_ALLOWED_EXTS.map(e => `.${e}`).join(',');
export const VIDEO_ACCEPT = VIDEO_ALLOWED_EXTS.map(e => `.${e}`).join(',');
