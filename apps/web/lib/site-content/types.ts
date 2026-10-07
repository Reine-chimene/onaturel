export type CmsImage = {
  file_id?: string | null;
  url?: string;
  alt?: string;
};

export type CmsLink = {
  label: string;
  href: string;
};

export type SiteContact = {
  whatsapp_e164: string;
  whatsapp_display: string;
  hours: string;
};

export type SiteFooterContent = {
  tagline: string;
  base_line: string;
};

export type HomeContent = {
  topbar: string;
  hero: {
    image: CmsImage;
    brand: string;
    title: string;
    title_emphasis: string;
    subtitle: string;
    cta_primary: CmsLink;
    cta_secondary: CmsLink;
  };
  incontournables: {
    title: string;
    card: {
      image: CmsImage;
      title: string;
      text: string;
      link_label: string;
      href: string;
    };
  };
  univers: {
    title: string;
    lead: string;
  };
  spirit: {
    label: string;
    title: string;
    text: string;
    cta: CmsLink;
    images: [CmsImage, CmsImage, CmsImage];
  };
  rituals: {
    title: string;
    link: CmsLink;
  };
  split: {
    left: { image: CmsImage; kicker: string; title: string; href: string };
    right: { image: CmsImage; kicker: string; title: string; href: string };
  };
  maison: {
    image: CmsImage;
    since: string;
    title: string;
    text: string;
    cta: CmsLink;
  };
  contact: {
    title: string;
    subtitle: string;
    cta_label: string;
  };
};

export type HistoireContent = {
  hero: {
    image: CmsImage;
    ghost: string;
    label: string;
    title: string;
    lead: string;
  };
  year: {
    mark: string;
    label: string;
    title: string;
    text: string;
    phrase: string;
  };
  body: {
    label: string;
    title: string;
    text: string;
    pillars: string[];
  };
  spirit: {
    label: string;
    title: string;
    paragraphs: [string, string];
    aside: string[];
  };
  guide: {
    label: string;
    title: string;
    text: string;
    cta_label: string;
  };
  close: {
    lines: [string, string, string];
    text: string;
    cta: CmsLink;
  };
};

export type BoutiqueContent = {
  kicker: string;
  title: string;
  lead: string;
  image: CmsImage;
};

export type SeoContent = {
  title: string;
  description: string;
  og_image: CmsImage;
};

export type SiteContent = {
  contact: SiteContact;
  footer: SiteFooterContent;
  home: HomeContent;
  histoire: HistoireContent;
  boutique: BoutiqueContent;
  seo: SeoContent;
};

export const CONTENT_KEYS = {
  contact: "content.contact",
  footer: "content.footer",
  home: "content.home",
  histoire: "content.histoire",
  boutique: "content.boutique",
  seo: "content.seo",
} as const;
