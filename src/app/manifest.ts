import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Big Dawgs Gotta Eat",
    short_name: "Big Dawgs",
    description: "Calorie and macro tracking",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ff8200",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
