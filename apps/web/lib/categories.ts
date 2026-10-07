import { publicObjectUrl } from "@/lib/storage";

export function categoryOut(item: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  image_file_id?: string | null;
  sort_order: number;
  is_visible: boolean;
  image?: { storage_key: string } | null;
}) {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    parent_id: item.parent_id,
    image_file_id: item.image_file_id ?? null,
    image_url: item.image?.storage_key ? publicObjectUrl(item.image.storage_key) : null,
    sort_order: item.sort_order,
    is_visible: item.is_visible,
  };
}
