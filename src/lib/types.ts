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
    userId: string;
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
  isManualClosed?: boolean; 
  loginCode: string;
  commissionRate: number;
  branchId: string;
  categoryId: string; 
  menuSections?: string[]; 
  isFeatured?: boolean;
  balanceAdjustment?: number;
  oneSignalId?: string; // معرف ون سيجنال الخاص بصاحب المتجر
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
  isFeatured?: boolean;
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
    isOnline?: boolean;
    isActive?: boolean; 
    branchId: string;
    idleCount?: number; 
    latitude?: number;
    longitude?: number;
    balanceAdjustment?: number;
    debtAdjustment?: number;
}

export type OrderStatus = 'unassigned' | 'pending_assignment' | 'preparing' | 'confirmed' | 'ready_for_pickup' | 'on_the_way' | 'delivered' | 'cancelled';

export interface Order {
    id: string;
    orderNumber?: number; 
    userId: string;
    items: CartItem[];
    total: number;
    date: string; 
    status: OrderStatus;
    address: Address;
    deliveryFee: number;
    deliveryWorkerId: string | null;
    deliveryWorker: {id: string; name: string} | null;
    isPaid: boolean;
    isFeePaid: boolean;
    isOrderPaidToOffice: boolean;
    branchId: string;
    confirmedAt?: string; 
    isArchived?: boolean; // حقل جديد لتصفير التقارير
    appliedCoupon: {
      code: string;
      discountAmount: number;
    } | null;
    restaurant: {
        id: string;
        name: string;
        latitude?: number | null;
        longitude?: number | null;
        commissionRate?: number;
        oneSignalId?: string;
    } | null;
}

export interface WithdrawRequest {
    id: string;
    type: 'restaurant' | 'delivery';
    targetId: string;
    targetName: string;
    amount: number; 
    commissionAmount?: number; 
    netAmount: number; 
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
    isFullDiscount?: boolean;
    maxUses: number;
    usedCount: number;
    usedBy: string[]; 
    restaurantId?: string;
    isFirstOrderOnly?: boolean;
    discountTarget: 'total' | 'delivery';
}

export interface AppSettings {
    id?: string;
    isMaintenanceMode: boolean;
    maintenanceMessage?: string;
    featuredStoreIds?: string[];
    featuredBannerIds?: string[];
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