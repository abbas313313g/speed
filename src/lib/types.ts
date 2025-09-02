

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

export type OrderStatus = 'unassigned' | 'pending_assignment' | 'confirmed' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled';

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
    assignedToWorkerId?: string;
    assignmentTimestamp?: string;
    appliedCoupon?: {
      code: string;
      discountAmount: number;
    };
}

export interface SupportTicket {
    id: string;
    question: string;
    createdAt: string;
    isResolved: boolean;
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


    

    