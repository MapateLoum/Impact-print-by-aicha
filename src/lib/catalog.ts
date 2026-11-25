export type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  oldPrice?: number;
  image: string;
  badge?: string;
  stock: number;
};

export const demoCategories = [
  { name: "Vêtements", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=85" },
  { name: "Objets personnalisés", image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=700&q=85" },
  { name: "Sacs & Tote bags", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=85" },
  { name: "Protection", image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=700&q=85" },
];

export const demoProducts: Product[] = [
  { id: "1", name: "T-shirt personnalisé", slug: "t-shirt-personnalise", category: "Vêtements", price: 7500, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=85", badge: "Best-seller", stock: 18 },
  { id: "2", name: "Gourde personnalisée", slug: "gourde-personnalisee", category: "Objets personnalisés", price: 6500, oldPrice: 8000, image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=700&q=85", badge: "-19%", stock: 12 },
  { id: "3", name: "Tote bag Impact", slug: "tote-bag-impact", category: "Sacs & Tote bags", price: 5000, image: "https://images.unsplash.com/photo-1597633125184-6e2e9b8d5b80?auto=format&fit=crop&w=700&q=85", stock: 25 },
  { id: "4", name: "Agenda premium", slug: "agenda-premium", category: "Papeterie", price: 9000, image: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=700&q=85", badge: "Nouveau", stock: 8 },
  { id: "5", name: "Casque de sécurité", slug: "casque-securite", category: "Protection", price: 12000, image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=700&q=85", stock: 30 },
  { id: "6", name: "Gilet de sécurité", slug: "gilet-securite", category: "Protection", price: 5500, image: "https://images.unsplash.com/photo-1569880153113-76e33fc52d5f?auto=format&fit=crop&w=700&q=85", stock: 20 },
];

export function formatXof(price: number) {
  return new Intl.NumberFormat("fr-SN", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(price);
}
