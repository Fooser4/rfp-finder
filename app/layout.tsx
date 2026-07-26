import "./globals.css";

export const metadata = {
  title: "RFP Finder",
  description: "Find branding and design RFPs from government and university sources",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
