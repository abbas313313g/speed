
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import type { User, CartItem, Product, Order, OrderStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { users as mockUsers } from '@/lib/mock-data';

interface AppContextType {
  user: User | null;
  allUsers: User[];
  cart: CartItem[];
  orders: Order[];
  allOrders: Order[];
  isLoading: boolean;
  login: (phone: string) => boolean;
  logout: () => void;
  signup: (userData: Omit<User, 'id'>) => void;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  placeOrder: () => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  addProduct: (product: Omit<Product, 'id' | 'restaurantId'>) => void;
  totalCartPrice: number;
  deliveryFee: number;
}

export const AppContext = createContext<AppContextType | null>(null);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const loadFromLocalStorage = () => {
    try {
      const storedUser = localStorage.getItem('speedShopUser');
      const storedCart = localStorage.getItem(`speedShopCart_${storedUser ? JSON.parse(storedUser).id : ''}`);
      const storedOrders = localStorage.getItem(`speedShopOrders_${storedUser ? JSON.parse(storedUser).id : ''}`);
      const storedAllOrders = localStorage.getItem('speedShopAllOrders');
      const storedAllUsers = localStorage.getItem('speedShopAllUsers');

      if (storedUser) setUser(JSON.parse(storedUser));
      if (storedCart) setCart(JSON.parse(storedCart));
      if (storedOrders) setOrders(JSON.parse(storedOrders));
      
      setAllOrders(storedAllOrders ? JSON.parse(storedAllOrders) : []);
      setAllUsers(storedAllUsers ? JSON.parse(storedAllUsers) : mockUsers);
      
    } catch (error) {
      console.error("Failed to parse from localStorage", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFromLocalStorage();
  }, []);

  const saveToLocalStorage = useCallback(() => {
    if (isLoading) return;
    localStorage.setItem('speedShopUser', JSON.stringify(user));
    if (user) {
        localStorage.setItem(`speedShopCart_${user.id}`, JSON.stringify(cart));
        localStorage.setItem(`speedShopOrders_${user.id}`, JSON.stringify(orders));
    }
    localStorage.setItem('speedShopAllOrders', JSON.stringify(allOrders));
    localStorage.setItem('speedShopAllUsers', JSON.stringify(allUsers));
  }, [user, cart, orders, allOrders, allUsers, isLoading]);

  useEffect(() => {
    saveToLocalStorage();
  }, [saveToLocalStorage]);

  const login = (phone: string): boolean => {
    const foundUser = allUsers.find(u => u.phone === phone);
    if (foundUser) {
        setUser(foundUser);
        loadUserSpecificData(foundUser.id);
        router.push(foundUser.isAdmin ? '/admin' : '/home');
        return true;
    }
    return false;
  };

  const loadUserSpecificData = (userId: string) => {
    const storedCart = localStorage.getItem(`speedShopCart_${userId}`);
    const storedOrders = localStorage.getItem(`speedShopOrders_${userId}`);
    setCart(storedCart ? JSON.parse(storedCart) : []);
    setOrders(storedOrders ? JSON.parse(storedOrders) : []);
  }

  const logout = () => {
    const isAdmin = user?.isAdmin;
    setUser(null);
    setCart([]);
    setOrders([]);
    localStorage.removeItem('speedShopUser');
    router.push(isAdmin ? '/admin' : '/');
  };

  const signup = (userData: Omit<User, 'id'>) => {
    const newUser: User = { ...userData, id: `user-${Date.now()}`, isAdmin: false };
    setAllUsers(prev => [...prev, newUser]);
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

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    const update = (orderList: Order[]) => orderList.map(order => 
        order.id === orderId ? { ...order, status } : order
    );
    setOrders(update);
    setAllOrders(update);
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
      user: { id: user.id, name: user.name, phone: user.phone },
      revenue: totalCartPrice,
    };

    setOrders(prevOrders => [newOrder, ...prevOrders]);
    setAllOrders(prevAllOrders => [newOrder, ...prevAllOrders]);
    clearCart();

    // Simulate order status progression for demo
    if (newOrder.status === 'confirmed') {
        setTimeout(() => updateOrderStatus(newOrder.id, 'preparing'), 30 * 1000);
        setTimeout(() => updateOrderStatus(newOrder.id, 'on_the_way'), 60 * 1000);
        setTimeout(() => updateOrderStatus(newOrder.id, 'delivered'), 120 * 1000);
    }
  };
  
  const addProduct = (productData: Omit<Product, 'id' | 'restaurantId'>) => {
    // In a real app, this would be an API call
    console.log("Adding product:", productData);
    toast({
        title: "تمت إضافة المنتج بنجاح",
        description: `تمت إضافة ${productData.name} إلى قائمة المنتجات.`,
    })
  }

  return (
    <AppContext.Provider
      value={{
        user,
        allUsers,
        cart,
        orders,
        allOrders,
        isLoading,
        login,
        logout,
        signup,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        placeOrder,
        updateOrderStatus,
        addProduct,
        totalCartPrice,
        deliveryFee,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
