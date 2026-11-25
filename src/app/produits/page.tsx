import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, PackageSearch, Search } from "lucide-react";
import { getPublicCategories, getPublicProducts } from "@/lib/catalog-data";
import { formatXof } from "@/lib/catalog";

export const instant = false;

type SearchParams = {
  q?: string;
  categorie?: string;
  min?: string;
  max?: string;
  tri?: string;
};

function parsePrice(value?: string) {
  if (!value) return undefined;
  const price = Number(value);
  return Number.isSafeInteger(price) && price >= 0 ? price : undefined;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await connection();
  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const categorySlug = params.categorie ?? "";
  const minPrice = parsePrice(params.min);
  const maxPrice = parsePrice(params.max);
  const sort = params.tri ?? "";
  const [categories, products] = await Promise.all([
    getPublicCategories(),
    getPublicProducts({
      search,
      categorySlug,
      minPrice,
      maxPrice,
      sort,
    }),
  ]);
  const selectedCategory = categories.find((category) => category.slug === categorySlug);

  return (
    <main className="catalog-layout">
      <span className="eyebrow">Collection complète</span>
      <h1>{selectedCategory?.name ?? "Nos produits"}</h1>
      <form className="catalog-toolbar" action="/produits">
        {categorySlug && <input type="hidden" name="categorie" value={categorySlug} />}
        {params.min && <input type="hidden" name="min" value={params.min} />}
        {params.max && <input type="hidden" name="max" value={params.max} />}
        <label className="searchbox">
          <Search size={16} />
          <input name="q" defaultValue={search} placeholder="Rechercher un produit..." aria-label="Rechercher un produit" />
        </label>
        <label className="sort-control">
          <span>Trier</span>
          <select name="tri" defaultValue={sort}>
            <option value="">Récents</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
          </select>
        </label>
        <button className="button button-ghost" type="submit">Appliquer</button>
      </form>

      <div className="catalog-grid">
        <aside className="filters">
          <h3>Catégories</h3>
          <Link className={`filter-option ${!categorySlug ? "filter-active" : ""}`} href="/produits">Toutes les catégories</Link>
          {categories.map((category) => (
            <Link
              className={`filter-option ${categorySlug === category.slug ? "filter-active" : ""}`}
              href={`/produits?categorie=${encodeURIComponent(category.slug)}`}
              key={category.id}
            >
              {category.name}
            </Link>
          ))}
          <form action="/produits" className="price-filter">
            {categorySlug && <input type="hidden" name="categorie" value={categorySlug} />}
            {search && <input type="hidden" name="q" value={search} />}
            {sort && <input type="hidden" name="tri" value={sort} />}
            <h3>Fourchette de prix (FCFA)</h3>
            <label className="price-field">Minimum<input type="number" name="min" min="0" defaultValue={minPrice} /></label>
            <label className="price-field">Maximum<input type="number" name="max" min="0" defaultValue={maxPrice} /></label>
            <button type="submit" className="button button-ghost">Filtrer par prix</button>
          </form>
        </aside>

        <div>
          <p className="results-count">{products.length} produit{products.length === 1 ? "" : "s"}</p>
          {products.length > 0 ? (
            <div className="product-grid">
              {products.map((product) => {
                const image = product.images[0];
                return (
                  <Link href={`/produits/${product.slug}`} className="product-card" key={product.id}>
                    <div className="product-media">
                      {product.isFeatured && <span className="product-badge">En vedette</span>}
                      {image
                        ? <img src={image.url} alt={image.alt ?? product.name} />
                        : <div className="product-placeholder"><PackageSearch size={48} /></div>}
                    </div>
                    <div className="product-info">
                      <span className="product-category">{product.categoryName}</span>
                      <h3>{product.name}</h3>
                      <div className="product-bottom">
                        <strong>{formatXof(product.price)}</strong>
                        <span className="add-round"><ArrowRight size={17} /></span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <PackageSearch size={28} />
              <p>Aucun produit ne correspond à cette recherche.</p>
              <Link className="button button-primary" href="/produits">Effacer les filtres</Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
