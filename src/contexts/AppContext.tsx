
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import type { User, CartItem, Product, Order, OrderStatus, Category, Restaurant, Banner } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { users as mockUsers, products as mockProducts, categories as mockCategories, restaurants as mockRestaurants, deliveryZones } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';

interface AppContextType {
  user: User | null;
  allUsers: User[];
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  allOrders: Order[];
  categories: Category[];
  restaurants: Restaurant[];
  banners: Banner[];
  isLoading: boolean;
  login: (phoneOrCode: string, password?: string) => boolean;
  logout: () => void;
  signup: (userData: Omit<User, 'id'>) => void;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  placeOrder: () => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  addProduct: (product: Omit<Product, 'id' | 'bestSeller'>) => void;
  addCategory: (category: Omit<Category, 'id' | 'icon'> & { iconName: string }) => void;
  addRestaurant: (restaurant: Omit<Restaurant, 'id'>) => void;
  addBanner: (banner: Omit<Banner, 'id'>) => void;
  applyCoupon: (coupon: string) => void;
  totalCartPrice: number;
  deliveryFee: number;
  discount: number;
}

export const AppContext = createContext<AppContextType | null>(null);

const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T) => void] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    const setValue = (value: T) => {
        try {
            setStoredValue(value);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(value));
            }
        } catch (error) {
            console.error(error);
        }
    };

    return [storedValue, setValue];
};


export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [discount, setDiscount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [allUsers, setAllUsers] = useLocalStorage<User[]>('speedShopAllUsers', mockUsers);
  const [products, setProducts] = useLocalStorage<Product[]>('speedShopProducts', mockProducts);
  const [allOrders, setAllOrders] = useLocalStorage<Order[]>('speedShopAllOrders', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('speedShopCategories', mockCategories);
  const [restaurants, setRestaurants] = useLocalStorage<Restaurant[]>('speedShopRestaurants', mockRestaurants);
  const [banners, setBanners] = useLocalStorage<Banner[]>('speedShopBanners', []);

  const router = useRouter();
  const { toast } = useToast();

  const loadUserFromLocalStorage = useCallback(() => {
    setIsLoading(true);
    try {
      const storedUser = localStorage.getItem('speedShopUser');
      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        const userExists = allUsers.find((u: User) => u.id === parsedUser.id);
        
        if (userExists) {
            setUser(userExists);
            loadUserSpecificData(userExists.id);
        } else {
            // User in session storage doesn't exist in our user list anymore
            localStorage.removeItem('speedShopUser');
            setUser(null);
        }
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [allUsers]);

  useEffect(() => {
    loadUserFromLocalStorage();
  }, [loadUserFromLocalStorage]);

  const saveUserToLocalStorage = useCallback(() => {
    if (isLoading) return;
    try {
        if(user) {
            localStorage.setItem('speedShopUser', JSON.stringify(user));
            localStorage.setItem(`speedShopCart_${user.id}`, JSON.stringify(cart));
            localStorage.setItem(`speedShopOrders_${user.id}`, JSON.stringify(orders));
        } else {
             localStorage.removeItem('speedShopUser');
        }
    } catch (error) {
        console.error("Failed to save user data to localStorage", error);
    }
  }, [user, cart, orders, isLoading]);

  useEffect(() => {
    saveUserToLocalStorage();
  }, [saveUserToLocalStorage]);
  
  const login = (phoneOrCode: string, password?: string): boolean => {
    let foundUser: User | undefined;

    if (password) {
        // Login with phone and password
        foundUser = allUsers.find(u => u.phone === phoneOrCode && u.password === password);
    } else {
        // Login with code
        foundUser = allUsers.find(u => u.loginCode === phoneOrCode);
    }

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
    
    const loginCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newUser: User = {
        id: `user-${Date.now()}`,
        ...userData,
        loginCode: loginCode,
        usedCoupons: []
    };
    
    setAllUsers([...allUsers, newUser]);
    toast({
        title: "تم إنشاء الحساب بنجاح!",
        description: `رمز الدخول السريع الخاص بك هو: ${loginCode}. يمكنك استخدامه لتسجيل الدخول لاحقًا.`,
        duration: 10000,
    });
  };
  
  const clearCartAndAdd = (product: Product, quantity: number = 1) => {
    const newItem = { product, quantity };
    setCart([newItem]);
    setDiscount(0);
    toast({
      title: "تم بدء طلب جديد",
      description: "تم مسح السلة القديمة وإضافة المنتج الجديد.",
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
  }, [setAllOrders]);

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
  
  const addProduct = (productData: Omit<Product, 'id' | 'bestSeller'>) => {
    const newProduct: Product = {
        id: `prod-${Date.now()}`,
        bestSeller: Math.random() < 0.2, // 20% chance of being a bestseller
        ...productData
    };
    setProducts(prev => [...prev, newProduct]);
    
    toast({
        title: "تمت إضافة المنتج بنجاح",
        description: `تمت إضافة ${productData.name} إلى قائمة المنتجات.`,
    })
  }

  const addCategory = (categoryData: Omit<Category, 'id' | 'icon'> & { iconName: string }) => {
    const newCategory: Category = {
        id: `cat-${Date.now()}`,
        name: categoryData.name,
        icon: () => <span>Icon</span>, // Placeholder
    };
    setCategories(prev => [...prev, newCategory]);
    toast({ title: "تمت إضافة القسم بنجاح" });
  }
  
  const addRestaurant = (restaurantData: Omit<Restaurant, 'id'>) => {
    const newRestaurant: Restaurant = {
        id: `res-${Date.now()}`,
        ...restaurantData
    };
    setRestaurants(prev => [...prev, newRestaurant]);
    toast({ title: "تمت إضافة المتجر بنجاح" });
  }
  
  const addBanner = (bannerData: Omit<Banner, 'id'>) => {
    const newBanner: Banner = {
        id: `banner-${Date.now()}`,
        ...bannerData
    };
    setBanners(prev => [...prev, newBanner]);
    toast({ title: "تمت إضافة البنر بنجاح" });
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
            const updatedUser: User = { ...user, usedCoupons: [...(user.usedCoupons || []), couponCode] };
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
        products,
        cart,
        orders,
        allOrders,
        categories,
        restaurants,
        banners,
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
        addCategory,
        addRestaurant,
        addBanner,
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

    