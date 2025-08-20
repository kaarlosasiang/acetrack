// Main form component
export { default as AddEventForm } from "./form";

// Schema and validation
export { eventFormSchema, eventStatusSchema, fileUploadSchema } from "./schema";

// Types and utilities
export type {
  EventFormData,
  EventFormProps,
  FileUploadState,
  FormSubmissionState,
  EventStatus,
} from "./types";

export {
  EVENT_STATUS_OPTIONS,
  DEFAULT_FORM_VALUES,
  transformFormDataToEventInsert,
  transformEventToFormData,
} from "./types";

// Re-export the main component as default
export { default } from "./form";
