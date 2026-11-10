import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Lefifi Investments | Events & Production",
    short_name: "Lefifi",
    description: "Event planning, equipment hire and technical production by Lefifi Investments in Gaborone, Botswana.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#09131e",
    theme_color: "#09131e",
    orientation: "portrait-primary",
    lang: "en",
    categories: ["business", "productivity"],
    prefer_related_applications: false,
    icons: [
      { src: "/lefifi-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
    ],
    shortcuts: [
      { name: "Services and enquiries", short_name: "Enquire", description: "Explore Lefifi services and send an enquiry", url: "/#request", icons: [{ src: "/lefifi-mark.svg", sizes: "any", type: "image/svg+xml" }] },
      { name: "My requests", short_name: "Requests", description: "Review your event and equipment requests", url: "/account", icons: [{ src: "/lefifi-mark.svg", sizes: "any", type: "image/svg+xml" }] }
    ]
  };
}
