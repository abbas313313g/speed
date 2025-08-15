
export interface User {
  id: string;
  name: string;
  phone: string;
  password?: string;
  deliveryZone: DeliveryZone;
  isAdmin?: boolean;
  usedCoupons?: string[];
  loginCode?: string;
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
  iconName: string;
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
    date: string;
    status: OrderStatus;
    estimatedDelivery: string;
    user?: Pick<User, 'id' | 'name' | 'phone'>;
    revenue?: number;
}
