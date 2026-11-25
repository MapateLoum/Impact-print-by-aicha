import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp";

export default function CheckoutPage() {
  return (
    <main className="page-wrap">
      <h1 className="page-title">Passer une commande</h1>
      <div className="empty-state cart-empty">
        <MessageCircle size={32} />
        <h2>Commandez directement avec Aicha</h2>
        <p>Choisissez un produit, puis contactez la boutique sur WhatsApp pour convenir de la personnalisation, de la livraison et du paiement.</p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/produits">Voir les produits</Link>
          <a className="button button-ghost" href={getWhatsAppUrl()}>Ouvrir WhatsApp</a>
        </div>
      </div>
    </main>
  );
}
