
"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';

export const useRestaurants = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useRestaurants must be used within an AppProvider');
    }
    return {
        restaurants: context.restaurants,
        isLoading: context.isLoading,
        addRestaurant: context.addRestaurant,
        updateRestaurant: context.updateRestaurant,
        deleteRestaurant: context.deleteRestaurant,
    };
};
