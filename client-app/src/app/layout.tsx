import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import AuthWrapper from "@/components/auth-wrapper";
import localFont from "next/font/local";
import PrivyProvider from "@/context/privy-provider";
import { UserDataProvider } from "@/context/user-data-provider";

const departureMono = localFont({
  src: "./fonts/DepartureMono-Regular.woff2",
  variable: "--font-departure-mono",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Unwallet",
  description:
    "One wallet for payments on any chain — built for agents, merchants, and users.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.className} ${departureMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <PrivyProvider>
            <UserDataProvider>
              <AuthWrapper>{children}</AuthWrapper>
            </UserDataProvider>
          </PrivyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
