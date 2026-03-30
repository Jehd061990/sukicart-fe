export interface POSOrderItemPayload {
  productId: string;
  quantity: number;
}

export interface CreatePOSOrderPayload {
  items: POSOrderItemPayload[];
  paymentMethod: "cash";
}

export interface POSOrderResponse {
  message: string;
  order: {
    _id: string;
    total: number;
    status: string;
    type: "POS" | "ONLINE";
  };
}
