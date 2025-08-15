
import type { Category, Restaurant, Product, DeliveryZone, User } from './types';
import { ShoppingBasket, Stethoscope, SwatchBook, Soup, Salad, ChefHat } from 'lucide-react';

export const categories: Category[] = [
  { id: 'cat1', name: 'ماركت', icon: ShoppingBasket, iconName: 'ShoppingBasket' },
  { id: 'cat2', name: 'صيدلية', icon: Stethoscope, iconName: 'Stethoscope' },
  { id: 'cat3', name: 'هدايا', icon: SwatchBook, iconName: 'SwatchBook' },
  { id: 'cat4', name: 'شوربات', icon: Soup, iconName: 'Soup' },
  { id: 'cat5', name: 'سلطات', icon: Salad, iconName: 'Salad' },
  { id: 'cat6', name: 'شرقي', icon: ChefHat, iconName: 'ChefHat' },
];

export const restaurants: Restaurant[] = [
  { id: 'res1', name: 'ماركت المنصور', image: 'https://placehold.co/400x300.png', rating: 4.5 },
  { id: 'res2', name: 'صيدلية الفرح', image: 'https://placehold.co/400x300.png', rating: 4.8 },
  { id: 'res3', name: 'متجر الهدايا', image: 'https://placehold.co/400x300.png', rating: 4.2 },
  { id: 'res4', name: 'مطعم الشمس', image: 'https://placehold.co/400x300.png', rating: 4.9 },
];

export const products: Product[] = [
  {
    id: 'prod1',
    name: 'مياه معدنية (صندوق)',
    description: 'صندوق مياه معدنية طبيعية (12 عبوة).',
    price: 5000,
    image: 'https://placehold.co/600x400.png',
    categoryId: 'cat1',
    restaurantId: 'res1',
    bestSeller: true,
  },
  {
    id: 'prod2',
    name: 'كريم مرطب للبشرة',
    description: 'كريم غني بالفيتامينات لترطيب عميق.',
    price: 12000,
    image: 'https://placehold.co/600x400.png',
    categoryId: 'cat2',
    restaurantId: 'res2',
    bestSeller: true,
  },
  {
    id: 'prod3',
    name: 'عطر رجالي فاخر',
    description: 'عطر جذاب برائحة تدوم طويلاً.',
    price: 25000,
    image: 'https://placehold.co/600x400.png',
    categoryId: 'cat3',
    restaurantId: 'res3',
    bestSeller: true,
  },
  {
    id: 'prod4',
    name: 'شامبو للشعر الجاف',
    description: 'شامبو ضد القشرة لجميع أنواع الشعر.',
    price: 7000,
    image: 'https://placehold.co/600x400.png',
    categoryId: 'cat2',
    restaurantId: 'res2',
  },
  {
    id: 'prod5',
    name: 'معجون أسنان مبيض',
    description: 'معجون أسنان بالفلورايد لحماية متكاملة.',
    price: 2500,
    image: 'https://placehold.co/600x400.png',
    categoryId: 'cat2',
    restaurantId: 'res2',
    bestSeller: true,
  },
  {
    id: 'prod6',
    name: 'أرز بسمتي (5 كغم)',
    description: 'كيس أرز بسمتي هندي فاخر، 5 كغم.',
    price: 15000,
    image: 'https://placehold.co/600x400.png',
    categoryId: 'cat1',
    restaurantId: 'res1',
  },
   {
    id: 'prod7',
    name: 'شوربة عدس',
    description: 'شوربة عدس ساخنة مع خبز محمص.',
    price: 3000,
    image: 'https://placehold.co/600x400.png',
    categoryId: 'cat4',
    restaurantId: 'res4',
  },
  {
    id: 'prod8',
    name: 'سلطة سيزر بالدجاج',
    description: 'خس، خبز محمص، جبنة بارميزان مع صلصة السيزر وقطع الدجاج المشوي.',
    price: 8000,
    image: 'https://placehold.co/600x400.png',
    categoryId: 'cat5',
    restaurantId: 'res4',
  },
  {
    id: 'prod9',
    name: 'كباب عراقي',
    description: 'سيخ كباب لحم غنم طازج مشوي على الفحم.',
    price: 12000,
    image: 'https://placehold.co/600x400.png',
    categoryId: 'cat6',
    restaurantId: 'res4',
    bestSeller: true,
  },
];

export const deliveryZones: DeliveryZone[] = [
    { name: 'المنصور', fee: 3000 },
    { name: 'الكرادة', fee: 2500 },
    { name: 'زيونة', fee: 2000 },
    { name: 'الأعظمية', fee: 3500 },
];

export const users: User[] = [
    { id: 'user-admin', name: 'المدير العام', phone: '07700000000', password: 'admin', deliveryZone: deliveryZones[0], isAdmin: true, loginCode: 'ADMIN007', usedCoupons: [] },
    { id: 'user-admin-special', name: 'المدير الخاص', phone: '07858366369', password: 'admin', deliveryZone: deliveryZones[0], isAdmin: true, loginCode: 'BOSS313', usedCoupons: [] },
    { id: 'user-1', name: 'علي احمد', phone: '07712345678', password: '1234', deliveryZone: deliveryZones[1], isAdmin: false, loginCode: 'ALI123', usedCoupons: [] }
]
