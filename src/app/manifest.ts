import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Duesly",
    short_name: "Duesly",
    description: "Collect estate dues and service charges with one shareable link.",
    start_url: "/",
    display: "standalone",
    background_color: "#08090a",
    theme_color: "#717CE2",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
