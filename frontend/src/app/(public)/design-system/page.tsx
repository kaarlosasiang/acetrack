"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

const DesignSystemPage = () => {
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      setTimeout(() => setCopiedValue(null), 2000);
    } catch (err: unknown) {
      // Optionally handle the error here (e.g., show a toast notification)
      throw new Error("Failed to copy to clipboard", { cause: err });
    }
  };

  const colors = {
    primary: {
      name: "Primary",
      value: "oklch(75% .183 55.934)",
      description: "Main brand color for buttons, links, and primary actions",
      className: "bg-primary text-primary-foreground",
    },
    black: {
      name: "Black",
      value: "#1e1e1e",
      description: "Primary text color and dark elements",
      className: "bg-[#1e1e1e] text-white",
    },
    background: {
      name: "Background",
      value: "white",
      description: "Main background color for light theme",
      className: "bg-white text-black border border-gray-200",
    },
  };

  const typography = {
    Display: {
      className: "text-6xl font-bold leading-tight",
      size: "60px",
      weight: "700",
      lineHeight: "1.1",
    },
    "Heading 1": {
      className: "text-5xl font-bold leading-tight",
      size: "48px",
      weight: "700",
      lineHeight: "1.2",
    },
    "Heading 2": {
      className: "text-4xl font-semibold leading-tight",
      size: "36px",
      weight: "600",
      lineHeight: "1.3",
    },
    "Heading 3": {
      className: "text-3xl font-semibold leading-normal",
      size: "30px",
      weight: "600",
      lineHeight: "1.4",
    },
    "Heading 4": {
      className: "text-2xl font-medium leading-normal",
      size: "24px",
      weight: "500",
      lineHeight: "1.4",
    },
    "Heading 5": {
      className: "text-xl font-medium leading-normal",
      size: "20px",
      weight: "500",
      lineHeight: "1.5",
    },
    "Body Large": {
      className: "text-lg leading-relaxed",
      size: "18px",
      weight: "400",
      lineHeight: "1.6",
    },
    Body: {
      className: "text-base leading-relaxed",
      size: "16px",
      weight: "400",
      lineHeight: "1.6",
    },
    "Body Small": {
      className: "text-sm leading-relaxed",
      size: "14px",
      weight: "400",
      lineHeight: "1.5",
    },
    Caption: {
      className: "text-xs text-gray-600",
      size: "12px",
      weight: "400",
      lineHeight: "1.4",
    },
  };

  const spacing = {
    XXS: { value: "4px", className: "w-1 h-1" },
    XS: { value: "8px", className: "w-2 h-2" },
    SM: { value: "12px", className: "w-3 h-3" },
    MD: { value: "16px", className: "w-4 h-4" },
    LG: { value: "24px", className: "w-6 h-6" },
    XL: { value: "32px", className: "w-8 h-8" },
    "2XL": { value: "48px", className: "w-12 h-12" },
    "3XL": { value: "64px", className: "w-16 h-16" },
    "4XL": { value: "96px", className: "w-24 h-24" },
  };

  const borderRadius = {
    None: { value: "0px", className: "rounded-none" },
    Small: { value: "4px", className: "rounded-sm" },
    Medium: { value: "8px", className: "rounded-md" },
    Large: { value: "12px", className: "rounded-lg" },
    "Extra Large": { value: "16px", className: "rounded-xl" },
    Full: { value: "9999px", className: "rounded-full" },
  };

  const shadows = {
    None: {
      value: "none",
      className: "shadow-none",
      css: "box-shadow: none;",
    },
    Small: {
      value: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      className: "shadow-sm",
      css: "box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);",
    },
    Medium: {
      value: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      className: "shadow-md",
      css: "box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);",
    },
    Large: {
      value:
        "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      className: "shadow-lg",
      css: "box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);",
    },
    "Extra Large": {
      value: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
      className: "shadow-2xl",
      css: "box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);",
    },
  };

  const CopyButton = ({ value }: { value: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => copyToClipboard(value)}
      className="ml-2 h-8 w-8 p-0"
    >
      {copiedValue === value ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <Copy className="w-4 h-4 text-gray-500" />
      )}
    </Button>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-6xl font-bold text-[#1e1e1e] mb-4">
            Design System
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl">
            A comprehensive guide to the visual and interaction design patterns
            that make up the AceTrack brand and user experience.
          </p>
        </div>

        {/* Colors Section */}
        <section className="mb-16">
          <h2 className="text-4xl font-semibold text-[#1e1e1e] mb-8">Colors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(colors).map(([key, color]) => (
              <Card key={key}>
                <CardContent className="p-6">
                  <div
                    className={`w-full h-24 rounded-lg mb-4 ${color.className}`}
                  ></div>
                  <CardTitle className="text-xl mb-2">{color.name}</CardTitle>
                  <div className="flex items-center mb-2">
                    <Badge variant="secondary" className="font-mono">
                      {color.value}
                    </Badge>
                    <CopyButton value={color.value} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {color.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Typography Section */}
        <section className="mb-16">
          <h2 className="text-4xl font-semibold text-[#1e1e1e] mb-8">
            Typography
          </h2>
          <div className="space-y-8">
            {Object.entries(typography).map(([name, style]) => (
              <div key={name} className="border-b border-gray-200 pb-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                  <div className={style.className}>{name} Sample Text</div>
                  <div className="flex items-center mt-2 lg:mt-0">
                    <span className="text-sm text-gray-500 mr-4">
                      {style.size} / {style.weight} / {style.lineHeight}
                    </span>
                    <CopyButton value={style.className} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Spacing Section */}
        <section className="mb-16">
          <h2 className="text-4xl font-semibold text-[#1e1e1e] mb-8">
            Spacing
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Object.entries(spacing).map(([name, space]) => (
              <Card key={name}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-center h-20 mb-4">
                    <div className={`bg-primary ${space.className}`}></div>
                  </div>
                  <CardTitle className="text-lg mb-1">{name}</CardTitle>
                  <div className="flex items-center">
                    <Badge variant="outline" className="font-mono text-xs">
                      {space.value}
                    </Badge>
                    <CopyButton value={space.value} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Border Radius Section */}
        <section className="mb-16">
          <h2 className="text-4xl font-semibold text-[#1e1e1e] mb-8">
            Border Radius
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {Object.entries(borderRadius).map(([name, radius]) => (
              <Card key={name}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-center h-20 mb-4">
                    <div
                      className={`w-12 h-12 bg-primary ${radius.className}`}
                    ></div>
                  </div>
                  <CardTitle className="text-sm mb-1">{name}</CardTitle>
                  <div className="flex items-center">
                    <Badge variant="outline" className="font-mono text-xs">
                      {radius.value}
                    </Badge>
                    <CopyButton value={radius.value} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Shadows Section */}
        <section className="mb-16">
          <h2 className="text-4xl font-semibold text-[#1e1e1e] mb-8">
            Shadows
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(shadows).map(([name, shadow]) => (
              <Card key={name}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center h-24 mb-4">
                    <div
                      className={`w-16 h-16 bg-white border border-gray-200 rounded-lg ${shadow.className}`}
                    ></div>
                  </div>
                  <CardTitle className="text-lg mb-2">{name}</CardTitle>
                  <div className="flex items-center">
                    <Badge
                      variant="outline"
                      className="font-mono text-xs break-all"
                    >
                      {shadow.css}
                    </Badge>
                    <CopyButton value={shadow.css} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Component Examples Section */}
        <section className="mb-16">
          <h2 className="text-4xl font-semibold text-[#1e1e1e] mb-8">
            Component Examples
          </h2>

          <Tabs defaultValue="buttons" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="buttons">Buttons</TabsTrigger>
              <TabsTrigger value="cards">Cards</TabsTrigger>
              <TabsTrigger value="forms">Forms</TabsTrigger>
            </TabsList>

            <TabsContent value="buttons" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Button Variants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Button>Primary Button</Button>
                    <Button variant="secondary">Secondary Button</Button>
                    <Button variant="outline">Outline Button</Button>
                    <Button variant="ghost">Ghost Button</Button>
                    <Button variant="link">Link Button</Button>
                    <Button disabled>Disabled Button</Button>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-lg font-semibold mb-2">Button Sizes</h4>
                    <div className="flex flex-wrap items-center gap-4">
                      <Button size="sm">Small</Button>
                      <Button size="default">Default</Button>
                      <Button size="lg">Large</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cards" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Card</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      This is a basic card with minimal styling.
                    </p>
                    <Button variant="link" className="p-0">
                      Learn More
                    </Button>
                  </CardContent>
                </Card>

                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle>Elevated Card</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      This card has more elevation with a larger shadow.
                    </p>
                    <Button>Action</Button>
                  </CardContent>
                </Card>

                <Card className="bg-primary text-primary-foreground">
                  <CardHeader>
                    <CardTitle>Primary Card</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 opacity-90">
                      This card uses the primary color as background.
                    </p>
                    <Button variant="secondary">Get Started</Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="forms" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Form Elements</CardTitle>
                </CardHeader>
                <CardContent className="max-w-md space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="text-input">Text Input</Label>
                    <Input
                      id="text-input"
                      type="text"
                      placeholder="Enter your text here..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="select-input">Select Dropdown</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="option1">Option 1</SelectItem>
                        <SelectItem value="option2">Option 2</SelectItem>
                        <SelectItem value="option3">Option 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="textarea-input">Textarea</Label>
                    <Textarea
                      id="textarea-input"
                      placeholder="Enter your message..."
                      rows={4}
                    />
                  </div>

                  <Button className="w-full">Submit Form</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        {/* Usage Guidelines */}
        <section className="mb-16">
          <h2 className="text-4xl font-semibold text-[#1e1e1e] mb-8">
            Usage Guidelines
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">✓ Do</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-green-700">
                  <li>
                    • Use the primary color for main actions and brand elements
                  </li>
                  <li>• Maintain consistent spacing using the defined scale</li>
                  <li>
                    • Follow the typography hierarchy for content structure
                  </li>
                  <li>• Use shadows purposefully to create visual hierarchy</li>
                  <li>• Ensure sufficient contrast for accessibility</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800">✗ Don&apos;t</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-red-700">
                  <li>• Don&apos;t use colors outside the defined palette</li>
                  <li>• Don&apos;t create custom spacing values</li>
                  <li>
                    • Don&apos;t skip heading levels in typography hierarchy
                  </li>
                  <li>• Don&apos;t overuse shadows or high elevation</li>
                  <li>
                    • Don&apos;t sacrifice accessibility for visual appeal
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DesignSystemPage;
