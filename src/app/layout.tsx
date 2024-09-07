
import { type Metadata } from "next";
import TopNav from "@/app/_components/TopNav";
import { Toaster } from "@/components/ui/toaster"
import { Web3AuthProvider } from "@/components/Web3AuthProvider";
// import localFont from "next/font/local";
import "./globals.css";

// const geistSans = localFont({
//   src: "./fonts/GeistVF.woff",
//   variable: "--font-geist-sans",
//   weight: "100 900",
// });
// const geistMono = localFont({
//   src: "./fonts/GeistMonoVF.woff",
//   variable: "--font-geist-mono",
//   weight: "100 900",
// });

export const metadata: Metadata = {
  title: "ZeroVero - Privacy-Preserving Identity Verification",
  description: "ZeroVero provides privacy-preserving identity verification solutions.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark`}>
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