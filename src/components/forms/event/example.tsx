import AddEventForm from "./form";
import type { EventInsert } from "@/lib/types/Database";

// Example usage of the optimized event form
export default function EventFormExample() {
  const handleSuccess = (event: EventInsert) => {
    console.log("Event created successfully:", event);
    // Handle success (e.g., redirect to event page, show success message, etc.)
  };

  const handleError = (error: Error) => {
    console.error("Failed to create event:", error);
    // Handle error (e.g., show error message, retry logic, etc.)
  };

  const handleCancel = () => {
    console.log("Form cancelled");
    // Handle cancel (e.g., navigate back, reset form, etc.)
  };

  // Example 1: Basic usage for creating a new event
  const CreateEventExample = () => (
    <AddEventForm
      onSuccess={handleSuccess}
      onError={handleError}
      submitButtonText="Create Event"
    />
  );

  // Example 2: Form for editing an existing event
  const EditEventExample = () => (
    <AddEventForm
      isEditMode={true}
      eventId={123}
      initialValues={{
        name: "Existing Event",
        description: "This is an existing event",
        status: 1,
        start_datetime: "2025-08-20T10:00",
        end_datetime: "2025-08-20T16:00",
      }}
      onSuccess={handleSuccess}
      onError={handleError}
      submitButtonText="Update Event"
      showCancelButton={true}
      onCancel={handleCancel}
    />
  );

  // Example 3: Form with custom initial values
  const CustomInitialValuesExample = () => (
    <AddEventForm
      initialValues={{
        name: "New Workshop",
        description: "A hands-on workshop",
        status: 1,
        start_datetime: "",
        end_datetime: "",
      }}
      onSuccess={handleSuccess}
      onError={handleError}
      submitButtonText="Create Workshop"
    />
  );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-4">Create New Event</h2>
        <CreateEventExample />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Edit Existing Event</h2>
        <EditEventExample />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Custom Initial Values</h2>
        <CustomInitialValuesExample />
      </section>
    </div>
  );
}
