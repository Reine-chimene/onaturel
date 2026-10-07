export const PUBLIC_NAV = [
  { href: "/", label: "Accueil" },
  { href: "/boutique?categorie=cosmetique-classique", label: "Cosmétique classique" },
  { href: "/boutique?categorie=produits-capillaires", label: "Produits capillaires" },
  { href: "/boutique?categorie=gommages", label: "Gommages" },
  { href: "/boutique?categorie=diete", label: "Diète" },
  { href: "/boutique?categorie=divers", label: "Divers" },
  { href: "/boutique?categorie=produits-spirituels-intense", label: "Produits spirituels" },
  { href: "/boutique?categorie=sacs-accessoires", label: "Sacs & accessoires" },
  { href: "/boutique?categorie=parfums", label: "Parfums" },
] as const;

export const NAV_DESKTOP = PUBLIC_NAV;
