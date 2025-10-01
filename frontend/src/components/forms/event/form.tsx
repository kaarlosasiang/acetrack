"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Image from "next/image";
import { Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

import { eventFormSchema } from "./schema";
import {
  type EventFormData,
  type EventFormProps,
  type FileUploadState,
  type FormSubmissionState,
  EVENT_STATUS_OPTIONS,
  DEFAULT_FORM_VALUES,
  transformFormDataToEventInsert,
  transformEventToFormData,
} from "./types";
import eventService from "@/lib/services/Eventservice";
import { 
  uploadImageToCloudinary,
  uploadImageWithProgress,
  validateImageFile 
} from "@/lib/services/CloudinaryService";

// Simple Cloudinary upload function for event banners using unsigned upload
async function uploadToCloudinary(
  file: File,
  eventId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Validate file before upload
  validateImageFile(file);

  // Use the basic unsigned upload function
  // Transformations will be handled by the upload preset configured in Cloudinary
  if (onProgress) {
    return uploadImageWithProgress(file, onProgress);
  } else {
    return uploadImageToCloudinary(file);
  }
}

export default function AddEventForm({
  initialValues,
  onSuccess,
  onError,
  isEditMode = false,
  eventId,
  submitButtonText = "Add Event",
  showCancelButton = false,
  onCancel,
}: EventFormProps = {}) {
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: initialValues ? transformEventToFormData(initialValues) : DEFAULT_FORM_VALUES,
  });

  const [uploadState, setUploadState] = React.useState<FileUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    url: initialValues?.banner || null, // Initialize with existing banner if editing
  });

  const [submissionState, setSubmissionState] = React.useState<FormSubmissionState>({
    isSubmitting: false,
    error: null,
    success: false,
  });

  const [dragActive, setDragActive] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null); // Store selected file for preview
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null); // Preview URL for selected file

  // Update upload state when initialValues change (for edit mode)
  React.useEffect(() => {
    if (initialValues?.banner) {
      setUploadState(prev => ({ ...prev, url: initialValues.banner || null }));
    }
  }, [initialValues?.banner]);

  // Cleanup preview URL when component unmounts or file changes
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function handleBannerUpload(file: File) {
    if (!file || !file.type.startsWith("image/")) return;

    try {
      // Validate file before creating preview
      validateImageFile(file);
      
      // Store the selected file for later upload
      setSelectedFile(file);
      
      // Create preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl); // Clean up previous preview
      }
      const newPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(newPreviewUrl);
      
      // Set a temporary URL in the form (will be replaced with actual Cloudinary URL on submit)
      form.setValue("banner", newPreviewUrl, { shouldValidate: true });
      
      // Clear any previous upload errors
      setUploadState(prev => ({ ...prev, error: null }));
      
      toast.success("Image ready for upload!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid file";
      setUploadState(prev => ({ ...prev, error: errorMessage }));
      toast.error(errorMessage);
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleBannerUpload(e.dataTransfer.files[0]);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleBannerUpload(file);
    }
  }

  function removeBanner() {
    // Clean up preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    
    setSelectedFile(null);
    form.setValue("banner", "", { shouldValidate: true });
    setUploadState(prev => ({ ...prev, url: null, error: null }));
  }

  async function onSubmit(values: EventFormData) {
    setSubmissionState({ isSubmitting: true, error: null, success: false });
    
    try {
      let bannerUrl = values.banner;
      
      // If we have a selected file (new upload), upload it to Cloudinary first
      if (selectedFile) {
        setUploadState(prev => ({ ...prev, isUploading: true, progress: 0 }));
        
        // Generate event ID for upload folder organization
        const uploadEventId = isEditMode && eventId ? eventId.toString() : `temp_${Date.now()}`;
        
        bannerUrl = await uploadToCloudinary(selectedFile, uploadEventId, (progress: number) => {
          setUploadState(prev => ({ ...prev, progress }));
        });
        
        setUploadState(prev => ({ ...prev, isUploading: false, progress: 100 }));
      }
      
      // Prepare event data with the uploaded banner URL
      const eventData = transformFormDataToEventInsert({
        ...values,
        banner: bannerUrl
      });
      
      let savedEvent;
      
      if (isEditMode && eventId) {
        // Update existing event
        savedEvent = await eventService.updateEvent(eventId, eventData);
        toast.success("Event updated successfully!");
      } else {
        // Create new event
        savedEvent = await eventService.createEvent(eventData);
        toast.success("Event created successfully!");
        onSuccess?.(savedEvent);
      }
      
      setSubmissionState({ isSubmitting: false, error: null, success: true });
      
      if (!isEditMode) {
        form.reset();
        // Reset all upload-related state
        setSelectedFile(null);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
        setUploadState({
          isUploading: false,
          progress: 0,
          error: null,
          url: null,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong";
      setSubmissionState({ isSubmitting: false, error: errorMessage, success: false });
      setUploadState(prev => ({ ...prev, isUploading: false, progress: 0 }));
      toast.error(errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Banner Upload Section */}
        <FormField
          control={form.control}
          name="banner"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Banner Image</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  {/* Combined Drag and Drop / Preview Area */}
                  <div
                    className={`relative border-2 border-dashed rounded-lg transition-colors overflow-hidden ${
                      dragActive
                        ? "border-primary bg-primary/5"
                        : "border-gray-300 hover:border-gray-400"
                    } ${uploadState.isUploading ? "opacity-50 pointer-events-none" : ""}`}
                    style={{ height: "400px", maxWidth: "100%" }}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    {(previewUrl || uploadState.url || field.value) && !uploadState.isUploading ? (
                      // Preview Mode
                      <div className="relative w-full h-full group">
                        <Image
                          src={previewUrl || uploadState.url || field.value || ""}
                          alt="Banner preview"
                          fill
                          className="object-cover rounded-lg"
                          sizes="(max-width: 768px) 100vw, 800px"
                        />
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="text-white text-center">
                            <Upload className="mx-auto h-8 w-8 mb-2" />
                            <p className="text-sm font-medium">
                              {previewUrl ? "Drop a new image to replace" : "Drop a new image to replace"}
                            </p>
                            <p className="text-xs">or click to browse</p>
                          </div>
                        </div>
                        {/* Remove button */}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={removeBanner}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        {/* Click overlay for file input */}
                        <label
                          htmlFor="banner-upload"
                          className="absolute inset-0 cursor-pointer"
                        >
                          <input
                            id="banner-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="sr-only"
                          />
                        </label>
                        {/* Preview indicator */}
                        {previewUrl && (
                          <div className="absolute bottom-2 left-2">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              Ready to upload
                            </Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Upload Mode
                      <div className="flex items-center justify-center h-full p-6">
                        <div className="text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-4">
                            <label
                              htmlFor="banner-upload-empty"
                              className="cursor-pointer"
                            >
                              <span className="mt-2 block text-sm font-medium text-gray-900">
                                Drop an image here or click to browse
                              </span>
                              <span className="mt-1 block text-xs text-gray-500">
                                PNG, JPG, GIF up to 10MB • Recommended: 1000x400
                                pixels
                              </span>
                            </label>
                            <input
                              id="banner-upload-empty"
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="sr-only"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {uploadState.isUploading && (
                      <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-2">
                            Uploading... {uploadState.progress}%
                          </div>
                          <div className="w-48 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadState.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <input type="hidden" {...field} />
                </div>
              </FormControl>
              <FormDescription>
                Upload a banner image for the event. The image will be uploaded when you save the event. Recommended size: 1000x400 pixels.
              </FormDescription>
              {uploadState.error && (
                <p className="text-sm text-red-600">{uploadState.error}</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Event Basic Information */}
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Name</FormLabel>
                <FormControl>
                  <Input placeholder="Event name" {...field} />
                </FormControl>
                <FormDescription>Name of the event.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Event description" 
                    {...field} 
                    rows={4}
                    className="resize-none"
                  />
                </FormControl>
                <FormDescription>
                  Optional: Describe the event details.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Location and Status - Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Event location" {...field} />
                </FormControl>
                <FormDescription>Where the event will take place.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(Number(value))} 
                  value={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EVENT_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Current status of the event.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Date and Time - Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="start_datetime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date & Time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormDescription>When the event starts.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="end_datetime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date & Time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormDescription>When the event ends.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {submissionState.error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {submissionState.error}
          </div>
        )}

        <div className="flex gap-4">
          <Button 
            type="submit" 
            disabled={submissionState.isSubmitting || uploadState.isUploading}
            className="flex-1"
            size={"lg"}
          >
            {uploadState.isUploading 
              ? `Uploading image... ${uploadState.progress}%`
              : submissionState.isSubmitting 
                ? "Saving..." 
                : submitButtonText
            }
          </Button>
          
          {showCancelButton && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={submissionState.isSubmitting || uploadState.isUploading}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
