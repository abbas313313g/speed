

export interface User {
  id: string; // This will be the Firebase Auth UID
  name: string;
  email: string;
  phone: string;
  isAdmin: boolean;
}

export interface Address {
    id: string;
    name: string; // e.g., "المنزل", "العمل"
    phone: string;
    deliveryZone: string;
    latitude?: number;
    longitude?: number;
    details?: string; // e.g., "الطابق الثاني، شقة 5"
}

export interface Product {
  id: string;
  name:string;
  description: string;
  price: number;
  wholesalePrice?: number;
  image: string;
  categoryId: string;
  restaurantId: string;
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
  linkType?: 'none' | 'product' | 'restaurant';
  link: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
}

export interface DeliveryWorker {
    id: string; // phone number
    name: string;
}

export type OrderStatus = 'confirmed' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled' | 'unassigned';

export interface Order {
    id: string;
    items: CartItem[];
    total: number;
    date: string; // Should be ISO string
    status: OrderStatus;
    estimatedDelivery: string;
    address: Address;
    profit?: number;
    deliveryFee: number;
    deliveryWorkerId?: string;
    deliveryWorker?: DeliveryWorker;
    userId?: string; // Optional now
}

export interface SupportTicket {
    id: string;
    question: string;
    createdAt: string;
    isResolved: boolean;
}

