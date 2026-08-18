import type { Metadata, Viewport } from "next";
import { Anton, Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

// The poster face. Air sets its display type in Control Compressed, which is
// proprietary; Anton is the substitute its own style guide names, and it is a
// single-weight ultra-condensed grotesk built for exactly this — all caps at
// enormous sizes.
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://twokeys.dev"),
  title: {
    default: "TwoKeys - technical permission is not company authorization",
    template: "%s - TwoKeys",
  },
  description:
    "A decision boundary for always-on company agents. The agent holds capability; the organization holds authority. TwoKeys resolves who must approve from the action itself and executes only after every required approval covers the same version.",
  openGraph: {
    title: "TwoKeys",
    description:
      "Capability is one key. Authority is the other. A decision boundary for always-on company agents.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a3288" },
    { media: "(prefers-color-scheme: dark)", color: "#03091c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${anton.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
