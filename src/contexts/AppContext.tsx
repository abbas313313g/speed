

"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { User, Product, Order, OrderStatus, Category, Restaurant, Banner, CartItem, Address, DeliveryZone, SupportTicket, DeliveryWorker, Coupon } from '@/lib/types';
import { categories as initialCategoriesData } from '@/lib/mock-data';
import { ShoppingBasket } from 'lucide-react';
import { db } from '@/lib/firebase';
import { 
    doc, 
    addDoc,
    updateDoc,
    deleteDoc,
    collection,
    onSnapshot,
    runTransaction,
    query,
    where,
    getDocs,
} from 'firebase/firestore';
import { formatCurrency } from '@/lib/utils';

// --- App Context ---
interface AppContextType {
  products: Product[];
  allOrders: Order[];
  categories: Category[];
  restaurants: Restaurant[];
  banners: Banner[];
  allUsers: User[];
  bestSellers: Product[];
  isLoading: boolean;
  cart: CartItem[];
  cartTotal: number;
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  placeOrder: (address: Address, couponCode?: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  addresses: Address[];
  addAddress: (address: Omit<Address, 'id'>) => void;
  deleteAddress: (addressId: string) => void;
  deliveryZones: DeliveryZone[];
  localOrderIds: string[];
  updateOrderStatus: (orderId: string, status: OrderStatus, workerId?: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Partial<Product> & {id: string}) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'icon'>) => Promise<void>;
  updateCategory: (category: Omit<Category, 'icon' | 'id'> & {id: string}) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  addRestaurant: (restaurant: Omit<Restaurant, 'id'>) => Promise<void>;
  updateRestaurant: (restaurant: Partial<Restaurant> & {id: string}) => Promise<void>;
  deleteRestaurant: (restaurantId: string) => Promise<void>;
  addBanner: (banner: Omit<Banner, 'id'>) => Promise<void>;
  updateBanner: (banner: Banner) => Promise<void>;
  deleteBanner: (bannerId: string) => Promise<void>;
  addDeliveryZone: (zone: Omit<DeliveryZone, 'id'>) => Promise<void>;
  updateDeliveryZone: (zone: DeliveryZone) => Promise<void>;
  deleteDeliveryZone: (zoneId: string) => Promise<void>;
  supportTickets: SupportTicket[];
  addSupportTicket: (question: string) => Promise<void>;
  resolveSupportTicket: (ticketId: string) => Promise<void>;
  deliveryWorkers: DeliveryWorker[];
  addDeliveryWorker: (worker: DeliveryWorker) => Promise<void>;
  coupons: Coupon[];
  addCoupon: (coupon: Omit<Coupon, 'id'|'usedCount'|'usedBy'>) => Promise<void>;
  deleteCoupon: (couponId: string) => Promise<void>;
  validateAndApplyCoupon: (couponCode: string) => Promise<{success: boolean; discount: number; message: string}>;
}

export const AppContext = createContext<AppContextType | null>(null);

const ASSIGNMENT_TIMEOUT = 60000; // 60 seconds

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
    const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
    const [deliveryWorkers, setDeliveryWorkers] = useState<DeliveryWorker[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);

    
    // --- Data Listeners ---
    useEffect(() => {
        setIsLoading(true);
        const unsubs = [
            onSnapshot(collection(db, "products"), snap => setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)))),
            onSnapshot(collection(db, "categories"), snap => setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)))),
            onSnapshot(collection(db, "restaurants"), snap => setRestaurants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant)))),
            onSnapshot(collection(db, "banners"), snap => setBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)))),
            onSnapshot(collection(db, "orders"), snap => {
                const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))
                                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setAllOrders(orders);
            }),
            onSnapshot(collection(db, "users"), snap => setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)))),
            onSnapshot(collection(db, "deliveryZones"), snap => setDeliveryZones(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryZone)))),
            onSnapshot(collection(db, "supportTickets"), snap => setSupportTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket)))),
            onSnapshot(collection(db, "deliveryWorkers"), snap => setDeliveryWorkers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryWorker)))),
            onSnapshot(collection(db, "coupons"), snap => setCoupons(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon)))),
        ];
        
        // Load from localStorage
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

    // --- Derived State ---
    const bestSellers = useMemo(() => {
        const salesCount: { [productId: string]: number } = {};

        allOrders.forEach(order => {
            order.items.forEach(item => {
                salesCount[item.product.id] = (salesCount[item.product.id] || 0) + item.quantity;
            });
        });

        // Find product objects for the sold product IDs
        const soldProducts = products.filter(p => salesCount[p.id] > 0);

        // Sort products by sales count in descending order
        return soldProducts.sort((a, b) => salesCount[b.id] - salesCount[a.id]);
    }, [allOrders, products]);


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

     // --- Coupon Management ---
    const validateAndApplyCoupon = async (couponCode: string): Promise<{success: boolean; discount: number; message: string}> => {
        const couponQuery = query(collection(db, "coupons"), where("code", "==", couponCode.trim()));
        const querySnapshot = await getDocs(couponQuery);

        if (querySnapshot.empty) {
            return { success: false, discount: 0, message: "كود الخصم غير صحيح." };
        }

        const couponDoc = querySnapshot.docs[0];
        const coupon = { id: couponDoc.id, ...couponDoc.data() } as Coupon;

        if (coupon.usedCount >= coupon.maxUses) {
            return { success: false, discount: 0, message: "تم استخدام هذا الكود بالكامل." };
        }
        
        // This is a simplified check. A real app would use the logged-in user's ID.
        const userId = "localUser"; // Placeholder for actual user ID
        if (coupon.usedBy?.includes(userId)) {
             return { success: false, discount: 0, message: "لقد استخدمت هذا الكود من قبل." };
        }

        return { success: true, discount: coupon.discountValue, message: `تم تطبيق خصم بقيمة ${formatCurrency(coupon.discountValue)}!` };
    };


    // --- Order Management ---
     useEffect(() => {
        localStorage.setItem('speedShopOrderIds', JSON.stringify(localOrderIds));
    }, [localOrderIds]);

    const placeOrder = async (address: Address, couponCode?: string) => {
        if (cart.length === 0) return;
        
        let finalTotal = cartTotal;
        let discountAmount = 0;
        let appliedCouponInfo;

        if (couponCode) {
            const couponResult = await validateAndApplyCoupon(couponCode);
            if (couponResult.success) {
                discountAmount = couponResult.discount;
                finalTotal -= discountAmount;
                appliedCouponInfo = { code: couponCode, discountAmount };
            } else {
                toast({ title: "فشل تطبيق الكود", description: couponResult.message, variant: "destructive"});
                return;
            }
        }

        const deliveryZoneDetails = deliveryZones.find(z => z.name === address.deliveryZone);
        const deliveryFee = deliveryZoneDetails ? deliveryZoneDetails.fee : 0;
        finalTotal += deliveryFee;


        const profit = cart.reduce((acc, item) => {
            const itemProfit = (item.product.price - (item.product.wholesalePrice || item.product.price)) * item.quantity;
            return acc + itemProfit;
        }, 0);


        const newOrderData: Omit<Order, 'id' | 'userId'> = {
            items: cart,
            total: finalTotal,
            date: new Date().toISOString(),
            status: 'unassigned',
            estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
            address,
            profit,
            deliveryFee,
            ...(appliedCouponInfo && { appliedCoupon: appliedCouponInfo })
        };
        
        const docRef = await addDoc(collection(db, "orders"), newOrderData);
        setLocalOrderIds(prev => [...prev, docRef.id]);

        if (couponCode) {
             const couponQuery = query(collection(db, "coupons"), where("code", "==", couponCode));
             const snapshot = await getDocs(couponQuery);
             if (!snapshot.empty) {
                 const couponDoc = snapshot.docs[0];
                 await updateDoc(couponDoc.ref, {
                     usedCount: couponDoc.data().usedCount + 1,
                     usedBy: [...(couponDoc.data().usedBy || []), "localUser"]
                 });
             }
        }
        
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
    
    // --- Intelligent Order Assignment ---
    const assignOrderToNextWorker = async (orderId: string, excludedWorkerIds: string[] = []) => {
        const completedOrdersByWorker: {[workerId: string]: number} = {};
        allOrders.forEach(o => {
            if (o.status === 'delivered' && o.deliveryWorkerId) {
                completedOrdersByWorker[o.deliveryWorkerId] = (completedOrdersByWorker[o.deliveryWorkerId] || 0) + 1;
            }
        });

        const availableWorkers = deliveryWorkers.filter(w => !excludedWorkerIds.includes(w.id));

        if (availableWorkers.length === 0) {
            console.log("No available workers to assign the order to.");
            await updateDoc(doc(db, "orders", orderId), { status: 'unassigned', assignedToWorkerId: null });
            return;
        }

        availableWorkers.sort((a,b) => (completedOrdersByWorker[a.id] || 0) - (completedOrdersByWorker[b.id] || 0));
        
        const nextWorker = availableWorkers[0];

        await updateDoc(doc(db, "orders", orderId), {
            status: 'pending_assignment',
            assignedToWorkerId: nextWorker.id,
            assignmentTimestamp: new Date().toISOString()
        });
        console.log(`Order ${orderId} assigned to ${nextWorker.name}`);
    };

    useEffect(() => {
        const unassignedOrders = allOrders.filter(o => o.status === 'unassigned');
        unassignedOrders.forEach(order => {
            assignOrderToNextWorker(order.id);
        });

        const interval = setInterval(() => {
            const pendingOrders = allOrders.filter(o => o.status === 'pending_assignment');
            pendingOrders.forEach(order => {
                const timestamp = new Date(order.assignmentTimestamp!).getTime();
                if (Date.now() - timestamp > ASSIGNMENT_TIMEOUT) {
                    console.log(`Order ${order.id} timed out for worker ${order.assignedToWorkerId}. Reassigning...`);
                    const previouslyAssigned = allOrders
                        .filter(o => o.id === order.id && o.assignedToWorkerId)
                        .map(o => o.assignedToWorkerId!);
                     assignOrderToNextWorker(order.id, previouslyAssigned);
                }
            });
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, [allOrders, deliveryWorkers]);

    const updateOrderStatus = async (orderId: string, status: OrderStatus, workerId?: string) => {
        const orderDocRef = doc(db, "orders", orderId);
        const updateData: any = { status };
        if (status === 'confirmed' && workerId) {
            const worker = deliveryWorkers.find(w => w.id === workerId);
            if (worker) {
                updateData.deliveryWorkerId = workerId;
                updateData.deliveryWorker = worker;
                updateData.assignedToWorkerId = null; // Clear assignment
            }
        }
        await updateDoc(orderDocRef, updateData);
    };

    const deleteOrder = async (orderId: string) => {
        const orderRef = doc(db, "orders", orderId);
        await deleteDoc(orderRef);
        toast({ title: "تم حذف الطلب بنجاح", variant: "destructive" });
    }

    // --- Support Ticket Management ---
    const addSupportTicket = async (question: string) => {
        const ticket: Omit<SupportTicket, 'id'> = {
            question,
            createdAt: new Date().toISOString(),
            isResolved: false,
        };
        await addDoc(collection(db, "supportTickets"), ticket);
    };

    const resolveSupportTicket = async (ticketId: string) => {
        await updateDoc(doc(db, "supportTickets", ticketId), { isResolved: true });
        toast({ title: "تم حل المشكلة" });
    }

    // --- Delivery Worker Management ---
    const addDeliveryWorker = async (worker: DeliveryWorker) => {
        await addDoc(collection(db, "deliveryWorkers"), worker);
        toast({ title: "تم إضافة عامل التوصيل" });
    }

    // --- ADMIN ACTIONS ---
    const addProduct = async (productData: Omit<Product, 'id'>) => {
        await addDoc(collection(db, "products"), productData);
        toast({ title: "تمت إضافة المنتج بنجاح" });
    }

    const updateProduct = async (updatedProduct: Partial<Product> & {id: string}) => {
        const { id, ...productData } = updatedProduct;
        const productDocRef = doc(db, "products", id);
        await updateDoc(productDocRef, productData);
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

    const addRestaurant = async (restaurantData: Omit<Restaurant, 'id'>) => {
        await addDoc(collection(db, "restaurants"), restaurantData);
        toast({ title: "تمت إضافة المتجر بنجاح" });
    }

    const updateRestaurant = async (updatedRestaurant: Partial<Restaurant> & {id: string}) => {
        const { id, ...restaurantData } = updatedRestaurant;
        const restaurantDocRef = doc(db, "restaurants", id);
        await updateDoc(restaurantDocRef, restaurantData);
        toast({ title: "تم تحديث المتجر بنجاح" });
    }

    const deleteRestaurant = async (restaurantId: string) => {
        await deleteDoc(doc(db, "restaurants", restaurantId));
        toast({ title: "تم حذف المتجر بنجاح", variant: "destructive" });
    }
  
    const addBanner = async (bannerData: Omit<Banner, 'id'>) => {
        await addDoc(collection(db, "banners"), bannerData);
        toast({ title: "تمت إضافة البنر بنجاح" });
    }

    const updateBanner = async (updatedBanner: Banner) => {
        const { id, ...bannerData } = updatedBanner;
        const bannerRef = doc(db, "banners", id);
        await updateDoc(bannerRef, bannerData);
        toast({ title: "تم تحديث البنر بنجاح" });
    };

    const deleteBanner = async (bannerId: string) => {
        const bannerRef = doc(db, "banners", bannerId);
        await deleteDoc(bannerRef);
        toast({ title: "تم حذف البنر بنجاح" });
    };

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

    const addCoupon = async (couponData: Omit<Coupon, 'id' | 'usedCount'|'usedBy'>) => {
        await addDoc(collection(db, "coupons"), { ...couponData, usedCount: 0, usedBy: [] });
        toast({ title: "تمت إضافة الكود بنجاح" });
    };

    const deleteCoupon = async (couponId: string) => {
        await deleteDoc(doc(db, "coupons", couponId));
        toast({ title: "تم حذف الكود بنجاح" });
    };

    const value: AppContextType = {
        products,
        allOrders,
        categories: dynamicCategories,
        restaurants,
        banners,
        allUsers,
        bestSellers,
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
        updateBanner,
        deleteBanner,
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
        supportTickets,
        addSupportTicket,
        resolveSupportTicket,
        deliveryWorkers,
        addDeliveryWorker,
        coupons,
        addCoupon,
        deleteCoupon,
        validateAndApplyCoupon,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
