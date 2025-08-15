
"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import type { User, CartItem, Product, Order, OrderStatus, Category, Restaurant, Banner, DeliveryZone } from '@/lib/types';
import { 
    users as initialUsers, 
    products as initialProducts, 
    categories as initialCategories, 
    restaurants as initialRestaurants,
    deliveryZones
} from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';
import { ShoppingBasket } from 'lucide-react';

// --- Local Storage Hook ---
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    const setValue = (value: T) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    };

    return [storedValue, setValue];
}


// --- App Context ---
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
  signup: (userData: Omit<User, 'id' | 'email' | 'isAdmin'>) => Promise<void>;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  placeOrder: () => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  addProduct: (product: Omit<Product, 'id' | 'bestSeller'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'icon'>) => Promise<void>;
  updateCategory: (category: Omit<Category, 'icon' | 'id'> & {id: string}) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  addRestaurant: (restaurant: Omit<Restaurant, 'id'>) => Promise<void>;
  updateRestaurant: (restaurant: Restaurant) => Promise<void>;
  deleteRestaurant: (restaurantId: string) => Promise<void>;
  addBanner: (banner: Omit<Banner, 'id'>) => Promise<void>;
  applyCoupon: (coupon: string) => void;
  totalCartPrice: number;
  deliveryFee: number;
  discount: number;
}

export const AppContext = createContext<AppContextType | null>(null);


export const AppContextProvider = ({ children }: { children: ReactNode }) => {
    const router = useRouter();
    const { toast } = useToast();
    
    // --- State Management ---
    const [isLoading, setIsLoading] = useState(true);
    const [users, setUsers] = useLocalStorage<User[]>('users', initialUsers);
    const [user, setUser] = useLocalStorage<User | null>('currentUser', null);
    
    const [products, setProducts] = useLocalStorage<Product[]>('products', initialProducts);
    const [categories, setCategories] = useLocalStorage<Category[]>('categories', initialCategories.map(c => ({...c, icon: undefined})));
    const [restaurants, setRestaurants] = useLocalStorage<Restaurant[]>('restaurants', initialRestaurants);
    const [banners, setBanners] = useLocalStorage<Banner[]>('banners', []);
    const [allOrders, setAllOrders] = useLocalStorage<Order[]>('allOrders', []);

    const [cart, setCart] = useLocalStorage<CartItem[]>('cart', []);
    const [discount, setDiscount] = useState(0);

    const orders = user ? allOrders.filter(o => o.userId === user.id) : [];

    // --- Effects ---
    useEffect(() => {
        // Simulate loading
        setTimeout(() => setIsLoading(false), 500);
    }, []);

    const dynamicCategories = React.useMemo(() => {
        const iconMap = initialCategories.reduce((acc, cat) => {
            acc[cat.iconName] = cat.icon;
            return acc;
        }, {} as {[key: string]: React.ComponentType<{ className?: string }>});

        return categories.map(cat => ({
            ...cat,
            icon: iconMap[cat.iconName] || ShoppingBasket
        }));
    }, [categories]);

    // --- Auth ---
    const login = async (phone: string, password?: string): Promise<boolean> => {
        const foundUser = users.find(u => u.phone === phone && u.password === password);
        if (foundUser) {
            setUser(foundUser);
            setCart([]); // Clear cart on login
            setDiscount(0);
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        setCart([]);
        setDiscount(0);
        router.push('/login');
    };

    const signup = async (userData: Omit<User, 'id'|'isAdmin'|'email'>) => {
        if (users.some(u => u.phone === userData.phone)) {
            toast({ title: "رقم الهاتف مستخدم بالفعل", variant: 'destructive' });
            throw new Error("Phone number already exists");
        }
        const newUser: User = {
            ...userData,
            id: `user-${Date.now()}`,
            email: `${userData.phone}@speedshop.app`,
            isAdmin: users.length === 0, // First user is admin
        };
        setUsers([...users, newUser]);
    };

    // --- Cart ---
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
                    <button className="p-2 bg-red-500 text-white rounded" onClick={() => clearCartAndAdd(product, quantity)}>
                        نعم، ابدأ طلب جديد
                    </button>
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
        const newCart = cart.filter(item => item.product.id !== productId);
        if(newCart.length === 0) setDiscount(0);
        setCart(newCart);
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }
        const newCart = cart.map(item =>
            item.product.id === productId ? { ...item, quantity } : item
        );
        setCart(newCart);
    };

    const clearCart = () => {
        setCart([]);
        setDiscount(0);
    };
    
    const totalCartPrice = cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
    const deliveryFee = cart.length > 0 ? (user?.deliveryZone?.fee ?? 3000) : 0;
    
    // --- Orders ---
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
        
        setAllOrders(prevOrders => [...prevOrders, newOrder]);
        clearCart();
    };

    const updateOrderStatus = (orderId: string, status: OrderStatus) => {
        setAllOrders(prevOrders => prevOrders.map(o => o.id === orderId ? {...o, status} : o));
    };
    
    // --- Admin Functions ---
    const addProduct = async (productData: Omit<Product, 'id' | 'bestSeller'>) => {
        const newProduct: Product = {
            ...productData,
            id: `prod-${Date.now()}`,
            bestSeller: Math.random() < 0.2
        };
        setProducts(prev => [...prev, newProduct]);
        toast({ title: "تمت إضافة المنتج بنجاح" });
    }

    const updateProduct = async (updatedProduct: Product) => {
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        toast({ title: "تم تحديث المنتج بنجاح" });
    }

    const deleteProduct = async (productId: string) => {
        setProducts(prev => prev.filter(p => p.id !== productId));
        toast({ title: "تم حذف المنتج بنجاح", variant: "destructive" });
    }

    const addCategory = async (categoryData: Omit<Category, 'id' | 'icon'>) => {
        const newCategory: Category = {
            ...categoryData,
            id: `cat-${Date.now()}`,
        }
        setCategories(prev => [...prev, newCategory]);
        toast({ title: "تمت إضافة القسم بنجاح" });
    }

    const updateCategory = async (updatedCategory: Omit<Category, 'icon' | 'id'> & {id: string}) => {
        setCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
        toast({ title: "تم تحديث القسم بنجاح" });
    }

    const deleteCategory = async (categoryId: string) => {
        setCategories(prev => prev.filter(c => c.id !== categoryId));
        toast({ title: "تم حذف القسم بنجاح", variant: "destructive" });
    }

    const addRestaurant = async (restaurantData: Omit<Restaurant, 'id'>) => {
        const newRestaurant = { ...restaurantData, id: `res-${Date.now()}` };
        setRestaurants(prev => [...prev, newRestaurant]);
        toast({ title: "تمت إضافة المتجر بنجاح" });
    }

    const updateRestaurant = async (updatedRestaurant: Restaurant) => {
        setRestaurants(prev => prev.map(r => r.id === updatedRestaurant.id ? updatedRestaurant : r));
        toast({ title: "تم تحديث المتجر بنجاح" });
    }

    const deleteRestaurant = async (restaurantId: string) => {
        setRestaurants(prev => prev.filter(r => r.id !== restaurantId));
        toast({ title: "تم حذف المتجر بنجاح", variant: "destructive" });
    }
  
    const addBanner = async (bannerData: Omit<Banner, 'id'>) => {
        const newBanner = { ...bannerData, id: `banner-${Date.now()}` };
        setBanners(prev => [...prev, newBanner]);
        toast({ title: "تمت إضافة البنر بنجاح" });
    }

    const applyCoupon = (coupon: string) => {
        if (!user) return;
        const couponCode = coupon.toUpperCase();

        const currentUser = users.find(u => u.id === user.id);
        if (currentUser?.usedCoupons?.includes(couponCode)) {
            toast({ title: "الكود مستخدم بالفعل", variant: "destructive" });
            return;
        }

        if (couponCode === 'SALE10') {
            const discountAmount = totalCartPrice * 0.10;
            setDiscount(discountAmount);
            
            const updatedUsers = users.map(u => 
                u.id === user.id 
                ? { ...u, usedCoupons: [...(u.usedCoupons || []), couponCode] }
                : u
            );
            setUsers(updatedUsers);
            setUser(updatedUsers.find(u => u.id === user.id) || null);

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
        categories: dynamicCategories,
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
