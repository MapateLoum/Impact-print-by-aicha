"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, LogOut, PackageCheck, PackagePlus, Plus, Star, Store, TriangleAlert, X } from "lucide-react";
import type { CategoryRow, ProductImageRow, ProductRow } from "@/lib/supabase/database.types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatXof } from "@/lib/catalog";

type AdminProductImage = ProductImageRow & { publicUrl: string };
type AdminProduct = ProductRow & {
  categoryName: string;
  categoryActive: boolean;
  images: AdminProductImage[];
};
type Feedback = { kind: "success" | "error"; message: string };
type ImageFileResult =
  | { kind: "file"; file: File }
  | { kind: "error"; message: string }
  | null;

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getImageFile(formData: FormData): ImageFileResult {
  const value = formData.get("image");
  if (!(value instanceof File) || value.size === 0) return null;
  if (!["image/jpeg", "image/png", "image/webp"].includes(value.type)) {
    return { kind: "error", message: "Choisissez une image JPG, PNG ou WebP." };
  }
  if (value.size > 5 * 1024 * 1024) {
    return { kind: "error", message: "L’image ne doit pas dépasser 5 Mo." };
  }
  return { kind: "file", file: value };
}

async function uploadProductImage(
  productId: string,
  productName: string,
  file: File,
  isPrimary: boolean,
  sortOrder: number,
) {
  const supabase = createSupabaseBrowserClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${productId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) return `L’image n’a pas été téléversée : ${uploadError.message}`;

  const { error: imageRowError } = await supabase.from("product_images").insert({
    product_id: productId,
    storage_path: storagePath,
    alt_text: productName,
    sort_order: sortOrder,
    is_primary: isPrimary,
  });

  if (imageRowError) {
    const { error: cleanupError } = await supabase.storage.from("product-images").remove([storagePath]);
    return cleanupError
      ? `L’image n’a pas été enregistrée : ${imageRowError.message}. Le fichier téléversé n’a pas pu être supprimé : ${cleanupError.message}`
      : `L’image n’a pas été enregistrée : ${imageRowError.message}`;
  }

  return null;
}

export function AdminDashboard({
  email,
  initialCategories,
  initialProducts,
}: {
  email: string;
  initialCategories: CategoryRow[];
  initialProducts: AdminProduct[];
}) {
  const router = useRouter();
  const categories = initialCategories;
  const products = initialProducts;
  const activeCategoryCount = categories.filter((category) => category.is_active).length;
  const publishedProductCount = products.filter((product) => product.is_published).length;
  const lowStockProductCount = products.filter(
    (product) => product.stock - product.reserved_stock <= product.low_stock_threshold,
  ).length;
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);

  function reportError(message: string) {
    setFeedback({ kind: "error", message });
    setBusy(false);
  }

  function reportSuccess(message: string) {
    setFeedback({ kind: "success", message });
    setBusy(false);
    router.refresh();
  }

  async function handleLogout() {
    setBusy(true);
    const { error } = await createSupabaseBrowserClient().auth.signOut();
    if (error) {
      reportError(`La déconnexion a échoué : ${error.message}`);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const slug = slugify(String(formData.get("slug") ?? "").trim() || name);
    if (!name || !slug) {
      reportError("Indiquez le nom de la catégorie.");
      return;
    }

    const { error } = await createSupabaseBrowserClient().from("categories").insert({
      name,
      slug,
      description: String(formData.get("description") ?? "").trim() || null,
      is_active: true,
    });

    if (error) {
      reportError(`La catégorie n’a pas été créée : ${error.message}`);
      return;
    }

    form.reset();
    reportSuccess("Catégorie créée.");
  }

  async function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const slug = slugify(String(formData.get("slug") ?? "").trim() || name);
    const sku = String(formData.get("sku") ?? "").trim();
    const categoryId = String(formData.get("category_id") ?? "");
    const price = Number(formData.get("price_xof"));
    const compareAtPriceValue = String(formData.get("compare_at_price_xof") ?? "").trim();
    const compareAtPrice = compareAtPriceValue ? Number(compareAtPriceValue) : null;
    const stock = Number(formData.get("stock"));
    const isPublished = formData.get("is_published") === "on";
    const category = categories.find((item) => item.id === categoryId);
    const imageInput = getImageFile(formData);

    if (imageInput?.kind === "error") {
      reportError(imageInput.message);
      return;
    }
    if (!imageInput) {
      reportError("Ajoutez une photo au produit avant de le créer.");
      return;
    }
    if (!name || !slug || !sku || !category) {
      reportError("Renseignez le nom, le SKU et une catégorie active.");
      return;
    }
    if (!Number.isSafeInteger(price) || price < 1) {
      reportError("Le prix doit être un nombre entier supérieur à zéro.");
      return;
    }
    if (compareAtPrice !== null && (!Number.isSafeInteger(compareAtPrice) || compareAtPrice <= price)) {
      reportError("Le prix barré doit être un nombre entier supérieur au prix de vente.");
      return;
    }
    if (!Number.isSafeInteger(stock) || stock < 0) {
      reportError("Le stock doit être un nombre entier positif ou nul.");
      return;
    }

    const productId = crypto.randomUUID();
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("admin_create_product", {
      p_product_id: productId,
      p_category_id: category.id,
      p_name: name,
      p_slug: slug,
      p_sku: sku,
      p_brand: String(formData.get("brand") ?? "").trim() || null,
      p_description: String(formData.get("description") ?? "").trim() || null,
      p_price_xof: price,
      p_compare_at_price_xof: compareAtPrice,
      p_stock: stock,
      p_is_published: isPublished,
    });

    if (error) {
      reportError(`Le produit n’a pas été créé : ${error.message}`);
      return;
    }

    const imageMessage = await uploadProductImage(productId, name, imageInput.file, true, 0);

    form.reset();
    if (imageMessage) {
      setFeedback({ kind: "error", message: `Produit créé, mais ${imageMessage}` });
      setBusy(false);
      router.refresh();
      return;
    }
    reportSuccess("Produit créé avec succès.");
  }

  async function handleUpdateProduct(productId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const slug = slugify(String(formData.get("slug") ?? "").trim() || name);
    const sku = String(formData.get("sku") ?? "").trim();
    const categoryId = String(formData.get("category_id") ?? "");
    const price = Number(formData.get("price_xof"));
    const compareAtPriceValue = String(formData.get("compare_at_price_xof") ?? "").trim();
    const compareAtPrice = compareAtPriceValue ? Number(compareAtPriceValue) : null;
    const isPublished = formData.get("is_published") === "on";
    const isFeatured = formData.get("is_featured") === "on";
    const category = categories.find((item) => item.id === categoryId);

    if (!name || !slug || !sku || !category) {
      reportError("Renseignez le nom, le SKU et une catégorie.");
      return;
    }
    if (!Number.isSafeInteger(price) || price < 1) {
      reportError("Le prix doit être un nombre entier supérieur à zéro.");
      return;
    }
    if (compareAtPrice !== null && (!Number.isSafeInteger(compareAtPrice) || compareAtPrice <= price)) {
      reportError("Le prix barré doit être supérieur au prix de vente.");
      return;
    }
    if (isPublished && !category.is_active) {
      reportError("Activez d’abord la catégorie pour publier ce produit.");
      return;
    }

    const { error } = await createSupabaseBrowserClient().from("products").update({
      name,
      slug,
      sku,
      category_id: category.id,
      brand: String(formData.get("brand") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      price_xof: price,
      compare_at_price_xof: compareAtPrice,
      is_published: isPublished,
      is_featured: isFeatured,
    }).eq("id", productId);

    if (error) {
      reportError(`Le produit n’a pas été modifié : ${error.message}`);
      return;
    }

    reportSuccess("Produit mis à jour.");
  }

  async function handleAddProductImage(product: AdminProduct, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);

    const form = event.currentTarget;
    const imageInput = getImageFile(new FormData(form));
    if (!imageInput) {
      reportError("Choisissez une image à téléverser.");
      return;
    }
    if (imageInput.kind === "error") {
      reportError(imageInput.message);
      return;
    }
    if (imageInput.kind !== "file") {
      reportError("Choisissez une image à téléverser.");
      return;
    }

    const isPrimary = !product.images.some((image) => image.is_primary);
    const error = await uploadProductImage(
      product.id,
      product.name,
      imageInput.file,
      isPrimary,
      product.images.length,
    );
    if (error) {
      reportError(error);
      return;
    }

    form.reset();
    reportSuccess("Photo ajoutée au produit.");
  }

  async function handleStockAdjustment(productId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const delta = Number(formData.get("delta"));
    const reason = String(formData.get("reason") ?? "").trim();
    if (!Number.isSafeInteger(delta) || delta === 0 || !reason) {
      reportError("Indiquez un ajustement entier non nul et son motif.");
      return;
    }

    const { error } = await createSupabaseBrowserClient().rpc("admin_adjust_product_stock", {
      p_product_id: productId,
      p_delta: delta,
      p_reason: reason,
    });
    if (error) {
      reportError(`Le stock n’a pas été ajusté : ${error.message}`);
      return;
    }

    form.reset();
    reportSuccess("Stock ajusté et mouvement enregistré.");
  }

  async function handleCategoryActiveChange(category: CategoryRow) {
    setBusy(true);
    setFeedback(null);
    const { error } = await createSupabaseBrowserClient()
      .from("categories")
      .update({ is_active: !category.is_active })
      .eq("id", category.id);

    if (error) {
      reportError(`La catégorie n’a pas été modifiée : ${error.message}`);
      return;
    }
    reportSuccess(category.is_active ? "Catégorie désactivée." : "Catégorie activée.");
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div className="admin-header-top">
          <Link className="admin-brand" href="/">
            <img src="/logo-impact-print.svg?v=3" alt="Impact Print by Aicha" />
          </Link>
          <div className="admin-header-actions">
            <Link className="button button-ghost" href="/">Voir la boutique</Link>
            <button className="button button-ghost" type="button" onClick={handleLogout} disabled={busy}>
              <LogOut size={16} /> Déconnexion
            </button>
          </div>
        </div>
        <div className="admin-header-copy">
          <span className="eyebrow"><Store size={14} /> Espace de gestion</span>
          <h1>Votre boutique, en un coup d’œil.</h1>
          <p>Connecté avec {email} · Gérez vos catégories, produits et stocks au même endroit.</p>
        </div>
      </header>

      {feedback && (
        <div className={`admin-feedback admin-feedback-${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}>
          <span>{feedback.message}</span>
          <button className="admin-feedback-close" type="button" onClick={() => setFeedback(null)} aria-label="Fermer le message">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="admin-stats" aria-label="Résumé du catalogue">
        <article className="admin-stat-card">
          <span className="admin-stat-icon"><Boxes size={20} /></span>
          <div><small>Catégories actives</small><strong>{activeCategoryCount}</strong></div>
          <span className="admin-stat-note">Univers de la boutique</span>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-icon stat-icon-yellow"><PackageCheck size={20} /></span>
          <div><small>Produits enregistrés</small><strong>{products.length}</strong></div>
          <span className="admin-stat-note">Dans votre catalogue</span>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-icon stat-icon-green"><Store size={20} /></span>
          <div><small>Produits publiés</small><strong>{publishedProductCount}</strong></div>
          <span className="admin-stat-note">Visibles par les clients</span>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-icon stat-icon-alert"><TriangleAlert size={20} /></span>
          <div><small>Stocks à surveiller</small><strong>{lowStockProductCount}</strong></div>
          <span className="admin-stat-note">Sous le seuil défini</span>
        </article>
      </section>

      <section className="admin-section">
        <div className="admin-section-heading">
          <div><span>Catalogue</span><h2>Catégories</h2></div>
          <span>{categories.length} catégorie{categories.length === 1 ? "" : "s"}</span>
        </div>
        <div className="admin-columns">
          <form className="admin-card admin-form" onSubmit={handleCreateCategory}>
            <h3><Plus size={18} /> Ajouter une catégorie</h3>
            <label className="admin-field">Nom<input name="name" required maxLength={100} /></label>
            <label className="admin-field">Slug (facultatif)<input name="slug" placeholder="créé depuis le nom" maxLength={120} /></label>
            <label className="admin-field">Description<textarea name="description" rows={3} maxLength={1000} /></label>
            <button className="button button-primary" type="submit" disabled={busy}>Créer la catégorie</button>
          </form>
          <div className="admin-card admin-list">
            {categories.length === 0 ? <p>Aucune catégorie. Créez-en une pour commencer à ajouter des produits.</p> : (
              categories.map((category) => (
                <div className="admin-list-row" key={category.id}>
                  <div><strong>{category.name}</strong><small>/{category.slug}</small></div>
                  <button
                    className={`status-pill ${category.is_active ? "status-active" : "status-inactive"}`}
                    type="button"
                    onClick={() => handleCategoryActiveChange(category)}
                    disabled={busy}
                  >
                    {category.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-heading">
          <div><span>Gestion des fiches</span><h2>Produits</h2></div>
          <span>{products.length} produit{products.length === 1 ? "" : "s"}</span>
        </div>
        <div className="admin-columns">
          <form className="admin-card admin-form" onSubmit={handleCreateProduct}>
            <h3><PackagePlus size={18} /> Ajouter un produit</h3>
            {categories.filter((category) => category.is_active).length === 0 ? (
              <p>Créez ou activez d’abord une catégorie.</p>
            ) : (
              <>
                <label className="admin-field">Nom<input name="name" required maxLength={180} /></label>
                <label className="admin-field">Slug (facultatif)<input name="slug" placeholder="créé depuis le nom" maxLength={180} /></label>
                <div className="admin-form-row">
                  <label className="admin-field">SKU<input name="sku" required maxLength={80} /></label>
                  <label className="admin-field">Catégorie
                    <select name="category_id" required defaultValue="">
                      <option value="" disabled>Choisir</option>
                      {categories.filter((category) => category.is_active).map((category) => (
                        <option value={category.id} key={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="admin-form-row">
                  <label className="admin-field">Prix (FCFA)<input name="price_xof" type="number" min="1" step="1" required /></label>
                  <label className="admin-field">Prix barré (facultatif)<input name="compare_at_price_xof" type="number" min="1" step="1" /></label>
                </div>
                <div className="admin-form-row">
                  <label className="admin-field">Stock initial<input name="stock" type="number" min="0" step="1" defaultValue="0" required /></label>
                  <label className="admin-field">Marque<input name="brand" maxLength={100} /></label>
                </div>
                <label className="admin-field">Description<textarea name="description" rows={3} maxLength={5000} /></label>
                <label className="admin-field">Photo obligatoire (JPG, PNG ou WebP, max. 5 Mo)<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
                <label className="admin-checkbox"><input type="checkbox" name="is_published" /> Publier immédiatement</label>
                <button className="button button-primary" type="submit" disabled={busy}>Créer le produit</button>
              </>
            )}
          </form>

          <div className="admin-product-list">
            {products.length === 0 ? (
              <div className="admin-card"><p>Aucun produit enregistré pour le moment.</p></div>
            ) : products.map((product) => (
              <article className="admin-card admin-product-card" key={product.id}>
                <div className="admin-product-summary">
                  {product.images[0]
                    ? <img src={product.images[0].publicUrl} alt={product.images[0].alt_text ?? product.name} />
                    : <div className="admin-image-placeholder"><Store size={22} /></div>}
                  <div className="admin-product-title">
                    <strong>{product.name}</strong>
                    <small>{product.categoryName} · SKU {product.sku}</small>
                    <span>{formatXof(product.price_xof)} · Stock : {product.stock - product.reserved_stock} disponible(s)</span>
                  </div>
                  <span className={`status-pill ${product.is_published ? "status-active" : "status-inactive"}`}>
                    {product.is_published ? "Publié" : "Brouillon"}
                  </span>
                </div>
                <details className="admin-details">
                  <summary>Modifier la fiche, le stock ou les photos</summary>
                  <form className="admin-edit-form" onSubmit={(event) => handleUpdateProduct(product.id, event)}>
                    <label className="admin-field">Nom<input name="name" defaultValue={product.name} required /></label>
                    <div className="admin-form-row">
                      <label className="admin-field">Slug<input name="slug" defaultValue={product.slug} required /></label>
                      <label className="admin-field">SKU<input name="sku" defaultValue={product.sku} required /></label>
                    </div>
                    <div className="admin-form-row">
                      <label className="admin-field">Catégorie
                        <select name="category_id" defaultValue={product.category_id ?? ""} required>
                          {categories.map((category) => <option value={category.id} key={category.id}>{category.name}{category.is_active ? "" : " (inactive)"}</option>)}
                        </select>
                      </label>
                      <label className="admin-field">Marque<input name="brand" defaultValue={product.brand ?? ""} /></label>
                    </div>
                    <div className="admin-form-row">
                      <label className="admin-field">Prix (FCFA)<input name="price_xof" type="number" min="1" defaultValue={product.price_xof} required /></label>
                      <label className="admin-field">Prix barré<input name="compare_at_price_xof" type="number" min="1" defaultValue={product.compare_at_price_xof ?? ""} /></label>
                    </div>
                    <label className="admin-field">Description<textarea name="description" rows={3} defaultValue={product.description ?? ""} /></label>
                    <div className="admin-checkbox-row">
                      <label className="admin-checkbox"><input name="is_published" type="checkbox" defaultChecked={product.is_published} /> Publié</label>
                      <label className="admin-checkbox"><input name="is_featured" type="checkbox" defaultChecked={product.is_featured} /> <Star size={14} /> En vedette</label>
                    </div>
                    <button className="button button-ghost" type="submit" disabled={busy}>Enregistrer la fiche</button>
                  </form>
                  <form className="admin-stock-form" onSubmit={(event) => handleStockAdjustment(product.id, event)}>
                    <h4>Ajuster le stock disponible</h4>
                    <div className="admin-form-row">
                      <label className="admin-field">Variation (+ ou −)<input name="delta" type="number" step="1" required /></label>
                      <label className="admin-field">Motif<input name="reason" required maxLength={200} placeholder="Réception, correction…" /></label>
                    </div>
                    <button className="button button-ghost" type="submit" disabled={busy}>Enregistrer le mouvement</button>
                  </form>
                  <form className="admin-stock-form" onSubmit={(event) => handleAddProductImage(product, event)}>
                    <h4>Photos du produit ({product.images.length})</h4>
                    <label className="admin-field">Ajouter une photo<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
                    <button className="button button-ghost" type="submit" disabled={busy}>Téléverser la photo</button>
                  </form>
                </details>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
