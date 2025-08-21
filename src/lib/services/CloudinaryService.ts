/**
 * Cloudinary Upload Service
 * 
 * This service provides multiple ways to upload images to Cloudinary:
 * 1. Client-side unsigned upload (recommended for user uploads)
 * 2. Server-side signed upload (for admin uploads)
 * 3. URL-based upload (for external images)
 * 4. Dynamic upload with configurable transformations
 */

// Upload configuration types
export interface UploadTransformation {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'scale' | 'crop' | 'thumb' | 'pad' | 'limit' | 'mfit' | 'mpad';
  gravity?: 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west' | string;
  quality?: 'auto' | number;
  format?: 'auto' | 'jpg' | 'png' | 'webp' | 'avif';
  radius?: number | 'max';
  background?: string;
  effects?: string[];
  overlay?: string;
  underlay?: string;
}

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  tags?: string[];
  transformation?: UploadTransformation;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  allowedFormats?: string[];
  maxFileSize?: number; // in bytes
  eager?: UploadTransformation[];
  context?: Record<string, string>;
  metadata?: Record<string, string>;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  url: string;
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
  resourceType?: string;
  bytes?: number;
  etag?: string;
  version?: number;
  versionId?: string;
  signature?: string;
  eager?: Array<{url: string; secureUrl: string}>;
}

// Dynamic upload function with full configuration
export async function uploadToCloudinary(
  file: File,
  options: UploadOptions = {},
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary configuration missing');
  }

  // Validate file
  validateFile(file, options);

  // Build transformation string
  const transformationString = buildTransformationString(options.transformation);

  // Prepare form data
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  
  if (options.folder) {
    formData.append('folder', options.folder);
  }
  
  if (options.publicId) {
    formData.append('public_id', options.publicId);
  }
  
  if (options.tags && options.tags.length > 0) {
    formData.append('tags', options.tags.join(','));
  }
  
  if (transformationString) {
    formData.append('transformation', transformationString);
  }
  
  if (options.resourceType) {
    formData.append('resource_type', options.resourceType);
  }
  
  if (options.context) {
    formData.append('context', Object.entries(options.context)
      .map(([key, value]) => `${key}=${value}`)
      .join('|'));
  }
  
  if (options.metadata) {
    formData.append('metadata', JSON.stringify(options.metadata));
  }
  
  if (options.eager && options.eager.length > 0) {
    const eagerTransformations = options.eager
      .map(transformation => buildTransformationString(transformation))
      .join('|');
    formData.append('eager', eagerTransformations);
  }

  // Upload with progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100)
          };
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          const result: UploadResult = {
            url: response.url,
            publicId: response.public_id,
            secureUrl: response.secure_url,
            width: response.width,
            height: response.height,
            format: response.format,
            resourceType: response.resource_type,
            bytes: response.bytes,
            etag: response.etag,
            version: response.version,
            versionId: response.version_id,
            signature: response.signature,
            eager: response.eager
          };
          resolve(result);
        } catch {
          reject(new Error('Failed to parse upload response'));
        }
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'));
    });

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    xhr.send(formData);
  });
}

// Helper function to build transformation string
function buildTransformationString(transformation?: UploadTransformation): string {
  if (!transformation) return '';

  const parts: string[] = [];

  if (transformation.width) parts.push(`w_${transformation.width}`);
  if (transformation.height) parts.push(`h_${transformation.height}`);
  if (transformation.crop) parts.push(`c_${transformation.crop}`);
  if (transformation.gravity) parts.push(`g_${transformation.gravity}`);
  if (transformation.quality) parts.push(`q_${transformation.quality}`);
  if (transformation.format) parts.push(`f_${transformation.format}`);
  if (transformation.radius !== undefined) parts.push(`r_${transformation.radius}`);
  if (transformation.background) parts.push(`b_${transformation.background}`);
  
  if (transformation.effects && transformation.effects.length > 0) {
    transformation.effects.forEach(effect => parts.push(`e_${effect}`));
  }
  
  if (transformation.overlay) parts.push(`l_${transformation.overlay}`);
  if (transformation.underlay) parts.push(`u_${transformation.underlay}`);

  return parts.join(',');
}

// Enhanced file validation
function validateFile(file: File, options: UploadOptions): void {
  // Check file type
  if (options.allowedFormats && options.allowedFormats.length > 0) {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !options.allowedFormats.includes(fileExtension)) {
      throw new Error(`File type not allowed. Allowed formats: ${options.allowedFormats.join(', ')}`);
    }
  } else {
    // Default image validation
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }
  }

  // Check file size
  const maxSize = options.maxFileSize || 10 * 1024 * 1024; // Default 10MB
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    throw new Error(`File size must be less than ${maxSizeMB}MB`);
  }
}

// Preset configurations for common use cases
export const UploadPresets = {
  // Avatar upload with circular cropping
  avatar: (userId: string): UploadOptions => ({
    folder: 'avatars',
    publicId: `avatar_${userId}_${Date.now()}`,
    tags: ['avatar', 'user'],
    transformation: {
      width: 400,
      height: 400,
      crop: 'fill',
      gravity: 'face',
      radius: 'max',
      quality: 'auto',
      format: 'auto'
    },
    eager: [
      { width: 40, height: 40, crop: 'fill', gravity: 'face', radius: 'max', format: 'auto' },
      { width: 80, height: 80, crop: 'fill', gravity: 'face', radius: 'max', format: 'auto' },
      { width: 120, height: 120, crop: 'fill', gravity: 'face', radius: 'max', format: 'auto' }
    ],
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    context: { type: 'avatar', user_id: userId },
    metadata: { uploaded_by: userId, upload_type: 'avatar' }
  }),

  // Event banner with optimization
  eventBanner: (eventId: string): UploadOptions => ({
    folder: 'events',
    publicId: `event_${eventId}_${Date.now()}`,
    tags: ['event', 'banner'],
    transformation: {
      width: 1200,
      height: 600,
      crop: 'fill',
      gravity: 'center',
      quality: 'auto',
      format: 'auto'
    },
    eager: [
      { width: 300, height: 150, crop: 'fill', gravity: 'center', format: 'auto' },
      { width: 600, height: 300, crop: 'fill', gravity: 'center', format: 'auto' },
      { width: 800, height: 400, crop: 'fill', gravity: 'center', format: 'auto' }
    ],
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    context: { type: 'event_banner', event_id: eventId },
    metadata: { event_id: eventId, upload_type: 'banner' }
  }),

  // Document upload (PDF, images)
  document: (userId: string, documentType: string): UploadOptions => ({
    folder: 'documents',
    publicId: `doc_${documentType}_${userId}_${Date.now()}`,
    tags: ['document', documentType],
    resourceType: 'auto',
    allowedFormats: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
    maxFileSize: 25 * 1024 * 1024, // 25MB
    context: { type: 'document', user_id: userId, document_type: documentType },
    metadata: { uploaded_by: userId, document_type: documentType }
  }),

  // Profile cover photo
  coverPhoto: (userId: string): UploadOptions => ({
    folder: 'covers',
    publicId: `cover_${userId}_${Date.now()}`,
    tags: ['cover', 'profile'],
    transformation: {
      width: 1500,
      height: 500,
      crop: 'fill',
      gravity: 'center',
      quality: 'auto',
      format: 'auto'
    },
    eager: [
      { width: 750, height: 250, crop: 'fill', gravity: 'center', format: 'auto' },
      { width: 1200, height: 400, crop: 'fill', gravity: 'center', format: 'auto' }
    ],
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    maxFileSize: 8 * 1024 * 1024, // 8MB
    context: { type: 'cover_photo', user_id: userId },
    metadata: { uploaded_by: userId, upload_type: 'cover' }
  }),

  // Gallery/general images
  gallery: (userId: string, albumId?: string): UploadOptions => ({
    folder: albumId ? `gallery/${albumId}` : 'gallery',
    publicId: `img_${userId}_${Date.now()}`,
    tags: ['gallery', ...(albumId ? [albumId] : [])],
    transformation: {
      width: 1200,
      height: 1200,
      crop: 'limit',
      quality: 'auto',
      format: 'auto'
    },
    eager: [
      { width: 200, height: 200, crop: 'fill', gravity: 'center', format: 'auto' },
      { width: 400, height: 400, crop: 'fit', format: 'auto' },
      { width: 800, height: 800, crop: 'fit', format: 'auto' }
    ],
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    maxFileSize: 15 * 1024 * 1024, // 15MB
    context: { 
      type: 'gallery', 
      user_id: userId, 
      ...(albumId && { album_id: albumId }) 
    },
    metadata: { uploaded_by: userId, upload_type: 'gallery' }
  })
};

// Convenient wrapper functions using presets
export async function uploadAvatar(
  file: File, 
  userId: string, 
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadToCloudinary(file, UploadPresets.avatar(userId), onProgress);
}

export async function uploadEventBanner(
  file: File, 
  eventId: string, 
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadToCloudinary(file, UploadPresets.eventBanner(eventId), onProgress);
}

export async function uploadDocument(
  file: File, 
  userId: string, 
  documentType: string, 
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadToCloudinary(file, UploadPresets.document(userId, documentType), onProgress);
}

export async function uploadCoverPhoto(
  file: File, 
  userId: string, 
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadToCloudinary(file, UploadPresets.coverPhoto(userId), onProgress);
}

export async function uploadToGallery(
  file: File, 
  userId: string, 
  albumId?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadToCloudinary(file, UploadPresets.gallery(userId, albumId), onProgress);
}

// Custom upload with user-defined options
export async function uploadCustom(
  file: File,
  customOptions: Partial<UploadOptions>,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const defaultOptions: UploadOptions = {
    folder: 'uploads',
    transformation: {
      quality: 'auto',
      format: 'auto'
    },
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    maxFileSize: 10 * 1024 * 1024 // 10MB
  };

  const mergedOptions = { ...defaultOptions, ...customOptions };
  return uploadToCloudinary(file, mergedOptions, onProgress);
}

// Client-side upload function (unsigned) - kept for backward compatibility
export async function uploadImageToCloudinary(file: File): Promise<string> {
  const result = await uploadToCloudinary(file, {
    folder: 'acetrack/events'
  });
  return result.secureUrl;
}

// Client-side upload with progress tracking
export async function uploadImageWithProgress(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const result = await uploadToCloudinary(
    file, 
    { folder: 'acetrack/events' }, 
    onProgress ? (progress) => onProgress(progress.percentage) : undefined
  );
  return result.secureUrl;
}

// Generate optimized image URL with transformations
export function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
    crop?: 'scale' | 'fit' | 'fill' | 'crop';
  } = {}
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    throw new Error('Cloudinary cloud name is not configured');
  }

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'scale'
  } = options;

  const transformations = [];
  
  if (width || height) {
    const dimensions = [
      width && `w_${width}`,
      height && `h_${height}`,
      `c_${crop}`
    ].filter(Boolean).join(',');
    transformations.push(dimensions);
  }
  
  if (quality) {
    transformations.push(`q_${quality}`);
  }
  
  if (format) {
    transformations.push(`f_${format}`);
  }

  const transformationString = transformations.length > 0 
    ? transformations.join('/') + '/'
    : '';

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformationString}${publicId}`;
}

// Extract public ID from Cloudinary URL
export function extractPublicIdFromUrl(url: string): string | null {
  try {
    const urlParts = url.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    
    if (uploadIndex === -1) return null;
    
    // Get everything after 'upload' and potential transformations
    const pathAfterUpload = urlParts.slice(uploadIndex + 1);
    
    // Remove version if present (starts with 'v' followed by numbers)
    const pathWithoutVersion = pathAfterUpload[0]?.startsWith('v') && 
      /^v\d+$/.test(pathAfterUpload[0])
      ? pathAfterUpload.slice(1)
      : pathAfterUpload;
    
    // Join the remaining path and remove file extension
    const publicId = pathWithoutVersion.join('/').replace(/\.[^/.]+$/, '');
    
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
}

// Delete image from Cloudinary (requires server-side API route)
export async function deleteImage(publicId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicId }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete image');
    }

    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}

// Validate file before upload
export function validateImageFile(
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): Promise<boolean> {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  } = options;

  return new Promise((resolve, reject) => {
    // Check file size
    if (file.size > maxSize) {
      reject(new Error(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`));
      return;
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      reject(new Error(`File type must be one of: ${allowedTypes.join(', ')}`));
      return;
    }

    // Check image dimensions if specified
    if (options.maxWidth || options.maxHeight) {
      const img = new Image();
      img.onload = () => {
        if (options.maxWidth && img.width > options.maxWidth) {
          reject(new Error(`Image width must be less than ${options.maxWidth}px`));
          return;
        }
        if (options.maxHeight && img.height > options.maxHeight) {
          reject(new Error(`Image height must be less than ${options.maxHeight}px`));
          return;
        }
        resolve(true);
      };
      img.onerror = () => {
        reject(new Error('Invalid image file'));
      };
      img.src = URL.createObjectURL(file);
    } else {
      resolve(true);
    }
  });
}

// =====================================
// AVATAR-SPECIFIC FUNCTIONS
// =====================================

// Upload user avatar with specific optimizations - updated to use new system
export async function uploadAvatarToCloudinary(file: File, userId: string): Promise<string> {
  const result = await uploadAvatar(file, userId);
  return result.secureUrl;
}

// Upload avatar with progress tracking - updated to use new system
export async function uploadAvatarWithProgress(
  file: File,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const result = await uploadAvatar(
    file, 
    userId, 
    onProgress ? (progress) => onProgress(progress.percentage) : undefined
  );
  return result.secureUrl;
}

// Generate optimized avatar URL with circular crop and sizes
export function getOptimizedAvatarUrl(
  publicId: string,
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number = 'md'
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    throw new Error('Cloudinary cloud name is not configured');
  }

  // Define avatar sizes
  const avatarSizes = {
    xs: 32,   // For small UI elements
    sm: 40,   // For navigation/comments
    md: 64,   // For profile cards
    lg: 96,   // For profile headers
    xl: 128   // For profile pages
  };

  const dimension = typeof size === 'number' ? size : avatarSizes[size];
  
  // Avatar-specific transformations: circular crop, face detection, quality optimization
  const transformations = [
    `w_${dimension},h_${dimension},c_fill,g_face,f_auto,q_auto`,
    'r_max' // Make it circular
  ];

  const transformationString = transformations.join('/');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformationString}/${publicId}`;
}

// Generate multiple avatar sizes for responsive display
export function getResponsiveAvatarUrls(publicId: string) {
  return {
    xs: getOptimizedAvatarUrl(publicId, 'xs'),
    sm: getOptimizedAvatarUrl(publicId, 'sm'),
    md: getOptimizedAvatarUrl(publicId, 'md'),
    lg: getOptimizedAvatarUrl(publicId, 'lg'),
    xl: getOptimizedAvatarUrl(publicId, 'xl'),
  };
}

// Validate avatar file with specific requirements
export function validateAvatarFile(file: File): Promise<boolean> {
  const options = {
    maxSize: 5 * 1024 * 1024, // 5MB for avatars
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxWidth: 1024,  // Reasonable limit for avatars
    maxHeight: 1024,
  };

  return new Promise((resolve, reject) => {
    // Check file size
    if (file.size > options.maxSize) {
      reject(new Error(`Avatar file size must be less than ${Math.round(options.maxSize / 1024 / 1024)}MB`));
      return;
    }

    // Check file type
    if (!options.allowedTypes.includes(file.type)) {
      reject(new Error(`Avatar must be one of: ${options.allowedTypes.join(', ')}`));
      return;
    }

    // Check image dimensions
    const img = new Image();
    img.onload = () => {
      if (img.width > options.maxWidth || img.height > options.maxHeight) {
        reject(new Error(`Avatar dimensions must be less than ${options.maxWidth}x${options.maxHeight}px`));
        return;
      }
      
      // Check aspect ratio (should be roughly square for best results)
      const aspectRatio = img.width / img.height;
      if (aspectRatio < 0.5 || aspectRatio > 2) {
        console.warn('Avatar aspect ratio is not square, may not look optimal');
      }
      
      resolve(true);
    };
    
    img.onerror = () => {
      reject(new Error('Invalid avatar image file'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

// Generate default avatar URL (for users without uploaded avatars)
export function getDefaultAvatarUrl(
  initials: string,
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number = 'md',
  backgroundColor?: string,
  textColor?: string
): string {
  const avatarSizes = {
    xs: 32,
    sm: 40,
    md: 64,
    lg: 96,
    xl: 128
  };

  const dimension = typeof size === 'number' ? size : avatarSizes[size];
  const bgColor = backgroundColor || 'blue';
  const txtColor = textColor || 'white';
  
  // Use Cloudinary's text overlay feature to generate initials avatar
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    // Fallback to a simple gradient avatar service
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=${dimension}&background=${bgColor.replace('#', '')}&color=${txtColor.replace('#', '')}&format=png`;
  }

  // Create a colored background with initials overlay
  return `https://res.cloudinary.com/${cloudName}/image/upload/w_${dimension},h_${dimension},c_fill,b_${bgColor},r_max/l_text:Arial_${Math.round(dimension * 0.4)}:${encodeURIComponent(initials)},co_${txtColor}/fl_layer_apply/acetrack/placeholder_avatar.png`;
}

// Helper function to get user initials from name
export function getUserInitials(firstName: string, lastName?: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return `${first}${last}` || '?';
}

// Default export with all functions
const CloudinaryService = {
  // Core dynamic upload functions
  uploadToCloudinary,
  uploadCustom,
  
  // Preset upload functions
  uploadAvatar,
  uploadEventBanner,
  uploadDocument,
  uploadCoverPhoto,
  uploadToGallery,
  
  // Legacy compatibility functions
  uploadImageToCloudinary,
  uploadImageWithProgress,
  uploadAvatarToCloudinary,
  uploadAvatarWithProgress,
  
  // URL generation and optimization
  getOptimizedImageUrl,
  getOptimizedAvatarUrl,
  getDefaultAvatarUrl,
  
  // Validation functions
  validateImageFile,
  validateAvatarFile,
  
  // Utility functions
  deleteImage,
  getUserInitials,
  
  // Configuration presets
  UploadPresets
};

export default CloudinaryService;
