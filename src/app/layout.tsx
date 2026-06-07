import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export const metadata: Metadata = {
  title: "CareerPilot — Your Agentic Career Co-pilot",
  description:
    "AI platform that knows you — hunts jobs, scores your fit, drafts applications, and builds your learning roadmap.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Topbar />
            <main className="flex-1 p-6 lg:p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
