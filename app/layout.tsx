import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const baloo = Baloo_2({ subsets: ["latin"], variable: "--font-baloo" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });

export const metadata: Metadata = {
  title: "GamersUnite 🫧 — find your party",
  description:
    "Matchmaking for games that don't have it. Find players, pick a mode, and meet up in Discord voice.",
};

// Applies the saved (or system) theme before first paint to avoid a flash.
const themeInit = `try{var t=localStorage.getItem("gu-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const invite = process.env.DISCORD_INVITE_URL;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${baloo.variable} ${nunito.variable} font-sans antialiased`}>
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 pt-6 text-center text-sm font-bold text-purple-300 dark:text-purple-300/50">
          <p>
            Made with 🫧 for people who just want a full party.
            {invite && (
              <>
                {" · "}
                <a href={invite} className="text-[#5865F2] underline dark:text-[#8b96f8]" target="_blank" rel="noreferrer">
                  Join our Discord
                </a>
              </>
            )}
          </p>
        </footer>
      </body>
    </html>
  );
}
