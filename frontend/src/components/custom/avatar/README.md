# Avatar and User Profile System

This documentation covers the complete avatar upload and user profile management system integrated with Cloudinary.

## Overview

The system provides:
- Avatar upload with drag & drop interface
- Image optimization and circular cropping for avatars
- User profile management with avatar integration
- Cloudinary integration for image storage
- Progress tracking and error handling

## Components

### AvatarUpload Component

**Location**: `src/components/avatar/AvatarUpload.tsx`

A comprehensive avatar upload component with the following features:
- Drag and drop file upload
- Click to upload option
- Progress tracking
- Image validation (type, size, dimensions)
- Preview functionality
- Circular cropping for avatars
- Error handling with user feedback

#### Props

```typescript
interface AvatarUploadProps {
  currentAvatarUrl?: string | null;    // Current avatar URL
  userId: string;                      // User ID for avatar upload
  userName: string;                    // User name for fallback avatar
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; // Avatar display size
  onAvatarUpdate?: (newAvatarUrl: string) => void; // Callback when avatar updates
  onError?: (error: Error) => void;    // Error callback
  editable?: boolean;                  // Whether avatar can be edited
  showUploadButton?: boolean;          // Show upload button
}
```

#### Usage

```tsx
import { AvatarUpload } from '@/components/avatar';

<AvatarUpload
  currentAvatarUrl={user.avatar}
  userId={user.student_id}
  userName={`${user.first_name} ${user.last_name}`}
  size="lg"
  onAvatarUpdate={(newUrl) => setAvatarUrl(newUrl)}
  onError={(error) => toast.error(error.message)}
  editable={true}
  showUploadButton={true}
/>
```

### ProfileForm Component

**Location**: `src/components/forms/user/ProfileForm.tsx`

A complete user profile management form that includes:
- Profile information editing (name, email, username)
- Avatar upload and management
- Form validation with Zod
- Integration with UserService

#### Props

```typescript
interface ProfileFormProps {
  profile: UserProfile;                // User profile data
  onSuccess?: (updatedProfile: UserProfile) => void; // Success callback
}
```

#### Usage

```tsx
import { ProfileForm } from '@/components/forms/user';

<ProfileForm
  profile={userProfile}
  onSuccess={(updated) => {
    console.log('Profile updated:', updated);
  }}
/>
```

## Services

### CloudinaryService

**Location**: `src/lib/services/CloudinaryService.ts`

Provides comprehensive image upload functionality:

#### Avatar-specific Functions

```typescript
// Upload avatar with circular cropping and optimization
uploadAvatarToCloudinary(file: File, userId: string): Promise<string>

// Upload avatar with progress tracking
uploadAvatarWithProgress(
  file: File, 
  userId: string, 
  onProgress: (progress: number) => void
): Promise<string>

// Get optimized avatar URL for different sizes
getOptimizedAvatarUrl(url: string, size: 'sm' | 'md' | 'lg'): string

// Validate avatar file (size, type, dimensions)
validateAvatarFile(file: File): void

// Get default avatar URL with user initials
getDefaultAvatarUrl(fullName: string): string

// Extract user initials from name
getUserInitials(firstName: string, lastName?: string): string
```

#### General Image Functions

```typescript
// Upload any image to Cloudinary
uploadImageToCloudinary(file: File): Promise<string>

// Upload image with progress tracking
uploadImageWithProgress(
  file: File, 
  onProgress: (progress: number) => void
): Promise<string>

// Get optimized image URL
getOptimizedImageUrl(url: string, width?: number, height?: number): string

// Validate image file
validateImageFile(file: File): void

// Delete image from Cloudinary
deleteImage(imageUrl: string): Promise<void>
```

### UserService

**Location**: `src/lib/services/UserService.ts`

Manages user profile operations with avatar integration:

#### Core Functions

```typescript
// Get user profile by student ID
getProfile(studentId: string): Promise<UserProfile | null>

// Update user profile information
updateProfile(studentId: string, updates: Partial<UserProfile>): Promise<UserProfile>

// Update user avatar (uploads to Cloudinary and updates database)
updateAvatar(studentId: string, file: File): Promise<string>

// Remove user avatar (deletes from Cloudinary and database)
removeAvatar(studentId: string): Promise<void>

// Get optimized avatar URL for display
getAvatarUrl(profile: UserProfile | null, size?: 'sm' | 'md' | 'lg'): string

// Get all users with optional filters
getUsers(filters?: {
  role_id?: number;
  course_id?: number;
  year_id?: number;
}): Promise<UserProfile[]>
```

## API Routes

### Upload Route

**Location**: `src/app/api/cloudinary/upload/route.ts`

Handles server-side image uploads with authentication and validation.

#### Endpoint
- **POST** `/api/cloudinary/upload`
- **Content-Type**: `multipart/form-data`

#### Request Body
```typescript
{
  file: File;           // Image file to upload
  folder?: string;      // Optional folder in Cloudinary
  transformation?: string; // Optional transformation parameters
}
```

#### Response
```typescript
{
  success: boolean;
  url?: string;         // Cloudinary URL if successful
  error?: string;       // Error message if failed
}
```

### Delete Route

**Location**: `src/app/api/cloudinary/delete/route.ts`

Handles server-side image deletion from Cloudinary.

#### Endpoint
- **DELETE** `/api/cloudinary/delete`
- **Content-Type**: `application/json`

#### Request Body
```typescript
{
  imageUrl: string;     // Full Cloudinary URL to delete
}
```

#### Response
```typescript
{
  success: boolean;
  message?: string;     // Success message
  error?: string;       // Error message if failed
}
```

## Database Schema

The user profile table includes an `avatar` field for storing Cloudinary URLs:

```sql
user_profile {
  id: number
  student_id: string
  first_name: string
  middle_initial: string | null
  last_name: string
  username: string
  course_id: number | null
  year_level: number
  avatar: string | null        -- Cloudinary URL
  password: string
  role_id: number
  email: string
}
```

## Environment Variables

Required Cloudinary configuration in `.env.local`:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

## Usage Examples

### Basic Avatar Display

```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import userService from '@/lib/services/UserService';
import CloudinaryService from '@/lib/services/CloudinaryService';

function UserAvatar({ profile }: { profile: UserProfile }) {
  const avatarUrl = userService.getAvatarUrl(profile, 'md');
  const initials = CloudinaryService.getUserInitials(
    profile.first_name, 
    profile.last_name
  );

  return (
    <Avatar className="h-10 w-10">
      <AvatarImage src={avatarUrl} alt={`${profile.first_name} avatar`} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
```

### Complete Profile Management Page

```tsx
import { useState, useEffect } from 'react';
import { ProfileForm } from '@/components/forms/user';
import userService from '@/lib/services/UserService';

function ProfilePage({ studentId }: { studentId: string }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userProfile = await userService.getProfile(studentId);
        setProfile(userProfile);
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [studentId]);

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>Profile not found</div>;

  return (
    <ProfileForm
      profile={profile}
      onSuccess={(updatedProfile) => {
        setProfile(updatedProfile);
        // Handle success (redirect, show message, etc.)
      }}
    />
  );
}
```

## Features

### Image Optimization
- Automatic resizing and compression
- Multiple size variants (sm: 40px, md: 80px, lg: 120px)
- Circular cropping for avatars
- WebP format conversion for better performance

### Security
- File type validation (only images allowed)
- File size limits (10MB for general images, 5MB for avatars)
- Server-side validation on API routes
- Secure deletion of old avatars

### User Experience
- Drag and drop upload interface
- Real-time progress tracking
- Preview functionality
- Error handling with user-friendly messages
- Fallback avatars with user initials

### Performance
- Optimized image delivery via Cloudinary CDN
- Lazy loading support
- Cached transformations
- Automatic format optimization

## Error Handling

The system includes comprehensive error handling:

1. **File Validation Errors**: Invalid file type, size, or dimensions
2. **Upload Errors**: Network issues, Cloudinary errors
3. **Database Errors**: Profile update failures
4. **Permission Errors**: Unauthorized access attempts

All errors are properly caught and displayed to users with appropriate messages.

## Best Practices

1. **Always validate files** before uploading
2. **Use progress tracking** for better UX
3. **Handle errors gracefully** with user feedback
4. **Optimize images** for web display
5. **Clean up old avatars** when updating
6. **Use fallback avatars** for users without uploaded images
7. **Implement proper loading states** during uploads
