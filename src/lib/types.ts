
import { z } from 'zod';

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

export interface ProductSize {
  name: string;
  price: number;
  stock: number;
}

export interface Product {
  id: string;
  name:string;
  description: string;
  price: number;
  wholesalePrice?: number;
  discountPrice?: number;
  sizes?: ProductSize[];
  stock: number;
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
  latitude?: number;
  longitude?: number;
  openTime?: string; // e.g., "09:00"
  closeTime?: string; // e.g., "23:00"
  isStoreOpen?: boolean; // This will be calculated on the client
  loginCode: string;
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
  selectedSize?: ProductSize;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
}

export interface DeliveryWorker {
    id: string; // phone number
    name: string;
    lastDeliveredAt?: string; // ISO String
    unfreezeProgress?: number;
    isOnline?: boolean;
}

export type OrderStatus = 'unassigned' | 'preparing' | 'confirmed' | 'ready_for_pickup' | 'on_the_way' | 'delivered' | 'cancelled';

export interface Order {
    id: string;
    userId: string;
    items: CartItem[];
    total: number;
    date: string; // Should be ISO string
    status: OrderStatus;
    estimatedDelivery: string;
    address: Address;
    profit: number | null;
    deliveryFee: number;
    deliveryWorkerId: string | null;
    deliveryWorker: {id: string; name: string} | null;
    isPaid?: boolean;
    appliedCoupon: {
      code: string;
      discountAmount: number;
    } | null;
    restaurant: {
        id: string;
        name: string;
        latitude?: number | null;
        longitude?: number | null;
    } | null;
}

export interface Message {
    role: 'user' | 'assistant' | 'admin';
    content: string;
    timestamp: string;
}

export interface SupportTicket {
    id: string;
    userId: string;
    userName: string;
    createdAt: string;
    isResolved: boolean;
    history: Message[];
}

export interface Coupon {
    id: string;
    code: string;
    discountType: 'fixed'; // Can be expanded to 'percentage'
    discountValue: number;
    maxUses: number;
    usedCount: number;
    usedBy: string[]; // Array of user IDs who have used this coupon
}

export interface TelegramConfig {
    id: string;
    chatId: string;
    type: 'owner' | 'worker';
    workerId?: string; // only if type is 'worker'
    name: string; // For display purposes (e.g., "Owner 1", "Ahmed's Phone")
}

export interface AppSettings {
    id?: string;
    isMaintenanceMode: boolean;
}

// AI Support Schemas
export const AiSupportInputSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'admin']),
    content: z.string(),
  })).describe("The conversation history."),
});
export type AiSupportInput = z.infer<typeof AiSupportInputSchema>;


export const AiSupportOutputSchema = z.object({
  response: z.string().describe("The AI's response to the user."),
});
export type AiSupportOutput = z.infer<typeof AiSupportOutputSchema>;

    