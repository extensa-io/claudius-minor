import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Claudius Minor", description: "A small AI agent with MongoDB memory." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
