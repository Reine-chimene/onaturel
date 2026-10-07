import { prisma } from "@/lib/db/prisma";

export function zoneOut(zone: {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  currency: { id: string; code: string; name: string; symbol: string; minor_units: number };
  fulfillment_modes: {
    id: string;
    mode: string;
    label: string;
    is_enabled: boolean;
    fee_policy: string;
    default_fee_amount: number | null;
  }[];
}) {
  return {
    id: zone.id,
    slug: zone.slug,
    name: zone.name,
    is_active: zone.is_active,
    sort_order: zone.sort_order,
    currency: zone.currency,
    fulfillment_modes: [...zone.fulfillment_modes].sort((a, b) => a.mode.localeCompare(b.mode)),
  };
}

export const zoneInclude = { currency: true, fulfillment_modes: true } as const;

export async function listZones(activeOnly: boolean) {
  const zones = await prisma.commercialZone.findMany({
    where: activeOnly ? { is_active: true } : undefined,
    include: zoneInclude,
    orderBy: { sort_order: "asc" },
  });
  return zones.map(zoneOut);
}
