export type ProductCategory = "vegetables" | "meat" | "fish";
export type ProductUnit = "kg" | "pcs";

export interface Product {
  _id: string;
  name: string;
  price: number;
  stock: number;
  unit: ProductUnit;
  category: ProductCategory;
  sellerId:
    | string
    | { _id: string; name?: string; email?: string; role?: string };
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductListResponse {
  count: number;
  products: Product[];
}
