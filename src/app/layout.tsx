import { type Metadata } from "next";
import { Web3AuthProvider } from "@/context/Web3AuthContext";
import TopNav from "@/app/_components/TopNav";
import { Toaster } from "@/components/ui/toaster"
import "./globals.css";

export const metadata: Metadata = {
  title: "Aeith - On-Chain AI Agents",
  description: "Aeith provides on-chain AI agent solutions.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="pt-[68px]">
        <Web3AuthProvider>
          <TopNav />
          <main>{children}</main>
          <Toaster />
        </Web3AuthProvider>
      </body>
    </html>
  );
}