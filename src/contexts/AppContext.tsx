
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { User, Product, Order, OrderStatus, Category, Restaurant, Banner, CartItem, Address, DeliveryZone } from '@/lib/types';
import { categories as initialCategoriesData } from '@/lib/mock-data';
import { ShoppingBasket } from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { 
    doc, 
    addDoc,
    updateDoc,
    deleteDoc,
    collection,
    onSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { formatCurrency } from '@/lib/utils';

// --- App Context ---
interface AppContextType {
  products: Product[];
  allOrders: Order[];
  categories: Category[];
  restaurants: Restaurant[];
  banners: Banner[];
  allUsers: User[];
  isLoading: boolean;
  cart: CartItem[];
  cartTotal: number;
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  placeOrder: (address: Address) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  addresses: Address[];
  addAddress: (address: Omit<Address, 'id'>) => void;
  deleteAddress: (addressId: string) => void;
  deliveryZones: DeliveryZone[];
  localOrderIds: string[];
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'bestSeller'> & {image: string}) => Promise<void>;
  updateProduct: (product: Partial<Product> & {id: string; image?:string;}) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'icon'>) => Promise<void>;
  updateCategory: (category: Omit<Category, 'icon' | 'id'> & {id: string}) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  addRestaurant: (restaurant: Omit<Restaurant, 'id'> & {image: string}) => Promise<void>;
  updateRestaurant: (restaurant: Partial<Restaurant> & {id: string; image?:string;}) => Promise<void>;
  deleteRestaurant: (restaurantId: string) => Promise<void>;
  addBanner: (banner: Omit<Banner, 'id'> & {image: string}) => Promise<void>;
  addDeliveryZone: (zone: Omit<DeliveryZone, 'id'>) => Promise<void>;
  updateDeliveryZone: (zone: DeliveryZone) => Promise<void>;
  deleteDeliveryZone: (zoneId: string) => Promise<void>;
}

export const AppContext = createContext<AppContextType | null>(null);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
    const { toast } = useToast();
    
    const [isLoading, setIsLoading] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [localOrderIds, setLocalOrderIds] = useState<string[]>([]);
    
    // --- Data Listeners ---
    useEffect(() => {
        setIsLoading(true);
        const unsubs = [
            onSnapshot(collection(db, "products"), snap => setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)))),
            onSnapshot(collection(db, "categories"), snap => {
                const cats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
                setCategories(cats);
            }),
            onSnapshot(collection(db, "restaurants"), snap => setRestaurants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant)))),
            onSnapshot(collection(db, "banners"), snap => setBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)))),
            onSnapshot(collection(db, "orders"), snap => setAllOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))),
            onSnapshot(collection(db, "users"), snap => setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)))),
            onSnapshot(collection(db, "deliveryZones"), snap => setDeliveryZones(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryZone)))),
        ];
        
        // Load cart, addresses, and order IDs from localStorage
        const savedCart = localStorage.getItem('speedShopCart');
        const savedAddresses = localStorage.getItem('speedShopAddresses');
        const savedOrderIds = localStorage.getItem('speedShopOrderIds');
        if (savedCart) setCart(JSON.parse(savedCart));
        if (savedAddresses) setAddresses(JSON.parse(savedAddresses));
        if (savedOrderIds) setLocalOrderIds(JSON.parse(savedOrderIds));

        setIsLoading(false);

        return () => {
            unsubs.forEach(unsub => unsub());
        };
    }, []);

    // --- Cart Management ---
    useEffect(() => {
        localStorage.setItem('speedShopCart', JSON.stringify(cart));
    }, [cart]);

    const cartTotal = useMemo(() => {
        return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
    }, [cart]);
    
    const addToCart = (product: Product, quantity: number) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.product.id === product.id);
            if (existingItem) {
                return prevCart.map(item =>
                    item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            return [...prevCart, { product, quantity }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
    };

    const updateCartQuantity = (productId: string, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(productId);
            return;
        }
        setCart(prevCart => prevCart.map(item => item.product.id === productId ? { ...item, quantity } : item));
    };
    
    const clearCart = () => setCart([]);

    // --- Address Management ---
     useEffect(() => {
        localStorage.setItem('speedShopAddresses', JSON.stringify(addresses));
    }, [addresses]);
    
    const addAddress = (address: Omit<Address, 'id'>) => {
        const newAddress = { ...address, id: `addr_${Date.now()}`};
        setAddresses(prev => [...prev, newAddress]);
    };

    const deleteAddress = (addressId: string) => {
        setAddresses(prev => prev.filter(addr => addr.id !== addressId));
    };

    // --- Order Management ---
     useEffect(() => {
        localStorage.setItem('speedShopOrderIds', JSON.stringify(localOrderIds));
    }, [localOrderIds]);

    const placeOrder = async (address: Address) => {
        if (cart.length === 0) return;
        
        const deliveryZoneDetails = deliveryZones.find(z => z.name === address.deliveryZone);
        const deliveryFee = deliveryZoneDetails ? deliveryZoneDetails.fee : 0;
        const total = cartTotal + deliveryFee;

        const newOrderData: Omit<Order, 'id' | 'userId'> = {
            items: cart,
            total,
            date: new Date().toISOString(),
            status: 'confirmed',
            estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
            address,
            revenue: cartTotal,
        };
        
        const docRef = await addDoc(collection(db, "orders"), newOrderData);
        setLocalOrderIds(prev => [...prev, docRef.id]);
        
        try {
            const botToken = "7601214758:AAFtkJRGqffuDLKPb8wuHm7r0pt_pDE7BSE";
            const chatId = "6626221973";

            if (botToken && chatId) {
                const itemsText = newOrderData.items.map(item => `${item.quantity}x ${item.product.name}`).join('\n');
                const locationLink = newOrderData.address.latitude ? `https://www.google.com/maps?q=${newOrderData.address.latitude},${newOrderData.address.longitude}` : 'غير محدد';
                const message = `
*طلب جديد* 🔥
*رقم الطلب:* \`${docRef.id.substring(0, 6)}\`
*الزبون:* ${newOrderData.address.name}
*الهاتف:* ${newOrderData.address.phone}
*العنوان:* ${newOrderData.address.deliveryZone}
*تفاصيل:* ${newOrderData.address.details || 'لا يوجد'}
*الموقع:* ${locationLink}
---
*المنتجات:*
${itemsText}
---
*المجموع:* ${formatCurrency(newOrderData.total)}
                `;

                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: message,
                        parse_mode: 'Markdown',
                    }),
                });
            }
        } catch (error) {
            console.error("Failed to send Telegram notification:", error);
        }

        clearCart();
    }


    const dynamicCategories = useMemo(() => {
        const iconMap = initialCategoriesData.reduce((acc, cat) => {
            acc[cat.iconName] = cat.icon;
            return acc;
        }, {} as {[key: string]: React.ComponentType<{ className?: string }>});

        return categories.map(cat => ({
            ...cat,
            icon: iconMap[cat.iconName] || ShoppingBasket
        }));
    }, [categories]);
    
    const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
        const orderDocRef = doc(db, "orders", orderId);
        await updateDoc(orderDocRef, { status });
    };

    const deleteOrder = async (orderId: string) => {
        const orderRef = doc(db, "orders", orderId);
        await deleteDoc(orderRef);
        toast({ title: "تم حذف الطلب بنجاح", variant: "destructive" });
    }

    // --- ADMIN ACTIONS ---
    const uploadImage = useCallback(async (dataUrl: string, path: string): Promise<string> => {
        if (!dataUrl || !dataUrl.startsWith('data:')) {
            return dataUrl; // It's already a URL.
        }
        
        try {
            // Convert base64 to blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();

            const storageRef = ref(storage, path);
            const snapshot = await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error) {
            console.error("Image upload failed:", error);
            toast({
                title: "فشل رفع الصورة",
                description: "حدث خطأ أثناء محاولة رفع الصورة. الرجاء المحاولة مرة أخرى.",
                variant: "destructive"
            });
            throw error; // Propagate the error to stop the save process
        }
    }, [toast]);
    
    const addProduct = async (productData: Omit<Product, 'id' | 'bestSeller'> & { image: string }) => {
        const imageUrl = await uploadImage(productData.image, `products/${Date.now()}`);
        const newProductData: Omit<Product, 'id'> = { ...productData, image: imageUrl, bestSeller: Math.random() < 0.2 };
        await addDoc(collection(db, "products"), newProductData);
        toast({ title: "تمت إضافة المنتج بنجاح" });
    }

    const updateProduct = async (updatedProduct: Partial<Product> & {id: string; image?:string;}) => {
        const { id, ...productData } = updatedProduct;
        let finalData = { ...productData };

        if (productData.image && productData.image.startsWith('data:')) {
          const newImageUrl = await uploadImage(productData.image, `products/${id}_${Date.now()}`);
          finalData = { ...finalData, image: newImageUrl };
        }
       
        const productDocRef = doc(db, "products", id);
        await updateDoc(productDocRef, finalData);
        toast({ title: "تم تحديث المنتج بنجاح" });
    }

    const deleteProduct = async (productId: string) => {
        await deleteDoc(doc(db, "products", productId));
        toast({ title: "تم حذف المنتج بنجاح", variant: "destructive" });
    }

    const addCategory = async (categoryData: Omit<Category, 'id' | 'icon'>) => {
        await addDoc(collection(db, "categories"), categoryData);
        toast({ title: "تمت إضافة القسم بنجاح" });
    }

    const updateCategory = async (updatedCategory: Omit<Category, 'icon' | 'id'> & {id: string}) => {
        const { id, ...categoryData } = updatedCategory;
        const categoryDocRef = doc(db, "categories", id);
        await updateDoc(categoryDocRef, categoryData);
        toast({ title: "تم تحديث القسم بنجاح" });
    }

    const deleteCategory = async (categoryId: string) => {
        await deleteDoc(doc(db, "categories", categoryId));
        toast({ title: "تم حذف القسم بنجاح", variant: "destructive" });
    }

    const addRestaurant = async (restaurantData: Omit<Restaurant, 'id'> & {image: string}) => {
        const imageUrl = await uploadImage(restaurantData.image, `restaurants/${Date.now()}`);
        await addDoc(collection(db, "restaurants"), { ...restaurantData, image: imageUrl });
        toast({ title: "تمت إضافة المتجر بنجاح" });
    }

    const updateRestaurant = async (updatedRestaurant: Partial<Restaurant> & {id: string; image?:string;}) => {
        const { id, ...restaurantData } = updatedRestaurant;
        let finalData = {...restaurantData};
        
        if (restaurantData.image && restaurantData.image.startsWith('data:')) {
            const newImageUrl = await uploadImage(restaurantData.image, `restaurants/${id}_${Date.now()}`);
            finalData = { ...finalData, image: newImageUrl };
        }

        const restaurantDocRef = doc(db, "restaurants", id);
        await updateDoc(restaurantDocRef, finalData);
        toast({ title: "تم تحديث المتجر بنجاح" });
    }

    const deleteRestaurant = async (restaurantId: string) => {
        await deleteDoc(doc(db, "restaurants", restaurantId));
        toast({ title: "تم حذف المتجر بنجاح", variant: "destructive" });
    }
  
    const addBanner = async (bannerData: Omit<Banner, 'id'> & {image: string}) => {
        const imageUrl = await uploadImage(bannerData.image, `banners/${Date.now()}`);
        await addDoc(collection(db, "banners"), { ...bannerData, image: imageUrl });
        toast({ title: "تمت إضافة البنر بنجاح" });
    }

    const addDeliveryZone = async (zone: Omit<DeliveryZone, 'id'>) => {
        await addDoc(collection(db, "deliveryZones"), zone);
        toast({ title: "تمت إضافة المنطقة بنجاح" });
    };

    const updateDeliveryZone = async (zone: DeliveryZone) => {
        const zoneRef = doc(db, "deliveryZones", zone.id);
        await updateDoc(zoneRef, { name: zone.name, fee: zone.fee });
        toast({ title: "تم تحديث المنطقة بنجاح" });
    };

    const deleteDeliveryZone = async (zoneId: string) => {
        const zoneRef = doc(db, "deliveryZones", zoneId);
        await deleteDoc(zoneRef);
        toast({ title: "تم حذف المنطقة بنجاح" });
    };

    const value: AppContextType = {
        products,
        allOrders,
        categories: dynamicCategories,
        restaurants,
        banners,
        allUsers,
        isLoading,
        updateOrderStatus,
        deleteOrder,
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
        addDeliveryZone,
        updateDeliveryZone,
        deleteDeliveryZone,
        cart,
        cartTotal,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        placeOrder,
        addresses,
        addAddress,
        deleteAddress,
        deliveryZones: deliveryZones,
        localOrderIds,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

    