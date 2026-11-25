import { connection } from "next/server";
import { AdminDashboard } from "./AdminDashboard";
import { AdminLoginForm } from "./AdminLoginForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseUserServerClient } from "@/lib/supabase/user-server";
import type { CategoryRow, ProductImageRow, ProductRow } from "@/lib/supabase/database.types";

export const instant = false;

export default async function AdminPage() {
  await connection();
  const supabase = await createSupabaseUserServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError && authError.name !== "AuthSessionMissingError") {
    throw new Error(`Impossible de vérifier la session : ${authError.message}`);
  }
  if (!user) return <AdminLoginForm />;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Impossible de vérifier les droits du compte : ${profileError.message}`);
  }
  if (!profile || !["admin", "staff"].includes(profile.role)) {
    return <AdminLoginForm initialMessage="Ce compte n’a pas accès à l’administration. Connectez-vous avec un compte autorisé." />;
  }

  const [categoryResult, productResult, imageResult] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order").order("name"),
    supabase.from("products").select("*").order("created_at", { ascending: false }),
    supabase.from("product_images").select("*").order("is_primary", { ascending: false }).order("sort_order"),
  ]);

  if (categoryResult.error) {
    throw new Error(`Impossible de charger les catégories : ${categoryResult.error.message}`);
  }
  if (productResult.error) {
    throw new Error(`Impossible de charger les produits : ${productResult.error.message}`);
  }
  if (imageResult.error) {
    throw new Error(`Impossible de charger les photos : ${imageResult.error.message}`);
  }

  const categories = categoryResult.data as CategoryRow[];
  const products = productResult.data as ProductRow[];
  const images = imageResult.data as ProductImageRow[];
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const imagesByProductId = new Map<string, (ProductImageRow & { publicUrl: string })[]>();
  const publicSupabase = createSupabaseServerClient();

  for (const image of images) {
    const productImages = imagesByProductId.get(image.product_id) ?? [];
    productImages.push({
      ...image,
      publicUrl: publicSupabase.storage.from("product-images").getPublicUrl(image.storage_path).data.publicUrl,
    });
    imagesByProductId.set(image.product_id, productImages);
  }

  const adminProducts = products.map((product) => {
    const category = product.category_id ? categoriesById.get(product.category_id) : undefined;
    return {
      ...product,
      categoryName: category?.name ?? "Sans catégorie",
      categoryActive: category?.is_active ?? false,
      images: imagesByProductId.get(product.id) ?? [],
    };
  });

  return (
    <AdminDashboard
      email={user.email ?? ""}
      initialCategories={categories}
      initialProducts={adminProducts}
    />
  );
}
