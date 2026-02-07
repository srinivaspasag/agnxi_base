import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "Agnxi — Production-grade AI agent hosting",
    template: "%s | Agnxi",
  },
  description:
    "Secure, scalable agent hosting platform. Multi-tenant, production-ready. Register agents, invoke via API, monitor in real time.",
  keywords: ["AI agents", "agent hosting", "multi-tenant", "API", "production"],
  authors: [{ name: "Agnxi" }],
  openGraph: {
    title: "Agnxi — Production-grade AI agent hosting",
    description:
      "Secure, scalable agent hosting platform. Multi-tenant, production-ready.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase:
    process.env.VERCEL_URL != null
      ? new URL(`https://${process.env.VERCEL_URL}`)
      : typeof process.env.NEXT_PUBLIC_APP_URL === "string"
        ? new URL(process.env.NEXT_PUBLIC_APP_URL)
        : undefined,
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
