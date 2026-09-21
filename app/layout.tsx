import "./globals.css";
import type { Metadata } from "next";
import StudioAuthBoundary from "@/components/StudioAuthBoundary";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Onboard Doc - Interactive Video Platform",
  description:
    "Create and experience interactive video content with AI-powered hotspots",
  openGraph: {
    images: [
      {
        url: "https://bolt.new/static/og_default.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      {
        url: "https://bolt.new/static/og_default.png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <StudioAuthBoundary>
          {children}
          <Toaster />
        </StudioAuthBoundary>
      </body>
    </html>
  );
}
