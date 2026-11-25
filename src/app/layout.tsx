import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Mail, MapPin, Menu, Phone, Search, ShoppingBag, ShieldCheck, Camera, Users } from "lucide-react";
import { getWhatsAppUrl, WHATSAPP_CONTACT_MESSAGE } from "@/lib/whatsapp";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  title: "Impact print by Aicha | Impression & objets personnalisés",
  description: "Découvrez nos créations personnalisées, vêtements, sacs, papeterie et équipements de protection à Dakar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="site-body min-h-full flex flex-col"
        style={{ color: "var(--ink)", backgroundColor: "#fff", colorScheme: "light" }}
      >
        <div className="top-strip">
          <div className="top-strip-inner">
            <div><span><Phone size={11} /> 77 220 30 48</span><span><Mail size={11} /> bbkdjo@icloud.com</span></div>
            <span><MapPin size={11} /> Dakar, Sénégal</span>
          </div>
        </div>
        <header className="site-header">
          <div className="header-inner">
            <Link href="/" className="brand">
              <img src="/logo-impact-print.svg?v=3" alt="Impact Print by Aicha" />
            </Link>
            <form className="header-search" action="/produits">
              <Search size={17} />
              <input name="q" placeholder="Que cherchez-vous ?" aria-label="Rechercher un produit" />
              <button type="submit">Rechercher</button>
            </form>
            <div className="header-actions">
              <Link className="header-account" href="/admin" aria-label="Administration de la boutique">
                <span className="account-dot"><ShieldCheck size={16} /></span>
                <span><small>Espace sécurisé</small><strong>Administration</strong></span>
              </Link>
              <Link className="icon-button cart" href="/panier" aria-label="Panier">
                <ShoppingBag size={19} /><span className="cart-count">0</span>
              </Link>
              <button className="icon-button mobile-menu" aria-label="Menu"><Menu size={19} /></button>
            </div>
          </div>
          <nav className="secondary-nav" aria-label="Navigation principale">
            <div>
              <Link href="/produits" className="nav-highlight"><Menu size={16} /> Toutes les catégories</Link>
              <Link href="/">Accueil</Link>
              <Link href="/produits">Produits</Link>
              <Link className="nav-contact" href={getWhatsAppUrl(WHATSAPP_CONTACT_MESSAGE)}>Nous contacter</Link>
            </div>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <div className="footer-grid">
            <div><Link href="/" className="brand"><img src="/logo-impact-print.svg?v=3" alt="Impact Print by Aicha" /></Link><p>Imprimez vos idées, faites la différence — créations personnalisées et sélection du quotidien.</p></div>
            <div><h4>Produits</h4><div className="footer-links"><Link href="/produits">Tout voir</Link></div></div>
            <div><h4>Service</h4><div className="footer-links"><Link href="/commande">Commander</Link><a href={getWhatsAppUrl(WHATSAPP_CONTACT_MESSAGE)}>WhatsApp</a><Link href="/admin">Administration</Link><Link href="/suivi">Suivre une commande</Link></div></div>
            <div><h4>Nous joindre</h4><p>Dakar, Sénégal<br />77 220 30 48<br />bbkdjo@icloud.com</p><div className="header-actions"><a className="icon-button" href="#" aria-label="Instagram"><Camera size={16} /></a><a className="icon-button" href="#" aria-label="Facebook"><Users size={16} /></a></div></div>
          </div>
          <div className="copyright">© 2026 Impact print by Aicha. Tous droits réservés.</div>
        </footer>
      </body>
    </html>
  );
}
