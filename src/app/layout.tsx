import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Valax Scrub BBS and Trade | Developer Community & Digital Marketplace",
  description: "Official Valax Scrub community forum, developer discussion boards, digital marketplace, and Utility Credit ledger system.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col antialiased">
        <Navbar />
        <div className="mx-auto flex w-full max-w-7xl flex-1">
          <Sidebar />
          <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
        <Footer />
      </body>
    </html>
  );
}