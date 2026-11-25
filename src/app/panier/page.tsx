import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export default function CartPage() {
  return (
    <main className="page-wrap">
      <h1 className="page-title">Votre panier</h1>
      <div className="empty-state cart-empty">
        <ShoppingBag size={32} />
        <h2>Votre panier est vide</h2>
        <p>Pour le moment, les commandes se font directement avec la boutique.</p>
        <Link className="button button-primary" href="/produits">Découvrir les produits</Link>
      </div>
    </main>
  );
}
