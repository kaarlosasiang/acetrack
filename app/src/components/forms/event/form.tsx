"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";

import { Button } from "@/components/ui/button";
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

const formSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Event name must be at least 2 characters." }),
  description: z.string().optional(),
  banner: z
    .string()
    .url({ message: "Banner must be a valid URL." })
    .optional()
    .or(z.literal(""))
    .optional(),
  status: z.coerce.number().int().min(0, { message: "Status is required." }),
  start_datetime: z
    .string()
    .min(1, { message: "Start date/time is required." }),
  end_datetime: z.string().min(1, { message: "End date/time is required." }),
  location: z.string().min(2, { message: "Location is required." }),
});

// Placeholder Cloudinary upload function
async function uploadToCloudinary(file: File): Promise<string> {
  // TODO: Replace with your Cloudinary upload logic and credentials
  // Example: use fetch to POST to Cloudinary unsigned upload endpoint
  // Return the uploaded image URL
  console.log("Uploading file:", file.name);
  return new Promise((resolve) => {
    setTimeout(
      () => resolve("https://res.cloudinary.com/demo/image/upload/sample.jpg"),
      1000
    );
  });
}

export default function AddEventForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      banner: "",
      status: 1,
      start_datetime: "",
      end_datetime: "",
      location: "",
    },
  });

  const [uploading, setUploading] = React.useState(false);

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      form.setValue("banner", url, { shouldValidate: true });
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    // TODO: Call eventService.createEvent here
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                <Textarea placeholder="Event description" {...field} />
              </FormControl>
              <FormDescription>Optional: describe the event.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="banner"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Banner Image</FormLabel>
              <FormControl>
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                  />
                  {uploading && (
                    <div className="text-xs mt-1">Uploading...</div>
                  )}
                  {field.value && !uploading && (
                    <Image
                      src={field.value}
                      alt="Banner preview"
                      width={200}
                      height={128}
                      className="mt-2 max-h-32 rounded object-cover"
                    />
                  )}
                  <input type="hidden" {...field} />
                </div>
              </FormControl>
              <FormDescription>
                Upload a banner image (Cloudinary).
              </FormDescription>
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
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={2}
                  placeholder="Status (e.g. 1)"
                  value={
                    typeof field.value === "number"
                      ? field.value.toString()
                      : ""
                  }
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormDescription>
                Status code (e.g. 1 = Active, 0 = Inactive).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
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
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="Event location" {...field} />
              </FormControl>
              <FormDescription>Where the event will be held.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Add Event</Button>
      </form>
    </Form>
  );
}
