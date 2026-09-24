import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import type { ReactNode } from "react";
import "./globals.css";

const mikhak = localFont({
  variable: "--font-mikhak",
  display: "swap",
  fallback: ["Tahoma", "Arial", "sans-serif"],
  src: "./fonts/Mikhak-FD.woff2",
  weight: "100 900",
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
    <html lang="fa" dir="rtl" className={mikhak.variable} suppressHydrationWarning>
      <body>
        <Script id="fleet-theme" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('fleet-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`}
        </Script>
        {children}
      </body>
    </html>
  );
}
