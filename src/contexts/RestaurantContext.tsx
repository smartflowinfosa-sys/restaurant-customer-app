import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export const TENANT_RESTAURANT_ID = 'asmak_almohit_001';
export const DEFAULT_PRIMARY_COLOR = '#00B4D8';

export interface RestaurantSettings {
  restaurant_id: string;
  restaurant_name: string;
  name?: string;
  contact_email?: string;
  tiktok_handle?: string;
  is_tiktok_enabled?: boolean;
  instagram_handle?: string;
  is_instagram_enabled?: boolean;
  is_whatsapp_enabled?: boolean;
  logo_url?: string;
  primary_color?: string;
  support_phone?: string;
  [key: string]: any;
}

export interface RestaurantBranch {
  id: string;
  restaurant_id: string;
  branch_name: string;
  phone_number?: string;
  whatsapp_number?: string;
  [key: string]: any;
}

export interface RestaurantContextType {
  restaurant: RestaurantSettings | null;
  restaurantData: RestaurantSettings | null;
  branches: RestaurantBranch[];
  primaryColor: string;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextType>({
  restaurant: null,
  restaurantData: null,
  branches: [],
  primaryColor: DEFAULT_PRIMARY_COLOR,
  isLoading: true,
  refetch: async () => {},
});

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [restaurant, setRestaurant] = useState<RestaurantSettings | null>(null);
  const [branches, setBranches] = useState<RestaurantBranch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTenantData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Fetch restaurant settings dynamically for the tenant
      const { data: settingsData, error: settingsError } = await supabase
        .from('restaurant_settings')
        .select('*')
        .eq('restaurant_id', TENANT_RESTAURANT_ID)
        .single();

      if (settingsError) {
        console.error('Error fetching restaurant settings:', settingsError);
      } else if (settingsData) {
        console.log('Fetched Settings (Context):', settingsData);
        setRestaurant({
          ...settingsData,
          name: settingsData.restaurant_name,
        });
      }

      // 2. Fetch restaurant branches dynamically for the tenant
      const { data: branchesData, error: branchesError } = await supabase
        .from('restaurant_branches')
        .select('*')
        .eq('restaurant_id', TENANT_RESTAURANT_ID);

      if (branchesError) {
        console.error('Error fetching restaurant branches:', branchesError);
      } else if (branchesData && branchesData.length > 0) {
        console.log('Fetched Branches (Context):', branchesData);
        // Frontend Safety Net: ensure strict uniqueness based on branch_name
        const uniqueBranches = Array.from(
          new Map(branchesData.map((item: any) => [item.branch_name, item])).values()
        );
        setBranches(uniqueBranches);
      } else {
        setBranches([]);
      }
    } catch (err) {
      console.error('Unexpected error fetching tenant data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenantData();
  }, [fetchTenantData]);

  const primaryColor = restaurant?.primary_color || DEFAULT_PRIMARY_COLOR;

  return (
    <RestaurantContext.Provider
      value={{
        restaurant,
        restaurantData: restaurant,
        branches,
        primaryColor,
        isLoading,
        refetch: fetchTenantData,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => useContext(RestaurantContext);
