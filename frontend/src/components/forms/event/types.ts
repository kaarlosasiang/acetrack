import { z } from "zod";
import type { EventInsert } from "@/lib/types/Database";
import { eventFormSchema } from "./schema";

/**
 * Form data type inferred from the validation schema
 */
export type EventFormData = z.infer<typeof eventFormSchema>;

/**
 * Event status options for the form
 */
export const EVENT_STATUS_OPTIONS = [
  { value: "0", label: "Inactive" },
  { value: "1", label: "Active" },
  { value: "2", label: "Completed" },
] as const;

/**
 * Event status type
 */
export type EventStatus = (typeof EVENT_STATUS_OPTIONS)[number]["value"];

/**
 * Form submission state
 */
export type FormSubmissionState = {
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
};

/**
 * File upload state
 */
export type FileUploadState = {
  isUploading: boolean;
  progress: number;
  error: string | null;
  url: string | null;
};

/**
 * Drag and drop state
 */
export type DragDropState = {
  isDragActive: boolean;
  isDragAccept: boolean;
  isDragReject: boolean;
};

/**
 * Event form props
 */
export interface EventFormProps {
  /**
   * Initial values for editing mode
   */
  initialValues?: Partial<EventFormData>;
  /**
   * Callback when form is successfully submitted
   */
  onSuccess?: (event: EventInsert) => void;
  /**
   * Callback when form submission fails
   */
  onError?: (error: Error) => void;
  /**
   * Whether the form is in edit mode
   */
  isEditMode?: boolean;
  /**
   * Event ID for editing mode
   */
  eventId?: number;
  /**
   * Custom submit button text
   */
  submitButtonText?: string;
  /**
   * Whether to show the cancel button
   */
  showCancelButton?: boolean;
  /**
   * Cancel button callback
   */
  onCancel?: () => void;
}

/**
 * Transform form data to database insert format
 */
export function transformFormDataToEventInsert(
  formData: EventFormData
): Omit<EventInsert, "id"> {
  return {
    name: formData.name,
    description: formData.description || null,
    location: formData.location,
    banner: formData.banner || null,
    status: formData.status,
    start_datetime: formData.start_datetime,
    end_datetime: formData.end_datetime,
  };
}

/**
 * Transform database event to form data
 */
export function transformEventToFormData(
  event: Partial<EventInsert>
): Partial<EventFormData> {
  return {
    name: event.name || "",
    description: event.description || "",
    location: event.location || "",
    banner: event.banner || "",
    status: event.status || 1,
    start_datetime: event.start_datetime || "",
    end_datetime: event.end_datetime || "",
  };
}

/**
 * Default form values
 */
export const DEFAULT_FORM_VALUES: EventFormData = {
  banner: "",
  name: "",
  description: "",
  location: "",
  status: 1,
  start_datetime: "",
  end_datetime: "",
};
