import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Build Your Own Personal Chatbot Assistant, Powered by MongoDB",
  description: "Hacktoberfest 2026 livestream slides with Néstor Daza.",
  icons: { icon: "/favicon.ico" },
};

export default function SlidesPage() {
  redirect("/presentation/index.html");
}
