import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Samata Sainik Dal (SSD) | Central Command Platform',
  description: 'Official Digital Command, Cadre Enlistment & Public Verification Platform of Samata Sainik Dal (Founded by Bodhisattva Dr. B.R. Ambedkar in 1927).',
  icons: {
    icon: '/logo.svg',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Noto+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Tiro+Devanagari+Hindi:ital@0;1&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
      </head>
      <body className="font-md">
        {children}
      </body>
    </html>
  );
}
