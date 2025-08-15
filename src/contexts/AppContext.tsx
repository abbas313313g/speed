
"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { auth, db, storage } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, writeBatch, getDocs } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

import { useCollection } from 'react-firebase-hooks/firestore';

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


// Define the shape of the context
interface AppContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
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
  signup: (userData: Omit<User, 'id' | 'email' | 'isAdmin'> & {password: string}) => Promise<void>;
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

// Helper function to seed data
const seedInitialData = async () => {
    const collections = {
        categories: initialCategoriesData.map(({icon, ...rest}) => rest),
        restaurants: initialRestaurantsData,
        products: initialProductsData,
    };

    const batch = writeBatch(db);

    for (const [collName, data] of Object.entries(collections)) {
        const collRef = collection(db, collName);
        const snapshot = await getDocs(collRef);
        if (snapshot.empty) {
            console.log(`Seeding ${collName}...`);
            data.forEach((item) => {
                const docRef = doc(collRef, item.id);
                batch.set(docRef, item);
            });
        }
    }
    
    // Seed initial users into Firestore (without creating Auth accounts)
    // You will need to create these users manually via the signup page
    const usersCollRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollRef);
    if(usersSnapshot.empty){
        console.log(`Seeding users...`);
        initialUsers.forEach(user => {
            const { password, ...userData } = user; // Don't store password in Firestore
            const docRef = doc(usersCollRef, user.id);
            // Make the first admin user an admin in the database
            const isAdmin = user.phone === '07700000000';
            const email = `${user.phone}@speedshop.app`;
            batch.set(docRef, {...userData, isAdmin, email});
        });
    }


    await batch.commit();
    console.log("Seeding complete or data already exists.");
};


export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { toast } = useToast();
  
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [discount, setDiscount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Firestore collections
  const [productsSnapshot] = useCollection(collection(db, 'products'));
  const products = productsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)) || [];
  
  const [categoriesSnapshot] = useCollection(collection(db, 'categories'));
  const rawCategories = categoriesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Omit<Category, 'icon'>)) || [];

  const [restaurantsSnapshot] = useCollection(collection(db, 'restaurants'));
  const restaurants = restaurantsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant)) || [];

  const [bannersSnapshot] = useCollection(collection(db, 'banners'));
  const banners = bannersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)) || [];

  const [allOrdersSnapshot] = useCollection(collection(db, 'orders'));
  const allOrders = allOrdersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)) || [];
  
  const [allUsersSnapshot] = useCollection(collection(db, 'users'));
  const allUsers = allUsersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)) || [];


  useEffect(() => {
    seedInitialData();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        // Fetch user profile from Firestore
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() } as User);
        } else {
            setUser(null); // Should not happen if signup is correct
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Update cart & orders when user changes
  useEffect(() => {
    if (user) {
      const cartRef = doc(db, 'carts', user.id);
      const ordersRef = collection(db, 'orders'); // Query for user-specific orders
      
      const unsubCart = onSnapshot(cartRef, (doc) => {
        setCart(doc.exists() ? doc.data().items : []);
      });
      
      // A more complex query would be needed here, for simplicity we listen to all and filter
      const unsubOrders = onSnapshot(ordersRef, (snapshot) => {
          const userOrders = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Order))
            .filter(order => order.userId === user.id);
          setOrders(userOrders);
      });

      return () => {
        unsubCart();
        unsubOrders();
      }
    } else {
      setCart([]);
      setOrders([]);
    }
  }, [user]);

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
    if (!password) return false;
    try {
      const email = `${phone}@speedshop.app`;
      await signInWithEmailAndPassword(auth, email, password!);
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      toast({title: "فشل تسجيل الدخول", description: "يرجى التحقق من المعلومات.", variant: "destructive"});
      return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const signup = async (userData: Omit<User, 'id'|'email'|'isAdmin'> & {password: string}) => {
    const { phone, password, name, deliveryZone } = userData;
    const email = `${phone}@speedshop.app`;
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser: Omit<User, 'id'> = {
        email,
        phone,
        name,
        deliveryZone,
        isAdmin: false // New users are never admins by default
      };
      await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
    } catch (error: any) {
        if(error.code === 'auth/email-already-in-use') {
            toast({ title: "هذا المستخدم موجود بالفعل", variant: 'destructive' });
        } else {
            toast({ title: "حدث خطأ أثناء إنشاء الحساب", variant: 'destructive' });
        }
      console.error("Signup failed:", error);
      throw error;
    }
  };
  
  const updateCartInFirestore = async (newCart: CartItem[]) => {
      if(user) {
          const cartRef = doc(db, 'carts', user.id);
          await setDoc(cartRef, { items: newCart }, { merge: true });
      }
  }

  const clearCartAndAdd = (product: Product, quantity: number = 1) => {
    const newItem = { product, quantity };
    updateCartInFirestore([newItem]);
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

    const existingItem = cart.find(item => item.product.id === product.id);
    let newCart: CartItem[];
    if (existingItem) {
      newCart = cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      newCart = [...cart, { product, quantity }];
    }
    updateCartInFirestore(newCart);

    toast({
      title: "تمت الإضافة إلى السلة",
      description: `تمت إضافة ${product.name} إلى سلة التسوق.`,
    });
  };

  const removeFromCart = (productId: string) => {
    const newCart = cart.filter(item => item.product.id !== productId);
    if(newCart.length === 0) setDiscount(0);
    updateCartInFirestore(newCart);
  };
  
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const newCart = cart.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    );
    updateCartInFirestore(newCart);
  };

  const clearCart = () => {
    updateCartInFirestore([]);
    setDiscount(0);
  };

  const totalCartPrice = cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const deliveryFee = cart.length > 0 ? (user?.deliveryZone?.fee ?? 3000) : 0;
  
  const placeOrder = async () => {
    if (!user || cart.length === 0) return;

    const newOrderData: Omit<Order, 'id'> = {
      userId: user.id,
      items: cart,
      total: totalCartPrice - discount + deliveryFee,
      date: new Date().toISOString(),
      status: 'confirmed',
      estimatedDelivery: '30-40 دقيقة',
      user: { id: user.id, name: user.name, phone: user.phone },
      revenue: totalCartPrice - discount,
    };
    
    await addDoc(collection(db, 'orders'), newOrderData);
    clearCart();
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { status });
  };
  
  const uploadImageAndGetURL = async (image: string, path: string): Promise<string> => {
    if (image.startsWith('https://placehold.co') || image.startsWith('https://firebasestorage.googleapis.com')) {
        return image;
    }
    const storageRef = ref(storage, path);
    await uploadString(storageRef, image, 'data_url');
    return await getDownloadURL(storageRef);
  }

  const addProduct = async (productData: Omit<Product, 'id' | 'bestSeller'>) => {
    const imageUrl = await uploadImageAndGetURL(productData.image, `products/${Date.now()}`);
    const newProduct: Omit<Product, 'id'> = {
        ...productData,
        image: imageUrl,
        bestSeller: Math.random() < 0.2
    };
    await addDoc(collection(db, 'products'), newProduct);
    toast({ title: "تمت إضافة المنتج بنجاح" });
  }

  const updateProduct = async (updatedProduct: Product) => {
    const {id, ...data} = updatedProduct;
    const imageUrl = await uploadImageAndGetURL(data.image, `products/${id}`);
    const productRef = doc(db, 'products', id);
    await updateDoc(productRef, {...data, image: imageUrl});
    toast({ title: "تم تحديث المنتج بنجاح" });
  }

  const deleteProduct = async (productId: string) => {
    await deleteDoc(doc(db, 'products', productId));
    toast({ title: "تم حذف المنتج بنجاح", variant: "destructive" });
  }

  const addCategory = async (categoryData: Omit<Category, 'id' | 'icon'>) => {
    await addDoc(collection(db, 'categories'), categoryData);
    toast({ title: "تمت إضافة القسم بنجاح" });
  }

  const updateCategory = async (updatedCategory: Omit<Category, 'icon' | 'id'> & {id: string}) => {
    const { id, ...data } = updatedCategory;
    await updateDoc(doc(db, 'categories', id), data);
    toast({ title: "تم تحديث القسم بنجاح" });
  }

  const deleteCategory = async (categoryId: string) => {
    await deleteDoc(doc(db, 'categories', categoryId));
    toast({ title: "تم حذف القسم بنجاح", variant: "destructive" });
  }
  
  const addRestaurant = async (restaurantData: Omit<Restaurant, 'id'>) => {
    const imageUrl = await uploadImageAndGetURL(restaurantData.image, `restaurants/${Date.now()}`);
    const newRestaurant = { ...restaurantData, image: imageUrl };
    await addDoc(collection(db, 'restaurants'), newRestaurant);
    toast({ title: "تمت إضافة المتجر بنجاح" });
  }

  const updateRestaurant = async (updatedRestaurant: Restaurant) => {
    const { id, ...data } = updatedRestaurant;
    const imageUrl = await uploadImageAndGetURL(data.image, `restaurants/${id}`);
    await updateDoc(doc(db, 'restaurants', id), {...data, image: imageUrl});
    toast({ title: "تم تحديث المتجر بنجاح" });
  }

  const deleteRestaurant = async (restaurantId: string) => {
    await deleteDoc(doc(db, 'restaurants', restaurantId));
    toast({ title: "تم حذف المتجر بنجاح", variant: "destructive" });
  }
  
  const addBanner = async (bannerData: Omit<Banner, 'id'>) => {
    const imageUrl = await uploadImageAndGetURL(bannerData.image, `banners/${Date.now()}`);
    const newBanner = { ...bannerData, image: imageUrl, link: bannerData.link || '#' };
    await addDoc(collection(db, 'banners'), newBanner);
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
        const userRef = doc(db, 'users', user.id);
        updateDoc(userRef, { usedCoupons: updatedUser.usedCoupons });

        toast({ title: "تم تطبيق الخصم!", description: `لقد حصلت على خصم بقيمة ${formatCurrency(discountAmount)}.` });
    } else {
        setDiscount(0);
        toast({ title: "كود الخصم غير صالح", variant: "destructive" });
    }
  };
  
  const value: AppContextType = {
    user,
    firebaseUser,
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
