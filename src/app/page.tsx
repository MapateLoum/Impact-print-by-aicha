import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowRight,
  Bike,
  MessageCircle,
  PackageCheck,
  PackageSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getPublicCategories, getPublicProducts } from "@/lib/catalog-data";
import { formatXof } from "@/lib/catalog";
import { getWhatsAppUrl } from "@/lib/whatsapp";

export const instant = false;

export default async function Home() {
  await connection();
  const [categories, products] = await Promise.all([
    getPublicCategories(),
    getPublicProducts(),
  ]);

  return (
    <main>
      <section className="hero-shell">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={15} /> Création & personnalisation à Dakar</span>
            <h1>Vos idées prennent <em>forme.</em></h1>
            <p>Impact print by Aicha imagine vos objets personnalisés et votre sélection de vêtements pour une marque qui se fait remarquer.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/produits">
                Découvrir nos produits <ArrowRight size={18} />
              </Link>
              <a className="button button-ghost" href={getWhatsAppUrl()}>
                <MessageCircle size={18} /> Commander
              </a>
            </div>
          </div>
          <div className="hero-art" aria-label="Visuels démonstration">
            <div className="hero-blob"></div>
            <div className="hero-card hero-card-main">
              <img src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85" alt="T-shirt démonstration" />
              <span>PERSONNALISÉ</span>
            </div>
            <div className="hero-card hero-card-small">
              <img src="https://images.unsplash.com/photo-1527863280617-15596f92e5c8?auto=format&fit=crop&w=600&q=85" alt="Sac démonstration" />
            </div>
          </div>
        </div>
      </section>

      <section className="category-section section-wrap">
        <div className="section-heading">
          <div><span>Nos univers</span><h2>Tout pour vous démarquer</h2></div>
          <Link href="/produits">Voir tout <ArrowRight size={16} /></Link>
        </div>
        {categories.length > 0 ? (
          <div className="category-grid">
            {categories.map((category, index) => (
              <Link href={`/produits?categorie=${encodeURIComponent(category.slug)}`} className="category-card" key={category.id}>
                <div className={`category-number c${(index % 4) + 1}`}>0{index + 1}</div>
                {category.imageUrl
                  ? <img src={category.imageUrl} alt={category.name} />
                  : <div className="category-placeholder"><PackageSearch size={42} /></div>}
                <div><h3>{category.name}</h3><span>Découvrir <ArrowRight size={14} /></span></div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">Les catégories seront affichées ici dès qu’elles seront ajoutées à la boutique.</div>
        )}
      </section>

      <section className="products-section section-wrap">
        <div className="section-heading">
          <div><span>La collection</span><h2>Découvrez nos produits</h2></div>
          <Link href="/produits">Toute la collection <ArrowRight size={16} /></Link>
        </div>
        {products.length > 0 ? (
          <div className="product-grid">
            {products.slice(0, 6).map((product) => {
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
            <p>Aucun produit n’est encore publié. Revenez bientôt découvrir la collection.</p>
          </div>
        )}
      </section>

      <section className="benefits section-wrap">
        <article><ShieldCheck /><div><h3>Qualité soignée</h3><p>Des finitions pensées pour durer.</p></div></article>
        <article><PackageCheck /><div><h3>Personnalisation</h3><p>Vos textes, couleurs et logos.</p></div></article>
        <article><Bike /><div><h3>Livraison organisée</h3><p>Avec votre livreur ou un partenaire de confiance.</p></div></article>
      </section>

      <section className="whatsapp-band">
        <div>
          <span>Une idée précise ?</span>
          <h2>Parlons-en directement sur WhatsApp</h2>
        </div>
        <a href={getWhatsAppUrl("Bonjour Impact print by Aicha, je souhaite passer une commande.")}>
          <MessageCircle /> Démarrer une conversation
        </a>
      </section>
    </main>
  );
}
