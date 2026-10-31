import "../styles/globals.css";
import { Geist_Mono, Instrument_Sans, Newsreader } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ThemeToaster } from "@/components/layout/theme-toaster";

const bodyFont = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const displayFont = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
});
const monoFont = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-geist-mono" });

const themeScript = `try {
  const saved = localStorage.getItem("paperwise-theme");
  const preference = saved === "light" || saved === "dark" ? saved : "system";
  const theme = preference === "system"
    ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preference;
} catch {
  document.documentElement.dataset.theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}`;

export const metadata = {
  title: "Paperwise — Chat with your documents",
  description: "Upload any PDF, Word doc, or text file and ask questions in plain English.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-bg font-sans text-ink antialiased selection:bg-accent/30">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <ThemeToaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
