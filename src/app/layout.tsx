import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tech-Solution | شريك استراتيجي للتحول الرقمي",
  description: "شريك استراتيجي واحد لحلول لا حدود لها. من الحلول الرقمية الذكية إلى صناعة الحدث والتأثير الإعلامي - نقدم للمؤسسات والشركات منظومة متكاملة للنجاح والتميز.",
  keywords: ["tech-solution", "تحول رقمي", "حلول رقمية", "تونس", "مؤسسات", "شركات"],
  authors: [{ name: "Tech-Solution" }],
  openGraph: {
    title: "Tech-Solution | شريك استراتيجي للتحول الرقمي",
    description: "شريك استراتيجي واحد لحلول لا حدود لها",
    type: "website",
    locale: "ar_TN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
