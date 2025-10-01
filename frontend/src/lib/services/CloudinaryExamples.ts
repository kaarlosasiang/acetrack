/**
 * Cloudinary Usage Examples
 * 
 * This file demonstrates various ways to use the Cloudinary service
 * in your AceTrack application.
 */

import { 
  uploadImageToCloudinary,
  uploadImageWithProgress,
  getOptimizedImageUrl,
  extractPublicIdFromUrl,
  deleteImage,
  validateImageFile
} from '@/lib/services/CloudinaryService';

// Example 1: Basic file upload (used in forms)
export async function basicUploadExample(file: File) {
  try {
    const imageUrl = await uploadImageToCloudinary(file);
    console.log('Uploaded image URL:', imageUrl);
    return imageUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

// Example 2: Upload with progress tracking
export async function uploadWithProgressExample(file: File) {
  try {
    const imageUrl = await uploadImageWithProgress(file, (progress) => {
      console.log(`Upload progress: ${progress}%`);
      // Update your UI progress indicator here
    });
    console.log('Upload completed:', imageUrl);
    return imageUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

// Example 3: Generate optimized image URLs for different use cases
export function imageOptimizationExamples(publicId: string) {
  // Thumbnail for list views
  const thumbnail = getOptimizedImageUrl(publicId, {
    width: 150,
    height: 150,
    crop: 'fill',
    quality: 'auto',
    format: 'webp'
  });

  // Hero image for banner
  const hero = getOptimizedImageUrl(publicId, {
    width: 1200,
    height: 400,
    crop: 'fill',
    quality: 80,
    format: 'auto'
  });

  // Mobile-optimized version
  const mobile = getOptimizedImageUrl(publicId, {
    width: 400,
    height: 300,
    crop: 'scale',
    quality: 'auto',
    format: 'webp'
  });

  return { thumbnail, hero, mobile };
}

// Example 4: File validation before upload
export async function validateAndUploadExample(file: File) {
  try {
    // Validate the file first
    await validateImageFile(file, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png'],
      maxWidth: 2000,
      maxHeight: 2000
    });

    // If validation passes, upload the file
    const imageUrl = await uploadImageToCloudinary(file);
    return imageUrl;
  } catch (error) {
    console.error('Validation or upload failed:', error);
    throw error;
  }
}

// Example 5: Extract public ID and delete image
export async function deleteImageExample(imageUrl: string) {
  try {
    // Extract public ID from the URL
    const publicId = extractPublicIdFromUrl(imageUrl);
    
    if (!publicId) {
      throw new Error('Could not extract public ID from URL');
    }

    // Delete the image
    const success = await deleteImage(publicId);
    
    if (success) {
      console.log('Image deleted successfully');
    } else {
      console.error('Failed to delete image');
    }

    return success;
  } catch (error) {
    console.error('Delete operation failed:', error);
    throw error;
  }
}

// Example 6: React component using Cloudinary (would be in a .tsx file)
export function getOptimizedImageProps(
  publicId: string,
  width = 400,
  height = 300
) {
  // Generate optimized URL
  const imageUrl = getOptimizedImageUrl(publicId, {
    width,
    height,
    crop: 'fill',
    quality: 'auto',
    format: 'auto'
  });

  return {
    src: imageUrl,
    width,
    height,
    loading: 'lazy' as const,
    style: { objectFit: 'cover' as const }
  };
}

// Example 7: Multiple file upload with error handling
export async function multipleFileUploadExample(files: FileList) {
  const uploadPromises = Array.from(files).map(async (file, index) => {
    try {
      const url = await uploadImageWithProgress(file, (progress) => {
        console.log(`File ${index + 1} upload progress: ${progress}%`);
      });
      return { success: true, url, filename: file.name };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed',
        filename: file.name 
      };
    }
  });

  const results = await Promise.all(uploadPromises);
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Uploaded ${successful.length} files successfully`);
  if (failed.length > 0) {
    console.error(`Failed to upload ${failed.length} files:`, failed);
  }

  return { successful, failed };
}

// Example 8: Server-side upload using API route
export async function serverSideUploadExample(file: File) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/cloudinary/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Server upload failed');
    }

    const result = await response.json();
    return result.url;
  } catch (error) {
    console.error('Server upload failed:', error);
    throw error;
  }
}
