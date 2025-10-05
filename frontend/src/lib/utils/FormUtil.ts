import { z } from "zod";

export type FormFieldConfig<TFormValues> = {
  [key in keyof TFormValues]?: z.ZodTypeAny;
};

// Make the function generic
export const generateFormSchema = <TFormValues>(
  config: FormFieldConfig<TFormValues>
): z.ZodObject<{ [key in keyof Required<TFormValues>]: z.ZodTypeAny }> => {
  if (!config || typeof config !== "object") {
    throw new Error("Invalid config provided for generateFormSchema");
  }

  const schemaFields = Object.entries(config).reduce(
    (acc, [field, configField]) => {
      if (configField === undefined || configField === null) {
        throw new Error(`Field schema for "${field}" is undefined`);
      }

      return {
        ...acc,
        [field]: configField,
      };
    },
    {} as { [key in keyof Required<TFormValues>]: z.ZodTypeAny }
  );

  // Create the base schema
  const baseSchema = z.object(schemaFields);

  // Return the base schema with any additional custom validation logic (e.g., superRefine)
  return baseSchema;
};
