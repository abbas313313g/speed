
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import type { User, CartItem, Product, Order, OrderStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface AppContextType {
  user: User | null;
  cart: CartItem[];
  orders: Order[];
  isLoading: boolean;
  login: (phone: string) => boolean;
  logout: () => void;
  signup: (userData: Omit<User, 'id'>) => void;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  placeOrder: () => void;
  totalCartPrice: number;
  deliveryFee: number;
}

export const AppContext = createContext<AppContextType | null>(null);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('speedShopUser');
      const storedCart = localStorage.getItem('speedShopCart');
      const storedOrders = localStorage.getItem('speedShopOrders');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      }
      if (storedOrders) {
        setOrders(JSON.parse(storedOrders));
      }
    } catch (error) {
      console.error("Failed to parse from localStorage", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('speedShopUser', JSON.stringify(user));
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('speedShopCart', JSON.stringify(cart));
    }
  }, [cart, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('speedShopOrders', JSON.stringify(orders));
    }
  }, [orders, isLoading]);

  const login = (phone: string): boolean => {
    // In a real app, you'd fetch the user. Here we just check localStorage.
    const storedUser = localStorage.getItem('speedShopUser');
    if (storedUser) {
      const parsedUser: User = JSON.parse(storedUser);
      if (parsedUser.phone === phone) {
        setUser(parsedUser);
        router.push('/home');
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setCart([]);
    setOrders([]); // Also clear orders on logout
    localStorage.removeItem('speedShopUser');
    localStorage.removeItem('speedShopCart');
    localStorage.removeItem('speedShopOrders');
    router.push('/');
  };

  const signup = (userData: Omit<User, 'id'>) => {
    const newUser: User = { ...userData, id: `user-${Date.now()}` };
    setUser(newUser);
    router.push('/home');
  };

  const clearCartAndAdd = (product: Product, quantity: number = 1) => {
    const newItem = { product, quantity };
    setCart([newItem]);
    toast({
      title: "تم بدء طلب جديد",
      description: "تم مسح سلة التسوق القديمة وإضافة المنتج الجديد.",
    });
  }

  const addToCart = (product: Product, quantity: number = 1) => {
    if (cart.length > 0 && cart[0].product.restaurantId !== product.restaurantId) {
       toast({
        title: "هل تريد بدء طلب جديد؟",
        description: "لا يمكنك الطلب من مطعمين مختلفين في نفس الوقت. هل تريد مسح سلتك الحالية والبدء من جديد؟",
        action: (
          <>
            <Button variant="destructive" onClick={() => clearCartAndAdd(product, quantity)}>نعم، إبدأ من جديد</Button>
          </>
        ),
      });
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, { product, quantity }];
    });
    toast({
      title: "تمت الإضافة إلى السلة",
      description: `تمت إضافة ${product.name} إلى سلة التسوق.`,
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };
  
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalCartPrice = cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const deliveryFee = user?.deliveryZone?.fee ?? 0;

  const updateOrderStatus = useCallback((orderId: string, newStatus: OrderStatus) => {
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
  }, []);

  const placeOrder = () => {
    if (!user || cart.length === 0) return;

    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      items: cart,
      total: totalCartPrice + deliveryFee,
      date: new Date().toISOString(),
      status: 'confirmed',
      estimatedDelivery: '30-40 دقيقة',
    };

    setOrders(prevOrders => [newOrder, ...prevOrders]);
    clearCart();

    // Simulate order status progression
    setTimeout(() => updateOrderStatus(newOrder.id, 'preparing'), 30 * 1000); // 30 seconds
    setTimeout(() => updateOrderStatus(newOrder.id, 'on_the_way'), 60 * 1000); // 1 minute
    setTimeout(() => updateOrderStatus(newOrder.id, 'delivered'), 120 * 1000); // 2 minutes
  };

  return (
    <AppContext.Provider
      value={{
        user,
        cart,
        orders,
        isLoading,
        login,
        logout,
        signup,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        placeOrder,
        totalCartPrice,
        deliveryFee,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
