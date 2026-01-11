import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MyFinAI - CRM Financeiro Premium",
  description: "Gestão inteligente de clientes e serviços financeiros",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
          <Sidebar />
          <main className="flex-1 ml-64 overflow-y-auto p-8 lg:p-12">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
