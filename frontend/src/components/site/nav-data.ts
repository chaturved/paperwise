export interface MenuItem {
  label: string;
  description: string;
  href: string;
  badge?: string;
}

export interface MegaMenu {
  id: string;
  label: string;
  columns: MenuItem[][];
  feature: { title: string; description: string; href: string; tone: "paint" | "warm" };
}

export const megaMenus: MegaMenu[] = [
  {
    id: "product",
    label: "Product",
    columns: [
      [
        { label: "Chat with documents", description: "Ask in plain language and get an answer with its source.", href: "/product" },
        { label: "Sources", description: "See the file and the quote behind each answer.", href: "/product#sources" },
        { label: "Library", description: "Keep your files together and choose which one to ask about.", href: "/product#library" },
      ],
      [
        { label: "Saved conversations", description: "Come back to a past chat without asking again.", href: "/product#history" },
        { label: "Pro", description: "Unlimited documents and questions, plus DOCX support.", href: "/pricing", badge: "SOON" },
      ],
    ],
    feature: { title: "Free plan, available now", description: "Five documents and twenty questions a day, with no payment needed.", href: "/pricing", tone: "paint" },
  },
  {
    id: "use-cases",
    label: "Use cases",
    columns: [
      [
        { label: "Contracts and policies", description: "Check a clause, a deadline or a requirement.", href: "/use-cases#contracts" },
        { label: "Reports and research", description: "Pull a figure from a long report and see where it came from.", href: "/use-cases#reports" },
      ],
      [
        { label: "Meeting notes", description: "Find who owns what and what was decided.", href: "/use-cases#notes" },
        { label: "Study and reference", description: "Ask questions of a paper, a textbook or a manual.", href: "/use-cases#study" },
      ],
    ],
    feature: { title: "Start with one file", description: "Upload a document and ask your first question in under a minute.", href: "/signup", tone: "warm" },
  },
];

export const navLinks = [
  { label: "Security", href: "/security" },
  { label: "Pricing", href: "/pricing" },
];

export const footerColumns = [
  {
    heading: "Product",
    links: [
      { label: "Chat with documents", href: "/product" },
      { label: "Sources", href: "/product#sources" },
      { label: "Library", href: "/product#library" },
      { label: "Saved conversations", href: "/product#history" },
    ],
  },
  {
    heading: "Use cases",
    links: [
      { label: "Contracts and policies", href: "/use-cases#contracts" },
      { label: "Reports and research", href: "/use-cases#reports" },
      { label: "Meeting notes", href: "/use-cases#notes" },
      { label: "Study and reference", href: "/use-cases#study" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Security", href: "/security" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
] as const;
