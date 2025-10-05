import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design System - AceTrack",
  description:
    "A comprehensive guide to the visual and interaction design patterns that make up the AceTrack brand and user experience.",
};

export default function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
