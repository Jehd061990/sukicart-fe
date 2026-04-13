export type ProductCategory = "vegetables" | "meat" | "fish";
export type ProductUnit = "kg" | "pcs";
export type ProductStatus = "active" | "inactive";

export interface Product {
  _id: string;
  name: string;
  price: number;
  stock: number;
  status: ProductStatus;
  unit: ProductUnit;
  category: ProductCategory;
  sellerId:
    | string
    | { _id: string; name?: string; email?: string; role?: string };
  image?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductListResponse {
  products: Product[];
  pagination: ProductPagination;
}

export interface ProductListFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: ProductCategory;
  status?: ProductStatus | "all";
}

export interface CreateProductPayload {
  name: string;
  price: number;
  stock: number;
  unit: ProductUnit;
  category: ProductCategory;
  status?: ProductStatus;
  image?: string;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;
