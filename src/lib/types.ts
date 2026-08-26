
import { z } from 'zod';

export interface User {
  id: string; 
  name: string;
  email: string;
  phone: string;
  isAdmin: boolean;
}

export interface Address {
    id: string;
    name: string; 
    phone: string;
    deliveryZone: string;
    latitude?: number;
    longitude?: number;
    details?: string; 
    branchId?: string; 
}

export interface ProductSize {
  name: string;
  price: number;
  stock: number;
  isUnlimited?: boolean; 
  isActive?: boolean; 
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
  storeSectionId?: string; 
  restaurantId: string;
  status: 'approved' | 'pending';
  branchId: string;
  isActive?: boolean;
  isUnlimitedStock?: boolean;
}

export interface Category {
  id: string;
  name: string;
  iconName: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface Restaurant {
  id: string;
  restaurantNumber: string;
  name: string;
  image: string;
  rating: number;
  latitude?: number;
  longitude?: number;
  openTime?: string; 
  closeTime?: string; 
  isStoreOpen?: boolean; 
  loginCode: string;
  commissionRate: number;
  branchId: string;
  categoryId: string; 
  menuSections?: string[]; 
}

export interface Branch {
    id: string;
    name: string;
    locationName: string;
    createdAt: string;
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
  branchId: string; 
}

export interface DeliveryWorker {
    id: string;
    name: string;
    password?: string;
    lastDeliveredAt?: string | null; 
    unfreezeProgress?: number;
    isOnline?: boolean;
    totalDeliveredCount?: number;
    branchId: string;
}

export type OrderStatus = 'unassigned' | 'pending_assignment' | 'preparing' | 'confirmed' | 'ready_for_pickup' | 'on_the_way' | 'delivered' | 'cancelled';

export interface Order {
    id: string;
    userId: string;
    items: CartItem[];
    total: number;
    date: string; 
    status: OrderStatus;
    estimatedDelivery: string;
    address: Address;
    profit: number;
    deliveryFee: number;
    deliveryWorkerId: string | null;
    deliveryWorker: {id: string; name: string} | null;
    isPaid: boolean;
    isFeePaid: boolean;
    isOrderPaidToOffice: boolean;
    branchId: string;
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

export interface WithdrawRequest {
    id: string;
    restaurantId: string;
    restaurantName: string;
    amount: number;
    status: 'pending' | 'completed' | 'rejected';
    requestedAt: string;
    branchId: string;
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
    branchId: string;
}

export interface Coupon {
    id: string;
    code: string;
    discountType: 'fixed'; 
    discountValue: number;
    maxUses: number;
    usedCount: number;
    usedBy: string[]; 
    restaurantId?: string;
    isFirstOrderOnly?: boolean;
}

export interface AppSettings {
    id?: string;
    isMaintenanceMode: boolean;
    maintenanceMessage?: string;
}

export interface AdminAccess {
    id: string;
    deviceId: string;
    branchId: string;
    status: 'approved' | 'pending';
    requestedAt: string;
    approvedAt?: string;
    deviceName?: string;
}
