import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import { getContext } from "@/lib/context";
import { themeCss } from "@/lib/theme";

export const metadata: Metadata = {
  title: "School Management System",
  description: "Scheme of work, lesson notes, student records and curriculum coverage for Nigerian schools",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { school } = await getContext();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap"
        />
        <style dangerouslySetInnerHTML={{ __html: themeCss(school) }} />
      </head>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
