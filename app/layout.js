import { Playfair_Display } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata = {
  title: "StealthVault | Encrypted file vault in your browser",
  description:
    "Encrypt files in your browser with AES-256-GCM. Your passphrase and your files never leave your device.",
};

export const viewport = {
  themeColor: "#0b0c10",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={playfair.variable}>
      <body>{children}</body>
    </html>
  );
}
