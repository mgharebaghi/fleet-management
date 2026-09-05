import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import "./globals.css";

const iranSansXFaNum = localFont({
  variable: "--font-iran-sans-x",
  display: "swap",
  fallback: ["Tahoma", "Arial", "sans-serif"],
  src: [
    {
      path: "./fonts/IRANSansXFaNum-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/IRANSansXFaNum-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "سامانه مدیریت ناوگان",
    template: "%s | سامانه مدیریت ناوگان",
  },
  description: "سامانه مدیریت ناوگان و اطلاعات پایه",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className={iranSansXFaNum.variable}>
      <body>{children}</body>
    </html>
  );
}
