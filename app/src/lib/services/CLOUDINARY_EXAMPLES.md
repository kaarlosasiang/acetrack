# Dynamic Cloudinary Upload System - Usage Examples

The new dynamic upload system provides flexible, configurable image uploads with presets and custom options.

## Core Dynamic Upload Function

### Basic Usage

```typescript
import { uploadToCloudinary } from '@/lib/services/CloudinaryService';

// Simple upload with default settings
const result = await uploadToCloudinary(file);
console.log('Uploaded:', result.secureUrl);

// Upload with custom folder
const result = await uploadToCloudinary(file, {
  folder: 'my-uploads'
});

// Upload with progress tracking
const result = await uploadToCloudinary(file, {
  folder: 'my-uploads'
}, (progress) => {
  console.log(`Upload progress: ${progress.percentage}%`);
});
```

### Advanced Configuration

```typescript
// Complex upload with multiple transformations
const result = await uploadToCloudinary(file, {
  folder: 'products',
  publicId: `product_${productId}`,
  tags: ['product', 'catalog', 'main'],
  transformation: {
    width: 800,
    height: 600,
    crop: 'fill',
    gravity: 'center',
    quality: 90,
    format: 'webp',
    radius: 10,
    effects: ['sharpen', 'brightness:10']
  },
  eager: [
    { width: 200, height: 150, crop: 'thumb' },
    { width: 400, height: 300, crop: 'fill' },
    { width: 100, height: 100, crop: 'fill', radius: 'max' }
  ],
  allowedFormats: ['jpg', 'png', 'webp'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  context: { 
    category: 'electronics',
    product_id: productId 
  },
  metadata: { 
    uploaded_by: userId,
    upload_date: new Date().toISOString()
  }
});

// Access different transformed versions
console.log('Main image:', result.secureUrl);
console.log('Thumbnails:', result.eager);
```

## Preset Upload Functions

### Avatar Upload

```typescript
import { uploadAvatar } from '@/lib/services/CloudinaryService';

// Simple avatar upload
const result = await uploadAvatar(file, userId);

// Avatar upload with progress
const result = await uploadAvatar(file, userId, (progress) => {
  setUploadProgress(progress.percentage);
});

// Result includes multiple sizes automatically
console.log('Avatar uploaded:', result.secureUrl);
console.log('Available sizes:', result.eager);
```

### Event Banner Upload

```typescript
import { uploadEventBanner } from '@/lib/services/CloudinaryService';

const result = await uploadEventBanner(file, eventId, (progress) => {
  console.log(`Banner upload: ${progress.percentage}%`);
});

// Automatically optimized for event banners (1200x600)
console.log('Banner URL:', result.secureUrl);
```

### Document Upload

```typescript
import { uploadDocument } from '@/lib/services/CloudinaryService';

// Upload PDF document
const result = await uploadDocument(pdfFile, userId, 'resume');

// Upload image document
const result = await uploadDocument(imageFile, userId, 'certificate');

console.log('Document uploaded:', result.secureUrl);
```

### Cover Photo Upload

```typescript
import { uploadCoverPhoto } from '@/lib/services/CloudinaryService';

const result = await uploadCoverPhoto(file, userId, (progress) => {
  updateProgressBar(progress.percentage);
});

// Optimized for cover photos (1500x500)
console.log('Cover photo:', result.secureUrl);
```

### Gallery Upload

```typescript
import { uploadToGallery } from '@/lib/services/CloudinaryService';

// Upload to general gallery
const result = await uploadToGallery(file, userId);

// Upload to specific album
const result = await uploadToGallery(file, userId, albumId);

console.log('Gallery image:', result.secureUrl);
```

## Custom Upload with Merged Options

```typescript
import { uploadCustom } from '@/lib/services/CloudinaryService';

const result = await uploadCustom(file, {
  folder: 'custom-uploads',
  transformation: {
    width: 500,
    height: 500,
    crop: 'fill',
    effects: ['sepia', 'contrast:20']
  },
  tags: ['custom', 'processed'],
  allowedFormats: ['jpg', 'png'],
  maxFileSize: 8 * 1024 * 1024 // 8MB
});
```

## Using Upload Presets Directly

```typescript
import { uploadToCloudinary, UploadPresets } from '@/lib/services/CloudinaryService';

// Use avatar preset
const avatarOptions = UploadPresets.avatar(userId);
const result = await uploadToCloudinary(file, avatarOptions);

// Modify preset options
const customAvatarOptions = {
  ...UploadPresets.avatar(userId),
  transformation: {
    ...UploadPresets.avatar(userId).transformation,
    effects: ['blur:100'] // Add blur effect
  }
};
const result = await uploadToCloudinary(file, customAvatarOptions);
```

## React Component Examples

### Dynamic Upload Hook

```typescript
// hooks/useCloudinaryUpload.ts
import { useState } from 'react';
import { uploadToCloudinary, type UploadOptions, type UploadResult, type UploadProgress } from '@/lib/services/CloudinaryService';

export function useCloudinaryUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File, options?: UploadOptions) => {
    try {
      setIsUploading(true);
      setError(null);
      setProgress(null);
      
      const uploadResult = await uploadToCloudinary(file, options, setProgress);
      setResult(uploadResult);
      return uploadResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setIsUploading(false);
    setProgress(null);
    setResult(null);
    setError(null);
  };

  return {
    upload,
    reset,
    isUploading,
    progress,
    result,
    error
  };
}
```

### Flexible Upload Component

```tsx
// components/upload/FlexibleUpload.tsx
import React, { useState } from 'react';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import { UploadOptions } from '@/lib/services/CloudinaryService';

interface FlexibleUploadProps {
  uploadOptions?: UploadOptions;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSize?: number;
  children?: React.ReactNode;
}

export function FlexibleUpload({
  uploadOptions = {},
  onSuccess,
  onError,
  accept = "image/*",
  maxSize = 10 * 1024 * 1024,
  children
}: FlexibleUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const { upload, isUploading, progress, error } = useCloudinaryUpload();

  const handleFileSelect = async (file: File) => {
    if (file.size > maxSize) {
      const errorMsg = `File size must be less than ${maxSize / (1024 * 1024)}MB`;
      onError?.(errorMsg);
      return;
    }

    try {
      const result = await upload(file, uploadOptions);
      onSuccess?.(result);
    } catch (err) {
      onError?.(error || 'Upload failed');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  return (
    <div
      className={`upload-area ${dragOver ? 'drag-over' : ''} ${isUploading ? 'uploading' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        disabled={isUploading}
        className="hidden"
        id="file-input"
      />
      
      <label htmlFor="file-input" className="cursor-pointer">
        {children || (
          <div className="upload-content">
            <p>Drag & drop a file here, or click to select</p>
            {isUploading && progress && (
              <div className="progress">
                <div 
                  className="progress-bar" 
                  style={{ width: `${progress.percentage}%` }}
                />
                <span>{progress.percentage}%</span>
              </div>
            )}
            {error && <p className="error">{error}</p>}
          </div>
        )}
      </label>
    </div>
  );
}
```

### Usage in Forms

```tsx
// Usage examples in different contexts
function ProductForm() {
  const handleProductImageUpload = (result: UploadResult) => {
    console.log('Product image uploaded:', result.secureUrl);
    // Access different sizes from eager transformations
    setThumbnail(result.eager?.[0]?.secureUrl);
    setMediumImage(result.eager?.[1]?.secureUrl);
    setMainImage(result.secureUrl);
  };

  return (
    <FlexibleUpload
      uploadOptions={{
        folder: 'products',
        tags: ['product', 'catalog'],
        transformation: {
          width: 800,
          height: 600,
          crop: 'fill',
          quality: 'auto',
          format: 'auto'
        },
        eager: [
          { width: 150, height: 150, crop: 'thumb' },
          { width: 400, height: 300, crop: 'fill' }
        ]
      }}
      onSuccess={handleProductImageUpload}
      onError={(error) => toast.error(error)}
    >
      <div className="product-upload-area">
        <ShoppingBag className="w-12 h-12 text-gray-400" />
        <p>Upload product image</p>
      </div>
    </FlexibleUpload>
  );
}

function UserAvatarUpload({ userId }: { userId: string }) {
  return (
    <FlexibleUpload
      uploadOptions={{
        folder: 'avatars',
        publicId: `avatar_${userId}`,
        transformation: {
          width: 400,
          height: 400,
          crop: 'fill',
          gravity: 'face',
          radius: 'max'
        },
        eager: [
          { width: 40, height: 40, crop: 'fill', gravity: 'face', radius: 'max' },
          { width: 80, height: 80, crop: 'fill', gravity: 'face', radius: 'max' }
        ]
      }}
      accept="image/*"
      maxSize={5 * 1024 * 1024} // 5MB
      onSuccess={(result) => {
        console.log('Avatar uploaded:', result.secureUrl);
        updateUserAvatar(result.secureUrl);
      }}
    >
      <div className="avatar-upload-area">
        <User className="w-8 h-8" />
        <span>Change Avatar</span>
      </div>
    </FlexibleUpload>
  );
}
```

## Advanced Features

### Multiple File Upload

```typescript
async function uploadMultipleFiles(files: File[], options: UploadOptions) {
  const uploads = files.map(file => uploadToCloudinary(file, {
    ...options,
    publicId: `${options.publicId}_${Date.now()}_${Math.random()}`
  }));
  
  const results = await Promise.all(uploads);
  return results;
}
```

### Conditional Transformations

```typescript
function getUploadOptions(fileType: string, userRole: string): UploadOptions {
  const baseOptions: UploadOptions = {
    folder: 'uploads',
    quality: 'auto',
    format: 'auto'
  };

  if (fileType === 'avatar') {
    return {
      ...baseOptions,
      ...UploadPresets.avatar('user_id'),
      transformation: {
        ...baseOptions.transformation,
        // Add role-specific effects
        ...(userRole === 'premium' && { effects: ['improve', 'auto_color'] })
      }
    };
  }

  if (fileType === 'document' && userRole === 'admin') {
    return {
      ...baseOptions,
      resourceType: 'auto',
      allowedFormats: ['pdf', 'doc', 'docx', 'jpg', 'png'],
      maxFileSize: 50 * 1024 * 1024 // 50MB for admins
    };
  }

  return baseOptions;
}
```

## Performance Optimization

### Eager Transformations

```typescript
// Generate multiple sizes during upload for faster loading
const eventBannerOptions: UploadOptions = {
  folder: 'events',
  transformation: {
    width: 1200,
    height: 600,
    crop: 'fill'
  },
  eager: [
    { width: 300, height: 150, crop: 'fill', format: 'webp' }, // Thumbnail
    { width: 600, height: 300, crop: 'fill', format: 'webp' }, // Medium
    { width: 150, height: 150, crop: 'thumb', format: 'webp' } // Square thumb
  ]
};
```

### Lazy Loading with Optimized URLs

```typescript
// Generate optimized URLs for different viewport sizes
function getResponsiveImageSrc(publicId: string) {
  return {
    mobile: getOptimizedImageUrl(publicId, { width: 400, format: 'webp' }),
    tablet: getOptimizedImageUrl(publicId, { width: 768, format: 'webp' }),
    desktop: getOptimizedImageUrl(publicId, { width: 1200, format: 'webp' })
  };
}
```

This dynamic system provides maximum flexibility while maintaining ease of use through presets and sensible defaults. You can easily extend it with new presets or custom transformations as needed.
