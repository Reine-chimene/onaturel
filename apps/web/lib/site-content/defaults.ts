import type { SiteContent } from "@/lib/site-content/types";

export const DEFAULT_SITE_CONTENT: SiteContent = {
  contact: {
    whatsapp_e164: "237673980711",
    whatsapp_display: "+237 673 980 711",
    hours: "Lundi – Samedi · 9h – 17h",
  },
  footer: {
    tagline: "Nous prenons soin de votre corps et de votre esprit.",
    base_line: "O’Naturelle · cosmétique classique · produits spirituels · Douala",
  },
  home: {
    topbar: "Depuis 2012 · Cosmétique bio · Cosmétique spirituelle · Douala",
    hero: {
      image: { url: "/images/hero-woman.png", alt: "Femme à la peau noire, cosmétique naturelle O’Naturelle" },
      brand: "O’Naturelle",
      title: "La beauté qui prend soin",
      title_emphasis: "du corps et de l’esprit.",
      subtitle: "Votre beauté. Votre énergie. Votre rituel.",
      cta_primary: { label: "Découvrir la boutique", href: "/boutique" },
      cta_secondary: {
        label: "Découvrir la cosmétique spirituelle",
        href: "/boutique?categorie=produits-spirituels-intense",
      },
    },
    incontournables: {
      title: "Nos incontournables",
      card: {
        image: { url: "/images/soin-savon.jpg", alt: "" },
        title: "Le pouvoir de la nature,\nentre soin et tradition.",
        text: "Une sélection de l’univers O’Naturelle, pensée pour le corps et pour l’esprit.",
        link_label: "Découvrir l’univers",
        href: "/boutique",
      },
    },
    univers: {
      title: "Trouvez votre univers",
      lead: "Explorez les univers O’Naturelle, du soin quotidien à la cosmétique spirituelle.",
    },
    spirit: {
      label: "Cosmétique spirituelle",
      title: "Quand le soin devient un rituel.",
      text: "Un univers inspiré par la nature, les traditions et les rituels de soin. L’eau, les plantes, les gestes — une autre manière de prendre soin du corps, de l’esprit, et de se reconnecter à soi.",
      cta: {
        label: "Découvrir la cosmétique spirituelle",
        href: "/boutique?categorie=produits-spirituels-intense",
      },
      images: [
        { url: "/images/spirit-water.jpg", alt: "Rituel au fil de l’eau" },
        { url: "/images/spirit-smudge.jpg", alt: "Botaniques de rituel" },
        { url: "/images/spirit-leaves.jpg", alt: "Plantes de soin" },
      ],
    },
    rituals: {
      title: "Des rituels pensés pour vous.",
      link: { label: "Voir la ligne spirituelle", href: "/boutique?categorie=produits-spirituels-intense" },
    },
    split: {
      left: {
        image: { url: "/images/savons-main.jpg", alt: "" },
        kicker: "Corps",
        title: "Gommages",
        href: "/boutique?categorie=gommages",
      },
      right: {
        image: { url: "/images/spirit-smudge.jpg", alt: "" },
        kicker: "Rituel",
        title: "Spirituelle",
        href: "/boutique?categorie=produits-spirituels-intense",
      },
    },
    maison: {
      image: { url: "/images/maison-jars.jpg", alt: "Plantes et botaniques O’Naturelle" },
      since: "Depuis 2012",
      title: "L’univers O’Naturelle",
      text: "La nature, la tradition et le soin se rencontrent ici — pour le corps et pour l’esprit.",
      cta: { label: "Notre histoire", href: "/notre-histoire" },
    },
    contact: {
      title: "Besoin d’un conseil ?",
      subtitle: "Suivi personnalisé.",
      cta_label: "Écrire sur WhatsApp",
    },
  },
  histoire: {
    hero: {
      image: { url: "/images/look-bio.jpg", alt: "" },
      ghost: "O’Naturelle",
      label: "Notre histoire",
      title: "Une beauté inspirée par la nature,\nles traditions et le bien-être.",
      lead: "Depuis 2012, O’Naturelle accompagne une approche authentique de la beauté et du soin.",
    },
    year: {
      mark: "2012",
      label: "La maison",
      title: "Depuis 2012",
      text: "Depuis 2012, O’Naturelle évolue autour d’une même conviction : prendre soin de soi peut être une expérience qui relie la beauté, la nature, les traditions et le bien-être.",
      phrase: "Nous prenons soin de votre corps et de votre esprit.",
    },
    body: {
      label: "Corps et esprit",
      title: "Prendre soin de soi, autrement.",
      text: "Chez O’Naturelle, le soin ne s’arrête pas à l’apparence. Il s’inscrit dans une approche plus globale du bien-être et de la reconnexion à soi.",
      pillars: ["Corps", "Esprit", "Nature", "Rituels"],
    },
    spirit: {
      label: "Cosmétique spirituelle",
      title: "Quand le soin devient un rituel.",
      paragraphs: [
        "La cosmétique spirituelle occupe une place centrale chez O’Naturelle. Elle relie le soin aux plantes, aux traditions et aux rituels — une attention portée au corps autant qu’à l’esprit, dans une reconnexion à soi.",
        "Les produits spirituels et les rituels de soins s’inscrivent dans cette approche, culturelle et sensorielle. Aucune propriété médicale n’est attribuée ici : seulement le geste de la maison, tel qu’elle le transmet.",
      ],
      aside: ["Plantes", "Traditions", "Rituels de soins", "Reconnexion à soi"],
    },
    guide: {
      label: "Suivi personnalisé",
      title: "Votre rituel commence par vous.",
      text: "O’Naturelle vous accompagne dans le choix de vos produits et de vos rituels de soins.",
      cta_label: "Parler à une conseillère",
    },
    close: {
      lines: ["Prenez soin de votre corps.", "Prenez soin de votre esprit.", "Prenez soin de vous."],
      text: "Nous prenons soin de votre corps et de votre esprit.",
      cta: { label: "Découvrir notre boutique", href: "/boutique" },
    },
  },
  boutique: {
    kicker: "Boutique",
    title: "L’univers O’Naturelle",
    lead: "Cosmétique classique, capillaires, gommages, diète, divers et produits spirituels.",
    image: { url: "/images/hero.jpg", alt: "O’Naturelle boutique" },
  },
  seo: {
    title: "O’Naturelle — cosmétique bio et spirituelle",
    description:
      "Depuis 2012, O’Naturelle célèbre une approche authentique de la beauté, du bien-être et des traditions.",
    og_image: { url: "/images/hero.jpg", alt: "O’Naturelle" },
  },
};
