
import type { Category, Restaurant, Product, DeliveryZone, User } from './types';
import { Beef, Pizza, Sandwich, Soup, Salad, ChefHat } from 'lucide-react';

export const categories: Category[] = [
  { id: 'cat1', name: 'برجر', icon: Beef },
  { id: 'cat2', name: 'بيتزا', icon: Pizza },
  { id: 'cat3', name: 'سندويتش', icon: Sandwich },
  { id: 'cat4', name: 'شوربات', icon: Soup },
  { id: 'cat5', name: 'سلطات', icon: Salad },
  { id: 'cat6', name: 'مأكولات شرقية', icon: ChefHat },
];

export const restaurants: Restaurant[] = [
  { id: 'res1', name: 'مطعم الكابتن', image: 'https://placehold.co/400x300.png', rating: 4.5 },
  { id: 'res2', name: 'بيتزا هت', image: 'https://placehold.co/400x300.png', rating: 4.8 },
  { id: 'res3', name: 'شاورما الريم', image: 'https://placehold.co/400x300.png', rating: 4.2 },
  { id: 'res4', name: 'برجر كينج', image: 'https://placehold.co/400x300.png', rating: 4.0 },
];

export const products: Product[] = [
  {
    id: 'prod1',
    name: 'برجر لحم كلاسيك',
    description: 'قطعة لحم مشوي مع جبنة، خس، طماطم، وبصل.',
    price: 8000,
    image: 'https://placehold.co/600x400.png',
    categoryId: 'cat1',
    restaurantId: 'res1',
    bestSeller: true,
  },
  {
    id: 'prod2',
    name: 'برجر دجاج كرسبي',
    description: 'صدر دجاج مقرمش مع مايونيز وخس.',
    price: 7500,
    image: 'https://placehold.co/600x400.png',
    categoryId: 'cat1',
    restaurantId: 'res4',
    bestSeller: true,
  },
  {
    id: 'prod3',
    name: 'بيتزا مارجريتا',
    description: 'عجينة رقيقة مع صلصة طماطم وجبنة موزاريلا.',
    price: 12000,
    image: 'https://placehold.co/600x400.png',
    categoryId: 'cat2',
    restaurantId: 'res2',
    bestSeller: true,
  },
  {
    id: 'prod4',
    name: 'بيتزا بيبروني',
    description: 'بيتزا كلاسيكية مع شرائح البيبروني.',
    price: 15000,
    image: 'https://placehold.co/600x400.png',
    categoryId: 'cat2',
    restaurantId: 'res2',
  },
  {
    id: 'prod5',
    name: 'سندويتش فلافل',
    description: 'خبز صاج مع فلافل، طرشي، وعمبة.',
    price: 2500,
    image: 'https://placehold.co/600x400.png',
    categoryId: 'cat3',
    restaurantId: 'res3',
    bestSeller: true,
  },
  {
    id: 'prod6',
    name: 'شاورما لحم',
    description: 'شاورما لحم بخبز الصاج مع الطحينة.',
    price: 4000,
    image: 'https://placehold.co/600x400.png',
    categoryId: 'cat6',
    restaurantId: 'res3',
  },
   {
    id: 'prod7',
    name: 'شوربة عدس',
    description: 'شوربة عدس ساخنة مع خبز محمص.',
    price: 3000,
    image: 'https://placehold.co/600x400.png',
    categoryId: 'cat4',
    restaurantId: 'res1',
  },
  {
    id: 'prod8',
    name: 'سلطة سيزر',
    description: 'خس، خبز محمص، جبنة بارميزان مع صلصة السيزر.',
    price: 6000,
    image: 'https://placehold.co/600x400.png',
    categoryId: 'cat5',
    restaurantId: 'res2',
  },
];

export const deliveryZones: DeliveryZone[] = [
    { name: 'المنصور', fee: 3000 },
    { name: 'الكرادة', fee: 2500 },
    { name: 'زيونة', fee: 2000 },
    { name: 'الأعظمية', fee: 3500 },
];

export const users: User[] = [
    { id: 'user-admin', name: 'المدير العام', phone: '07700000000', deliveryZone: deliveryZones[0], isAdmin: true },
    { id: 'user-1', name: 'أحمد علي', phone: '07801111111', deliveryZone: deliveryZones[1] },
]
