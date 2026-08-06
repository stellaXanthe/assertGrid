import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { AiAssistant } from "@/components/AiAssistant";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AssertGrid | Automated Web & API Testing",
  description:
    "Chain multi-step API tests and automate end-to-end browser workflows seamlessly.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen flex flex-col`}
      >
        {/* AssertGrid Navigation Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2.5 group">
                <div className="bg-blue-600 text-white font-black text-sm px-2.5 py-1 rounded-md shadow-sm group-hover:bg-blue-700 transition-colors">
                  AG
                </div>
                <span className="font-extrabold text-xl tracking-tight text-gray-900">
                  Assert<span className="text-blue-600">Grid</span>
                </span>
              </Link>

              <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-gray-600">
                <Link
                  href="/dashboard"
                  className="hover:text-blue-600 transition-colors px-2 py-1 rounded-md hover:bg-gray-100"
                >
                  Dashboard
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                System Operational
              </span>
            </div>
          </div>
        </header>

        {/* Main Content View */}
        <main className="flex-1">{children}</main>

        {/* Global Open-Source AI Assistant Drawer */}
        <AiAssistant />
      </body>
    </html>
  );
}