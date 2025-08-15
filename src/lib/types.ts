
export interface User {
  id: string;
  name: string;
  phone: string;
  deliveryZone: DeliveryZone;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  restaurantId: string;
  bestSeller?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface Restaurant {
  id: string;
  name: string;
  image: string;
  rating: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface DeliveryZone {
  name: string;
  fee: number;
}

export type OrderStatus = 'confirmed' | 'preparing' | 'on_the_way' | 'delivered';

export interface Order {
    id: string;
    items: CartItem[];
    total: number;
    date: string;
    status: OrderStatus;
    estimatedDelivery: string;
}
