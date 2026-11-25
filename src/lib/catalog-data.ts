import "server-only";

import type { CategoryRow, ProductImageRow, ProductRow } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryName: string;
  categorySlug: string;
  brand: string | null;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  availableStock: number;
  isFeatured: boolean;
  attributes: ProductRow["attributes"];
  images: { url: string; alt: string | null; isPrimary: boolean }[];
};

function getPublicImageUrl(supabase: SupabaseServerClient, bucket: string, path: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function getPublicCategories(): Promise<CatalogCategory[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, image_path, is_active, sort_order, description, created_at, updated_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Impossible de charger les catégories : ${error.message}`);
  }

  return (data as CategoryRow[]).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    imageUrl: getPublicImageUrl(supabase, "store-media", category.image_path),
  }));
}

type ProductFilters = {
  search?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
};

export async function getPublicProducts(filters: ProductFilters = {}): Promise<CatalogProduct[]> {
  const supabase = createSupabaseServerClient();
  let categoryId: string | undefined;

  if (filters.categorySlug) {
    const { data, error } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.categorySlug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw new Error(`Impossible de charger la catégorie : ${error.message}`);
    }
    if (!data) return [];
    categoryId = data.id;
  }

  let query = supabase
    .from("products")
    .select("id, category_id, name, slug, sku, brand, description, price_xof, compare_at_price_xof, stock, reserved_stock, low_stock_threshold, attributes, is_published, is_featured, created_at, updated_at")
    .eq("is_published", true);

  if (categoryId) query = query.eq("category_id", categoryId);

  const search = filters.search?.trim().replace(/[%_*(),]/g, "").slice(0, 80);
  if (search) query = query.ilike("name", `%${search}%`);

  if (filters.minPrice !== undefined) query = query.gte("price_xof", filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte("price_xof", filters.maxPrice);

  if (filters.sort === "price-asc") {
    query = query.order("price_xof", { ascending: true });
  } else if (filters.sort === "price-desc") {
    query = query.order("price_xof", { ascending: false });
  } else {
    query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(100);
  if (error) {
    throw new Error(`Impossible de charger les produits : ${error.message}`);
  }

  return mapProducts(data as ProductRow[]);
}

export async function getPublicProductBySlug(slug: string): Promise<CatalogProduct | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, category_id, name, slug, sku, brand, description, price_xof, compare_at_price_xof, stock, reserved_stock, low_stock_threshold, attributes, is_published, is_featured, created_at, updated_at")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Impossible de charger le produit : ${error.message}`);
  }
  if (!data) return null;

  const [product] = await mapProducts([data as ProductRow]);
  return product ?? null;
}

async function mapProducts(rows: ProductRow[]): Promise<CatalogProduct[]> {
  if (rows.length === 0) return [];

  const supabase = createSupabaseServerClient();
  const categoryIds = [...new Set(rows.flatMap((row) => row.category_id ? [row.category_id] : []))];
  const productIds = rows.map((row) => row.id);
  const [categoryResult, imageResult] = await Promise.all([
    categoryIds.length
      ? supabase
          .from("categories")
          .select("id, name, slug, image_path, is_active, sort_order, description, created_at, updated_at")
          .in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("product_images")
      .select("id, product_id, storage_path, alt_text, sort_order, is_primary, created_at")
      .in("product_id", productIds)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true }),
  ]);

  if (categoryResult.error) {
    throw new Error(`Impossible de charger les catégories des produits : ${categoryResult.error.message}`);
  }
  if (imageResult.error) {
    throw new Error(`Impossible de charger les photos des produits : ${imageResult.error.message}`);
  }

  const categoriesById = new Map(
    (categoryResult.data as CategoryRow[]).map((category) => [category.id, category]),
  );
  const imagesByProductId = new Map<string, ProductImageRow[]>();

  for (const image of imageResult.data as ProductImageRow[]) {
    const images = imagesByProductId.get(image.product_id) ?? [];
    images.push(image);
    imagesByProductId.set(image.product_id, images);
  }

  return rows.flatMap((row) => {
    const category = row.category_id ? categoriesById.get(row.category_id) : undefined;
    if (!category) return [];

    return [{
      id: row.id,
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      categoryName: category.name,
      categorySlug: category.slug,
      brand: row.brand,
      description: row.description,
      price: row.price_xof,
      compareAtPrice: row.compare_at_price_xof,
      availableStock: Math.max(0, row.stock - row.reserved_stock),
      isFeatured: row.is_featured,
      attributes: row.attributes,
      images: (imagesByProductId.get(row.id) ?? []).map((image) => ({
        url: getPublicImageUrl(supabase, "product-images", image.storage_path) ?? "",
        alt: image.alt_text,
        isPrimary: image.is_primary,
      })),
    }];
  });
}
