
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import type { User, CartItem, Product, Order, OrderStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { users as mockUsers } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';

interface AppContextType {
  user: User | null;
  allUsers: User[];
  cart: CartItem[];
  orders: Order[];
  allOrders: Order[];
  isLoading: boolean;
  login: (phone: string, password?: string) => boolean;
  logout: () => void;
  signup: (userData: Omit<User, 'id'>) => void;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  placeOrder: () => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  addProduct: (product: Omit<Product, 'id' | 'restaurantId'>) => void;
  applyCoupon: (coupon: string) => void;
  totalCartPrice: number;
  deliveryFee: number;
  discount: number;
}

export const AppContext = createContext<AppContextType | null>(null);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [discount, setDiscount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const loadFromLocalStorage = useCallback(() => {
    setIsLoading(true);
    try {
      const storedUser = localStorage.getItem('speedShopUser');
      const storedAllOrders = localStorage.getItem('speedShopAllOrders');
      const storedAllUsers = localStorage.getItem('speedShopAllUsers');

      const activeUsers = storedAllUsers ? JSON.parse(storedAllUsers) : mockUsers;
      setAllUsers(activeUsers);
      setAllOrders(storedAllOrders ? JSON.parse(storedAllOrders) : []);

      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        const userExists = activeUsers.some((u: User) => u.id === parsedUser.id);
        
        if (userExists) {
            setUser(parsedUser);
            loadUserSpecificData(parsedUser.id);
        } else {
            // User from localStorage doesn't exist in our user list anymore, so log out.
            localStorage.removeItem('speedShopUser');
            setUser(null);
        }
      }
    } catch (error) {
      console.error("Failed to parse from localStorage", error);
      setUser(null);
      setCart([]);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  const saveToLocalStorage = useCallback(() => {
    if (isLoading) return;
    try {
        if(user) {
            localStorage.setItem('speedShopUser', JSON.stringify(user));
            localStorage.setItem(`speedShopCart_${user.id}`, JSON.stringify(cart));
            localStorage.setItem(`speedShopOrders_${user.id}`, JSON.stringify(orders));
        } else {
             localStorage.removeItem('speedShopUser');
        }
        localStorage.setItem('speedShopAllOrders', JSON.stringify(allOrders));
        localStorage.setItem('speedShopAllUsers', JSON.stringify(allUsers));
    } catch (error) {
        console.error("Failed to save to localStorage", error);
    }
  }, [user, cart, orders, allOrders, allUsers, isLoading]);

  useEffect(() => {
    saveToLocalStorage();
  }, [saveToLocalStorage]);

  const login = (phone: string, password?: string): boolean => {
    const foundUser = allUsers.find(u => u.phone === phone && u.password === password);
    if (foundUser) {
        setUser(foundUser);
        loadUserSpecificData(foundUser.id);
        return true;
    }
    return false;
  };

  const loadUserSpecificData = (userId: string) => {
    const storedCart = localStorage.getItem(`speedShopCart_${userId}`);
    const storedOrders = localStorage.getItem(`speedShopOrders_${userId}`);
    setCart(storedCart ? JSON.parse(storedCart) : []);
    setOrders(storedOrders ? JSON.parse(storedOrders) : []);
    setDiscount(0);
  }

  const logout = () => {
    const userId = user?.id;
    setUser(null);
    setCart([]);
    setOrders([]);
    setDiscount(0);
    localStorage.removeItem('speedShopUser');
    if (userId) {
        localStorage.removeItem(`speedShopCart_${userId}`);
        localStorage.removeItem(`speedShopOrders_${userId}`);
    }
    router.push('/login');
  };

  const signup = (userData: Omit<User, 'id'>) => {
    const existingUser = allUsers.find(u => u.phone === userData.phone);
    if(existingUser) {
        throw new Error("هذا الرقم مسجل بالفعل.");
    }
    
    const newUser: User = {
        id: `user-${Date.now()}`,
        ...userData,
    };

    setAllUsers(prevUsers => [...prevUsers, newUser]);
  };
  
  const clearCartAndAdd = (product: Product, quantity: number = 1) => {
    const newItem = { product, quantity };
    setCart([newItem]);
    setDiscount(0);
    toast({
      title: "تم بدء طلب جديد",
      description: "تم مسح سلة التسوق القديمة وإضافة المنتج الجديد.",
    });
  }

  const addToCart = (product: Product, quantity: number = 1) => {
    if (cart.length > 0 && cart[0].product.restaurantId !== product.restaurantId) {
        toast({
            title: "لا يمكن الطلب من متاجر مختلفة",
            description: "هل تريد مسح السلة وبدء طلب جديد من هذا المتجر؟",
            action: (
              <Button variant="destructive" onClick={() => clearCartAndAdd(product, quantity)}>
                نعم، ابدأ طلب جديد
              </Button>
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
    setCart(prevCart => {
        const newCart = prevCart.filter(item => item.product.id !== productId);
        if(newCart.length === 0) setDiscount(0);
        return newCart;
    });
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
    setDiscount(0);
  };

  const totalCartPrice = cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const deliveryFee = cart.length > 0 ? (user?.deliveryZone?.fee ?? 3000) : 0;

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    const update = (orderList: Order[]) => orderList.map(order => 
        order.id === orderId ? { ...order, status } : order
    );
    setOrders(prevOrders => update(prevOrders));
    setAllOrders(prevAllOrders => update(prevAllOrders));
  }, []);

  const placeOrder = () => {
    if (!user || cart.length === 0) return;

    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      items: cart,
      total: totalCartPrice - discount + deliveryFee,
      date: new Date().toISOString(),
      status: 'confirmed',
      estimatedDelivery: '30-40 دقيقة',
      user: { id: user.id, name: user.name, phone: user.phone },
      revenue: totalCartPrice - discount,
    };

    setOrders(prevOrders => [newOrder, ...prevOrders]);
    setAllOrders(prevAllOrders => [newOrder, ...prevAllOrders]);
    clearCart();

    if (newOrder.status === 'confirmed') {
        setTimeout(() => updateOrderStatus(newOrder.id, 'preparing'), 30 * 1000);
        setTimeout(() => updateOrderStatus(newOrder.id, 'on_the_way'), 60 * 1000);
        setTimeout(() => updateOrderStatus(newOrder.id, 'delivered'), 120 * 1000);
    }
  };
  
  const addProduct = (productData: Omit<Product, 'id' | 'restaurantId'>) => {
    console.log("Adding product:", productData);
    toast({
        title: "تمت إضافة المنتج بنجاح",
        description: `تمت إضافة ${productData.name} إلى قائمة المنتجات.`,
    })
  }

  const applyCoupon = (coupon: string) => {
    const couponCode = coupon.toUpperCase();

    if (user?.usedCoupons?.includes(couponCode)) {
        toast({
            title: "الكود مستخدم بالفعل",
            description: "لقد استخدمت هذا الكود من قبل.",
            variant: "destructive",
        });
        return;
    }

    if (couponCode === 'SALE10') {
        const discountAmount = totalCartPrice * 0.10;
        setDiscount(discountAmount);
        
        if (user) {
            const updatedUser = { ...user, usedCoupons: [...(user.usedCoupons || []), couponCode] };
            setUser(updatedUser);
            setAllUsers(prevUsers => prevUsers.map(u => u.id === user.id ? updatedUser : u));
        }

        toast({
            title: "تم تطبيق الخصم!",
            description: `لقد حصلت على خصم بقيمة ${formatCurrency(discountAmount)}.`,
        });
    } else {
        setDiscount(0);
        toast({
            title: "كود الخصم غير صالح",
            description: "الرجاء التأكد من الكود والمحاولة مرة أخرى.",
            variant: "destructive",
        });
    }
  };

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
        applyCoupon,
        totalCartPrice,
        deliveryFee,
        discount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
