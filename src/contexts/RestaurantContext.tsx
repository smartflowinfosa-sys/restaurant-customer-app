import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface RestaurantData {
  restaurant_name: string;
  logo_url?: string;
  support_phone?: string;
  [key: string]: any;
}

interface RestaurantContextType {
  restaurantData: RestaurantData | null;
  isLoading: boolean;
}

const RestaurantContext = createContext<RestaurantContextType>({
  restaurantData: null,
  isLoading: true,
});

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurantSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('restaurant_settings')
          .select('*')
          .limit(1)
          .single();

        if (error) {
          console.error('Error fetching restaurant settings:', error);
        } else if (data) {
          setRestaurantData(data);
        }
      } catch (err) {
        console.error('Unexpected error fetching restaurant settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurantSettings();
  }, []);

  return (
    <RestaurantContext.Provider value={{ restaurantData, isLoading }}>
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => useContext(RestaurantContext);
