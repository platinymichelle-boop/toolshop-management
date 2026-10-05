import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Metal Stamping Maintenance",
    short_name: "MSM",
    description: "Sistem de management operational pentru service",
    start_url: "/",
    scope: "/", // ADAUGAT: Blochează aplicația să iasă în browserul normal
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
