"use client";

import * as React from "react";
import { Camera, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  uploadAvatarWithProgress,
  getOptimizedAvatarUrl,
  getDefaultAvatarUrl,
  getUserInitials,
  validateAvatarFile,
} from "@/lib/services/CloudinaryService";

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  userId: string;
  userName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  onAvatarUpdate?: (newAvatarUrl: string) => void;
  onError?: (error: Error) => void;
  editable?: boolean;
  showUploadButton?: boolean;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  previewUrl: string | null;
}

export function AvatarUpload({
  currentAvatarUrl,
  userId,
  userName,
  size = 'lg',
  onAvatarUpdate,
  onError,
  editable = true,
  showUploadButton = true,
}: AvatarUploadProps) {
  const [uploadState, setUploadState] = React.useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    previewUrl: null,
  });
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Get user initials for fallback
  const initials = React.useMemo(() => {
    const names = userName.split(' ');
    return getUserInitials(names[0], names[1]);
  }, [userName]);

  // Get avatar URL with optimization
  const avatarUrl = React.useMemo(() => {
    if (uploadState.previewUrl) return uploadState.previewUrl;
    if (currentAvatarUrl) {
      // If it's already a Cloudinary URL, optimize it
      if (currentAvatarUrl.includes('cloudinary.com')) {
        const publicId = currentAvatarUrl.split('/').pop()?.split('.')[0];
        return publicId ? getOptimizedAvatarUrl(publicId, size) : currentAvatarUrl;
      }
      return currentAvatarUrl;
    }
    return getDefaultAvatarUrl(initials, size);
  }, [currentAvatarUrl, uploadState.previewUrl, size, initials]);

  const handleFileSelect = (file: File) => {
    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setUploadState(prev => ({ ...prev, previewUrl, error: null }));
    
    // Start upload
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setUploadState(prev => ({ ...prev, isUploading: true, progress: 0, error: null }));

    try {
      // Validate file
      await validateAvatarFile(file);

      // Upload with progress
      const avatarUrl = await uploadAvatarWithProgress(
        file,
        userId,
        (progress) => {
          setUploadState(prev => ({ ...prev, progress }));
        }
      );

      // Success
      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        progress: 100,
        previewUrl: null 
      }));

      onAvatarUpdate?.(avatarUrl);
      toast.success("Avatar updated successfully!");
      setIsDialogOpen(false);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        progress: 0, 
        error: errorMessage,
        previewUrl: null 
      }));
      toast.error(errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const cancelPreview = () => {
    setUploadState(prev => ({ ...prev, previewUrl: null, error: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar Display */}
      <div className="relative group">
        <Avatar className={`${getSizeClasses(size)} transition-all duration-200`}>
          <AvatarImage 
            src={avatarUrl} 
            alt={`${userName}'s avatar`}
            className="object-cover"
          />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Upload overlay (only visible on hover if editable) */}
        {editable && (
          <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
            <Camera className="h-5 w-5 text-white" />
          </div>
        )}

        {/* Upload progress overlay */}
        {uploadState.isUploading && (
          <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
            <div className="text-white text-xs">
              {uploadState.progress}%
            </div>
          </div>
        )}
      </div>

      {/* Upload Button */}
      {editable && showUploadButton && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={uploadState.isUploading}>
              <Camera className="h-4 w-4 mr-2" />
              Change Avatar
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update Avatar</DialogTitle>
              <DialogDescription>
                Upload a new profile picture. For best results, use a square image.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Current/Preview Avatar */}
              <div className="flex justify-center">
                <Avatar className="h-24 w-24">
                  <AvatarImage 
                    src={uploadState.previewUrl || avatarUrl} 
                    alt="Avatar preview"
                  />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </div>

              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-gray-300 hover:border-gray-400"
                } ${uploadState.isUploading ? "opacity-50 pointer-events-none" : ""}`}
                onDrop={handleDrop}
                onDragOver={handleDrag}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
              >
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-gray-400" />
                  <div>
                    <button
                      type="button"
                      onClick={openFileDialog}
                      className="text-primary hover:text-primary/80 font-medium"
                      disabled={uploadState.isUploading}
                    >
                      Choose file
                    </button>
                    <span className="text-gray-500"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>

                {/* Progress bar */}
                {uploadState.isUploading && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadState.progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Uploading... {uploadState.progress}%
                    </p>
                  </div>
                )}

                {/* Error message */}
                {uploadState.error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{uploadState.error}</p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {uploadState.previewUrl && !uploadState.isUploading && (
                <div className="flex gap-2">
                  <Button
                    onClick={cancelPreview}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      const file = fileInputRef.current?.files?.[0];
                      if (file) handleUpload(file);
                    }}
                    size="sm"
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Helper function to get size classes
function getSizeClasses(size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') {
  const sizeClasses = {
    xs: 'h-8 w-8',
    sm: 'h-10 w-10',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
    xl: 'h-32 w-32',
  };
  return sizeClasses[size];
}

// Simple avatar display component (read-only)
export function AvatarDisplay({
  avatarUrl,
  userName,
  size = 'md',
  className = '',
}: {
  avatarUrl?: string | null;
  userName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const names = userName.split(' ');
  const initials = getUserInitials(names[0], names[1]);
  
  const optimizedUrl = React.useMemo(() => {
    if (!avatarUrl) return getDefaultAvatarUrl(initials, size);
    
    if (avatarUrl.includes('cloudinary.com')) {
      const publicId = avatarUrl.split('/').pop()?.split('.')[0];
      return publicId ? getOptimizedAvatarUrl(publicId, size) : avatarUrl;
    }
    return avatarUrl;
  }, [avatarUrl, size, initials]);

  return (
    <Avatar className={`${getSizeClasses(size)} ${className}`}>
      <AvatarImage 
        src={optimizedUrl} 
        alt={`${userName}'s avatar`}
        className="object-cover"
      />
      <AvatarFallback className="bg-primary text-primary-foreground">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
