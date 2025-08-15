
export interface User {
  id: string;
  name: string;
  phone: string;
  // password is not stored in Firestore, it's handled by Firebase Auth
  deliveryZone: DeliveryZone;
  isAdmin?: boolean;
  usedCoupons?: string[];
  loginCode?: string;
  email: string; // Firebase Auth uses email
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
  // icon component cannot be stored in Firestore. We will render it dynamically using iconName
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
    revenue?: number;
    userId: string;
}
