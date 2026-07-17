import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: { default: "Duesly", template: "%s · Duesly" },
  description:
    "Collect estate dues and service charges with one shareable link.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          id="duesly-theme"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var t = localStorage.getItem('duesly-theme');
              if(!t){ t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; }
              document.documentElement.setAttribute('data-theme', t);
            }catch(e){ document.documentElement.setAttribute('data-theme','dark'); }})();`,
          }}
        />
        {children}
      </body>
    </html>
  )
}
