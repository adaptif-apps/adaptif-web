export interface ServiceCategory {
  id: string;
  name: string;
  focus: string;
  icon: "design" | "branding" | "web" | "production" | "marketing" | "ai";
  services: string[];
}

export const dedicatedTeamServices: ServiceCategory[] = [
  {
    id: "design",
    name: "Design",
    focus: "Visual craft & systems",
    icon: "design",
    services: [
      "Logo & identity design",
      "Visual systems",
      "Illustration",
      "Iconography",
      "Presentation design",
    ],
  },
  {
    id: "branding",
    name: "Branding",
    focus: "Positioning & voice",
    icon: "branding",
    services: [
      "Brand strategy",
      "Tone of voice",
      "Brand guidelines",
      "Naming & positioning",
    ],
  },
  {
    id: "web",
    name: "Web",
    focus: "Digital experiences",
    icon: "web",
    services: [
      "Landing pages",
      "Webflow development",
      "UI/UX design",
      "Microsites & portals",
    ],
  },
  {
    id: "production",
    name: "Production",
    focus: "Multi-channel deliverables",
    icon: "production",
    services: [
      "Social media graphics",
      "Ad creatives",
      "Print & packaging",
      "Video editing",
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    focus: "Campaign & growth assets",
    icon: "marketing",
    services: [
      "Email design",
      "Campaign assets",
      "Performance creatives",
      "Pitch decks",
    ],
  },
  {
    id: "ai-enhanced",
    name: "AI-Enhanced",
    focus: "Workflow & production support",
    icon: "ai",
    services: [
      "AI-assisted ideation",
      "Asset generation",
      "Rapid prototyping",
      "Multi-format variation sets",
    ],
  },
];
