# Cloudinary Setup Guide for AceTrack

This guide will help you set up Cloudinary for image upload functionality in your AceTrack application.

## 📋 Prerequisites

1. A Cloudinary account (free tier available)
2. Node.js and npm installed
3. AceTrack project set up

## 🚀 Step 1: Create a Cloudinary Account

1. Go to [Cloudinary](https://cloudinary.com) and sign up for a free account
2. After verification, you'll be taken to your dashboard
3. Note down your **Cloud Name**, **API Key**, and **API Secret**

## 🔧 Step 2: Configure Environment Variables

Update your `.env.local` file with your Cloudinary credentials:

```env
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=acetrack_events_preset
```

**Important:** Replace the placeholder values with your actual Cloudinary credentials.

## 📁 Step 3: Create an Upload Preset

An upload preset defines how your uploads are handled (folder structure, transformations, etc.).

### Option A: Using Cloudinary Dashboard (Recommended)

1. Go to your [Cloudinary Console](https://cloudinary.com/console)
2. Navigate to **Settings** → **Upload**
3. Scroll down to **Upload presets**
4. Click **Add upload preset**
5. Configure the preset:
   - **Preset name:** `acetrack_events_preset`
   - **Signing Mode:** `Unsigned` (allows client-side uploads)
   - **Folder:** `acetrack/events`
   - **Resource type:** `Image`
   - **Access control:** `Public read`
   - **File size limit:** `10000000` (10MB)
   - **Allowed formats:** `jpg,png,gif,webp`

### Option B: Using Cloudinary API

```bash
curl -X POST \
  "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/upload_presets" \
  -H "Authorization: Basic $(echo -n 'YOUR_API_KEY:YOUR_API_SECRET' | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "acetrack_events_preset",
    "unsigned": true,
    "folder": "acetrack/events",
    "resource_type": "image",
    "allowed_formats": ["jpg", "png", "gif", "webp"],
    "max_file_size": 10000000
  }'
```

## 🔄 Step 4: Install Dependencies (Already Done)

The required packages are already installed:
- `cloudinary` - Official Cloudinary SDK
- `next-cloudinary` - Next.js integration (optional, for advanced features)

## 🧪 Step 5: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to a page with the event form
3. Try uploading an image - you should see:
   - Upload progress indicator
   - Success message
   - Image preview

## 🛠️ Available Upload Methods

### 1. Client-Side Unsigned Upload (Default)
- **Used in:** Event form banner upload
- **Pros:** Fast, doesn't require server resources
- **Cons:** Limited security control
- **File:** `CloudinaryService.ts` → `uploadImageToCloudinary()`

### 2. Client-Side with Progress Tracking
- **Used in:** Enhanced event form
- **Pros:** Real-time progress feedback
- **File:** `CloudinaryService.ts` → `uploadImageWithProgress()`

### 3. Server-Side Signed Upload
- **Used for:** Admin uploads, sensitive content
- **Pros:** Full security control, server-side validation
- **API Route:** `/api/cloudinary/upload`

## 📂 File Organization

Your uploads will be organized as follows:
```
cloudinary/
├── acetrack/
│   ├── events/
│   │   ├── banner1.jpg
│   │   ├── banner2.png
│   │   └── ...
│   └── users/
│       ├── avatar1.jpg
│       └── ...
```

## 🔒 Security Best Practices

1. **Never expose API Secret:** Keep it in `.env.local` only
2. **Use upload presets:** Configure allowed formats and size limits
3. **Validate files:** Client and server-side validation
4. **Set folder restrictions:** Organize uploads in specific folders
5. **Monitor usage:** Check your Cloudinary dashboard regularly

## 🎨 Image Transformations

Cloudinary automatically optimizes images. You can also use transformations:

```typescript
import { getOptimizedImageUrl } from '@/lib/services/CloudinaryService';

// Generate a thumbnail
const thumbnailUrl = getOptimizedImageUrl(publicId, {
  width: 300,
  height: 200,
  crop: 'fill',
  quality: 'auto',
  format: 'auto'
});
```

## 🚨 Troubleshooting

### Common Issues:

#### 1. "Upload failed" error
- Check your environment variables
- Verify upload preset exists and is unsigned
- Check network connectivity

#### 2. "Invalid upload preset" error
- Ensure preset name matches exactly
- Verify preset is set to "unsigned"

#### 3. Files too large
- Check your preset's file size limit
- Verify client-side validation

#### 4. CORS issues
- Cloudinary allows cross-origin requests by default
- Check browser console for specific errors

### Debug Mode:

Add this to see detailed upload information:

```typescript
// In CloudinaryService.ts
console.log('Upload config:', {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
});
```

## 📊 Monitoring Usage

1. Visit your [Cloudinary Dashboard](https://cloudinary.com/console)
2. Check the **Media Library** for uploaded files
3. Monitor **Usage** to track your plan limits
4. Review **Reports** for detailed analytics

## 🚀 Production Deployment

When deploying to production:

1. **Vercel/Netlify:** Add environment variables in your deployment platform
2. **Docker:** Use environment files or secrets
3. **Traditional hosting:** Set environment variables on your server

### Environment Variables Checklist:
- ✅ `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- ✅ `NEXT_PUBLIC_CLOUDINARY_API_KEY`
- ✅ `CLOUDINARY_API_SECRET`
- ✅ `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

## 🔄 Additional Features

The Cloudinary service includes:

- ✅ File validation (size, type, dimensions)
- ✅ Progress tracking
- ✅ Error handling
- ✅ Image optimization
- ✅ URL transformations
- ✅ Delete functionality
- ✅ Public ID extraction

## 📞 Support

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudinary Support](https://support.cloudinary.com/)
- [Community Forum](https://community.cloudinary.com/)

---

## 🎉 You're All Set!

Your Cloudinary integration is now ready! Users can upload event banners with:
- Real-time progress tracking
- Automatic image optimization
- Comprehensive error handling
- Professional UI/UX

Happy coding! 🚀
