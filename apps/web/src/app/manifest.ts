import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ello — your English tutor",
    short_name: "Ello",
    description: "Practice English with an AI tutor: conversation, corrections, flashcards and progress.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF8F3",
    theme_color: "#3346D3",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Daily review", url: "/daily" },
      { name: "Tutor chat", url: "/tutor" },
      { name: "Offline flashcards", url: "/offline-review" },
    ],
  };
}
