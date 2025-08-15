
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  deliveryZone: DeliveryZone;
  addresses: Address[];
  isAdmin: boolean;
  usedCoupons: string[];
  isProfileComplete: boolean;
}

export interface Address {
    id: string;
    name: string; // e.g., "المنزل", "العمل"
    latitude: number;
    longitude: number;
    details?: string; // e.g., "الطابق الثاني، شقة 5"
}

export interface Product {
  id: string;
  name:string;
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
  iconName: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface Restaurant {
  id: string;
  name: string;
  image: string;
  rating: number;
}

export interface Banner {
  id: string;
  image: string;
  link: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface DeliveryZone {
  name: string;
  fee: number;
}

export type OrderStatus = 'confirmed' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled';

export interface Order {
    id: string;
    items: CartItem[];
    total: number;
    date: string; // Should be ISO string
    status: OrderStatus;
    estimatedDelivery: string;
    user?: {
        id: string;
        name: string;
        phone: string;
    };
    address?: Address;
    revenue?: number;
    userId: string;
}
