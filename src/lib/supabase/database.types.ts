export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  sku: string;
  brand: string | null;
  description: string | null;
  price_xof: number;
  compare_at_price_xof: number | null;
  stock: number;
  reserved_stock: number;
  low_stock_threshold: number;
  attributes: Json;
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductImageRow = {
  id: string;
  product_id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  full_name: string;
  avatar_path: string | null;
  role: "admin" | "staff" | "customer";
  created_at: string;
  updated_at: string;
};

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      categories: Table<CategoryRow>;
      products: Table<ProductRow>;
      product_images: Table<ProductImageRow>;
    };
    Views: { [_ in never]: never };
    Functions: {
      admin_adjust_product_stock: {
        Args: {
          p_product_id: string;
          p_delta: number;
          p_reason: string;
        };
        Returns: number;
      };
      admin_create_product: {
        Args: {
          p_product_id: string;
          p_category_id: string;
          p_name: string;
          p_slug: string;
          p_sku: string;
          p_brand: string | null;
          p_description: string | null;
          p_price_xof: number;
          p_compare_at_price_xof: number | null;
          p_stock: number;
          p_is_published: boolean;
        };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
