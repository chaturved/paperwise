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
        { label: "Sources", description: "Numbered citations, and the cited page opened with the passage highlighted.", href: "/product/sources" },
        { label: "How it works", description: "From a file to a checked answer in three steps.", href: "/how-it-works" },
      ],
      [
        { label: "Library", description: "Keep your files together and choose which one to ask about.", href: "/product#library" },
        { label: "Saved conversations", description: "Come back to a past chat without asking again.", href: "/product#history" },
        { label: "Pro", description: "Unlimited documents and questions, larger files and full history.", href: "/pricing", badge: "SOON" },
      ],
    ],
    feature: { title: "Free plan, available now", description: "Five documents and twenty questions a day, with no payment needed.", href: "/pricing", tone: "paint" },
  },
  {
    id: "solutions",
    label: "Solutions",
    columns: [
      [
        { label: "For freelancers", description: "Read a client contract or brief before you sign or start.", href: "/for/freelancers" },
        { label: "For small businesses", description: "Find the answer in your leases, policies and supplier terms.", href: "/for/small-business" },
        { label: "For researchers and students", description: "Ask a paper, a textbook or a manual a question.", href: "/for/researchers-and-students" },
      ],
      [
        { label: "Contracts and policies", description: "Check a clause, a deadline or a requirement.", href: "/use-cases#contracts" },
        { label: "Reports and research", description: "Pull a figure from a long report and see where it came from.", href: "/use-cases#reports" },
        { label: "All use cases", description: "Meeting notes, study material and more.", href: "/use-cases" },
      ],
    ],
    feature: { title: "Start with one file", description: "Upload a document and ask your first question in under a minute.", href: "/signup", tone: "warm" },
  },
  {
    id: "resources",
    label: "Resources",
    columns: [
      [
        { label: "Questions and answers", description: "What you can upload, what it costs and how your data is handled.", href: "/faq" },
        { label: "Security", description: "How your files are kept private, in plain language.", href: "/security" },
      ],
      [
        { label: "AI and your documents", description: "What is sent to the AI service, and what is not.", href: "/legal/ai" },
        { label: "Legal", description: "Terms of Service, Privacy Policy and more.", href: "/legal" },
      ],
    ],
    feature: { title: "See it on your own files", description: "Ask for a walkthrough using a document you already have.", href: "/demo", tone: "paint" },
  },
  {
    id: "company",
    label: "Company",
    columns: [
      [
        { label: "About", description: "Why Paperwise shows its sources.", href: "/about" },
        { label: "Contact", description: "Reach the team by email.", href: "/contact" },
      ],
      [{ label: "Request a demo", description: "A walkthrough using a document you bring.", href: "/demo" }],
    ],
    feature: { title: "Talk to us", description: "Questions about plans, security or your files are welcome.", href: "/contact", tone: "warm" },
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
      { label: "Sources", href: "/product/sources" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    heading: "Solutions",
    links: [
      { label: "For freelancers", href: "/for/freelancers" },
      { label: "For small businesses", href: "/for/small-business" },
      { label: "For researchers and students", href: "/for/researchers-and-students" },
      { label: "Use cases", href: "/use-cases" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Questions and answers", href: "/faq" },
      { label: "Security", href: "/security" },
      { label: "AI and your documents", href: "/legal/ai" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Request a demo", href: "/demo" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "All legal documents", href: "/legal" },
    ],
  },
] as const;
