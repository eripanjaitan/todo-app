import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task Reminder",
  description: "Workspace-based to-do list with in-app reminders",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <main className="mx-auto max-w-2xl p-4 sm:p-6">{children}</main>
        <Toaster richColors />
      </body>
    </html>
  );
}
