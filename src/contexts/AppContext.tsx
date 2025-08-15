
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import type { User, CartItem, Product, Order, OrderStatus, Category, Restaurant, Banner } from '@/lib/types';
import { 
    users as initialUsers, 
    products as initialProductsData, 
    categories as initialCategoriesData, 
    restaurants as initialRestaurantsData,
    deliveryZones
} from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';
import { ShoppingBasket } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';


// Custom hook for managing state with localStorage
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
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

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.error(error);
        }
    };

    return [storedValue, setValue];
}


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
  login: (phone: string, password?: string) => Promise<boolean>;
  logout: () => void;
  signup: (userData: Omit<User, 'id'>) => Promise<void>;
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
  updateCategory: (category: Omit<Category, 'icon' | 'id'> & {id: string}) => void;
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


export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { toast } = useToast();
  
  const [user, setUser] = useLocalStorage<User | null>('speed-shop-user', null);
  const [users, setUsers] = useLocalStorage<User[]>('speed-shop-users', initialUsers);
  const [products, setProducts] = useLocalStorage<Product[]>('speed-shop-products', initialProductsData);
  const [rawCategories, setRawCategories] = useLocalStorage<Omit<Category, 'icon'>[]>('speed-shop-categories', initialCategoriesData.map(({icon, ...rest}) => rest));
  const [restaurants, setRestaurants] = useLocalStorage<Restaurant[]>('speed-shop-restaurants', initialRestaurantsData);
  const [banners, setBanners] = useLocalStorage<Banner[]>('speed-shop-banners', []);
  const [orders, setOrders] = useLocalStorage<Order[]>('speed-shop-orders', []);
  const [allOrders, setAllOrders] = useLocalStorage<Order[]>('speed-shop-all-orders', []);
  
  const [cart, setCart] = useLocalStorage<CartItem[]>(`speed-shop-cart-${user?.id || ''}`, []);
  const [discount, setDiscount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading for 500ms to allow local storage to hydrate
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const categories = React.useMemo(() => {
    const iconMap = initialCategoriesData.reduce((acc, cat) => {
        acc[cat.iconName] = cat.icon;
        return acc;
    }, {} as {[key: string]: React.ComponentType<{ className?: string }>});

    return rawCategories.map(cat => ({
        ...cat,
        icon: iconMap[cat.iconName] || ShoppingBasket
    }));
  }, [rawCategories]);


  const login = async (phone: string, password?: string): Promise<boolean> => {
    const foundUser = users.find(u => u.phone === phone && u.password === password);
    if (foundUser) {
        setUser(foundUser);
        return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setCart([]);
    router.push('/login');
  };

  const signup = async (userData: Omit<User, 'id'>) => {
    const existingUser = users.find(u => u.phone === userData.phone);
    if (existingUser) {
        toast({ title: "هذا المستخدم موجود بالفعل", variant: 'destructive' });
        throw new Error("User already exists");
    }
    const newUser: User = {
        id: `user-${Date.now()}`,
        ...userData
    };
    setUsers(prev => [...prev, newUser]);
    toast({ title: "تم إنشاء الحساب بنجاح!" });
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
  
  const placeOrder = () => {
    if (!user || cart.length === 0) return;

    const newOrder: Order = {
      id: `order-${Date.now()}`,
      userId: user.id,
      items: cart,
      total: totalCartPrice - discount + deliveryFee,
      date: new Date().toISOString(),
      status: 'confirmed',
      estimatedDelivery: '30-40 دقيقة',
      user: { id: user.id, name: user.name, phone: user.phone },
      revenue: totalCartPrice - discount,
    };
    
    // For current user
    setOrders(prev => [...prev, newOrder]);
    // For admin view
    setAllOrders(prev => [...prev, newOrder]);
    
    clearCart();
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    const update = (prev: Order[]) => prev.map(o => o.id === orderId ? {...o, status} : o);
    setOrders(update);
    setAllOrders(update);
  };
  
  const addProduct = (productData: Omit<Product, 'id' | 'bestSeller'>) => {
    const newProduct: Product = {
        ...productData,
        id: `prod-${Date.now()}`,
        bestSeller: Math.random() < 0.2
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
     const newCategory: Omit<Category, 'icon'> = {
        ...categoryData,
        id: `cat-${Date.now()}`,
    };
    setRawCategories(prev => [...prev, newCategory]);
    toast({ title: "تمت إضافة القسم بنجاح" });
  }

  const updateCategory = (updatedCategory: Omit<Category, 'icon' | 'id'> & {id: string}) => {
    setRawCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
    toast({ title: "تم تحديث القسم بنجاح" });
  }

  const deleteCategory = (categoryId: string) => {
    setRawCategories(prev => prev.filter(c => c.id !== categoryId));
    toast({ title: "تم حذف القسم بنجاح", variant: "destructive" });
  }
  
  const addRestaurant = (restaurantData: Omit<Restaurant, 'id'>) => {
    const newRestaurant: Restaurant = {
        ...restaurantData,
        id: `res-${Date.now()}`,
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
        ...bannerData,
        id: `banner-${Date.now()}`,
        link: bannerData.link || '#'
    };
    setBanners(prev => [...prev, newBanner]);
    toast({ title: "تمت إضافة البنر بنجاح" });
  }

  const applyCoupon = (coupon: string) => {
    if (!user) return;
    const couponCode = coupon.toUpperCase();
    if (user.usedCoupons?.includes(couponCode)) {
        toast({ title: "الكود مستخدم بالفعل", variant: "destructive" });
        return;
    }
    if (couponCode === 'SALE10') {
        const discountAmount = totalCartPrice * 0.10;
        setDiscount(discountAmount);
        
        const updatedUser = { ...user, usedCoupons: [...(user.usedCoupons || []), couponCode] };
        setUser(updatedUser);
        setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));

        toast({ title: "تم تطبيق الخصم!", description: `لقد حصلت على خصم بقيمة ${formatCurrency(discountAmount)}.` });
    } else {
        setDiscount(0);
        toast({ title: "كود الخصم غير صالح", variant: "destructive" });
    }
  };
  
  const value: AppContextType = {
    user,
    allUsers: users,
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
