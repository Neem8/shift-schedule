import "@/app/globals.css"; // your global styles path

export const metadata = {
  title: "Store Shift Scheduler",
  description: "Dynamic shift allocation matrix",
  manifest: "/manifest.json", // Tells Next.js to inject the manifest link tag
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Mobile address bar configuration styling overrides */}
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}