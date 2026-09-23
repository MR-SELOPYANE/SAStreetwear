export const formatZAR = (n: number | string) =>
  "R" + Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const CATEGORIES = ["Tops", "Bottoms", "Shoes", "Jackets", "Caps & Hats", "Accessories", "Dresses", "Kids"];

export type Product = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  sizes: string;
  image_url: string | null;
  stock: number;
  active: boolean;
  created_at: string;
  sellers?: { shop_name: string; location: string; phone: string } | null;
};
