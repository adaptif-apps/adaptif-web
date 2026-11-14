export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  tags: string[];
  image: string;
  gallery: string[];
  sortOrder: number;
  isPublished: boolean;
  showOnHome: boolean;
}

const imagePool = [
  "/work-featured/sideline.jpg",
  "/work-featured/yumyum.jpg",
  "/work-featured/forever.jpg",
  "/work-featured/morganic.jpg",
  "/work-featured/dunamis.jpg",
  "/work-featured/platemakrs.jpg",
  "/work/dcbe45c0e1ae80c24e20cf0d5abba272.jpg",
  "/work/1fce34a3758cff5e47cf0a25904b4854.jpg",
  "/work/9e80968f8b616f415454cfd43eb454c8.jpg",
  "/work/0cb17cbee8ef36202bfb1b0e17338257.jpg",
  "/work/664bbf117716eb69519b17e2f37bee2a.jpg",
  "/work/ade59a73aba7c39e38d6aa91565627bc.jpg",
  "/header_images/Work Item Container-1.jpg",
  "/header_images/Work Item Container-2.jpg",
  "/header_images/Work Item Container-3.jpg",
  "/header_images/Work Item Container-4.jpg",
  "/header_images/Work Item Container-5.jpg",
  "/header_images/Work Item Container-6.jpg",
  "/header_images/Work Item Container-7.jpg",
  "/header_images/Work Item Container-8.jpg",
  "/header_images/Work Item Container-10.jpg",
  "/header_images/Work Item Container-11.jpg",
  "/header_images/Work Item Container.jpg",
];

function buildGallery(primary: string, offset: number): string[] {
  const rest = imagePool.filter((img) => img !== primary);
  const rotated = [...rest.slice(offset % rest.length), ...rest.slice(0, offset % rest.length)];
  return [primary, ...rotated.slice(0, 11)];
}

const rawSeed: Omit<PortfolioProject, "gallery" | "sortOrder" | "isPublished" | "showOnHome">[] = [
  {
    id: "sideline-podcast",
    title: "Sideline Podcast",
    description:
      "A sports podcast brand that is energetic, informal, and community-driven, blending passionate game analysis with humor, internet culture, and relatable storytelling.",
    tags: ["Branding", "Motion Design", "Social Media Creative", "Ad Creative", "Video Production"],
    image: "/work-featured/sideline.jpg",
  },
  {
    id: "yum-yum-digital",
    title: "Yum Yum Digital",
    description:
      "A bold digital agency identity built around kinetic motion, expressive 3D visuals, and conversion-focused web experiences.",
    tags: ["Branding", "Social Media Creative", "Web Design", "Marketing Campaign"],
    image: "/work-featured/yumyum.jpg",
  },
  {
    id: "forever-and-ever",
    title: "Forever & Ever",
    description:
      "A warm, family-centered memory platform designed to make capturing and sharing everyday milestones effortless across web and mobile.",
    tags: ["Branding", "App Design", "Web Design", "Social Media Creative"],
    image: "/work-featured/forever.jpg",
  },
  {
    id: "morganic",
    title: "Morganic",
    description:
      "A clean, performance-led wellness and functional nutrition brand pairing vibrant product storytelling with high-converting ecommerce creatives.",
    tags: ["Branding", "Ecommerce", "Social Media Creative", "Ad Creative"],
    image: "/work-featured/morganic.jpg",
  },
  {
    id: "dunamis-xp",
    title: "Dunamis XP",
    description:
      "A disciplined athletic training app and brand system engineered for clarity in motion, structured workouts, and daily progress tracking.",
    tags: ["Branding", "App Design"],
    image: "/work-featured/dunamis.jpg",
  },
  {
    id: "platemakrs",
    title: "Platemakrs",
    description:
      "A precision-crafted automotive customization platform combining sleek dark UI, interactive configurators, and full-funnel campaign creatives.",
    tags: ["Branding", "App Design", "Email Campaign", "Social Media", "Ad Creatives"],
    image: "/work-featured/platemakrs.jpg",
  },
  {
    id: "punch-4-parkinsons",
    title: "Punch 4 Parkinson’s",
    description:
      "An uplifting community fitness initiative uniting boxing-inspired programs, accessible mobile tools, and awareness-driven campaign visuals.",
    tags: ["Branding", "App Design", "Social Media", "Ad Creative"],
    image: "/header_images/Work Item Container-1.jpg",
  },
  {
    id: "king-energy",
    title: "King Energy",
    description:
      "High-impact social storytelling and retention email campaigns crafted to keep an active lifestyle audience engaged every week.",
    tags: ["Email Campaign", "Social Media"],
    image: "/header_images/Work Item Container-2.jpg",
  },
  {
    id: "riizeup",
    title: "RiizeUp",
    description:
      "A modern wellness brand system spanning retail packaging, in-store P.O.P displays, ecommerce web design, and paid social creative.",
    tags: ["Branding", "Social Media Creative", "Web Design", "Ad Creative", "Packaging", "P.O.P Material"],
    image: "/header_images/Work Item Container-3.jpg",
  },
  {
    id: "riize-health",
    title: "Riize Health",
    description:
      "A cohesive healthcare and supplement identity built for shelf presence, digital trust, and omnichannel acquisition campaigns.",
    tags: ["Branding", "Social Media Creative", "Web Design", "Ad Creative", "Packaging", "P.O.P Material"],
    image: "/header_images/Work Item Container-4.jpg",
  },
  {
    id: "designer-plants",
    title: "Designer Plants",
    description:
      "Botanical architectural styling translated into an elevated brand, tactile packaging, editorial web design, and seasonal ad campaigns.",
    tags: ["Branding", "Web Design", "Social Media Creative", "Packaging", "Ad Creative"],
    image: "/header_images/Work Item Container-5.jpg",
  },
  {
    id: "designer-vertical-gardens",
    title: "Designer Vertical Gardens",
    description:
      "A lush, design-forward visual system showcasing architectural greenery across digital storefronts, packaging, and paid acquisition.",
    tags: ["Branding", "Web Design", "Social Media Creative", "Packaging", "Ad Creative"],
    image: "/header_images/Work Item Container-6.jpg",
  },
  {
    id: "miss-bukowski",
    title: "Miss Bukowski",
    description:
      "An expressive editorial lifestyle brand uniting distinctive typography, curated web design, social content, and lifecycle email.",
    tags: ["Branding", "Web Design", "Social Media", "Email Campaign"],
    image: "/header_images/Work Item Container-7.jpg",
  },
  {
    id: "cafe-marbella",
    title: "Café Marbella",
    description:
      "A warm, sensory ecommerce experience crafted to highlight single-origin coffee craftsmanship and streamline online ordering.",
    tags: ["Ecommerce Design"],
    image: "/header_images/Work Item Container-8.jpg",
  },
  {
    id: "webinars-lupulados",
    title: "Webinars Lupulados",
    description:
      "A specialized brewing education platform combining vibrant event branding, ecommerce ticketing, and multi-channel marketing campaigns.",
    tags: ["Branding", "Social Media Creative", "Ad Creative", "Ecommerce Design", "Marketing Campaign"],
    image: "/work/dcbe45c0e1ae80c24e20cf0d5abba272.jpg",
  },
  {
    id: "congreso-de-lupulo",
    title: "Congreso de Lúpulo",
    description:
      "An international craft-brewing congress identity spanning event branding, ticketed ecommerce, paid media, and campaign assets.",
    tags: ["Branding", "Social Media Creative", "Ad Creative", "Ecommerce Design", "Marketing Campaign"],
    image: "/header_images/Work Item Container-10.jpg",
  },
  {
    id: "billy-pet-stuff",
    title: "Billy Pet Stuff",
    description:
      "A playful, approachable pet lifestyle brand built around expressive social creative and a conversion-friendly ecommerce storefront.",
    tags: ["Branding", "Social Media Creative", "Ecommerce Design"],
    image: "/header_images/Work Item Container-11.jpg",
  },
  {
    id: "high-corner",
    title: "High Corner",
    description:
      "A crisp, contemporary commerce brand balancing bold visual identity with agile social storytelling and online store design.",
    tags: ["Branding", "Social Media Creative", "Ecommerce Design"],
    image: "/work/1fce34a3758cff5e47cf0a25904b4854.jpg",
  },
  {
    id: "maison-etherique",
    title: "Maison Etherique",
    description:
      "A refined luxury maison identity expressed through tactile packaging, print collateral, and serene editorial web design.",
    tags: ["Branding", "Packaging", "Web Design", "Print Creative"],
    image: "/header_images/Work Item Container.jpg",
  },
];

export const portfolioSeed: PortfolioProject[] = rawSeed.map((item, idx) => ({
  ...item,
  gallery: buildGallery(item.image, idx * 2),
  sortOrder: idx,
  isPublished: true,
  showOnHome: idx < 6,
}));
