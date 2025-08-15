
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import type { User, CartItem, Product, Order, OrderStatus, Category, Restaurant, Banner } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { 
    users as initialUsers, 
    products as initialProducts, 
    categories as initialCategoriesData, 
    restaurants as initialRestaurants,
    deliveryZones
} from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';
import { Stethoscope, SwatchBook, Soup, Salad, ChefHat, ShoppingBasket } from 'lucide-react';

const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
  ShoppingBasket,
  Stethoscope,
  SwatchBook,
  Soup,
  Salad,
  ChefHat,
};

type StoredCategory = Omit<Category, 'icon'>;

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
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  addCategory: (category: Omit<Category, 'id' | 'icon'>) => void;
  updateCategory: (category: Omit<Category, 'icon'>) => void;
  deleteCategory: (categoryId: string) => void;
  addRestaurant: (restaurant: Omit<Restaurant, 'id'>) => void;
  updateRestaurant: (restaurant: Restaurant) => void;
  deleteRestaurant: (restaurantId: string) => void;
  addBanner: (banner: Omit<Banner, 'id'>) => void;
  applyCoupon: (coupon: string) => void;
  totalCartPrice: number;
  deliveryFee: number;
  discount: number;
}

export const AppContext = createContext<AppContextType | null>(null);

const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        // This function now runs only on the client, once.
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            if (item && item !== 'undefined' && item !== 'null') {
                return JSON.parse(item);
            }
            window.localStorage.setItem(key, JSON.stringify(initialValue));
            return initialValue;
        } catch (error) {
            console.error(`Error reading or parsing localStorage key “${key}”:`, error);
            return initialValue;
        }
    });

    useEffect(() => {
        // This effect syncs state changes to localStorage.
        try {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(storedValue));
            }
        } catch (error) {
            console.log(error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
};

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);

  // Global Data States are now managed by useState, initialized from mock data
  const [allUsers, setAllUsers] = useState<User[]>(initialUsers);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [storedCategories, setStoredCategories] = useState<StoredCategory[]>(initialCategoriesData);
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  
  // User-specific states will still use localStorage to remember the logged-in user
  const [user, setUser] = useLocalStorage<User | null>('speedShopUser', null);
  
  // Cart and orders can also use localStorage, but keyed by user ID
  const cartKey = user ? `speedShopCart_${user.id}` : 'speedShopCart_guest';
  const ordersKey = user ? `speedShopOrders_${user.id}` : 'speedShopOrders_guest';

  const [cart, setCart] = useLocalStorage<CartItem[]>(cartKey, []);
  const [orders, setOrders] = useLocalStorage<Order[]>(ordersKey, []);
  
  const [discount, setDiscount] = useState(0);

  const categories: Category[] = storedCategories.map(c => ({...c, icon: iconMap[c.iconName] || ShoppingBasket}));

  const router = useRouter();
  const { toast } = useToast();
  
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const login = (phoneOrCode: string, password?: string): boolean => {
    let foundUser: User | undefined;
    if (password) {
        foundUser = allUsers.find(u => u.phone === phoneOrCode && u.password === password);
    } else {
        foundUser = allUsers.find(u => u.loginCode === phoneOrCode);
    }

    if (foundUser) {
        setUser(foundUser);
        return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setCart([]);
    setOrders([]);
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
    
    setAllUsers(prev => [...prev, newUser]);
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
  }, [setOrders, setAllOrders]);

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
        bestSeller: Math.random() < 0.2,
        ...productData
    };
    setProducts(prev => [...prev, newProduct]);
    toast({ title: "تمت إضافة المنتج بنجاح" });
  }

  const updateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    toast({ title: "تم تحديث المنتج بنجاح" });
  }

  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    toast({ title: "تم حذف المنتج بنجاح", variant: "destructive" });
  }

  const addCategory = (categoryData: Omit<Category, 'id' | 'icon'>) => {
    const newCategory: StoredCategory = {
        id: `cat-${Date.now()}`,
        name: categoryData.name,
        iconName: categoryData.iconName,
    };
    setStoredCategories(prev => [...prev, newCategory]);
    toast({ title: "تمت إضافة القسم بنجاح" });
  }

  const updateCategory = (updatedCategory: Omit<Category, 'icon'>) => {
    setStoredCategories(prev => prev.map(c => c.id === updatedCategory.id ? { id: c.id, name: updatedCategory.name, iconName: updatedCategory.iconName } : c));
    toast({ title: "تم تحديث القسم بنجاح" });
  }

  const deleteCategory = (categoryId: string) => {
    setStoredCategories(prev => prev.filter(c => c.id !== categoryId));
    toast({ title: "تم حذف القسم بنجاح", variant: "destructive" });
  }
  
  const addRestaurant = (restaurantData: Omit<Restaurant, 'id'>) => {
    const newRestaurant: Restaurant = {
        id: `res-${Date.now()}`,
        ...restaurantData
    };
    setRestaurants(prev => [...prev, newRestaurant]);
    toast({ title: "تمت إضافة المتجر بنجاح" });
  }

  const updateRestaurant = (updatedRestaurant: Restaurant) => {
    setRestaurants(prev => prev.map(r => r.id === updatedRestaurant.id ? updatedRestaurant : r));
    toast({ title: "تم تحديث المتجر بنجاح" });
  }

  const deleteRestaurant = (restaurantId: string) => {
    setRestaurants(prev => prev.filter(r => r.id !== restaurantId));
    toast({ title: "تم حذف المتجر بنجاح", variant: "destructive" });
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
        toast({ title: "الكود مستخدم بالفعل", variant: "destructive" });
        return;
    }
    if (couponCode === 'SALE10') {
        const discountAmount = totalCartPrice * 0.10;
        setDiscount(discountAmount);
        if (user) {
            const updatedUser: User = { ...user, usedCoupons: [...(user.usedCoupons || []), couponCode] };
            setUser(updatedUser);
            setAllUsers(allUsers.map(u => u.id === user.id ? updatedUser : u));
        }
        toast({ title: "تم تطبيق الخصم!", description: `لقد حصلت على خصم بقيمة ${formatCurrency(discountAmount)}.` });
    } else {
        setDiscount(0);
        toast({ title: "كود الخصم غير صالح", variant: "destructive" });
    }
  };
  
  const value = {
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
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    addRestaurant,
    updateRestaurant,
    deleteRestaurant,
    addBanner,
    applyCoupon,
    totalCartPrice,
    deliveryFee,
    discount,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
