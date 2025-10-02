

"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { User, Product, Order, OrderStatus, Category, Restaurant, Banner, CartItem, Address, DeliveryZone, SupportTicket, DeliveryWorker, Coupon, ProductSize, TelegramConfig, Message } from '@/lib/types';
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
    runTransaction,
    query,
    where,
    getDocs,
    setDoc,
    arrayUnion,
    getDoc
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { formatCurrency, calculateDistance, calculateDeliveryFee } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';


// --- Telegram Bot Helper ---
const sendTelegramMessage = async (chatId: string, message: string) => {
    try {
        const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
        if (!botToken || !chatId) return;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
        });
    } catch (error) {
        console.error(`Failed to send Telegram message to ${chatId}:`, error);
    }
};

// --- Storage Helper ---
const uploadImage = async (base64: string, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    const snapshot = await uploadString(storageRef, base64, 'data_url');
    return getDownloadURL(snapshot.ref);
};


// --- App Context ---
interface AppContextType {
  products: Product[];
  categories: Category[];
  restaurants: Restaurant[];
  banners: Banner[];
  allUsers: User[];
  allOrders: Order[]; // Populated by listener
  bestSellers: Product[];
  isLoading: boolean;
  cart: CartItem[];
  cartTotal: number;
  addToCart: (product: Product, quantity: number, selectedSize?: ProductSize) => boolean;
  removeFromCart: (productId: string, sizeName?: string) => void;
  updateCartQuantity: (productId: string, quantity: number, sizeName?: string) => void;
  clearCart: () => void;
  placeOrder: (address: Address, couponCode?: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  addresses: Address[];
  addAddress: (address: Omit<Address, 'id'>) => void;
  deleteAddress: (addressId: string) => void;
  deliveryZones: DeliveryZone[];
  localOrderIds: string[];
  updateOrderStatus: (orderId: string, status: OrderStatus, workerId?: string) => Promise<void>;
  updateWorkerStatus: (workerId: string, isOnline: boolean) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'> & { image: string }) => Promise<void>;
  updateProduct: (product: Partial<Product> & {id: string}) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'icon'>) => Promise<void>;
  updateCategory: (category: Omit<Category, 'icon' | 'id'> & {id: string}) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  addRestaurant: (restaurant: Omit<Restaurant, 'id'> & {image: string}) => Promise<void>;
  updateRestaurant: (restaurant: Partial<Restaurant> & {id: string}) => Promise<void>;
  deleteRestaurant: (restaurantId: string) => Promise<void>;
  addBanner: (banner: Omit<Banner, 'id'> & {image: string}) => Promise<void>;
  updateBanner: (banner: Banner) => Promise<void>;
  deleteBanner: (bannerId: string) => Promise<void>;
  addDeliveryZone: (zone: Omit<DeliveryZone, 'id'>) => Promise<void>;
  updateDeliveryZone: (zone: DeliveryZone) => Promise<void>;
  deleteDeliveryZone: (zoneId: string) => Promise<void>;
  supportTickets: SupportTicket[];
  mySupportTicket: SupportTicket | null;
  createSupportTicket: (firstMessage: Message) => Promise<void>;
  addMessageToTicket: (ticketId: string, message: Message) => Promise<void>;
  resolveSupportTicket: (ticketId: string) => Promise<void>;
  startNewTicketClient: () => void;
  deliveryWorkers: DeliveryWorker[];
  addDeliveryWorker: (worker: Pick<DeliveryWorker, 'id' | 'name'>) => Promise<void>;
  coupons: Coupon[];
  addCoupon: (coupon: Omit<Coupon, 'id'|'usedCount'|'usedBy'>) => Promise<void>;
  deleteCoupon: (couponId: string) => Promise<void>;
  validateAndApplyCoupon: (couponCode: string) => Promise<{success: boolean; discount: number; message: string}>;
  telegramConfigs: TelegramConfig[];
  addTelegramConfig: (config: Omit<TelegramConfig, 'id'>) => Promise<void>;
  deleteTelegramConfig: (configId: string) => Promise<void>;
  userId: string;
}

export const AppContext = createContext<AppContextType | null>(null);

const ASSIGNMENT_TIMEOUT = 120000; // 2 minutes

// Helper to get or create a unique user ID
const getUserId = () => {
    let id = localStorage.getItem('speedShopUserId');
    if (!id) {
        id = uuidv4();
        localStorage.setItem('speedShopUserId', id);
    }
    return id;
};


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
    const [mySupportTicket, setMySupportTicket] = useState<SupportTicket | null>(null);
    const [deliveryWorkers, setDeliveryWorkers] = useState<DeliveryWorker[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [telegramConfigs, setTelegramConfigs] = useState<TelegramConfig[]>([]);
    const [userId, setUserId] = useState('');

    useEffect(() => {
        setUserId(getUserId());
    }, []);
    
    // --- Data Listeners ---
    useEffect(() => {
        setIsLoading(true);
        const fetchData = async () => {
            try {
                const [
                    productsSnap,
                    categoriesSnap,
                    restaurantsSnap,
                    bannersSnap,
                    usersSnap,
                    deliveryZonesSnap,
                    couponsSnap,
                    telegramConfigsSnap,
                ] = await Promise.all([
                    getDocs(collection(db, "products")),
                    getDocs(collection(db, "categories")),
                    getDocs(collection(db, "restaurants")),
                    getDocs(collection(db, "banners")),
                    getDocs(collection(db, "users")),
                    getDocs(collection(db, "deliveryZones")),
                    getDocs(collection(db, "coupons")),
                    getDocs(collection(db, "telegramConfigs")),
                ]);

                setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
                setCategories(categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
                setRestaurants(restaurantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant)));
                setBanners(bannersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)));
                setAllUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
                setDeliveryZones(deliveryZonesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryZone)));
                setCoupons(couponsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon)));
                setTelegramConfigs(telegramConfigsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TelegramConfig)));
            } catch (error) {
                console.error("Error fetching initial data:", error);
                if ((error as any).code !== 'resource-exhausted') {
                    toast({ title: "فشل تحميل البيانات", description: "حدث خطأ أثناء جلب بيانات التطبيق.", variant: "destructive" });
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        const unsubs = [
            onSnapshot(collection(db, "supportTickets"), 
                (snap) => setSupportTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket))),
                (error) => console.error("Support tickets snapshot error: ", error)
            ),
            onSnapshot(collection(db, "deliveryWorkers"), 
                (snap) => setDeliveryWorkers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryWorker))),
                (error) => console.error("Delivery workers snapshot error: ", error)
            ),
             onSnapshot(collection(db, "orders"), 
                (snap) => setAllOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())),
                (error) => console.error("Orders snapshot error: ", error)
            ),
        ];
        
        const savedCart = localStorage.getItem('speedShopCart');
        const savedAddresses = localStorage.getItem('speedShopAddresses');
        const savedOrderIds = localStorage.getItem('speedShopOrderIds');
        if (savedCart) setCart(JSON.parse(savedCart));
        if (savedAddresses) setAddresses(JSON.parse(savedAddresses));
        if (savedOrderIds) setLocalOrderIds(JSON.parse(savedOrderIds));

        return () => {
            unsubs.forEach(unsub => unsub());
        };
    }, [toast]);


    // Listener for user-specific support ticket
    useEffect(() => {
        if (!userId) return;

        const q = query(collection(db, "supportTickets"), where("userId", "==", userId));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            if (!querySnapshot.empty) {
                // Find unresolved ticket first, otherwise show the latest resolved one
                const ticketDoc = querySnapshot.docs.find(doc => !doc.data().isResolved) || querySnapshot.docs.sort((a,b) => new Date(b.data().createdAt).getTime() - new Date(a.data().createdAt).getTime())[0];
                if (ticketDoc) {
                    setMySupportTicket({ id: ticketDoc.id, ...ticketDoc.data() } as SupportTicket);
                }
            } else {
                setMySupportTicket(null);
            }
        });

        return () => unsubscribe();

    }, [userId]);


    // --- Derived State ---
    const bestSellers = useMemo(() => {
        const salesCount: { [productId: string]: number } = {};

        allOrders.forEach(order => {
            order.items.forEach(item => {
                salesCount[item.product.id] = (salesCount[item.product.id] || 0) + item.quantity;
            });
        });

        const soldProducts = products.filter(p => salesCount[p.id] > 0);

        return soldProducts.sort((a, b) => salesCount[b.id] - salesCount[a.id]);
    }, [allOrders, products]);


    // --- Cart Management ---
    useEffect(() => {
        localStorage.setItem('speedShopCart', JSON.stringify(cart));
    }, [cart]);

    const cartTotal = useMemo(() => {
        return cart.reduce((total, item) => {
            const price = item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price;
            return total + price * item.quantity;
        }, 0);
    }, [cart]);
    
    const addToCart = useCallback((product: Product, quantity: number, selectedSize?: ProductSize): boolean => {
        const restaurantId = product.restaurantId;
        const cartIsFromDifferentRestaurant = cart.length > 0 && cart[0].product.restaurantId !== restaurantId;
        
        if(cartIsFromDifferentRestaurant) {
            toast({
                title: "بدء سلة جديدة؟",
                description: "لديك منتجات من متجر آخر. هل تريد حذفها وبدء سلة جديدة من هذا المتجر؟",
                action: <button onClick={() => {
                    const newCartItem = { product, quantity, selectedSize };
                    setCart([newCartItem]);
                    toast({
                        title: "تمت الإضافة إلى السلة",
                        description: `تمت إضافة ${product.name} إلى سلتك.`,
                    });
                }} className="px-3 py-1.5 border rounded-md text-sm bg-primary text-primary-foreground">نعم، ابدأ</button>
            });
            return false;
        }

        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(item => 
                item.product.id === product.id && 
                item.selectedSize?.name === selectedSize?.name
            );

            if (existingItemIndex > -1) {
                const updatedCart = [...prevCart];
                updatedCart[existingItemIndex].quantity += quantity;
                return updatedCart;
            }
            return [...prevCart, { product, quantity, selectedSize }];
        });
        return true;
    }, [cart, toast]);


    const removeFromCart = (productId: string, sizeName?: string) => {
        setCart(prevCart => prevCart.filter(item => 
            !(item.product.id === productId && item.selectedSize?.name === sizeName)
        ));
    };

    const updateCartQuantity = (productId: string, quantity: number, sizeName?: string) => {
        if (quantity < 1) {
            removeFromCart(productId, sizeName);
            return;
        }
        setCart(prevCart => prevCart.map(item => 
            (item.product.id === productId && item.selectedSize?.name === sizeName)
                ? { ...item, quantity } 
                : item
        ));
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
    
        const cartRestaurant = restaurants.find(r => r.id === cart[0].product.restaurantId);
        if (!cartRestaurant) {
            throw new Error("لم يتم العثور على المتجر الخاص بالطلب.");
        }
    
        try {
            // Step 1: Pre-fetch product and coupon data to validate outside the transaction
            const productDocs = new Map<string, Product>();
            for (const item of cart) {
                const productRef = doc(db, "products", item.product.id);
                const productDoc = await getDoc(productRef);
                if (!productDoc.exists()) {
                    throw new Error(`منتج "${item.product.name}" لم يعد متوفرًا.`);
                }
                const productData = productDoc.data() as Product;
    
                if (item.selectedSize) {
                    const size = productData.sizes?.find(s => s.name === item.selectedSize!.name);
                    if (!size || size.stock < item.quantity) {
                        throw new Error(`الكمية المطلوبة من "${item.product.name} (${item.selectedSize.name})" غير متوفرة.`);
                    }
                } else {
                    if ((productData.stock ?? 0) < item.quantity) {
                        throw new Error(`الكمية المطلوبة من "${item.product.name}" غير متوفرة.`);
                    }
                }
                productDocs.set(item.product.id, productData);
            }
    
            let coupon: (Coupon & {id: string}) | null = null;
            let couponDocRef: any = null;
            if (couponCode) {
                const couponQuery = query(collection(db, "coupons"), where("code", "==", couponCode.trim()));
                const querySnapshot = await getDocs(couponQuery);
                if (querySnapshot.empty) {
                    throw new Error("كود الخصم غير صحيح.");
                }
                const couponDoc = querySnapshot.docs[0];
                couponDocRef = couponDoc.ref;
                coupon = { id: couponDoc.id, ...couponDoc.data() } as (Coupon & {id: string});
    
                if (coupon.usedCount >= coupon.maxUses) throw new Error("تم استخدام هذا الكود بالكامل.");
                if (coupon.usedBy?.includes(userId)) throw new Error("لقد استخدمت هذا الكود من قبل.");
            }
    
            // Step 2: Calculate all order values before the transaction
            const discountAmount = coupon?.discountValue || 0;
            const appliedCouponInfo = coupon ? { code: coupon.code, discountAmount: discountAmount } : null;
    
            const distance = (address.latitude && address.longitude && cartRestaurant.latitude && cartRestaurant.longitude)
                ? calculateDistance(address.latitude, address.longitude, cartRestaurant.latitude, cartRestaurant.longitude)
                : 0;
            const deliveryFee = calculateDeliveryFee(distance);
    
            const finalTotal = Math.max(0, cartTotal - discountAmount) + deliveryFee;
    
            const profit = cart.reduce((acc, item) => {
                const productData = productDocs.get(item.product.id);
                if (!productData) return acc;
                const itemPrice = item.selectedSize?.price ?? productData.discountPrice ?? productData.price;
                const wholesalePrice = productData.wholesalePrice ?? 0;
                return acc + ((itemPrice - wholesalePrice) * item.quantity);
            }, 0);
    
            // Step 3: Run the simplified transaction
            await runTransaction(db, async (transaction) => {
                const newOrderData: Omit<Order, 'id'> = {
                    userId: userId,
                    items: cart,
                    total: finalTotal,
                    date: new Date().toISOString(),
                    status: 'unassigned',
                    estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
                    address,
                    profit: profit,
                    deliveryFee: deliveryFee,
                    deliveryWorkerId: null,
                    deliveryWorker: null,
                    assignedToWorkerId: null,
                    assignmentTimestamp: null,
                    appliedCoupon: appliedCouponInfo,
                    rejectedBy: [],
                };
    
                const sanitizedOrderData = Object.fromEntries(
                    Object.entries(newOrderData).map(([key, value]) => [key, value === undefined ? null : value])
                );
    
                const orderRef = doc(collection(db, "orders"));
                transaction.set(orderRef, sanitizedOrderData);
    
                for (const item of cart) {
                    const productRef = doc(db, "products", item.product.id);
                    const productData = productDocs.get(item.product.id);
                    if (!productData) continue; // Should not happen due to pre-fetch
    
                    if (item.selectedSize) {
                        const newSizes = productData.sizes?.map((s: ProductSize) =>
                            s.name === item.selectedSize!.name
                            ? { ...s, stock: s.stock - item.quantity }
                            : s
                        ) ?? [];
                        transaction.update(productRef, { sizes: newSizes });
                    } else {
                        transaction.update(productRef, { stock: productData.stock - item.quantity });
                    }
                }
    
                if (couponDocRef && coupon) {
                    transaction.update(couponDocRef, { 
                        usedCount: coupon.usedCount + 1,
                        usedBy: arrayUnion(userId)
                    });
                }
    
                // Non-transactional side effects (can be moved out if needed)
                setLocalOrderIds(prev => [...prev, orderRef.id]);
                
                const ownerConfigs = telegramConfigs.filter(c => c.type === 'owner');
                if (ownerConfigs.length > 0) {
                    const itemsText = cart.map(item => {
                        const sizeText = item.selectedSize ? ` (${item.selectedSize.name})` : '';
                        return `${item.quantity}x ${item.product.name}${sizeText}`;
                    }).join('\\n');
                    const locationLink = address.latitude ? `https://www.google.com/maps?q=${address.latitude},${address.longitude}` : 'غير محدد';
                    const message = `
*طلب جديد* 🔥
*رقم الطلب:* \`${orderRef.id.substring(0, 6)}\`
*الزبون:* ${address.name}
*الهاتف:* ${address.phone}
*العنوان:* ${address.deliveryZone}
*تفاصيل:* ${address.details || 'لا يوجد'}
*الموقع:* ${locationLink}
---
*المنتجات:*
${itemsText}
---
*المجموع:* ${formatCurrency(finalTotal)}
                    `;
                    ownerConfigs.forEach(config => sendTelegramMessage(config.chatId, message));
                }
                
                clearCart();
            });
    
        } catch (error: any) {
            console.error("Order placement failed:", error);
            throw error; // Re-throw to be caught by the UI
        }
    };
    


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
        // Fetch fresh data to ensure we have the latest state
        const currentOrders = (await getDocs(collection(db, "orders"))).docs.map(d => d.data() as Order);
        const currentWorkers = (await getDocs(collection(db, "deliveryWorkers"))).docs.map(d => ({id: d.id, ...d.data()}) as DeliveryWorker);
        
        const completedOrdersByWorker: {[workerId: string]: number} = {};
        currentOrders.forEach(o => {
            if (o.status === 'delivered' && o.deliveryWorkerId) {
                completedOrdersByWorker[o.deliveryWorkerId] = (completedOrdersByWorker[o.deliveryWorkerId] || 0) + 1;
            }
        });

        const busyWorkerIds = new Set(
            currentOrders
                .filter(o => ['confirmed', 'preparing', 'on_the_way'].includes(o.status))
                .map(o => o.deliveryWorkerId)
                .filter((id): id is string => !!id)
        );

        const availableWorkers = currentWorkers.filter(
            w => w.isOnline && !busyWorkerIds.has(w.id) && !excludedWorkerIds.includes(w.id)
        );

        if (availableWorkers.length === 0) {
            console.log("No available workers to assign the order to.");
            await updateDoc(doc(db, "orders", orderId), { status: 'unassigned', assignedToWorkerId: null, assignmentTimestamp: null, rejectedBy: excludedWorkerIds });
            return;
        }

        availableWorkers.sort((a,b) => (completedOrdersByWorker[a.id] || 0) - (completedOrdersByWorker[b.id] || 0));
        
        const nextWorker = availableWorkers[0];

        const updateData = {
            status: 'pending_assignment',
            assignedToWorkerId: nextWorker.id,
            assignmentTimestamp: new Date().toISOString()
        };
        await updateDoc(doc(db, "orders", orderId), updateData);
        console.log(`Order ${orderId} assigned to ${nextWorker.name}`);

        const currentConfigs = (await getDocs(collection(db, "telegramConfigs"))).docs.map(d => ({id: d.id, ...d.data()}) as TelegramConfig);
        const workerConfig = currentConfigs.find(c => c.type === 'worker' && c.workerId === nextWorker.id);
        const orderData = currentOrders.find(o => o.id === orderId); 
        if (workerConfig && orderData) {
            const message = `
*لديك طلب جديد في الانتظار* 🛵
*رقم الطلب:* \`${orderId.substring(0, 6)}\`
*المنطقة:* ${orderData.address.deliveryZone}
*ربحك من التوصيل:* ${formatCurrency(orderData.deliveryFee)}

الرجاء مراجعة التطبيق لقبول أو رفض الطلب.
            `;
            sendTelegramMessage(workerConfig.chatId, message);
        }
    };

    useEffect(() => {
        const unassignedOrders = allOrders.filter(o => o.status === 'unassigned');
        unassignedOrders.forEach(order => {
            const excludedIds = order.rejectedBy || [];
            assignOrderToNextWorker(order.id, excludedIds);
        });

        const interval = setInterval(() => {
            const pendingOrders = allOrders.filter(o => o.status === 'pending_assignment');
            pendingOrders.forEach(order => {
                if (!order.assignmentTimestamp || !order.assignedToWorkerId) return;
                const timestamp = new Date(order.assignmentTimestamp).getTime();
                if (Date.now() - timestamp > ASSIGNMENT_TIMEOUT) {
                    console.log(`Order ${order.id} timed out for worker ${order.assignedToWorkerId}. Reassigning...`);
                    const newRejectedBy = Array.from(new Set([...(order.rejectedBy || []), order.assignedToWorkerId]));
                    assignOrderToNextWorker(order.id, newRejectedBy);
                }
            });
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, [allOrders]);

    const updateWorkerStatus = async (workerId: string, isOnline: boolean) => {
        try {
            const workerRef = doc(db, 'deliveryWorkers', workerId);
            await setDoc(workerRef, { isOnline }, { merge: true });
        } catch (error) {
            console.error("Failed to update worker status:", error);
        }
    };


    const updateOrderStatus = async (orderId: string, status: OrderStatus, workerId?: string) => {
        const orderDocRef = doc(db, "orders", orderId);
        const currentOrder = allOrders.find(o => o.id === orderId);
        if (!currentOrder) return;

        const updateData: any = { status };
        
        if (status === 'confirmed' && workerId) {
            const worker = deliveryWorkers.find(w => w.id === workerId);
            if (worker) {
                updateData.deliveryWorkerId = workerId;
                updateData.deliveryWorker = { id: worker.id, name: worker.name };
                updateData.assignedToWorkerId = null;
                updateData.assignmentTimestamp = null;
                updateData.rejectedBy = [];

                const workerConfig = telegramConfigs.find(c => c.type === 'worker' && c.workerId === workerId);
                if (workerConfig && currentOrder) {
                    const message = `
*تم قبول الطلب الجديد* ✅
*رقم الطلب:* \`${orderId.substring(0, 6)}\`
*الزبون:* ${currentOrder.address.name}
*المنطقة:* ${currentOrder.address.deliveryZone}
*المبلغ المستلم:* ${formatCurrency(currentOrder.total)}

الرجاء مراجعة التطبيق لبدء التوصيل.
                    `;
                    sendTelegramMessage(workerConfig.chatId, message);
                }
            }
        }
        
        if (status === 'unassigned' && workerId) {
            updateData.assignedToWorkerId = null;
            updateData.assignmentTimestamp = null;
            updateData.rejectedBy = arrayUnion(workerId); // Add rejecting worker to the list
        }

        if (status === 'cancelled') {
            try {
                await runTransaction(db, async (transaction) => {
                    for (const item of currentOrder.items) {
                        const productRef = doc(db, "products", item.product.id);
                        const productDoc = await transaction.get(productRef);
                        if (productDoc.exists()) {
                            const productData = productDoc.data() as Product;
                            if (item.selectedSize) {
                                const newSizes = productData.sizes?.map(s => 
                                    s.name === item.selectedSize!.name 
                                    ? { ...s, stock: s.stock + item.quantity } 
                                    : s
                                ) ?? [];
                                transaction.update(productRef, { sizes: newSizes });
                            } else {
                                transaction.update(productRef, { stock: (productData.stock || 0) + item.quantity });
                            }
                        }
                    }
                    transaction.update(orderDocRef, updateData);
                });
            } catch (e) {
                console.error("Transaction failed: ", e);
                toast({title: "فشل إلغاء الطلب", description: "حدث خطأ أثناء إعادة المنتجات للمخزون.", variant: "destructive"});
                return; // Stop if transaction fails
            }
        } else {
            await updateDoc(orderDocRef, updateData);
        }

        if (status === 'delivered' && workerId) {
            const workerDocRef = doc(db, "deliveryWorkers", workerId);
            const worker = deliveryWorkers.find(w => w.id === workerId);
            const now = new Date();
            let unfreezeProgress = worker?.unfreezeProgress || 0;

            const myDeliveredOrders = allOrders.filter(o => o.deliveryWorkerId === workerId && o.status === 'delivered').length;
            const lastDeliveredDate = worker?.lastDeliveredAt ? new Date(worker.lastDeliveredAt) : null;
            let isFrozen = false;
            if(lastDeliveredDate) {
                const hoursSinceLastDelivery = (now.getTime() - lastDeliveredDate.getTime()) / (1000 * 60 * 60);
                if (hoursSinceLastDelivery > 48) {
                    isFrozen = true;
                }
            }
           
            if (isFrozen) {
                unfreezeProgress += 1;
                if (unfreezeProgress >= 10) {
                    await updateDoc(workerDocRef, {
                        lastDeliveredAt: now.toISOString(),
                        unfreezeProgress: 0
                    });
                } else {
                    await updateDoc(workerDocRef, { unfreezeProgress });
                }
            } else {
                 await updateDoc(workerDocRef, {
                    lastDeliveredAt: now.toISOString(),
                    unfreezeProgress: 0
                });
            }
        }
    };

    const deleteOrder = async (orderId: string) => {
        const orderRef = doc(db, "orders", orderId);
        await deleteDoc(orderRef);
        setAllOrders(prev => prev.filter(o => o.id !== orderId));
        toast({ title: "تم حذف الطلب بنجاح", variant: "destructive" });
    }

    // --- Support Ticket Management ---
    const startNewTicketClient = () => {
        setMySupportTicket(null);
    }
    
    const createSupportTicket = async (firstMessage: Message) => {
        if (!userId) return;
        // If there's an existing ticket that isn't resolved, add to it
        if (mySupportTicket && !mySupportTicket.isResolved) {
             await addMessageToTicket(mySupportTicket.id, firstMessage);
             return;
        }

        // Otherwise, create a new one
        const userName = addresses[0]?.name || `مستخدم ${userId.substring(0, 4)}`;
        const newTicket: Omit<SupportTicket, 'id'> = {
            userId,
            userName,
            createdAt: new Date().toISOString(),
            isResolved: false,
            history: [firstMessage],
        };
        await addDoc(collection(db, "supportTickets"), newTicket);
        
        const ownerConfigs = telegramConfigs.filter(c => c.type === 'owner');
        if (ownerConfigs.length > 0) {
            const notificationMsg = `
*تذكرة دعم جديدة* 📩
*من:* ${userName} (${userId.substring(0,4)})
*المشكلة:* ${firstMessage.content}

الرجاء المتابعة من لوحة التحكم.
`;
            ownerConfigs.forEach(config => sendTelegramMessage(config.chatId, notificationMsg));
        }
    };

    const addMessageToTicket = async (ticketId: string, message: Message) => {
        const ticketRef = doc(db, "supportTickets", ticketId);
        await updateDoc(ticketRef, {
            history: arrayUnion(message)
        });

        if (message.role === 'user') {
            const ownerConfigs = telegramConfigs.filter(c => c.type === 'owner');
             if (ownerConfigs.length > 0) {
                 const ticket = supportTickets.find(t => t.id === ticketId);
                 const notificationMsg = `
*رد جديد على تذكرة دعم* 💬
*من:* ${ticket?.userName || 'غير معروف'}
*الرسالة:* ${message.content}
`;
                 ownerConfigs.forEach(config => sendTelegramMessage(config.chatId, notificationMsg));
             }
        }
    };

    const resolveSupportTicket = async (ticketId: string) => {
        await updateDoc(doc(db, "supportTickets", ticketId), { isResolved: true });
    }

    // --- Delivery Worker Management ---
    const addDeliveryWorker = async (workerData: Pick<DeliveryWorker, 'id' | 'name'>) => {
        const workerRef = doc(db, 'deliveryWorkers', workerData.id);
        await setDoc(workerRef, { name: workerData.name, isOnline: true }, { merge: true });
        setDeliveryWorkers(prev => {
            const existing = prev.find(w => w.id === workerData.id);
            if (existing) {
                return prev.map(w => w.id === workerData.id ? {...w, ...workerData, isOnline: true} : w);
            }
            return [...prev, {...workerData, isOnline: true}];
        })
    };


    // --- Telegram Config Management ---
    const addTelegramConfig = async (configData: Omit<TelegramConfig, 'id'>) => {
        const docRef = await addDoc(collection(db, "telegramConfigs"), configData);
        setTelegramConfigs(prev => [...prev, {id: docRef.id, ...configData}]);
        toast({ title: "تمت إضافة معرف تليجرام بنجاح" });
    };

    const deleteTelegramConfig = async (configId: string) => {
        await deleteDoc(doc(db, "telegramConfigs", configId));
        setTelegramConfigs(prev => prev.filter(c => c.id !== configId));
        toast({ title: "تم حذف معرف تليجرام بنجاح" });
    };


    // --- ADMIN ACTIONS ---
    const addProduct = async (productData: Omit<Product, 'id'> & { image: string }) => {
        const imageUrl = await uploadImage(productData.image, `products/${uuidv4()}`);
        const docRef = await addDoc(collection(db, "products"), { ...productData, image: imageUrl });
        setProducts(prev => [...prev, {id: docRef.id, ...productData, image: imageUrl}]);
        toast({ title: "تمت إضافة المنتج بنجاح" });
    }

    const updateProduct = async (updatedProduct: Partial<Product> & {id: string}) => {
        const { id, image, ...productData } = updatedProduct;
        let imageUrl = image;
        // Check if image is a new base64 upload
        if (image && image.startsWith('data:image')) {
            imageUrl = await uploadImage(image, `products/${id}`);
        }
        const productDocRef = doc(db, "products", id);
        const finalData = { ...productData, image: imageUrl };
        await updateDoc(productDocRef, finalData);
        setProducts(prev => prev.map(p => p.id === id ? {...p, ...finalData} as Product : p));
        toast({ title: "تم تحديث المنتج بنجاح" });
    }

    const deleteProduct = async (productId: string) => {
        await deleteDoc(doc(db, "products", productId));
        setProducts(prev => prev.filter(p => p.id !== productId));
        // Note: Deleting image from storage is optional to prevent broken links if image is reused.
        toast({ title: "تم حذف المنتج بنجاح", variant: "destructive" });
    }

    const addCategory = async (categoryData: Omit<Category, 'id' | 'icon'>) => {
        const docRef = await addDoc(collection(db, "categories"), categoryData);
        setCategories(prev => [...prev, {id: docRef.id, ...categoryData}]);
        toast({ title: "تمت إضافة القسم بنجاح" });
    }

    const updateCategory = async (updatedCategory: Omit<Category, 'icon' | 'id'> & {id: string}) => {
        const { id, ...categoryData } = updatedCategory;
        const categoryDocRef = doc(db, "categories", id);
        await updateDoc(categoryDocRef, categoryData);
        setCategories(prev => prev.map(c => c.id === id ? { ...c, ...categoryData } : c));
        toast({ title: "تم تحديث القسم بنجاح" });
    }

    const deleteCategory = async (categoryId: string) => {
        await deleteDoc(doc(db, "categories", categoryId));
        setCategories(prev => prev.filter(c => c.id !== categoryId));
        toast({ title: "تم حذف القسم بنجاح" });
    }

    const addRestaurant = async (restaurantData: Omit<Restaurant, 'id'> & {image: string}) => {
        const imageUrl = await uploadImage(restaurantData.image, `restaurants/${uuidv4()}`);
        const docRef = await addDoc(collection(db, "restaurants"), { ...restaurantData, image: imageUrl });
        setRestaurants(prev => [...prev, {id: docRef.id, ...restaurantData, image: imageUrl}]);
        toast({ title: "تمت إضافة المتجر بنجاح" });
    }

    const updateRestaurant = async (updatedRestaurant: Partial<Restaurant> & {id: string}) => {
        const { id, image, ...restaurantData } = updatedRestaurant;
        let imageUrl = image;
        if (image && image.startsWith('data:image')) {
            imageUrl = await uploadImage(image, `restaurants/${id}`);
        }
        const restaurantDocRef = doc(db, "restaurants", id);
        const finalData = { ...restaurantData, image: imageUrl };
        await updateDoc(restaurantDocRef, finalData);
        setRestaurants(prev => prev.map(r => r.id === id ? {...r, ...finalData} as Restaurant : r));
        toast({ title: "تم تحديث المتجر بنجاح" });
    }

    const deleteRestaurant = async (restaurantId: string) => {
        await deleteDoc(doc(db, "restaurants", restaurantId));
        setRestaurants(prev => prev.filter(r => r.id !== restaurantId));
        toast({ title: "تم حذف المتجر بنجاح" });
    }
  
    const addBanner = async (bannerData: Omit<Banner, 'id'> & {image: string}) => {
        const imageUrl = await uploadImage(bannerData.image, `banners/${uuidv4()}`);
        const docRef = await addDoc(collection(db, "banners"), { ...bannerData, image: imageUrl });
        setBanners(prev => [...prev, {id: docRef.id, ...bannerData, image: imageUrl}]);
        toast({ title: "تمت إضافة البنر بنجاح" });
    }

    const updateBanner = async (banner: Banner) => {
        const { id, image, ...bannerData } = banner;
        let imageUrl = image;
        if (image && image.startsWith('data:image')) {
            imageUrl = await uploadImage(image, `banners/${id}`);
        }
        const bannerRef = doc(db, "banners", id);
        await updateDoc(bannerRef, { ...bannerData, image: imageUrl });
        setBanners(prev => prev.map(b => b.id === id ? {...b, ...bannerData, image: imageUrl } as Banner : b));
        toast({ title: "تم تحديث البنر بنجاح" });
    };

    const deleteBanner = async (bannerId: string) => {
        const bannerRef = doc(db, "banners", bannerId);
        await deleteDoc(bannerRef);
        setBanners(prev => prev.filter(b => b.id !== bannerId));
        toast({ title: "تم حذف البنر بنجاح" });
    };

    const addDeliveryZone = async (zone: Omit<DeliveryZone, 'id'>) => {
        const docRef = await addDoc(collection(db, "deliveryZones"), zone);
        setDeliveryZones(prev => [...prev, {id: docRef.id, ...zone}]);
        toast({ title: "تمت إضافة المنطقة بنجاح" });
    };

    const updateDeliveryZone = async (zone: DeliveryZone) => {
        const zoneRef = doc(db, "deliveryZones", zone.id);
        await updateDoc(zoneRef, { name: zone.name, fee: zone.fee });
        setDeliveryZones(prev => prev.map(z => z.id === zone.id ? zone : z));
        toast({ title: "تم تحديث المنطقة بنجاح" });
    };

    const deleteDeliveryZone = async (zoneId: string) => {
        const zoneRef = doc(db, "deliveryZones", zoneId);
        await deleteDoc(zoneRef);
        setDeliveryZones(prev => prev.filter(z => z.id !== zoneId));
        toast({ title: "تم حذف المنطقة بنجاح" });
    };

    const addCoupon = async (couponData: Omit<Coupon, 'id' | 'usedCount'|'usedBy'>) => {
        const finalData = { ...couponData, usedCount: 0, usedBy: [] };
        const docRef = await addDoc(collection(db, "coupons"), finalData);
        setCoupons(prev => [...prev, {id: docRef.id, ...finalData}]);
        toast({ title: "تمت إضافة الكود بنجاح" });
    };

    const deleteCoupon = async (couponId: string) => {
        await deleteDoc(doc(db, "coupons", couponId));
        setCoupons(prev => prev.filter(c => c.id !== couponId));
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
        updateWorkerStatus,
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
        deliveryZones,
        localOrderIds,
        supportTickets,
        mySupportTicket,
        createSupportTicket,
        addMessageToTicket,
        resolveSupportTicket,
        startNewTicketClient,
        deliveryWorkers,
        addDeliveryWorker,
        coupons,
        addCoupon,
        deleteCoupon,
        validateAndApplyCoupon,
        telegramConfigs,
        addTelegramConfig,
        deleteTelegramConfig,
        userId,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

