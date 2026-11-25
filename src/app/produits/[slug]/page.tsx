import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { MessageCircle, PackageSearch } from "lucide-react";
import { getPublicProductBySlug } from "@/lib/catalog-data";
import { formatXof } from "@/lib/catalog";
import { getWhatsAppUrl, getWhatsAppWebUrl } from "@/lib/whatsapp";

export const instant = false;

type ProductPageProps = { params: Promise<{ slug: string }> };
const getProduct = cache(getPublicProductBySlug);

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Produit introuvable | Impact print by Aicha" };

  const title = `${product.name} | Impact print by Aicha`;
  const description = product.description?.trim()
    || `Découvrez ${product.name} chez Impact print by Aicha à Dakar.`;
  const image = product.images[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [{ url: image.url, alt: image.alt ?? product.name }] : [],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  await connection();
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const image = product.images[0];
  const productUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(`/produits/${product.slug}`, process.env.NEXT_PUBLIC_SITE_URL).toString()
    : null;
  const messageParts = [
    "Bonjour Aicha,",
    "",
    `Je souhaite commander le produit « ${product.name} » (prix affiché : ${formatXof(product.price)}).`,
    "Pouvez-vous me confirmer sa disponibilité et m’indiquer les options de personnalisation, de livraison et de paiement ?",
  ];
  if (productUrl) messageParts.push("", `Lien du produit : ${productUrl}`);
  messageParts.push("", "Merci !");
  const message = messageParts.join("\n");
  const attributes = product.attributes && typeof product.attributes === "object" && !Array.isArray(product.attributes)
    ? Object.entries(product.attributes).filter(([, value]) => value === null || typeof value !== "object")
    : [];

  return (
    <main className="page-wrap">
      <div className="breadcrumbs"><Link href="/">Accueil</Link> / <Link href="/produits">Produits</Link> / {product.name}</div>
      <div className="product-detail">
        <div className="detail-image">
          {image
            ? <img src={image.url} alt={image.alt ?? product.name} />
            : <div className="product-placeholder"><PackageSearch size={64} /></div>}
        </div>
        <div className="detail-copy">
          <span className="eyebrow">{product.categoryName}</span>
          <h1>{product.name}</h1>
          {product.brand && <p className="product-brand">{product.brand}</p>}
          <div className="detail-price">{formatXof(product.price)}</div>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <small className="compare-price">{formatXof(product.compareAtPrice)}</small>
          )}
          {product.description && <p className="detail-desc">{product.description}</p>}
          <p className={`stock-status ${product.availableStock > 0 ? "in-stock" : "out-of-stock"}`}>
            {product.availableStock > 0 ? `${product.availableStock} disponible${product.availableStock > 1 ? "s" : ""}` : "Actuellement indisponible"}
          </p>
          {attributes.length > 0 && (
            <dl className="product-attributes">
              {attributes.map(([name, value]) => (
                <div key={name}><dt>{name}</dt><dd>{value === null ? "—" : String(value)}</dd></div>
              ))}
            </dl>
          )}
          <div className="hero-actions">
            <a className="button button-primary" href={getWhatsAppUrl(message)}>
              <MessageCircle size={18} /> Commander sur WhatsApp
            </a>
          </div>
          <a className="detail-whatsapp-fallback" href={getWhatsAppWebUrl(message)} target="_blank" rel="noreferrer">
            L’application ne s’ouvre pas ? Continuer sur WhatsApp Web
          </a>
          <p className="detail-order-note">Personnalisation, livraison et paiement se conviennent directement avec la boutique.</p>
        </div>
      </div>
    </main>
  );
}
