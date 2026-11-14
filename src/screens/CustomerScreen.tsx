import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  Modal,
  Dimensions,
  useWindowDimensions,
  Alert as RNAlert,
  TextInput,
  I18nManager,
  Linking,
  Platform,
  LayoutAnimation,
  UIManager,
  KeyboardAvoidingView,
  Switch,
  Animated,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Path, Defs, LinearGradient, Stop, ClipPath, G } from 'react-native-svg';
let MapView: any = null;
let PROVIDER_GOOGLE: any = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
}
import { supabase } from '../../lib/supabase';
import { useRestaurant, TARGET_RESTAURANT_ID } from '../contexts/RestaurantContext';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import LoginScreen from './LoginScreen';
import AnimatedSplashScreen from '../components/AnimatedSplashScreen';
import MoyasarPaymentModal from '../components/MoyasarPaymentModal';

const RESTAURANT_ID = TARGET_RESTAURANT_ID;

// Material Expressive Color Palette (matched to reference mockup)
export const BG_WARM = '#F9F9F6';
export const DEEP_TEAL = '#055055';
export const TEXT_TEAL_DARK = '#053B3F';
export const TEXT_TEAL_MUTED = '#4B6B6E';
export const PILL_MINT = '#D0EBE3';
export const CARD_MINT = '#E2F3EE';
export const CARD_IMAGE_MINT = '#BDE3D8';
export const NAV_MINT = '#D4EEE7';
export const ACCENT_ORANGE = '#F37324';
export const STAR_GOLD = '#F4B928';

// Turquoise color scheme fallback
const TURQUOISE_COLOR = DEEP_TEAL;
const WHITE_COLOR = '#FFFFFF';

// Default coordinates (Jeddah)
const DEFAULT_COORDS = {
  latitude: 21.5433,
  longitude: 39.1728,
};

interface Category {
  id: string;
  name?: string;
  name_ar?: string;
  name_en?: string;
  title?: string;
}

interface Restaurant {
  id: string;
  name?: string;
  restaurant_name?: string;
  primary_color: string;
  contact_email?: string;
  is_tiktok_enabled?: boolean;
  tiktok_handle?: string;
  is_instagram_enabled?: boolean;
  instagram_handle?: string;
  is_whatsapp_enabled?: boolean;
}

interface MenuItem {
  id: string;
  restaurant_id: string;
  title?: string;
  name?: string;
  name_ar?: string;
  name_en?: string;
  description: string;
  description_en?: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  category?: string;
  category_id?: string;
  image_url: string;
  is_weighted?: boolean;
  has_options?: boolean;
}

interface CartItem extends MenuItem {
  quantity: number;
  cart_item_id?: string;
  weight?: number;
  selected_options?: Record<string, any>;
  final_price?: number;
  notes?: string;
}

export interface Promotion {
  id: string;
  restaurant_id?: string;
  name?: string;
  discount_percentage: number;
  target_branches?: any;
  selected_branches?: any;
  selected_items: any;
  target_audience?: string;
  order_type?: string;
  start_date?: string;
  end_date?: string | null;
  is_active: boolean;
  created_at?: string;
}

export const isPromotionActive = (promo: any): boolean => {
  if (!promo || promo.is_active === false) return false;

  const now = new Date();

  if (promo.start_date) {
    const start = new Date(promo.start_date);
    if (!isNaN(start.getTime()) && now < start) {
      return false;
    }
  }

  if (promo.end_date) {
    const endStr = String(promo.end_date).trim();
    let end: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(endStr)) {
      end = new Date(`${endStr}T23:59:59.999`);
    } else {
      end = new Date(promo.end_date);
    }
    if (!isNaN(end.getTime()) && now > end) {
      return false;
    }
  }

  return true;
};

export const matchesBranch = (promo: any, branchValue: string, branchList: any[]): boolean => {
  const promoBranches = promo.target_branches || promo.selected_branches || promo.branches || promo.branch_ids || promo.branch_id;
  if (!promoBranches) return true;

  let branchArr: any[] = [];
  if (Array.isArray(promoBranches)) {
    branchArr = promoBranches;
  } else if (typeof promoBranches === 'string') {
    try {
      const parsed = JSON.parse(promoBranches);
      if (Array.isArray(parsed)) branchArr = parsed;
      else branchArr = [promoBranches];
    } catch {
      branchArr = promoBranches.split(',').map((s: string) => s.trim());
    }
  } else {
    branchArr = [promoBranches];
  }

  if (branchArr.length === 0 || branchArr.some((b: any) => String(b).toLowerCase() === 'all' || String(b) === 'الكل')) {
    return true;
  }

  if (!branchValue) return true;

  const currentBranch = branchList?.find((b: any) =>
    b.branch_name === branchValue || b.name === branchValue || b.id === branchValue || String(b.id) === String(branchValue)
  );
  const currentId = currentBranch?.id ? String(currentBranch.id).trim() : null;
  const currentName = currentBranch?.branch_name || currentBranch?.name || branchValue;

  return branchArr.some((b: any) => {
    const val = typeof b === 'object' && b !== null ? String(b.id || b.name || b.branch_name).trim() : String(b).trim();
    if (val === 'all' || val.toLowerCase() === 'all' || val === 'الكل') return true;
    if (currentId && val === currentId) return true;
    if (currentName && val.toLowerCase() === String(currentName).toLowerCase()) return true;
    if (val.toLowerCase() === String(branchValue).toLowerCase()) return true;
    return false;
  });
};

export const matchesOrderType = (promo: any, currentMode: 'delivery' | 'pickup'): boolean => {
  const promoType = promo.order_type || promo.orderType || promo.fulfillment_type;
  if (!promoType) return true;
  const str = String(promoType).trim().toLowerCase();
  if (str === 'all' || str === 'الكل' || str === '') return true;
  if (currentMode === 'delivery') {
    return str === 'delivery' || str === 'توصيل';
  }
  if (currentMode === 'pickup') {
    return str === 'pickup' || str === 'takeaway' || str === 'استلام';
  }
  return true;
};

export const isItemInPromotion = (promo: any, itemId: string | number): boolean => {
  if (!promo || !itemId) return false;
  let items = promo.selected_items || promo.items || promo.menu_items;

  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch {
      items = items.split(',').map((s: string) => s.trim());
    }
  }

  if (!Array.isArray(items)) {
    return false;
  }

  const targetId = String(itemId).trim();
  return items.some((item: any) => {
    if (typeof item === 'object' && item !== null) {
      return String(item.id || item.menu_item_id || item.item_id).trim() === targetId;
    }
    return String(item).trim() === targetId;
  });
};

export const getActivePromotionForItem = (
  itemId: string | number,
  promotionsList: Promotion[],
  selectedBranch: string,
  branchList: any[],
  deliveryMode: 'delivery' | 'pickup'
): Promotion | null => {
  if (!itemId || !promotionsList || promotionsList.length === 0) return null;

  const validPromos = promotionsList.filter(promo => {
    return (
      isPromotionActive(promo) &&
      matchesBranch(promo, selectedBranch, branchList) &&
      matchesOrderType(promo, deliveryMode) &&
      isItemInPromotion(promo, itemId)
    );
  });

  if (validPromos.length === 0) return null;

  return validPromos.reduce((best, curr) => {
    const bestPct = Number(best.discount_percentage || 0);
    const currPct = Number(curr.discount_percentage || 0);
    return currPct > bestPct ? curr : best;
  });
};

export const calculateDiscountedPrice = (originalPrice: number, discountPercentage: number): number => {
  const pct = Math.max(0, Math.min(100, Number(discountPercentage) || 0));
  return Math.max(0, Math.round((originalPrice * (1 - pct / 100)) * 100) / 100);
};

export const calculateTimeLeft = (targetDateStr: string): number => {
  if (!targetDateStr) return 0;
  const endStr = String(targetDateStr).trim();
  const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(endStr)
    ? new Date(`${endStr}T23:59:59.999`)
    : new Date(endStr);
  const targetTime = targetDate.getTime();
  if (isNaN(targetTime)) return 0;
  return Math.max(0, targetTime - Date.now());
};

const circularCountdownStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '800',
    color: '#0284C7',
    textAlign: 'center',
    includeFontPadding: false,
  },
});

const circularHourglassStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BCE3D8',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: DEEP_TEAL,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: -0.2,
  },
});

interface CircularHourglassCountdownProps {
  startDate?: string;
  endDate: string;
  primaryColor?: string;
  onExpire: () => void;
  style?: any;
}

export const CircularHourglassCountdown: React.FC<CircularHourglassCountdownProps> = ({
  startDate,
  endDate,
  primaryColor,
  onExpire,
  style,
}) => {
  const [timeLeftMs, setTimeLeftMs] = useState<number>(() => calculateTimeLeft(endDate));
  const hasExpiredRef = useRef(false);
  const totalDurationRef = useRef<number>(0);

  useEffect(() => {
    hasExpiredRef.current = false;
    const initial = calculateTimeLeft(endDate);
    setTimeLeftMs(initial);

    const parseDateMs = (dStr?: string | null): number => {
      if (!dStr) return 0;
      const s = String(dStr).trim();
      const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T23:59:59.999`) : new Date(s);
      const t = d.getTime();
      return isNaN(t) ? 0 : t;
    };

    const startMs = parseDateMs(startDate);
    const endMs = parseDateMs(endDate);
    if (startMs > 0 && endMs > startMs) {
      totalDurationRef.current = endMs - startMs;
    } else {
      totalDurationRef.current = Math.max(initial, 24 * 60 * 60 * 1000);
    }

    if (initial <= 0) {
      hasExpiredRef.current = true;
      onExpire();
      return;
    }

    const intervalId = setInterval(() => {
      const remaining = calculateTimeLeft(endDate);
      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        clearInterval(intervalId);
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          onExpire();
        }
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [startDate, endDate, onExpire]);

  if (timeLeftMs <= 0) {
    return null;
  }

  const size = 24;
  const strokeWidth = 2.2;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const totalMs = totalDurationRef.current > 0 ? totalDurationRef.current : 24 * 60 * 60 * 1000;
  const progress = Math.min(1, Math.max(0, timeLeftMs / totalMs));
  const strokeDashoffset = circumference * (1 - progress);

  const totalSeconds = Math.floor(timeLeftMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedTime = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  const brandColor = primaryColor || '#00B4D8';

  return (
    <View style={[circularHourglassStyles.pill, style]}>
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          {/* Background Track Circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated Progress Ring in Restaurant's Brand Primary Color */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={brandColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </Svg>
        {/* Hourglass Icon inside the circle */}
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: 9, lineHeight: 11 }}>⏳</Text>
        </View>
      </View>
      <Text style={circularHourglassStyles.timeText}>
        {formattedTime}
      </Text>
    </View>
  );
};

interface PromotionCountdownProps {
  startDate?: string;
  endDate: string;
  isRTL: boolean;
  getText: (ar: string, en: string) => string;
  onExpire: () => void;
  size?: number;
}

export const PromotionCountdown: React.FC<PromotionCountdownProps> = ({
  startDate,
  endDate,
  isRTL,
  getText,
  onExpire,
  size = 54,
}) => {
  const [timeLeftMs, setTimeLeftMs] = useState<number>(() => calculateTimeLeft(endDate));
  const hasExpiredRef = useRef(false);
  const totalDurationRef = useRef<number>(0);

  useEffect(() => {
    hasExpiredRef.current = false;
    const initial = calculateTimeLeft(endDate);
    setTimeLeftMs(initial);

    // Compute total duration reference
    const parseDateMs = (dStr?: string | null): number => {
      if (!dStr) return 0;
      const s = String(dStr).trim();
      const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T23:59:59.999`) : new Date(s);
      const t = d.getTime();
      return isNaN(t) ? 0 : t;
    };

    const startMs = parseDateMs(startDate);
    const endMs = parseDateMs(endDate);
    if (startMs > 0 && endMs > startMs) {
      totalDurationRef.current = endMs - startMs;
    } else {
      totalDurationRef.current = Math.max(initial, 24 * 60 * 60 * 1000);
    }

    if (initial <= 0) {
      hasExpiredRef.current = true;
      onExpire();
      return;
    }

    const intervalId = setInterval(() => {
      const remaining = calculateTimeLeft(endDate);
      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        clearInterval(intervalId);
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          onExpire();
        }
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [startDate, endDate, onExpire]);

  if (timeLeftMs <= 0) {
    return null;
  }

  const strokeWidth = Math.max(2.5, Math.round(size * 0.065 * 10) / 10);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const totalMs = totalDurationRef.current > 0 ? totalDurationRef.current : 24 * 60 * 60 * 1000;
  const progress = Math.min(1, Math.max(0, timeLeftMs / totalMs));
  const strokeDashoffset = circumference * (1 - progress);

  const totalSeconds = Math.floor(timeLeftMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedTime = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  const fontSize = size < 58 ? 8.5 : (size < 68 ? 9.5 : 11.5);

  return (
    <View style={circularCountdownStyles.container}>
      <View style={[circularCountdownStyles.circleWrapper, { width: size, height: size }]}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          {/* Background circle track: Soft cyan tint */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#E0F2FE"
            strokeWidth={strokeWidth}
            fill="#F0F9FF"
          />
          {/* Animated Cyan Progress Arc (سماوي) */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#00B4D8"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </Svg>
        {/* Centered Time Text */}
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2 }]}>
          <Text
            style={[
              circularCountdownStyles.timeText,
              {
                fontSize,
                color: '#0284C7',
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formattedTime}
          </Text>
        </View>
      </View>
    </View>
  );
};

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LocationModalMapProps {
  mapRef: React.RefObject<any>;
  initialRegion: Region;
  primaryColor: string;
  onRegionChangeComplete: (region: Region) => void;
  onLocateMe: () => void;
}

const LocationModalMap = React.memo(
  ({ mapRef, initialRegion, primaryColor, onRegionChangeComplete, onLocateMe }: LocationModalMapProps) => {
    if (!MapView) {
      return null;
    }

    return (
      <>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
          zoomControlEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
          moveOnMarkerPress={false}
          onRegionChangeComplete={onRegionChangeComplete}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginLeft: -20,
            marginTop: -40,
            alignItems: 'center',
          }}
        >
          <View style={[styles.markerPin, { backgroundColor: primaryColor }]}>
            <Ionicons name="location" size={24} color="#FFFFFF" />
          </View>
          <View style={[styles.markerShadow, { backgroundColor: primaryColor }]} />
        </View>
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            backgroundColor: '#FFFFFF',
            borderRadius: 30,
            width: 50,
            height: 50,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
          onPress={onLocateMe}
        >
          <Ionicons name="locate" size={24} color="#1E293B" />
        </TouchableOpacity>
      </>
    );
  }
);

export default function CustomerScreen() {
  const {
    restaurant,
    branches,
    primaryColor: contextPrimaryColor,
    isLoading: isRestaurantLoading,
  } = useRestaurant();
  // ALL HOOKS MUST BE DECLARED FIRST - Strict Rules of Hooks
  const [categories, setCategories] = useState<Category[]>([
    { id: 'all', name: 'الكل', name_en: 'All' },
    { id: 'todays_offers', name: 'العروض', name_ar: 'العروض', name_en: 'Offers' },
  ]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);
  const [promoCodesList, setPromoCodesList] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const handlePromotionExpired = useCallback((promoId: string) => {
    console.log('[Promotions] Promotion countdown reached zero, auto-reverting UI:', promoId);
    setPromotions(prevPromos =>
      prevPromos.map(p => (p.id === promoId ? { ...p, is_active: false } : p))
    );
  }, []);
  const [activeTab, setActiveTab] = useState('menu');
  const [offersSection, setOffersSection] = useState('offers');
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [userLocation, setUserLocation] = useState(DEFAULT_COORDS);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchLocation, setSearchLocation] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isAppReady, setIsAppReady] = useState(false);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);
  const [isCartModalVisible, setIsCartModalVisible] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [successOrderNumber, setSuccessOrderNumber] = useState<string | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<any>(null);
  const [statusToast, setStatusToast] = useState<{
    visible: boolean;
    orderNumber: string;
    status: string;
    title: string;
    message: string;
    color: string;
    bgColor: string;
    icon: any;
  } | null>(null);
  const lastStatusRef = useRef<string | null>(null);
  const toastAnimY = useRef(new Animated.Value(-120)).current;
  const toastAnimOpacity = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef<any>(null);
  const [checkoutDeliveryAddress, setCheckoutDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedLocation, setSelectedLocation] = useState({ latitude: 21.5433, longitude: 39.1728 });
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'applepay' | 'mada' | 'card'>('card');
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [currentMoyasarOrder, setCurrentMoyasarOrder] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<any | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('وسط');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardError, setCardError] = useState('');
  const [gender, setGender] = useState('ذكر');
  const [mealOptions, setMealOptions] = useState<any[]>([]);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, any>>({});
  const [mealQuantity, setMealQuantity] = useState<number>(1);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWalletBalance, setUseWalletBalance] = useState<boolean>(false);
  const [session, setSession] = useState<any>(null);
  const [hasCheckedInitialSession, setHasCheckedInitialSession] = useState<boolean>(false);
  const [isGuestBrowsing, setIsGuestBrowsing] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState<string>('');
  const [activeBannerSlide, setActiveBannerSlide] = useState<number>(0);
  const [bannerMeasuredWidth, setBannerMeasuredWidth] = useState<number>(0);
  const [failedItemImages, setFailedItemImages] = useState<Record<string, boolean>>({});
  const bannerScrollRef = useRef<ScrollView | null>(null);
  const hasRequestedPermissions = useRef(false);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const normalizedCtxColor = contextPrimaryColor?.trim().toLowerCase();
  const primaryColor = (normalizedCtxColor && normalizedCtxColor !== '#00b4d8')
    ? contextPrimaryColor!
    : DEEP_TEAL;
  const isRTL = language === 'ar';
  const rtlRow: 'row' | 'row-reverse' =
    (isRTL && !I18nManager.isRTL) || (!isRTL && I18nManager.isRTL) ? 'row-reverse' : 'row';
  const shouldFlipScroll = isRTL && !I18nManager.isRTL;
  const alignReadingStart: 'flex-start' | 'flex-end' =
    (isRTL && !I18nManager.isRTL) || (!isRTL && I18nManager.isRTL) ? 'flex-end' : 'flex-start';
  const alignPhysicalRight: 'flex-start' | 'flex-end' =
    I18nManager.isRTL ? 'flex-start' : 'flex-end';

  const CART_STORAGE_KEY = '@restaurant_cart';

  // Automatically select first branch once tenant branches load from context
  useEffect(() => {
    if (branches && branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0].branch_name || branches[0].id);
    }
  }, [branches, selectedBranch]);

  // ALL USEEFFECT HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          setCustomerPhone(session.user.phone?.replace('+966', '0') || '');
          if (session.user.user_metadata?.name) {
            setCustomerName(session.user.user_metadata.name);
          }
        }
      })
      .finally(() => {
        setHasCheckedInitialSession(true);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setCustomerPhone(session.user.phone?.replace('+966', '0') || '');
        if (session.user.user_metadata?.name) {
          setCustomerName(session.user.user_metadata.name);
        }
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load cart from AsyncStorage on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCart(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to load cart from storage:', e);
      } finally {
        setCartReady(true);
      }
    };
    loadCart();
  }, []);

  // Save cart to AsyncStorage whenever it changes (skip until initial load done)
  useEffect(() => {
    if (!cartReady) return;
    const saveCart = async () => {
      try {
        await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      } catch (e) {
        console.warn('Failed to save cart to storage:', e);
      }
    };
    saveCart();
  }, [cart, cartReady]);

  const [resumeCheckout, setResumeCheckout] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isAddAddressModalVisible, setIsAddAddressModalVisible] = useState(false);
  const [selectedAddressType, setSelectedAddressType] = useState('المنزل');
  const [manualAddress, setManualAddress] = useState({ neighborhood: '', street: '', building: '' });
  const [addressEntryMode, setAddressEntryMode] = useState<'selection' | 'manual'>('selection');
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState<'المنزل' | 'العمل' | 'أخرى'>('المنزل');
  const [isDefaultAddress, setIsDefaultAddress] = useState(false);
  const [addressPhotoUri, setAddressPhotoUri] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [loadingSavedAddresses, setLoadingSavedAddresses] = useState<boolean>(false);

  const SAVED_ADDRESSES_STORAGE_KEY = '@restaurant_saved_addresses';

  const getValidUserId = useCallback(async (): Promise<string | null> => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let uid: string | undefined = session?.user?.id;
    if (!uid || !uuidRegex.test(uid) || uid === '00000000-0000-0000-0000-000000000000') {
      try {
        const { data } = await supabase.auth.getUser();
        uid = data?.user?.id;
      } catch {
        // Ignore auth lookup errors
      }
    }
    if (typeof uid === 'string' && uuidRegex.test(uid) && uid !== '00000000-0000-0000-0000-000000000000') {
      return uid;
    }
    return null;
  }, [session?.user?.id]);

  const fetchSavedAddresses = useCallback(async () => {
    try {
      setLoadingSavedAddresses(true);
      const userId = await getValidUserId();
      if (userId) {
        const { data, error } = await supabase
          .from('user_addresses')
          .select('*')
          .eq('user_id', userId)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          setSavedAddresses(data);
          await AsyncStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify(data)).catch(() => {});
          return;
        }
        if (error) {
          console.warn('[Address] Fetch warning:', error.message);
        }
      }

      const cached = await AsyncStorage.getItem(SAVED_ADDRESSES_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setSavedAddresses(parsed);
        }
      }
    } catch (err) {
      console.warn('[Address] Fetch failed:', err);
    } finally {
      setLoadingSavedAddresses(false);
    }
  }, [getValidUserId]);

  useEffect(() => {
    if (activeTab === 'more' || activeSection === 'SavedAddresses' || session?.user?.id) {
      fetchSavedAddresses();
    }
  }, [activeTab, activeSection, session?.user?.id, fetchSavedAddresses]);

  const withTimeout = <T,>(promise: Promise<T>, ms = 3000, label = 'operation'): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
      ),
    ]);

  useEffect(() => {
    const registerForPushNotificationsAsync = async () => {
      if (Platform.OS === 'web') return;
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        setPushEnabled(false);
        return;
      }
      setPushEnabled(true);
    };
    registerForPushNotificationsAsync();
  }, []);

  const toggleNotifications = async (value: boolean) => {
    if (Platform.OS === 'web') return;
    if (value) {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        setPushEnabled(status === 'granted');
        if (status !== 'granted') {
          if (typeof window !== 'undefined' && (window as any).alert) {
            (window as any).alert('الرجاء تفعيل الإشعارات من إعدادات الجهاز');
          } else {
            alert('الرجاء تفعيل الإشعارات من إعدادات الجهاز');
          }
        } else if (session?.user?.id) {
          await supabase.from('customers').update({ is_notifications_enabled: true }).eq('id', session.user.id);
        }
      } catch (e) {
        setPushEnabled(false);
        alert('حدث خطأ أثناء طلب صلاحيات الإشعارات');
      }
    } else {
      setPushEnabled(false);
      if (session?.user?.id) {
        await supabase.from('customers').update({ is_notifications_enabled: false }).eq('id', session.user.id);
      }
    }
  };

  const mapRef = useRef<any>(null);
  const latestMapRegionRef = useRef<Region | null>(null);

  const handleMapRegionChangeComplete = useCallback((region: Region) => {
    latestMapRegionRef.current = region;
  }, []);

  const handleLocateMe = useCallback(async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (typeof window !== 'undefined' && (window as any).alert) {
          (window as any).alert('Please enable location services.');
        } else {
          RNAlert.alert('تنبيه', 'الرجاء تفعيل خدمات الموقع', [{ text: 'حسناً' }]);
        }
        return;
      }
      const location = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        3000,
        'getCurrentPositionAsync'
      );
      const { latitude, longitude } = location.coords;
      const nextRegion: Region = {
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };

      latestMapRegionRef.current = nextRegion;
      mapRef.current?.animateToRegion(nextRegion);
    } catch (error) {
      console.warn('[Location] handleLocateMe fallback:', error);
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const launchAddressCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        RNAlert.alert('تنبيه', 'الرجاء السماح بالوصول إلى الكاميرا لإضافة صورة للموقع', [{ text: 'حسناً' }]);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAddressPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('[AddressPhoto] Camera error:', err);
    }
  };

  const launchAddressGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        RNAlert.alert('تنبيه', 'الرجاء السماح بالوصول إلى معرض الصور لإضافة صورة للموقع', [{ text: 'حسناً' }]);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAddressPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('[AddressPhoto] Gallery error:', err);
    }
  };

  const handlePickAddressPhoto = () => {
    if (Platform.OS === 'web') {
      launchAddressGallery();
      return;
    }
    RNAlert.alert(
      'صورة الموقع',
      'اختر طريقة إضافة صورة للموقع:',
      [
        { text: 'التقاط صورة بالكاميرا', onPress: launchAddressCamera },
        { text: 'اختيار من المعرض', onPress: launchAddressGallery },
        { text: 'إلغاء', style: 'cancel' },
      ]
    );
  };

  useEffect(() => {
    if (session && resumeCheckout) {
      setResumeCheckout(false);
      setIsCartModalVisible(true);
      // Return to cart modal without auto-submitting
    }
  }, [session, resumeCheckout]);

  const normalizePhone = (phone: string) => {
    let p = phone.trim();
    if (p.startsWith('+966')) p = p.slice(4);
    if (p.startsWith('05')) p = p.slice(1);
    return p;
  };

  useEffect(() => {
    const fetchWallet = async () => {
      if (!session?.user?.phone) {
        setWalletBalance(0);
        return;
      }
      const phoneToUse = normalizePhone(session.user.phone);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('wallet_balance')
          .eq('phone', phoneToUse)
          .single();
        
        if (error) {
          console.warn('Wallet fetch error (handled):', error);
          setWalletBalance(0);
          return;
        }
        
        if (data) {
          setWalletBalance(data.wallet_balance || 0);
        } else {
          setWalletBalance(0);
        }
      } catch (e) {
        console.error('Error fetching wallet:', e);
        setWalletBalance(0);
      }
    };
    if (isAppReady && session?.user?.phone) {
      fetchWallet();
    }
  }, [session?.user?.phone, isAppReady]);

  useEffect(() => {
    if (selectedMeal) {
      setMealQuantity(selectedMeal?.is_weighted ? 0.5 : 1);
      setSelectedChoices({});
      setMealOptions([]);

      const fetchOptions = async () => {
        try {
          // Step 1: Fetch groups using item_id
          console.log("Meal ID being queried:", selectedMeal.id);
          const { data: groups, error: groupErr } = await supabase
            .from('option_groups')
            .select('*')
            .eq('menu_item_id', selectedMeal.id);

          console.log("Fetched groups:", groups, "Error:", groupErr);

          if (groups && groups.length > 0) {
            // Step 2: Fetch choices for all matched groups
            const groupIds = groups.map((g: any) => g.id);
            const { data: choices, error: choiceErr } = await supabase
              .from('option_choices')
              .select('*')
              .in('group_id', groupIds);

            console.log("Fetched choices:", choices, "Error:", choiceErr);

            // Step 3: Combine them
            const structuredOptions = groups.map((g: any) => ({
              ...g,
              choices: choices ? choices.filter((c: any) => c.group_id === g.id) : []
            }));

            setMealOptions(structuredOptions);
          } else {
            setMealOptions([]);
          }

        } catch (error) {
          console.error("Error fetching options:", error);
        }
      };

      fetchOptions();
    }
  }, [selectedMeal]);

  useEffect(() => {
    fetchData();
    // requestPermissions();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!session?.user?.phone) {
        setOrders([]);
        return;
      }
      try {
        setOrdersLoading(true);
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('customer_phone', session.user.phone.replace('+966', '0'))
          .eq('restaurant_id', TARGET_RESTAURANT_ID)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.warn('Orders fetch with restaurant_id warning:', error.message);
          // Fallback query without restaurant_id filter if column is not yet indexed
          const { data: fallbackOrders } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('customer_phone', session.user.phone.replace('+966', '0'))
            .order('created_at', { ascending: false });
          if (fallbackOrders) setOrders(fallbackOrders);
        } else if (data) {
          setOrders(data);
        }
      } catch (e) {
        console.error('Error fetching orders:', e);
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchOrders();
  }, [session?.user?.phone]);

  useEffect(() => {
    (async () => {
      if (deliveryMode === 'delivery') {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        try {
          let location = await Location.getCurrentPositionAsync({});
          setSelectedLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
        } catch (error) {
          console.warn('Error getting location:', error);
        }
      }
    })();
  }, [deliveryMode]);

  const handleSplashFinish = useCallback(() => {
    setIsAppReady(true);
  }, []);

  useEffect(() => {
    // Safety fallback timer after animated splash sequence (~2.15s) completes
    const timer = setTimeout(() => {
      setIsAppReady(true);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  const getOrderStatusDetails = (status: string, orderDeliveryMode?: string, isRtlMode: boolean = true) => {
    switch (status) {
      case 'pending':
        return {
          label: isRtlMode ? 'قيد الانتظار ⏳' : 'Pending ⏳',
          icon: 'time-outline',
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          title: isRtlMode ? 'طلبك قيد الانتظار' : 'Order Pending',
          description: isRtlMode ? 'تم استلام طلبك وبانتظار موافقة المطعم' : 'Your order is pending restaurant confirmation',
          step: 1,
        };
      case 'accepted':
        return {
          label: isRtlMode ? 'تم قبول الطلب 👍' : 'Accepted 👍',
          icon: 'checkmark-circle-outline',
          color: '#3B82F6',
          bgColor: '#DBEAFE',
          title: isRtlMode ? 'تم قبول طلبك!' : 'Order Accepted!',
          description: isRtlMode ? 'قام المطعم بقبول طلبك وسيتم البدء في تحضيره' : 'The restaurant accepted your order and will start preparing',
          step: 2,
        };
      case 'in_kitchen':
      case 'preparing':
        return {
          label: isRtlMode ? 'جاري التحضير 🍳' : 'Preparing 🍳',
          icon: 'restaurant-outline',
          color: '#8B5CF6',
          bgColor: '#EDE9FE',
          title: isRtlMode ? 'طلبك في المطبخ!' : 'Preparing Your Order!',
          description: isRtlMode ? 'يتم تحضير وجبتك الآن بعناية' : 'Your meal is now being prepared in the kitchen',
          step: 2,
        };
      case 'ready':
      case 'ready_for_pickup':
        if (orderDeliveryMode === 'delivery') {
          return {
            label: isRtlMode ? 'جاهز للتوصيل 📦' : 'Ready for Delivery 📦',
            icon: 'bicycle-outline',
            color: '#10B981',
            bgColor: '#D1FAE5',
            title: isRtlMode ? 'طلبك جاهز للتوصيل!' : 'Order Ready for Delivery!',
            description: isRtlMode ? 'تم تجهيز الطلب وبانتظار مندوب التوصيل' : 'Order is ready and waiting for delivery driver',
            step: 3,
          };
        }
        return {
          label: isRtlMode ? 'جاهز للاستلام 🛍️' : 'Ready for Pickup 🛍️',
          icon: 'bag-check-outline',
          color: '#10B981',
          bgColor: '#D1FAE5',
          title: isRtlMode ? 'طلبك جاهز للاستلام!' : 'Ready for Pickup!',
          description: isRtlMode ? 'وجبتك جاهزة الآن للاستلام من الفرع' : 'Your meal is ready to be picked up from the branch',
          step: 3,
        };
      case 'out_for_delivery':
        return {
          label: isRtlMode ? 'في الطريق 🚗' : 'Out for Delivery 🚗',
          icon: 'car-outline',
          color: '#06B6D4',
          bgColor: '#CFFAFE',
          title: isRtlMode ? 'طلبك في الطريق!' : 'Out for Delivery!',
          description: isRtlMode ? 'مندوب التوصيل في طريقه إليك الآن' : 'Your delivery driver is on the way',
          step: 3,
        };
      case 'completed':
      case 'delivered':
        return {
          label: isRtlMode ? 'تم التسليم بنجاح ✅' : 'Delivered ✅',
          icon: 'checkmark-done-circle-outline',
          color: '#10B981',
          bgColor: '#D1FAE5',
          title: isRtlMode ? 'تم تسليم الطلب بنجاح!' : 'Order Delivered!',
          description: isRtlMode ? 'بالهناء والشفاء! شكراً لطلبك من مطعمنا' : 'Enjoy your meal! Thank you for ordering with us',
          step: 4,
        };
      case 'cancelled':
        return {
          label: isRtlMode ? 'تم الإلغاء ❌' : 'Cancelled ❌',
          icon: 'close-circle-outline',
          color: '#EF4444',
          bgColor: '#FEE2E2',
          title: isRtlMode ? 'تم إلغاء الطلب' : 'Order Cancelled',
          description: isRtlMode ? 'تم إلغاء هذا الطلب من قبل المطعم أو العميل' : 'This order has been cancelled',
          step: 0,
        };
      default:
        return {
          label: status,
          icon: 'information-circle-outline',
          color: primaryColor,
          bgColor: '#F1F5F9',
          title: isRtlMode ? 'تحديث حالة الطلب' : 'Order Status Update',
          description: isRtlMode ? `الحالة الحالية: ${status}` : `Current status: ${status}`,
          step: 1,
        };
    }
  };

  const triggerStatusToast = (order: any, newStatus: string) => {
    const statusDetails = getOrderStatusDetails(newStatus, order.delivery_mode, isRTL);
    const displayNum = order.display_id || `#${String(order.id).slice(0, 6)}`;

    const toastData = {
      visible: true,
      orderNumber: displayNum,
      status: statusDetails.label,
      title: getText(`تحديث حالة الطلب (${displayNum})`, `Order Status Updated (${displayNum})`),
      message: statusDetails.description,
      color: statusDetails.color,
      bgColor: statusDetails.bgColor,
      icon: statusDetails.icon,
    };

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setStatusToast(toastData);
    toastAnimY.setValue(-120);
    toastAnimOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(toastAnimY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
      Animated.timing(toastAnimOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Trigger local push notification if permitted
    try {
      if (Platform.OS !== 'web') {
        Notifications.scheduleNotificationAsync({
          content: {
            title: getText(`تحديث حالة الطلب (${displayNum})`, `Order Status Updated (${displayNum})`),
            body: `${statusDetails.label}: ${statusDetails.description}`,
            sound: true,
          },
          trigger: null,
        }).catch(() => {});
      }
    } catch (e) {
      // safe fallback
    }

    toastTimeoutRef.current = setTimeout(() => {
      hideStatusToast();
    }, 6000);
  };

  const hideStatusToast = () => {
    Animated.parallel([
      Animated.timing(toastAnimY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(toastAnimOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStatusToast(null);
    });
  };

  const renderStatusToast = () => {
    if (!statusToast || !statusToast.visible) return null;

    return (
      <Animated.View
        style={{
          position: 'absolute',
          top: Platform.OS === 'ios' ? insets.top + 10 : 30,
          left: 16,
          right: 16,
          zIndex: 99999,
          elevation: 99999,
          transform: [{ translateY: toastAnimY }],
          opacity: toastAnimOpacity,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={hideStatusToast}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.18,
            shadowRadius: 16,
            elevation: 12,
            borderLeftWidth: isRTL ? 0 : 5,
            borderRightWidth: isRTL ? 5 : 0,
            borderColor: statusToast.color,
            borderWidth: 1,
            borderTopColor: '#E2E8F0',
            borderBottomColor: '#E2E8F0',
            ...(isRTL ? { borderLeftColor: '#E2E8F0' } : { borderRightColor: '#E2E8F0' }),
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: statusToast.bgColor,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: isRTL ? 0 : 12,
              marginLeft: isRTL ? 12 : 0,
            }}
          >
            <Ionicons name={statusToast.icon} size={24} color={statusToast.color} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0F172A', textAlign: isRTL ? 'right' : 'left' }}>
                {statusToast.title}
              </Text>
              <View style={{ backgroundColor: statusToast.bgColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: statusToast.color }}>
                  {statusToast.status}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: '#475569', textAlign: isRTL ? 'right' : 'left' }} numberOfLines={2}>
              {statusToast.message}
            </Text>
          </View>

          <TouchableOpacity
            onPress={hideStatusToast}
            style={{ padding: 6, marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}
          >
            <Ionicons name="close" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  useEffect(() => {
    const current_order_id = trackingOrderId;
    if (!current_order_id) {
      setTrackedOrder(null);
      lastStatusRef.current = null;
      return;
    }

    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, restaurant_branches(name)')
          .eq('id', current_order_id)
          .single();
        if (data) {
          setTrackedOrder(data);
          lastStatusRef.current = data.status;
        }
      } catch (err) {
        console.error('Error fetching tracked order:', err);
      }
    };

    fetchOrder();

    // Supabase Realtime subscription: strictly listen for UPDATE events on 'orders' table where id === current_order_id
    const channel = supabase
      .channel(`order-updates-${current_order_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${current_order_id}`,
        },
        (payload: any) => {
          console.log('[Realtime] Order UPDATE received for order:', current_order_id, payload);
          const updatedOrder = payload.new;
          if (!updatedOrder) return;

          const previousStatus = lastStatusRef.current;
          const newStatus = updatedOrder.status;

          // Merge updated data into active order
          setTrackedOrder((prev: any) => (prev ? { ...prev, ...updatedOrder } : updatedOrder));

          // Keep orders list in sync in background
          setOrders((prevOrders) =>
            prevOrders.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
          );

          // If status has changed, trigger Toast notification / in-app alert
          if (newStatus && previousStatus !== newStatus) {
            console.log(`[Realtime] Order status changed from ${previousStatus} -> ${newStatus}`);
            lastStatusRef.current = newStatus;
            triggerStatusToast(updatedOrder, newStatus);
          } else {
            lastStatusRef.current = newStatus;
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Channel status for order ${current_order_id}:`, status);
      });

    return () => {
      console.log(`[Realtime] Cleaning up subscription for order ${current_order_id}`);
      supabase.removeChannel(channel);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [trackingOrderId]);

  useEffect(() => {
    // Update RTL/LTR based on language
    if (language === 'ar') {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
    } else {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
    }
  }, [language]);

  useEffect(() => {
    if (showLocationModal) {
      setLocationLoading(true);
      setMapRegion(null);
      latestMapRegionRef.current = null;
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            console.log('Location permission denied');
            const fallbackRegion: Region = {
              latitude: DEFAULT_COORDS.latitude,
              longitude: DEFAULT_COORDS.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            };
            latestMapRegionRef.current = fallbackRegion;
            setMapRegion(fallbackRegion);
            return;
          }

          let coords: { latitude: number; longitude: number } | null = null;
          try {
            const location = await withTimeout(
              Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
              5000,
              'getCurrentPositionAsync'
            );
            coords = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
          } catch (gpsErr) {
            console.warn('[Location] getCurrentPositionAsync timed out, checking last known position:', gpsErr);
            const lastKnown = await Location.getLastKnownPositionAsync({}).catch(() => null);
            if (lastKnown?.coords) {
              coords = {
                latitude: lastKnown.coords.latitude,
                longitude: lastKnown.coords.longitude,
              };
            }
          }

          const targetCoords = coords || DEFAULT_COORDS;
          const resolvedRegion: Region = {
            latitude: targetCoords.latitude,
            longitude: targetCoords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          latestMapRegionRef.current = resolvedRegion;
          setMapRegion(resolvedRegion);
          setUserLocation(targetCoords);
          mapRef.current?.animateToRegion(resolvedRegion, 300);
        } catch (error) {
          console.warn('Error getting location on map open:', error);
          const fallbackRegion: Region = {
            latitude: DEFAULT_COORDS.latitude,
            longitude: DEFAULT_COORDS.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          latestMapRegionRef.current = fallbackRegion;
          setMapRegion(fallbackRegion);
        } finally {
          setLocationLoading(false);
        }
      })();
    }
  }, [showLocationModal]);

  const requestPermissions = async () => {
    if (!hasRequestedPermissions.current) {
      // Request Location Permission (Mandatory)
      setTimeout(async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            setLocationLoading(true);
            const location = await Location.getCurrentPositionAsync({});
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
            setLocationLoading(false);
            console.log('Location permission granted and coordinates fetched');
          } else {
            console.log('Location permission denied');
            // Location is mandatory, show alert again
            RNAlert.alert(
              isRTL ? 'مطلوب' : 'Required',
              isRTL
                ? 'إذن الموقع مطلوب لاستخدام التطبيق'
                : 'Location permission is required to use the app',
              [
                {
                  text: isRTL ? 'حسناً' : 'OK',
                  onPress: () => requestPermissions(),
                },
              ]
            );
          }
        } catch (error) {
          console.error('Error requesting location permission:', error);
          setLocationLoading(false);
        }
      }, 1000);

      // Request Notification Permission
      setTimeout(() => {
        RNAlert.alert(
          isRTL ? 'تفعيل الإشعارات' : 'Enable Notifications',
          isRTL
            ? 'تفعيل الإشعارات للحصول على تحديثات حول طلباتك والعروض'
            : 'Enable notifications to get updates about your orders and offers',
          [
            {
              text: isRTL ? 'تفعيل' : 'Enable',
              onPress: () => console.log('Notifications enabled'),
            },
            {
              text: isRTL ? 'لاحقاً' : 'Later',
              onPress: () => console.log('Notifications postponed'),
              style: 'cancel',
            },
          ]
        );
      }, 2500);

      hasRequestedPermissions.current = true;
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch categories strictly filtered by restaurant_id
      let fetchedCategories: any[] = [];
      try {
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('*')
          .eq('restaurant_id', TARGET_RESTAURANT_ID)
          .order('sort_order', { ascending: true });

        if (catError) {
          console.warn("Categories query with restaurant_id:", catError.message);
          // Fallback to activeRestaurantId if restaurant_id column hasn't migrated yet
          const activeRestaurantId = process.env.EXPO_PUBLIC_ACTIVE_RESTAURANT_ID;
          if (activeRestaurantId) {
            const { data: fallbackCats } = await supabase
              .from('categories')
              .select('*')
              .eq('user_id', activeRestaurantId)
              .order('sort_order', { ascending: true });
            if (fallbackCats && fallbackCats.length > 0) fetchedCategories = fallbackCats;
          }
        } else if (catData && catData.length > 0) {
          fetchedCategories = catData;
        } else {
          // If 0 rows matched restaurant_id, check activeRestaurantId transition fallback
          const activeRestaurantId = process.env.EXPO_PUBLIC_ACTIVE_RESTAURANT_ID;
          if (activeRestaurantId) {
            const { data: fallbackCats } = await supabase
              .from('categories')
              .select('*')
              .eq('user_id', activeRestaurantId)
              .order('sort_order', { ascending: true });
            if (fallbackCats && fallbackCats.length > 0) fetchedCategories = fallbackCats;
          }
        }
      } catch (catErr) {
        console.error("Error fetching categories:", catErr);
      }

      setCategories([
        { id: 'all', name: 'الكل', name_en: 'All' },
        ...fetchedCategories,
        { id: 'todays_offers', name: 'العروض', name_ar: 'العروض', name_en: 'Offers' },
      ]);

      // 2. Fetch products / menu items strictly filtered by restaurant_id
      let fetchedItems: any[] = [];
      try {
        // Try 'products' table first with restaurant_id
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('restaurant_id', TARGET_RESTAURANT_ID)
          .order('sort_order', { ascending: true });

        if (!productsError && productsData && productsData.length > 0) {
          fetchedItems = productsData;
        } else {
          // Try 'menu_items' table with restaurant_id and shared restaurant_id
          const { data: menuItemsData, error: menuItemsError } = await supabase
            .from('menu_items')
            .select('*')
            .or(`restaurant_id.eq.${TARGET_RESTAURANT_ID},restaurant_id.eq.22222222-2222-2222-2222-222222222222`)
            .order('sort_order', { ascending: true });

          if (!menuItemsError && menuItemsData && menuItemsData.length > 0) {
            fetchedItems = menuItemsData;
          } else {
            // Fallback for transition if restaurant_id column hasn't been migrated yet
            const activeRestaurantId = process.env.EXPO_PUBLIC_ACTIVE_RESTAURANT_ID;
            if (activeRestaurantId) {
              const { data: fallbackItems } = await supabase
                .from('menu_items')
                .select('*')
                .eq('user_id', activeRestaurantId)
                .order('sort_order', { ascending: true });
              if (fallbackItems && fallbackItems.length > 0) fetchedItems = fallbackItems;
            }
          }
        }
      } catch (itemErr) {
        console.error("Error fetching products:", itemErr);
      }

      // Normalize items so fields match regardless of schema variations (title vs name, image vs image_url)
      const normalizedItems: MenuItem[] = (fetchedItems || []).map((item: any) => ({
        ...item,
        id: String(item.id),
        restaurant_id: item.restaurant_id || TARGET_RESTAURANT_ID,
        name: item.name || item.name_ar || item.title || '',
        name_ar: item.name_ar || item.name || item.title || '',
        name_en: item.name_en || item.name || '',
        description: item.description || item.description_ar || '',
        description_en: item.description_en || '',
        price: Number(item.price || 0),
        image_url: item.image_url || item.image || item.photo_url || '',
        category_id: item.category_id ? String(item.category_id) : (item.category ? String(item.category) : undefined),
        is_weighted: !!item.is_weighted,
        has_options: !!item.has_options,
      }));

      setMenuItems(normalizedItems);

      // 3. Fetch offers strictly filtered by restaurant_id
      try {
        let { data: offersData, error: offersError } = await supabase
          .from('offers')
          .select('*')
          .eq('restaurant_id', TARGET_RESTAURANT_ID);

        if ((offersError || !offersData || offersData.length === 0) && process.env.EXPO_PUBLIC_ACTIVE_RESTAURANT_ID) {
          const { data: fallbackOffers } = await supabase
            .from('offers')
            .select('*')
            .eq('restaurant_id', process.env.EXPO_PUBLIC_ACTIVE_RESTAURANT_ID);
          if (fallbackOffers) offersData = fallbackOffers;
        }

        if (offersData) setOffers(offersData);
      } catch (err) {
        console.error('Error fetching offers:', err);
        setOffers([]);
      }

      // 4. Fetch promo codes strictly filtered by restaurant_id
      try {
        let { data: promoData, error: promoError } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('restaurant_id', TARGET_RESTAURANT_ID);

        if ((promoError || !promoData || promoData.length === 0) && process.env.EXPO_PUBLIC_ACTIVE_RESTAURANT_ID) {
          const { data: fallbackPromos } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('restaurant_id', process.env.EXPO_PUBLIC_ACTIVE_RESTAURANT_ID);
          if (fallbackPromos) promoData = fallbackPromos;
        }

        if (promoData) setPromoCodesList(promoData);
      } catch (err) {
        console.error('Error fetching promo codes:', err);
        setPromoCodesList([]);
      }

      // 5. Fetch all active promotions from central promotions table
      try {
        const { data: promoList, error: promoListError } = await supabase
          .from('promotions')
          .select('*')
          .eq('is_active', true);

        if (promoListError) {
          console.warn('[Promotions] Query with is_active error:', promoListError.message);
          setPromotions([]);
        } else if (promoList && promoList.length > 0) {
          const activePromos = promoList.filter((p: any) => isPromotionActive(p));
          console.log('[Promotions] Loaded active promotions count:', activePromos.length);
          setPromotions(activePromos);
        } else {
          setPromotions([]);
        }
      } catch (err) {
        console.warn('Error fetching promotions:', err);
        setPromotions([]);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter items by category and live search query
  const categoryFilteredItems = selectedCategory === 'todays_offers'
    ? menuItems.filter(item => {
        return promotions.some(promo => {
          return (
            isPromotionActive(promo) &&
            matchesBranch(promo, selectedBranch, branches) &&
            matchesOrderType(promo, deliveryMode) &&
            isItemInPromotion(promo, item.id)
          );
        });
      })
    : (!selectedCategory || selectedCategory === 'all' || selectedCategory === 'الكل'
        ? menuItems
        : menuItems.filter(item => item.category_id != null && String(item.category_id) === String(selectedCategory)));

  const filteredItems = menuSearchQuery.trim() === ''
    ? categoryFilteredItems
    : categoryFilteredItems.filter(item => {
        const q = menuSearchQuery.trim().toLowerCase();
        const titleAr = (item.name || item.name_ar || item.title || '').toLowerCase();
        const titleEn = (item.name_en || '').toLowerCase();
        const descAr = (item.description || '').toLowerCase();
        const descEn = (item.description_en || '').toLowerCase();
        return titleAr.includes(q) || titleEn.includes(q) || descAr.includes(q) || descEn.includes(q);
      });

  const addToCart = (item: CartItem | MenuItem) => {
    setCart(prevCart => {
      if ('cart_item_id' in item && item.cart_item_id) {
        const existingItem = prevCart.find(cartItem => cartItem.cart_item_id === item.cart_item_id);
        if (existingItem) {
          return prevCart.map(cartItem =>
            cartItem.cart_item_id === item.cart_item_id
              ? { ...cartItem, quantity: cartItem.quantity + ('quantity' in item ? item.quantity : 1) }
              : cartItem
          );
        }
        return [...prevCart, { ...item, quantity: 'quantity' in item ? item.quantity : 1 } as CartItem];
      }

      const existingItem = prevCart.find(cartItem => cartItem.id === item.id && !cartItem.cart_item_id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.id === item.id && !cartItem.cart_item_id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prevCart, { ...item, quantity: 1 } as CartItem];
    });
  };

  const removeFromCart = (itemId: string, cartItemId?: string) => {
    setCart(prevCart => {
      if (cartItemId) {
        const existingItem = prevCart.find(cartItem => cartItem.cart_item_id === cartItemId);
        if (existingItem && existingItem.quantity > 1) {
          return prevCart.map(cartItem =>
            cartItem.cart_item_id === cartItemId
              ? { ...cartItem, quantity: cartItem.quantity - 1 }
              : cartItem
          );
        }
        return prevCart.filter(cartItem => cartItem.cart_item_id !== cartItemId);
      }

      const existingItem = prevCart.find(cartItem => cartItem.id === itemId && !cartItem.cart_item_id);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(cartItem =>
          cartItem.id === itemId && !cartItem.cart_item_id
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        );
      }
      return prevCart.filter(cartItem => !(cartItem.id === itemId && !cartItem.cart_item_id));
    });
  };

  const updateCartItem = (cartItemId: string | undefined, itemId: string, isIncrement: boolean) => {
    setCart(prevCart => {
      const item = cartItemId
        ? prevCart.find(ci => ci.cart_item_id === cartItemId)
        : prevCart.find(ci => ci.id === itemId && !ci.cart_item_id);

      if (!item) return prevCart;

      const isWeighted = !!(item as any).is_weighted;
      const step = isWeighted ? 0.5 : 1;
      const currentVal = isWeighted ? ((item.weight ?? item.quantity) as number) : item.quantity;
      const newVal = isIncrement ? currentVal + step : currentVal - step;

      if (newVal <= 0) {
        return cartItemId
          ? prevCart.filter(ci => ci.cart_item_id !== cartItemId)
          : prevCart.filter(ci => !(ci.id === itemId && !ci.cart_item_id));
      }

      const baseUnitPrice = isWeighted
        ? (item.final_price != null ? item.final_price / currentVal : item.price)
        : (item.final_price || item.price);

      const updatedFields = isWeighted
        ? { weight: newVal, final_price: parseFloat((baseUnitPrice * newVal).toFixed(2)) }
        : { quantity: newVal };

      if (cartItemId) {
        return prevCart.map(ci =>
          ci.cart_item_id === cartItemId ? { ...ci, ...updatedFields } : ci
        );
      }
      return prevCart.map(ci =>
        ci.id === itemId && !ci.cart_item_id ? { ...ci, ...updatedFields } : ci
      );
    });
  };

  const getItemQuantity = (itemId: string) => {
    const item = cart.find(cartItem => cartItem.id === itemId && !cartItem.cart_item_id);
    return item?.quantity || 0;
  };

  const getCartItemUnitPrice = useCallback((item: CartItem): number => {
    const activePromo = getActivePromotionForItem(item.id, promotions, selectedBranch, branches, deliveryMode);
    const rawBase = Number(item.original_price ?? item.price ?? 0);

    if (activePromo && Number(activePromo.discount_percentage) > 0) {
      const discountedBase = calculateDiscountedPrice(rawBase, Number(activePromo.discount_percentage));

      if (item.selected_options && Object.keys(item.selected_options).length > 0) {
        let extraPrice = 0;
        Object.values(item.selected_options).forEach((choice: any) => {
          if (Array.isArray(choice)) {
            choice.forEach(c => { extraPrice += (c?.extra_price || 0); });
          } else if (choice) {
            extraPrice += (choice?.extra_price || 0);
          }
        });
        return item.is_weighted && item.weight
          ? Math.round(((discountedBase + extraPrice) * item.weight) * 100) / 100
          : Math.round((discountedBase + extraPrice) * 100) / 100;
      }

      if (item.is_weighted && item.weight) {
        return Math.round((discountedBase * item.weight) * 100) / 100;
      }

      return discountedBase;
    }

    if (item.final_price != null && !item.discount_percentage) {
      return item.final_price;
    }

    if (item.is_weighted && item.weight) {
      return Math.round((rawBase * item.weight) * 100) / 100;
    }

    return rawBase;
  }, [promotions, selectedBranch, branches, deliveryMode]);

  const totalItems = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  const totalPrice = cart.reduce((sum, item) => sum + (getCartItemUnitPrice(item) * (Number(item.quantity) || 1)), 0);

  const getText = (ar: string, en: string) => isRTL ? ar : en;

  const handleAutoLocate = async () => {
    setLocationLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting current location:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const renderCategory = (category: Category) => {
    const isOffers = category.id === 'todays_offers';
    const isActive = selectedCategory === category.id;
    const categoryName = isOffers
      ? getText('العروض', 'Offers')
      : language === 'en'
        ? (category.name_en || category.name || category.title || category.name_ar || 'All')
        : (category.name || category.title || category.name_ar || 'الكل');

    return (
      <TouchableOpacity
        key={category.id}
        style={[
          styles.categoryPill,
          isActive
            ? [styles.categoryPillActive, { backgroundColor: primaryColor }]
            : styles.categoryPillInactive,
          { transform: [{ scaleX: shouldFlipScroll ? -1 : 1 }] }
        ]}
        onPress={() => setSelectedCategory(category.id)}
        activeOpacity={0.85}
      >
        <Text
          style={[
            styles.categoryPillText,
            isActive ? styles.categoryPillTextActive : styles.categoryPillTextInactive,
          ]}
        >
          {categoryName}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderMenuItem = ({ item }: { item: MenuItem }) => {
    const quantity = getItemQuantity(item.id);
    const itemName = language === 'en'
      ? (item.name_en || item.name || item.name_ar || item.title)
      : (item.name || item.name_ar || item.title);
    const itemDesc = language === 'en'
      ? (item.description_en || item.description)
      : (item.description);

    const activePromo = getActivePromotionForItem(item.id, promotions, selectedBranch, branches, deliveryMode);
    const hasDiscount = !!activePromo && Number(activePromo.discount_percentage) > 0;
    const discountPercentage = hasDiscount ? Number(activePromo.discount_percentage) : 0;
    const originalPrice = Number(item.price || 0);
    const discountedPrice = hasDiscount
      ? calculateDiscountedPrice(originalPrice, discountPercentage)
      : originalPrice;

    const handleOpenMealDetail = () => {
      setSelectedMeal({
        ...item,
        original_price: originalPrice,
        final_price: discountedPrice,
        discount_percentage: hasDiscount ? discountPercentage : undefined,
      });
      setSelectedSize('وسط');
      setSelectedAddons([]);
      setSpecialInstructions('');
    };

    const isWeightedOrCustomizable = Boolean((item as any).is_weighted || (item as any).has_options);
    const showPlaceholderImage = !item.image_url || failedItemImages[item.id];

    return (
      <View style={[styles.menuItem, { flexDirection: rtlRow }]}>
        {/* 1. RIGHT SIDE: Rounded Square Image Container */}
        <TouchableOpacity
          style={styles.menuItemImageContainer}
          onPress={handleOpenMealDetail}
          activeOpacity={0.9}
        >
          {showPlaceholderImage ? (
            <View style={styles.menuItemPlaceholderBox}>
              <Ionicons name="image-outline" size={34} color="#356968" />
              <Text style={styles.menuItemPlaceholderText}>
                {getText('صورة الطبق', 'Dish Photo')}
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: item.image_url }}
              style={styles.menuItemImage}
              resizeMode="cover"
              onError={() => setFailedItemImages(prev => ({ ...prev, [item.id]: true }))}
            />
          )}

          {hasDiscount && (
            <View style={[styles.discountTagPill, isRTL ? { right: 6 } : { left: 6 }]}>
              <Text style={styles.discountTagPillText}>
                {discountPercentage}% {getText('خصم', 'OFF')}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 2. MIDDLE / LEFT-OF-IMAGE: Title, Description, Price & Countdown */}
        <TouchableOpacity
          style={[
            styles.menuItemContent,
            { alignItems: alignReadingStart }
          ]}
          onPress={handleOpenMealDetail}
          activeOpacity={0.85}
        >
          <Text
            style={[styles.menuItemTitle, { textAlign: isRTL ? 'right' : 'left' }]}
            numberOfLines={1}
          >
            {itemName}
          </Text>

          {!!itemDesc && (
            <Text
              style={[styles.menuItemDescription, { textAlign: isRTL ? 'right' : 'left' }]}
              numberOfLines={2}
            >
              {itemDesc}
            </Text>
          )}

          {hasDiscount ? (
            <View style={{ alignItems: alignReadingStart, marginTop: 2 }}>
              <View style={{ flexDirection: rtlRow, alignItems: 'baseline', gap: 6 }}>
                <Text style={[styles.discountedPriceText, { color: primaryColor }]}>
                  {discountedPrice} {getText('ر.س', 'SAR')}
                </Text>
                <Text style={styles.originalPriceStrikethrough}>
                  {originalPrice} {getText('ر.س', 'SAR')}
                </Text>
              </View>
              {!!activePromo?.end_date && (
                <View style={{ marginTop: 5 }}>
                  <CircularHourglassCountdown
                    startDate={activePromo.start_date}
                    endDate={activePromo.end_date}
                    primaryColor={primaryColor}
                    onExpire={() => handlePromotionExpired(activePromo.id)}
                  />
                </View>
              )}
            </View>
          ) : (
            <Text style={[styles.menuItemPrice, { color: primaryColor, textAlign: isRTL ? 'right' : 'left' }]}>
              {item.price} {getText('ر.س', 'SAR')}
            </Text>
          )}
        </TouchableOpacity>

        {/* 3. BOTTOM-LEFT / LEFT SIDE: Prominent Dark Teal '+' Button or Expanded Counter */}
        <View style={styles.menuItemActionZone}>
          {quantity === 0 || isWeightedOrCustomizable ? (
            <TouchableOpacity
              style={[styles.expressiveAddButton, { backgroundColor: primaryColor }]}
              onPress={() => {
                if (isWeightedOrCustomizable) {
                  handleOpenMealDetail();
                } else {
                  addToCart({
                    ...item,
                    original_price: originalPrice,
                    final_price: discountedPrice,
                    discount_percentage: hasDiscount ? discountPercentage : undefined,
                  });
                }
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={[styles.expressiveCounterContainer, { flexDirection: rtlRow, borderColor: primaryColor }]}>
              <TouchableOpacity
                style={[styles.expressiveCounterBtn, { backgroundColor: primaryColor }]}
                onPress={() => addToCart({
                  ...item,
                  original_price: originalPrice,
                  final_price: discountedPrice,
                  discount_percentage: hasDiscount ? discountPercentage : undefined,
                })}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={[styles.expressiveCounterText, { color: primaryColor }]}>
                {quantity}
              </Text>
              <TouchableOpacity
                style={styles.expressiveCounterMinusBtn}
                onPress={() => removeFromCart(item.id)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                activeOpacity={0.8}
              >
                <Ionicons name="remove" size={16} color={primaryColor} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderBottomNavItem = (tabId: string, iconName: string, labelAr: string, labelEn: string) => {
    const isActive = activeTab === tabId;

    return (
      <TouchableOpacity
        key={tabId}
        style={[
          styles.bottomNavItem,
          isActive && [styles.bottomNavActivePill, { backgroundColor: primaryColor }],
        ]}
        onPress={() => setActiveTab(tabId)}
        activeOpacity={0.85}
      >
        <Ionicons
          name={iconName as any}
          size={19}
          color={isActive ? '#FFFFFF' : TEXT_TEAL_DARK}
        />
        <Text
          style={isActive ? styles.bottomNavActiveText : styles.bottomNavText}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {getText(labelAr, labelEn)}
        </Text>
      </TouchableOpacity>
    );
  };

  const handlePlaceOrder = async () => {
    if (isSubmitting) return; // Prevent double submission
    
    // Cross-platform alert: RNAlert.alert is a no-op on React Native Web
    const showAlert = (title: string, message: string) => {
      if (typeof window !== 'undefined' && (window as any).alert) {
        (window as any).alert(`${title}\n\n${message}`);
      } else {
        RNAlert.alert(title, message, [{ text: 'حسناً' }]);
      }
    };

    // ── Validation ────────────────────────────────────────────────
    setNameError('');
    setPhoneError('');
    setCardError('');
    let hasError = false;

    if (deliveryMode === 'pickup' && !selectedBranch) {
      RNAlert.alert('تنبيه', 'الرجاء اختيار الفرع لاستلام الطلب', [{ text: 'حسناً' }]);
      hasError = true;
    }

    if (!customerName || customerName.trim() === '') {
      setNameError('الرجاء إدخال الاسم بالكامل');
      hasError = true;
    }

    const saudiPhoneRegex = /^05\d{8}$/;
    if (!customerPhone || !saudiPhoneRegex.test(customerPhone.trim())) {
      setPhoneError('الرجاء إدخال رقم جوال سعودي صحيح يتكون من 10 أرقام ويبدأ بـ 05');
      hasError = true;
    }

    if (paymentMethod === 'card') {
      if (!cardNumber || !/^\d{16}$/.test(cardNumber.replace(/\s+/g, ''))) {
        setCardError('بيانات البطاقة غير صحيحة أو منتهية الصلاحية');
        hasError = true;
      } else if (!cardCVV || !/^\d{3,4}$/.test(cardCVV.trim())) {
        setCardError('بيانات البطاقة غير صحيحة أو منتهية الصلاحية');
        hasError = true;
      } else if (!cardExpiry || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry.trim())) {
        setCardError('بيانات البطاقة غير صحيحة أو منتهية الصلاحية');
        hasError = true;
      } else {
        const [expMonth, expYear] = cardExpiry.split('/').map(Number);
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear() % 100;

        if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
          setCardError('بيانات البطاقة غير صحيحة أو منتهية الصلاحية');
          hasError = true;
        }
      }
    }

    if (hasError) return;

    try {
      setIsSubmitting(true);

      console.log('[Order] Starting submission — cart items:', cart.length);
      const subtotal = cart.reduce(
        (sum, item) => sum + (getCartItemUnitPrice(item) * item.quantity),
        0
      );
      const deliveryFee = deliveryMode === 'delivery' ? 10 : 0;
      let grandTotal = Math.max(0, subtotal + deliveryFee - discount);
      let amountPaidFromWallet = 0;
      if (useWalletBalance && walletBalance > 0) {
        amountPaidFromWallet = Math.min(grandTotal, walletBalance);
        grandTotal = Math.max(0, grandTotal - amountPaidFromWallet);
      }

      // ── Branch Linking ──────────────────────────────────────────
      const matchedBranch = branches.find(
        (b: any) => b.branch_name === selectedBranch || b.id === selectedBranch
      );
      const branchName = deliveryMode === 'pickup'
        ? (matchedBranch?.branch_name || selectedBranch)
        : (branches && branches.length > 0 ? branches[0].branch_name : null);
      const branchId = deliveryMode === 'pickup'
        ? (matchedBranch?.id || null)
        : (branches && branches.length > 0 ? branches[0].id : null);

      const resolvedDeliveryAddress = deliveryMode === 'delivery'
        ? (checkoutDeliveryAddress.trim() || deliveryAddress.trim() || null)
        : null;

      // ── 1. Insert Main Order with Tenant ID ────────────────────────
      const richOrderPayload: any = {
        restaurant_id: TARGET_RESTAURANT_ID, // 1. STRICTLY tied to tenant
        customer_name: customerName.trim(),
        customer_phone: normalizePhone(customerPhone),
        total_amount: grandTotal,
        delivery_type: deliveryMode,
        payment_method: paymentMethod,
        branch_name: branchName,
        branch_id: branchId,
        delivery_address: resolvedDeliveryAddress,
        notes: orderNotes.trim() || null,
        latitude: deliveryMode === 'delivery' ? selectedLocation.latitude : null,
        longitude: deliveryMode === 'delivery' ? selectedLocation.longitude : null,
        status: 'pending' // Initial status
      };

      console.log('[Order] Inserting order payload:', JSON.stringify(richOrderPayload));

      let order: any = null;
      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .insert([richOrderPayload])
        .select()
        .single();

      if (orderError) {
        console.warn('[Order] Rich insert warning, attempting resilient base payload:', orderError.message);
        // Fallback in case optional columns (branch_id, delivery_address, notes) are not present in schema
        const fallbackOrderPayload: any = {
          restaurant_id: TARGET_RESTAURANT_ID,
          customer_name: customerName.trim(),
          customer_phone: normalizePhone(customerPhone),
          total_amount: grandTotal,
          delivery_type: deliveryMode,
          payment_method: paymentMethod,
          branch_name: branchName,
          latitude: deliveryMode === 'delivery' ? selectedLocation.latitude : null,
          longitude: deliveryMode === 'delivery' ? selectedLocation.longitude : null,
          status: 'pending'
        };

        const { data: retryOrder, error: retryError } = await supabase
          .from('orders')
          .insert([fallbackOrderPayload])
          .select()
          .single();

        if (retryError) {
          console.error('[Order] Insert retry FAILED:', retryError);
          throw new Error(retryError.message);
        }
        order = retryOrder;
      } else {
        order = insertedOrder;
      }

      console.log('[Order] Created (Step 1 success) — id:', order.id);

      // ── 2. Bulk Insert Order Items ────────────────────────────────
      const orderId = order.id;
      const itemsPayload = cart.map(item => {
        const itemPrice = getCartItemUnitPrice(item);
        return {
          order_id: orderId,
          menu_item_id: item.id || (item as any).menu_item_id,
          name: item.name || item.name_ar || item.title || '',
          quantity: item.quantity,
          unit_price: itemPrice,
          price: itemPrice * item.quantity
        };
      });

      console.log('[Order] Items payload:', JSON.stringify(itemsPayload));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsPayload);

      if (itemsError) {
        console.error('[Order] Items insert FAILED (Step 2 failed):', JSON.stringify(itemsError));
        throw new Error(`[order_items] ${itemsError.message} (code: ${itemsError.code ?? 'unknown'})`);
      }

      console.log('[Order] Items inserted (Step 2 success):', itemsPayload.length);

      // ── 3. Cleanup & UX ──────────────────────────────────────────
      setCart([]);
      await AsyncStorage.removeItem(CART_STORAGE_KEY);

      setCustomerName('');
      setCustomerPhone('');
      setCheckoutDeliveryAddress('');
      setOrderNotes('');
      setPromoCode('');
      setDiscount(0);
      setIsCartModalVisible(false);
      setPlacedOrderId(order.id);
      setSuccessOrderNumber(String(order.display_id ?? order.id));

    } catch (error: any) {
      const msg = error?.message ?? JSON.stringify(error);
      console.error('[Order] Submission FAILED:', msg);
      showAlert('فشل إرسال الطلب', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayNow = async () => {
    if (isSubmitting) return;

    const showAlert = (title: string, message: string) => {
      if (typeof window !== 'undefined' && (window as any).alert) {
        (window as any).alert(`${title}\n\n${message}`);
      } else {
        RNAlert.alert(title, message, [{ text: 'حسناً' }]);
      }
    };

    if (!session || !session.user) {
      setIsCartModalVisible(false);
      setResumeCheckout(true);
      setTimeout(() => setShowAuthModal(true), 400);
      return;
    }

    if (cart.length === 0) {
      showAlert('السلة فارغة', 'الرجاء إضافة منتجات إلى السلة للمتابعة.');
      return;
    }

    setNameError('');
    setPhoneError('');
    let hasError = false;

    if (deliveryMode === 'pickup' && !selectedBranch) {
      RNAlert.alert('تنبيه', 'الرجاء اختيار الفرع لاستلام الطلب', [{ text: 'حسناً' }]);
      hasError = true;
    }

    const currentCustomerName = (customerName || session.user.user_metadata?.name || 'عميل').trim();
    if (!currentCustomerName) {
      setNameError('الرجاء إدخال الاسم بالكامل');
      hasError = true;
    }

    const currentCustomerPhone = (customerPhone || session.user.phone?.replace('+966', '0') || '').trim();
    const saudiPhoneRegex = /^05\d{8}$/;
    if (!currentCustomerPhone || !saudiPhoneRegex.test(currentCustomerPhone)) {
      setPhoneError('الرجاء إدخال رقم جوال سعودي صحيح يتكون من 10 أرقام ويبدأ بـ 05');
      hasError = true;
    }

    if (hasError) return;

    try {
      setIsSubmitting(true);

      const subtotal = cart.reduce(
        (sum, item) => sum + (getCartItemUnitPrice(item) * item.quantity),
        0
      );
      const deliveryFee = deliveryMode === 'delivery' ? 10 : 0;
      let grandTotal = Math.max(0, subtotal + deliveryFee - discount);
      let amountPaidFromWallet = 0;
      if (useWalletBalance && walletBalance > 0) {
        amountPaidFromWallet = Math.min(grandTotal, walletBalance);
        grandTotal = Math.max(0, grandTotal - amountPaidFromWallet);
      }

      const matchedBranch = branches.find(
        (b: any) => b.branch_name === selectedBranch || b.id === selectedBranch
      );
      const branchName = deliveryMode === 'pickup'
        ? (matchedBranch?.branch_name || selectedBranch)
        : (branches && branches.length > 0 ? branches[0].branch_name : null);
      const branchId = deliveryMode === 'pickup'
        ? (matchedBranch?.id || null)
        : (branches && branches.length > 0 ? branches[0].id : null);

      const resolvedDeliveryAddress = deliveryMode === 'delivery'
        ? (checkoutDeliveryAddress.trim() || deliveryAddress.trim() || null)
        : null;

      const itemsJson = cart.map(item => ({
        menu_item_id: item.id || (item as any).menu_item_id,
        name: item.name || item.name_ar || item.title || '',
        quantity: item.quantity,
        unit_price: getCartItemUnitPrice(item),
        price: getCartItemUnitPrice(item) * item.quantity,
        selected_options: item.selected_options || null,
        notes: item.notes || null,
      }));

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const rawUserId = session?.user?.id;
      const validUserId =
        typeof rawUserId === 'string' &&
        uuidRegex.test(rawUserId) &&
        rawUserId !== '00000000-0000-0000-0000-000000000000'
          ? rawUserId
          : null;

      // ── Step 2: Insert order into Supabase orders table with pending_payment ──
      const orderPayload: any = {
        status: 'pending_payment',
        restaurant_id: 'asmak_almohit_001',
        user_id: validUserId,
        customer_name: currentCustomerName,
        customer_phone: normalizePhone(currentCustomerPhone),
        items: itemsJson,
        total_amount: grandTotal,
        delivery_type: deliveryMode,
        payment_method: paymentMethod,
        branch_name: branchName,
        branch_id: branchId,
        delivery_address: resolvedDeliveryAddress,
        notes: orderNotes.trim() || null,
        latitude: deliveryMode === 'delivery' ? selectedLocation.latitude : null,
        longitude: deliveryMode === 'delivery' ? selectedLocation.longitude : null,
        wallet_amount_used: amountPaidFromWallet,
      };

      console.log('[Moyasar] Inserting order payload:', JSON.stringify(orderPayload));

      let createdOrder: any = null;
      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (orderError) {
        console.warn('[Moyasar] Insert warning, retrying fallback payload:', orderError.message);
        const { items, ...fallbackPayload } = orderPayload;
        if (
          orderError.code === '23503' ||
          orderError.code === '22P02' ||
          orderError.message?.includes('orders_user_id_fkey')
        ) {
          fallbackPayload.user_id = null;
        }
        const { data: retryOrder, error: retryError } = await supabase
          .from('orders')
          .insert([fallbackPayload])
          .select()
          .single();

        if (retryError || !retryOrder) {
          if (
            retryError?.code === '23503' ||
            retryError?.code === '22P02' ||
            retryError?.message?.includes('orders_user_id_fkey')
          ) {
            const { data: finalOrder, error: finalError } = await supabase
              .from('orders')
              .insert([{ ...fallbackPayload, user_id: null }])
              .select()
              .single();

            if (finalOrder && !finalError) {
              createdOrder = finalOrder;
            } else {
              const failMsg = finalError?.message || retryError?.message || orderError.message;
              console.error('[Moyasar] Order creation FAILED:', failMsg);
              showAlert('فشل إرسال الطلب', failMsg);
              return;
            }
          } else {
            const failMsg = retryError?.message || orderError.message;
            console.error('[Moyasar] Order creation FAILED:', failMsg);
            showAlert('فشل إرسال الطلب', failMsg);
            return;
          }
        } else {
          createdOrder = retryOrder;
        }
      } else {
        createdOrder = insertedOrder;
      }

      console.log('[Moyasar] Order created with ID:', createdOrder.id);

      // Insert line items into order_items table for consistency across app
      try {
        const lineItemsPayload = cart.map(item => {
          const itemPrice = getCartItemUnitPrice(item);
          return {
            order_id: createdOrder.id,
            menu_item_id: item.id || (item as any).menu_item_id,
            name: item.name || item.name_ar || item.title || '',
            quantity: item.quantity,
            unit_price: itemPrice,
            price: itemPrice * item.quantity,
          };
        });
        await supabase.from('order_items').insert(lineItemsPayload);
      } catch (lineErr) {
        console.warn('[Moyasar] order_items insert warning:', lineErr);
      }

      // Step 3: Open Payment Modal
      setCurrentMoyasarOrder(createdOrder);
      setIsCartModalVisible(false);
      setIsPaymentModalVisible(true);

    } catch (err: any) {
      const errMsg = err?.message || JSON.stringify(err);
      console.error('[Moyasar] Unexpected checkout error:', errMsg);
      showAlert('فشل إرسال الطلب', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoyasarPaymentResult = async (paymentResult: any) => {
    console.log('[Moyasar] Payment result received:', JSON.stringify(paymentResult));

    const showAlert = (title: string, message: string) => {
      if (typeof window !== 'undefined' && (window as any).alert) {
        (window as any).alert(`${title}\n\n${message}`);
      } else {
        RNAlert.alert(title, message, [{ text: 'حسناً' }]);
      }
    };

    const status = paymentResult?.status;
    const isPaid = status === 'paid';

    if (isPaid) {
      // 1. Close payment modal
      setIsPaymentModalVisible(false);

      // 2. Clear cart & local storage
      setCart([]);
      await AsyncStorage.removeItem(CART_STORAGE_KEY);

      // 3. Clear checkout inputs
      setCustomerName('');
      setCustomerPhone('');
      setCheckoutDeliveryAddress('');
      setOrderNotes('');
      setPromoCode('');
      setDiscount(0);

      const orderId = currentMoyasarOrder?.id;
      if (orderId) {
        setPlacedOrderId(orderId);
        setSuccessOrderNumber(String(currentMoyasarOrder.display_id ?? orderId));
      }

      // 4. Show Arabic confirmation alert
      showAlert('تم بنجاح', 'تم الدفع واستلام طلبك بنجاح!');
    } else {
      // Payment failed or cancelled
      const errorMsg =
        paymentResult?.source?.message ||
        paymentResult?.message ||
        'لم تكتمل عملية الدفع بنجاح. يرجى التأكد من صحة بيانات البطاقة ورصيدها والمحاولة مرة أخرى.';
      showAlert('فشل الدفع', `لم تكتمل عملية الدفع: ${errorMsg}`);
    }
  };

  const renderPaymentModal = () => {
    if (!currentMoyasarOrder) return null;

    return (
      <MoyasarPaymentModal
        visible={isPaymentModalVisible}
        onClose={() => setIsPaymentModalVisible(false)}
        amount={Number(currentMoyasarOrder.total_amount)}
        orderId={currentMoyasarOrder.id}
        displayOrderId={currentMoyasarOrder.display_id}
        deliveryType={currentMoyasarOrder.delivery_type}
        primaryColor={primaryColor}
        isRTL={isRTL}
        getText={getText}
        onPaymentResult={handleMoyasarPaymentResult}
      />
    );
  };

  const renderCartModal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (getCartItemUnitPrice(item) * item.quantity), 0);
    const deliveryFee = deliveryMode === 'delivery' ? 10 : 0;
    let total = subtotal + deliveryFee - discount;
    if (useWalletBalance && walletBalance > 0) {
      total = Math.max(0, total - walletBalance);
    }
    const cashbackPercentage = restaurant?.cashback_percentage || 5;
    const minOrderValue = restaurant?.min_order_value || 100;
    const potentialCashback = subtotal * (cashbackPercentage / 100);
    const amountToMinOrder = Math.max(0, minOrderValue - subtotal);

    const sectionTitle = (ar: string, en: string) => (
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 14, marginTop: 4 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
        <Text style={{ marginHorizontal: 10, fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {getText(ar, en)}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
      </View>
    );

    const paymentOptions: { key: 'cash' | 'applepay' | 'mada' | 'card'; labelAr: string; labelEn: string; icon: string }[] = [
      { key: 'applepay', labelAr: 'Apple Pay', labelEn: 'Apple Pay', icon: 'apple-pay' },
      { key: 'mada', labelAr: 'مدى', labelEn: 'Mada', icon: 'credit-card' },
      { key: 'card', labelAr: 'بطاقة ائتمان', labelEn: 'Credit Card', icon: 'credit-card' },
      { key: 'cash', labelAr: 'كاش', labelEn: 'Cash', icon: 'money-bill-wave' },
    ];

    return (
      <Modal
        visible={isCartModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCartModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.cartModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.cartModalBackdrop}
            activeOpacity={1}
            onPress={() => setIsCartModalVisible(false)}
          />
          <View style={[styles.cartModalContent, { height: '88%', maxHeight: '92%' }]}>

            {/* ── Header ── */}
            <View style={[styles.cartModalHeader, { flexDirection: rtlRow }]}>
              <Text style={styles.cartModalTitle}>{getText('ملخص الطلب والدفع', 'Order Summary')}</Text>
              <TouchableOpacity
                onPress={() => setIsCartModalVisible(false)}
                style={{
                  flexDirection: rtlRow,
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: '#F1F5F9',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                }}
              >
                <Ionicons name="close" size={18} color="#1E293B" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>
                  {getText('إغلاق', 'Close')}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >

              {/* ── SECTION 1: Cart Items ── */}
              {sectionTitle('طلبك', 'Your Order')}
              <View style={{ backgroundColor: '#F9FAFB', borderRadius: 14, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' }}>
                {cart.map((item, idx) => (
                  <View
                    key={item.cart_item_id || item.id}
                    style={[{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }, idx < cart.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }]}
                  >
                    <View style={[{ flex: 1 }, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B', textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>
                        {language === 'en' ? (item.name_en || item.name || item.name_ar || item.title) : (item.name || item.name_ar || item.title)}
                        {item.weight ? ` (${item.weight} ${getText('كجم', 'kg')})` : ''}
                      </Text>

                      {item.selected_options && Object.keys(item.selected_options).length > 0 && (
                        <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                          {Object.values(item.selected_options).map(opt => Array.isArray(opt) ? opt.map(o => o.name_ar || o.name).join(', ') : opt.name_ar || opt.name).filter(Boolean).join(', ')}
                        </Text>
                      )}

                      {item.notes ? (
                        <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                          {getText('ملاحظة:', 'Note:')} {item.notes}
                        </Text>
                      ) : null}

                      {(() => {
                        const unitPrice = getCartItemUnitPrice(item);
                        const activePromo = getActivePromotionForItem(item.id, promotions, selectedBranch, branches, deliveryMode);
                        const hasDiscount = !!activePromo && Number(activePromo.discount_percentage) > 0;
                        const originalPrice = item.original_price || item.price;
                        return hasDiscount ? (
                          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#10B981' }}>
                              {unitPrice} {getText('ر.س', 'SAR')}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#9CA3AF', textDecorationLine: 'line-through' }}>
                              {originalPrice} {getText('ر.س', 'SAR')}
                            </Text>
                            <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                              <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '800' }}>
                                {activePromo.discount_percentage}% OFF 🔥
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <Text style={{ fontSize: 13, color: primaryColor, marginTop: 4 }}>
                            {`${unitPrice} ${getText('ر.س', 'SAR')}`}
                          </Text>
                        );
                      })()}
                    </View>
                    {/* Unified Smart Counter */}
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => updateCartItem(item.cart_item_id, item.id, true)}
                      >
                        <Ionicons name="add" size={15} color={primaryColor} />
                      </TouchableOpacity>
                      <View style={{ backgroundColor: '#F1F5F9', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, minWidth: 44, alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>
                          {(item as any).is_weighted
                            ? `${item.weight ?? item.quantity} ${getText('كجم', 'kg')}`
                            : `${item.quantity}`}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => updateCartItem(item.cart_item_id, item.id, false)}
                      >
                        <Ionicons name="remove" size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {/* ── SECTION 2: Order Mode ── */}
              {sectionTitle('طريقة الاستلام', 'Fulfillment')}
              <View
                style={{
                  alignSelf: 'center',
                  width: '80%',
                  maxWidth: 320,
                  flexDirection: rtlRow,
                  backgroundColor: '#F1F5F9',
                  borderRadius: 12,
                  padding: 4,
                  gap: 6,
                  marginBottom: 14,
                }}
              >
                {(['delivery', 'pickup'] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setDeliveryMode(mode)}
                    style={[{
                      width: '49%',
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      borderRadius: 10,
                      alignItems: 'center',
                      flexDirection: rtlRow,
                      justifyContent: 'center',
                      gap: 6,
                    }, deliveryMode === mode
                      ? { backgroundColor: primaryColor }
                      : { backgroundColor: 'transparent' }]}
                  >
                    <Ionicons
                      name={mode === 'delivery' ? 'car-outline' : 'storefront-outline'}
                      size={17}
                      color={deliveryMode === mode ? '#FFFFFF' : '#64748B'}
                    />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: deliveryMode === mode ? '#FFFFFF' : '#64748B' }}>
                      {mode === 'delivery' ? getText('توصيل', 'Delivery') : getText('استلام', 'Pickup')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {deliveryMode === 'delivery' ? (
                <View style={{ marginBottom: 20, gap: 10 }}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setIsCartModalVisible(false);
                      setTimeout(() => setShowLocationModal(true), 250);
                    }}
                    style={{
                      width: '100%',
                      flexDirection: rtlRow,
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#F8FAFC',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      gap: 10,
                    }}
                  >
                    <Ionicons name="location-outline" size={20} color={primaryColor} />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#1E293B',
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                      numberOfLines={1}
                    >
                      {checkoutDeliveryAddress || deliveryAddress || getText('تحديد موقع التوصيل على الخريطة', 'Select delivery location on map')}
                    </Text>
                    <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color="#64748B" />
                  </TouchableOpacity>

                  <View style={{ height: 220, width: '100%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', position: 'relative' }}>
                  {Platform.OS === 'web' ? (
                    <View style={{ flex: 1, backgroundColor: '#eee', borderRadius: 10, overflow: 'hidden' }}>
                      {/* @ts-ignore */}
                      <iframe
                        src={`https://maps.google.com/maps?q=${selectedLocation.latitude},${selectedLocation.longitude}&hl=ar&z=15&output=embed`}
                        style={{ width: '100%', height: '100%', border: 0 }}
                      />
                      <Text style={{ textAlign: 'center', padding: 5, fontSize: 12, color: '#555' }}>
                        (هذه خريطة محاكاة للمتصفح. في الجوال ستعمل الخريطة الأصلية)
                      </Text>
                    </View>
                  ) : (
                    <>
                      <MapView
                        provider={PROVIDER_GOOGLE}
                        style={{ flex: 1 }}
                        initialRegion={{
                          latitude: selectedLocation.latitude,
                          longitude: selectedLocation.longitude,
                          latitudeDelta: 0.05,
                          longitudeDelta: 0.05,
                        }}
                        zoomControlEnabled={false}
                        showsCompass={false}
                        rotateEnabled={false}
                        pitchEnabled={false}
                        toolbarEnabled={false}
                        moveOnMarkerPress={false}
                        showsMyLocationButton={false}
                        onRegionChangeComplete={(region: any) => setSelectedLocation({ latitude: region.latitude, longitude: region.longitude })}
                      />
                      <View pointerEvents="none" style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -16, marginTop: -32 }}>
                        <Ionicons name="location" size={32} color="#EF4444" />
                      </View>
                    </>
                  )}
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      bottom: 15,
                      left: 15,
                      backgroundColor: 'white',
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      alignItems: 'center',
                      justifyContent: 'center',
                      elevation: 9999,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 5,
                      zIndex: 9999,
                    }}
                    onPress={async () => {
                      try {
                        let { status } = await Location.requestForegroundPermissionsAsync();
                        if (status === 'granted') {
                          let loc = await Location.getCurrentPositionAsync({});
                          setSelectedLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                        } else {
                          alert('تم رفض صلاحية الوصول للموقع.');
                        }
                      } catch (error) {
                        console.warn('Location error:', error);
                      }
                    }}
                  >
                    <Ionicons name="navigate-sharp" size={24} color="#007bff" />
                  </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>
                    {getText('اختر الفرع', 'Select Branch')}
                  </Text>
                  
                  <View style={{ gap: 10 }}>
                    {branches && branches.length > 0 ? (
                      branches.map((branchObj: any) => {
                        const branchName = branchObj.branch_name || branchObj.name;
                        const isSelected = selectedBranch === branchName;
                        return (
                          <TouchableOpacity
                            key={branchObj.id || branchName}
                            onPress={() => setSelectedBranch(branchName)}
                            style={[{
                              width: '100%',
                              flexDirection: rtlRow,
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingVertical: 13,
                              paddingHorizontal: 14,
                              borderRadius: 12,
                              borderWidth: 1.5,
                              gap: 10,
                            }, isSelected
                              ? { borderColor: primaryColor, backgroundColor: '#EEF2FF' }
                              : { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }]}
                          >
                            <Ionicons
                              name="storefront-outline"
                              size={18}
                              color={isSelected ? primaryColor : '#64748B'}
                            />
                            <Text
                              style={{
                                flex: 1,
                                fontSize: 14,
                                color: isSelected ? primaryColor : '#374151',
                                fontWeight: isSelected ? '700' : '600',
                                textAlign: isRTL ? 'right' : 'left',
                              }}
                              numberOfLines={1}
                            >
                              {branchName}
                            </Text>
                            <Ionicons
                              name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                              size={20}
                              color={isSelected ? primaryColor : '#9CA3AF'}
                            />
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <View style={{ padding: 12, backgroundColor: '#F8FAFC', borderRadius: 8, width: '100%', alignItems: 'center' }}>
                        <Text style={{ color: '#94A3B8', fontSize: 14 }}>
                          {getText('جاري تحميل الفروع...', 'Loading branches...')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* ── SECTION 3: Customer Info ── */}
              {sectionTitle('بيانات العميل', 'Customer Info')}
              <View style={{ marginBottom: 20, gap: 10 }}>
                {nameError ? (
                  <Text style={{ color: '#EF4444', fontSize: 12, textAlign: isRTL ? 'right' : 'left', marginBottom: 4 }}>
                    {nameError}
                  </Text>
                ) : null}
                <TextInput
                  style={[styles.cartModalNotesInput, { textAlign: isRTL ? 'right' : 'left', minHeight: 48, borderColor: nameError ? '#EF4444' : '#E5E7EB' }]}
                  placeholder={getText('الاسم الكامل', 'Full Name')}
                  placeholderTextColor="#9CA3AF"
                  value={customerName}
                  onChangeText={(text) => { setCustomerName(text); if (nameError) setNameError(''); }}
                />
                <TextInput
                  style={[styles.cartModalNotesInput, { textAlign: isRTL ? 'right' : 'left', minHeight: 48, borderColor: phoneError ? '#EF4444' : '#E5E7EB' }]}
                  placeholder={getText('رقم الجوال (05XXXXXXXX)', 'Phone Number (05XXXXXXXX)')}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={customerPhone}
                  onChangeText={(text) => { setCustomerPhone(text); if (phoneError) setPhoneError(''); }}
                />
                {phoneError ? (
                  <Text style={{ color: '#EF4444', fontSize: 12, textAlign: isRTL ? 'right' : 'left' }}>
                    {phoneError}
                  </Text>
                ) : null}
                {deliveryMode === 'delivery' && (
                  <View style={{ gap: 8 }}>
                    {savedAddresses.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ flexDirection: rtlRow, gap: 8, paddingVertical: 2 }}
                      >
                        {savedAddresses.map((addr: any, idx: number) => {
                          const addrTitle = addr.label || addr.address_type || getText('عنوان', 'Address');
                          const isSelectedAddr = checkoutDeliveryAddress === addr.address_text;
                          return (
                            <TouchableOpacity
                              key={addr.id || idx}
                              onPress={() => {
                                const text = addr.address_text || addrTitle;
                                setCheckoutDeliveryAddress(text);
                                setDeliveryAddress(text);
                                if (typeof addr.latitude === 'number' && typeof addr.longitude === 'number') {
                                  setSelectedLocation({ latitude: addr.latitude, longitude: addr.longitude });
                                }
                              }}
                              style={{
                                flexDirection: rtlRow,
                                alignItems: 'center',
                                gap: 6,
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: isSelectedAddr ? primaryColor : '#E2E8F0',
                                backgroundColor: isSelectedAddr ? `${primaryColor}15` : '#F8FAFC',
                              }}
                            >
                              <Ionicons name="location-outline" size={14} color={isSelectedAddr ? primaryColor : '#64748B'} />
                              <Text style={{ fontSize: 12.5, fontWeight: '600', color: isSelectedAddr ? primaryColor : '#334155' }}>
                                {addrTitle}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                    <TextInput
                      style={[styles.cartModalNotesInput, { textAlign: isRTL ? 'right' : 'left', minHeight: 48, borderColor: '#E5E7EB' }]}
                      placeholder={getText('عنوان التوصيل (الحي، الشارع، رقم المبنى)', 'Delivery Address (District, Street, Building)')}
                      placeholderTextColor="#9CA3AF"
                      value={checkoutDeliveryAddress}
                      onChangeText={setCheckoutDeliveryAddress}
                    />
                  </View>
                )}
                <TextInput
                  style={[styles.cartModalNotesInput, { textAlign: isRTL ? 'right' : 'left', minHeight: 80 }]}
                  placeholder={getText('ملاحظات (اختياري)', 'Notes (optional)')}
                  placeholderTextColor="#9CA3AF"
                  value={orderNotes}
                  onChangeText={setOrderNotes}
                  multiline
                />
              </View>

              {/* ── SECTION 4: Promo Code ── */}
              {sectionTitle('كود الخصم', 'Promo Code')}
              <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginBottom: 20 }]}>
                <TextInput
                  style={[styles.cartModalNotesInput, { flex: 1, textAlign: isRTL ? 'right' : 'left', minHeight: 48 }]}
                  placeholder={getText('أدخل الكود', 'Enter code')}
                  placeholderTextColor="#9CA3AF"
                  value={promoCode}
                  onChangeText={setPromoCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={{ backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}
                  onPress={() => alert(getText('هذه الميزة قادمة قريباً!', 'Coming soon!'))}
                >
                  <Text style={{ color: primaryColor, fontWeight: '700', fontSize: 14 }}>
                    {getText('تطبيق', 'Apply')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── SECTION 5: Payment Method ── */}
              {sectionTitle('طريقة الدفع', 'Payment Method')}
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                {paymentOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setPaymentMethod(opt.key)}
                    style={[{
                      flex: 1,
                      minWidth: '45%',
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      borderRadius: 12,
                      borderWidth: 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }, paymentMethod === opt.key
                      ? { borderColor: primaryColor, backgroundColor: '#EEF2FF' }
                      : { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }]}
                  >
                    {opt.key === 'applepay' && (
                      <FontAwesome5 name="apple-pay" size={26} color="#000" />
                    )}
                    {opt.key === 'mada' && (
                      <FontAwesome5 name="credit-card" size={22} color="#004B87" />
                    )}
                    {opt.key === 'card' && (
                      <FontAwesome5 name="credit-card" size={22} color="#1a1f71" />
                    )}
                    {opt.key === 'cash' && (
                      <FontAwesome5 name="money-bill-wave" size={22} color="#28a745" />
                    )}
                    <Text style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: paymentMethod === opt.key ? primaryColor : '#64748B',
                      textAlign: 'center',
                    }}>
                      {getText(opt.labelAr, opt.labelEn)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Conditional Credit Card Info Badge (Moyasar) ── */}
              {(paymentMethod === 'card' || paymentMethod === 'applepay' || paymentMethod === 'mada') && (
                <View style={{
                  marginBottom: 20,
                  padding: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  backgroundColor: '#F8FAFC',
                  gap: 10,
                }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="shield-checkmark" size={22} color="#10B981" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', textAlign: isRTL ? 'right' : 'left' }}>
                        {getText('دفع إلكتروني فوري وآمن (Moyasar)', 'Secure Instant Payment (Moyasar)')}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748B', textAlign: isRTL ? 'right' : 'left' }}>
                        {getText('مشفر بالكامل وفق معايير PCI DSS مع التحقق برمز OTP', 'Encrypted via PCI DSS with 3DS OTP verification')}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#EEF2F6' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#004B87' }}>مدى mada</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1F71' }}>VISA</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#EB001B' }}>MasterCard</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#016FD0' }}>AMEX</Text>
                  </View>
                </View>
              )}

              {/* ── SECTION 6: Financial Summary ── */}
              {walletBalance > 0 && (
                <View style={{ marginBottom: 20 }}>
                  {sectionTitle('الدفع بالمحفظة', 'Pay with Wallet')}
                  <TouchableOpacity
                    style={[{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      padding: 16,
                      borderWidth: 1.5,
                      borderRadius: 12,
                      gap: 12
                    }, useWalletBalance ? { borderColor: primaryColor, backgroundColor: '#EEF2FF' } : { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }]}
                    onPress={() => setUseWalletBalance(!useWalletBalance)}
                  >
                    <Ionicons name="wallet" size={24} color={useWalletBalance ? primaryColor : '#9CA3AF'} />
                    <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: useWalletBalance ? primaryColor : '#1E293B' }}>
                        {getText('الدفع باستخدام رصيد المحفظة', 'Pay with Wallet Balance')}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                        {getText(`الرصيد المتاح: ${walletBalance.toFixed(2)} ر.س`, `Available Balance: ${walletBalance.toFixed(2)} SAR`)}
                      </Text>
                    </View>
                    <Ionicons
                      name={useWalletBalance ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={useWalletBalance ? primaryColor : '#CBD5E1'}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {cashbackPercentage > 0 && (
                <View style={{ marginBottom: 20 }}>
                  {subtotal < minOrderValue ? (
                    <View style={{ backgroundColor: '#EFF6FF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE', flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name="bag-handle" size={22} color="#3B82F6" />
                      <Text style={{ color: '#1D4ED8', fontSize: 13, fontWeight: '600', flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                        {getText(
                          `أضف منتجات بقيمة ${amountToMinOrder.toFixed(2)} ريال إضافية لتحصل على كاش باك بنسبة ${cashbackPercentage}%!`,
                          `Add items worth ${amountToMinOrder.toFixed(2)} SAR to earn ${cashbackPercentage}% cashback!`
                        )}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#A7F3D0', flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name="gift" size={22} color="#10B981" />
                      <Text style={{ color: '#047857', fontSize: 13, fontWeight: '600', flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                        {getText(
                          `رائع! 🤩 ستحصل على ${potentialCashback.toFixed(2)} ريال في محفظتك عند إتمام هذا الطلب!`,
                          `Awesome! 🤩 You will earn ${potentialCashback.toFixed(2)} SAR in your wallet upon completing this order!`
                        )}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {sectionTitle('ملخص الطلب', 'Order Summary')}
              <View style={{ backgroundColor: '#F9FAFB', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ color: '#64748B', fontSize: 14 }}>{getText('المجموع الفرعي', 'Subtotal')}</Text>
                  <Text style={{ color: '#1E293B', fontSize: 14 }}>{`${subtotal} ${getText('ر.س', 'SAR')}`}</Text>
                </View>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ color: '#64748B', fontSize: 14 }}>{getText('رسوم التوصيل', 'Delivery Fee')}</Text>
                  <Text style={{ color: '#1E293B', fontSize: 14 }}>{deliveryMode === 'delivery' ? `10 ${getText('ر.س', 'SAR')}` : getText('مجاني', 'Free')}</Text>
                </View>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ color: '#64748B', fontSize: 14 }}>{getText('الخصم', 'Discount')}</Text>
                  <Text style={{ color: '#16A34A', fontSize: 14 }}>{`- 0 ${getText('ر.س', 'SAR')}`}</Text>
                </View>
                <View style={{ height: 1, backgroundColor: '#E5E7EB', marginBottom: 12 }} />
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1E293B' }}>{getText('الإجمالي', 'Total')}</Text>
                  <Text style={{ fontSize: 17, fontWeight: 'bold', color: primaryColor }}>{`${total} ${getText('ر.س', 'SAR')}`}</Text>
                </View>
              </View>

            </ScrollView>

            {/* ── Submit Button ── */}
            <View style={[styles.cartModalFooter, { paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) }]}>
              <TouchableOpacity
                style={[styles.cartCheckoutButton, { backgroundColor: primaryColor }, isSubmitting && { opacity: 0.7 }]}
                onPress={() => {
                  console.log('[Checkout] Submit / Pay Now button pressed');
                  if (!session) {
                    setIsCartModalVisible(false);
                    setResumeCheckout(true);
                    setTimeout(() => setShowAuthModal(true), 400);
                  } else {
                    if (paymentMethod === 'cash') {
                      handlePlaceOrder();
                    } else {
                      handlePayNow();
                    }
                  }
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons
                      name={session ? (paymentMethod === 'cash' ? "checkmark-circle-outline" : "card-outline") : "log-in-outline"}
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.cartCheckoutButtonText}>
                      {session
                        ? (paymentMethod === 'cash'
                            ? getText('إرسال الطلب (كاش)', 'Submit Order (Cash)')
                            : getText('إرسال الطلب / ادفع الآن', 'Submit Order / Pay Now'))
                        : getText('تسجيل الدخول للمتابعة', 'Login to Continue')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const renderOrderTrackingModal = () => {
    if (!trackingOrderId || !trackedOrder) return null;

    const statusInfo = getOrderStatusDetails(trackedOrder.status, trackedOrder.delivery_mode, isRTL);
    const orderDisplayNum = trackedOrder.display_id || `#${trackedOrder.id.slice(0, 6)}`;
    const currentStep = statusInfo.step;

    const steps = [
      { id: 1, labelAr: 'تم الاستلام', labelEn: 'Received', icon: 'checkmark-circle' },
      { id: 2, labelAr: 'قيد التجهيز', labelEn: 'Preparing', icon: 'restaurant' },
      { id: 3, labelAr: trackedOrder.delivery_mode === 'delivery' ? 'في الطريق' : 'جاهز للاستلام', labelEn: trackedOrder.delivery_mode === 'delivery' ? 'On The Way' : 'Ready', icon: trackedOrder.delivery_mode === 'delivery' ? 'car' : 'bag-check' },
      { id: 4, labelAr: 'تم التسليم', labelEn: 'Delivered', icon: 'flag' },
    ];

    return (
      <Modal visible={!!trackingOrderId} animationType="slide" transparent={true} onRequestClose={() => setTrackingOrderId(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          {/* In-Modal Toast if active */}
          {renderStatusToast()}

          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 420, maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 15 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
              
              {/* Header with Live Indicator & Close */}
              <View style={{ width: '100%', flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669' }}>
                    {getText('مباشر • Realtime', 'Live • Realtime')}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setTrackingOrderId(null)}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Icon & Title */}
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: statusInfo.bgColor, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name={statusInfo.icon as any} size={38} color={statusInfo.color} />
              </View>

              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#0F172A', marginBottom: 4, textAlign: 'center' }}>
                {getText('تتبع حالة الطلب', 'Track Order Status')}
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#64748B', marginBottom: 20, textAlign: 'center' }}>
                {getText(`طلب رقم: ${orderDisplayNum}`, `Order No: ${orderDisplayNum}`)}
              </Text>

              {/* Status Card */}
              <View style={{ backgroundColor: statusInfo.bgColor, borderRadius: 18, padding: 16, width: '100%', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: `${statusInfo.color}30` }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: statusInfo.color, marginBottom: 4, textAlign: 'center' }}>
                  {statusInfo.title}
                </Text>
                <Text style={{ fontSize: 13, color: '#334155', textAlign: 'center', lineHeight: 18 }}>
                  {statusInfo.description}
                </Text>
              </View>

              {/* Visual Stepper / Progress Bar (for standard flow) */}
              {trackedOrder.status !== 'cancelled' && (
                <View style={{ width: '100%', marginBottom: 24, paddingHorizontal: 6 }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    {steps.map((st) => {
                      const isCompleted = currentStep >= st.id;
                      const isCurrent = currentStep === st.id;
                      return (
                        <View key={st.id} style={{ alignItems: 'center', flex: 1 }}>
                          <View
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 17,
                              backgroundColor: isCompleted ? primaryColor : '#E2E8F0',
                              justifyContent: 'center',
                              alignItems: 'center',
                              borderWidth: isCurrent ? 3 : 0,
                              borderColor: `${primaryColor}40`,
                              marginBottom: 6,
                            }}
                          >
                            <Ionicons
                              name={st.icon as any}
                              size={16}
                              color={isCompleted ? '#FFFFFF' : '#94A3B8'}
                            />
                          </View>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: isCurrent ? 'bold' : '500',
                              color: isCompleted ? '#0F172A' : '#94A3B8',
                              textAlign: 'center',
                            }}
                          >
                            {getText(st.labelAr, st.labelEn)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Order Info Summary */}
              <View style={{ width: '100%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 20, gap: 10 }}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#64748B' }}>{getText('نوع الاستلام:', 'Order Type:')}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>
                    {trackedOrder.delivery_mode === 'delivery' ? getText('توصيل إلى العنوان 🚗', 'Delivery to Address 🚗') : getText('استلام من الفرع 🛍️', 'Pickup from Branch 🛍️')}
                  </Text>
                </View>
                {trackedOrder.restaurant_branches?.name && (
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#64748B' }}>{getText('الفرع:', 'Branch:')}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>{trackedOrder.restaurant_branches.name}</Text>
                  </View>
                )}
                {trackedOrder.delivery_address && (
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#64748B' }}>{getText('العنوان:', 'Address:')}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B', maxWidth: '65%', textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>{trackedOrder.delivery_address}</Text>
                  </View>
                )}
                <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 2 }} />
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{getText('المبلغ الإجمالي:', 'Total Amount:')}</Text>
                  <Text style={{ fontSize: 17, fontWeight: 'bold', color: primaryColor }}>{trackedOrder.total_amount} {getText('ر.س', 'SAR')}</Text>
                </View>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                style={{ backgroundColor: primaryColor, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, width: '100%', alignItems: 'center' }}
                onPress={() => setTrackingOrderId(null)}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>
                  {getText('إغلاق والعودة', 'Close & Return')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderSuccessModal = () => {
    const displayOrderId = successOrderNumber || '';
    return (
      <Modal
        visible={successOrderNumber !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSuccessOrderNumber(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            padding: 32,
            alignItems: 'center',
            width: '100%',
            maxWidth: 360,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 10,
          }}>
            {/* Checkmark Icon */}
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 40 }}>{'✅'}</Text>
            </View>

            {/* Title */}
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginBottom: 24, textAlign: 'center' }}>
              {getText('تم إرسال طلبك بنجاح!', 'Order Placed Successfully!')}
            </Text>

            {/* Order Details */}
            <View style={{ backgroundColor: '#F1F5F9', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 24, marginBottom: 28, width: '100%', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#334155', textAlign: 'center' }}>
                {getText(`رقم الطلب: ${displayOrderId}`, `Order Number: ${displayOrderId}`)}
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: primaryColor, textAlign: 'center' }}>
                {deliveryMode === 'delivery' ? getText('نوع الطلب: توصيل', 'Order Type: Delivery') : getText('نوع الطلب: استلام من الفرع', 'Order Type: Branch Pickup')}
              </Text>
            </View>

            {/* Track Order Live Button */}
            <TouchableOpacity
              style={{
                backgroundColor: primaryColor,
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 24,
                width: '100%',
                alignItems: 'center',
                marginBottom: 10,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                justifyContent: 'center',
                gap: 8,
              }}
              onPress={() => {
                const oId = placedOrderId;
                setSuccessOrderNumber(null);
                if (oId) {
                  setTrackingOrderId(oId);
                } else {
                  setActiveTab('orders');
                }
              }}
            >
              <Ionicons name="pulse" size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>
                {getText('تتبع حالة الطلب مباشرة ⚡', 'Track Order Live ⚡')}
              </Text>
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
              style={{ backgroundColor: '#F1F5F9', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, width: '100%', alignItems: 'center' }}
              onPress={() => {
                setCart([]);
                setSuccessOrderNumber(null);
                setActiveTab('menu');
              }}
            >
              <Text style={{ color: '#64748B', fontSize: 15, fontWeight: '600' }}>
                {getText('العودة للقائمة الرئيسية', 'Return to Main Menu')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderMenuSkeleton = () => (
    <View style={{ paddingHorizontal: 16, gap: 14, paddingTop: 4 }}>
      {[1, 2, 3, 4].map((_, idx) => (
        <View
          key={idx}
          style={{
            flexDirection: rtlRow,
            backgroundColor: CARD_MINT,
            borderRadius: 24,
            padding: 12,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 104,
              height: 104,
              borderRadius: 20,
              backgroundColor: CARD_IMAGE_MINT,
            }}
          />
          <View style={{ flex: 1, marginHorizontal: 14, gap: 9, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <View style={{ width: '72%', height: 17, borderRadius: 9, backgroundColor: '#C5E6DC' }} />
            <View style={{ width: '92%', height: 12, borderRadius: 6, backgroundColor: '#D3EDE5' }} />
            <View style={{ width: '44%', height: 15, borderRadius: 8, backgroundColor: '#C5E6DC', marginTop: 4 }} />
          </View>
          <View
            style={{
              width: 52,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#C5E6DC',
            }}
          />
        </View>
      ))}
      <View style={{ alignItems: 'center', paddingVertical: 14 }}>
        <ActivityIndicator size="small" color={primaryColor} />
        <Text style={{ marginTop: 8, fontSize: 13, color: TEXT_TEAL_MUTED }}>
          {getText('جاري تحديث قائمة الطعام...', 'Updating menu catalog...')}
        </Text>
      </View>
    </View>
  );

  const renderMenuTab = () => {
    return (
      <View style={{ flex: 1, backgroundColor: BG_WARM }}>
        <ScrollView
          style={styles.menuScrollRoot}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.menuScrollContent, { paddingBottom: 130 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Decorative Organic Background Shapes (Material Expressive Mockup) */}
          <View pointerEvents="none" style={styles.bgDecorTopRight}>
            <Svg width={270} height={125} viewBox="0 0 270 125">
              <Path
                d="M 18,0 C 52,38 118,86 270,114 L 270,0 Z"
                fill="#DCEFE9"
              />
            </Svg>
          </View>
          <View pointerEvents="none" style={styles.bgDecorMidLeft}>
            <Svg width={66} height={150} viewBox="0 0 66 150">
              <Path
                d="M 0,14 C 28,2 62,16 58,54 C 54,90 22,122 0,144 Z"
                fill="#AEE2D6"
              />
            </Svg>
          </View>

          {/* 1. Top Location Pill + Organic Wavy Promo Banner + Restaurant Info + Search & Action Pills */}
          {renderMenuHeader()}

          {/* 2. Horizontal Scrolling Category Pills */}
          <View style={styles.categoriesContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.categoriesList, { flexDirection: 'row' }]}
              style={{ transform: [{ scaleX: shouldFlipScroll ? -1 : 1 }] }}
            >
              {categories.map(renderCategory)}
            </ScrollView>
          </View>

          {/* 3. Section Heading: "من قائمتنا" + Expressive Orange Splash Droplets */}
          <View style={[styles.fromOurMenuHeader, { flexDirection: rtlRow }]}>
            <Text style={[styles.fromOurMenuTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {getText('من قائمتنا', 'From Our Menu')}
            </Text>
            <View style={[styles.fromOurMenuSplash, !isRTL && { transform: [{ scaleX: -1 }] }]}>
              <Svg width={28} height={26} viewBox="0 0 28 26">
                {/* Upper-right vertical droplet */}
                <Path
                  d="M 21.5,12.5 C 19.2,7.2 21.2,1.5 24.2,2.2 C 27,2.9 25.4,8.8 21.5,12.5 Z"
                  fill={ACCENT_ORANGE}
                />
                {/* Middle diagonal droplet */}
                <Path
                  d="M 16.5,16.5 C 10.6,12.2 8.8,6.2 11.6,4.2 C 14.4,2.3 18.2,9.2 16.5,16.5 Z"
                  fill={ACCENT_ORANGE}
                />
                {/* Lower-left horizontal droplet */}
                <Path
                  d="M 14.5,21.5 C 8,24 2.5,22.2 3.2,19 C 3.9,15.8 10.2,17.8 14.5,21.5 Z"
                  fill={ACCENT_ORANGE}
                />
              </Svg>
            </View>
          </View>

          {/* 4. Menu Item Cards */}
          {loading ? (
            renderMenuSkeleton()
          ) : (
            <View style={styles.menuCardsWrapper}>
              {filteredItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="fish-outline" size={44} color={TEXT_TEAL_MUTED} style={{ marginBottom: 8, opacity: 0.65 }} />
                  <Text style={styles.emptyText}>
                    {menuSearchQuery.trim()
                      ? getText('لا توجد أطباق مطابقة لبحثك', 'No dishes match your search')
                      : selectedCategory === 'todays_offers'
                        ? getText('لا يوجد عرض نشط حالياً', 'No active offer right now')
                        : getText('لا توجد أصناف في هذه الفئة', 'No items in this category')}
                  </Text>
                </View>
              ) : (
                filteredItems.map((item) => (
                  <View key={item.id}>
                    {renderMenuItem({ item })}
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderOffersTab = () => (
    <View style={styles.offersContainer}>
      {/* Toggle Control */}
      <View style={[styles.toggleContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            offersSection === 'offers' && { backgroundColor: primaryColor },
          ]}
          onPress={() => setOffersSection('offers')}
        >
          <Text
            style={[
              styles.toggleText,
              offersSection === 'offers' && styles.toggleTextActive,
            ]}
          >
            {getText('قسم العروض', 'Offers Section')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            offersSection === 'codes' && { backgroundColor: primaryColor },
          ]}
          onPress={() => setOffersSection('codes')}
        >
          <Text
            style={[
              styles.toggleText,
              offersSection === 'codes' && styles.toggleTextActive,
            ]}
          >
            {getText('قسم الأكواد', 'Promo Codes')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.offersContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        {offersSection === 'offers' ? (
          <View style={styles.offersSection}>
            {offers.length === 0 ? (
               <Text style={{ textAlign: 'center', marginTop: 40, color: '#64748B' }}>{getText('لا توجد عروض حالياً', 'No active offers')}</Text>
            ) : (
              offers.map((offer, index) => (
                <View key={index} style={styles.offerCard}>
                  <View style={[styles.offerBadge, { backgroundColor: primaryColor }]}>
                    <Text style={styles.offerBadgeText}>{offer.badge_text || getText('عرض خاص', 'Special Offer')}</Text>
                  </View>
                  <Text style={[styles.offerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{isRTL ? (offer.title_ar || offer.title) : offer.title}</Text>
                  <Text style={[styles.offerDescription, { textAlign: isRTL ? 'right' : 'left' }]}>{isRTL ? (offer.description_ar || offer.description) : offer.description}</Text>
                  <Text style={[styles.offerValidity, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('صالح حتى', 'Valid until')} {offer.valid_until ? offer.valid_until.split('T')[0] : ''}</Text>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.codesSection}>
            {promoCodesList.length === 0 ? (
               <Text style={{ textAlign: 'center', marginTop: 40, color: '#64748B' }}>{getText('لا توجد أكواد حالياً', 'No active promo codes')}</Text>
            ) : (
              promoCodesList.map((code, index) => (
                <View key={index} style={styles.codeCard}>
                  <Text style={[styles.codeTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{isRTL ? (code.title_ar || code.code) : code.code}</Text>
                  <View style={[styles.codeInput, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={styles.codeText}>{code.code}</Text>
                    <TouchableOpacity style={[styles.copyButton, { backgroundColor: primaryColor }]}>
                      <Text style={styles.copyButtonText}>{getText('نسخ', 'Copy')}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.codeDescription, { textAlign: isRTL ? 'right' : 'left' }]}>{getText(`خصم ${code.discount_percentage}%`, `${code.discount_percentage}% off`)}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );

  const renderOrdersTab = () => (
    <View style={styles.ordersContainer}>
      <Text style={[styles.ordersTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('طلباتي السابقة', 'My Previous Orders')}</Text>
      {!session ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, marginTop: 40 }}>
          <Ionicons name="lock-closed-outline" size={64} color="#CBD5E1" />
          <Text style={{ fontSize: 18, color: '#475569', marginTop: 16, marginBottom: 24, textAlign: 'center', fontWeight: '600' }}>
            {getText('يرجى تسجيل الدخول لعرض بياناتك', 'Please log in to view your data')}
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: primaryColor, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}
            onPress={() => setShowAuthModal(true)}
          >
            <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>{getText('تسجيل الدخول', 'Login')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <ScrollView
        style={styles.ordersContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        {ordersLoading ? (
          <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 40 }} />
        ) : orders.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#64748B' }}>
            {getText('لا توجد طلبات سابقة', 'No previous orders found')}
          </Text>
        ) : (
          orders.map((order, index) => {
            const orderDisplayNum = order.display_id || `#${order.id.slice(0, 6)}`;
            return (
              <TouchableOpacity
                key={order.id || index}
                activeOpacity={0.8}
                onPress={() => setTrackingOrderId(order.id)}
                style={styles.orderCard}
              >
                <View style={[styles.orderHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={styles.orderNumber}>{getText(`طلب ${orderDisplayNum}`, `Order ${orderDisplayNum}`)} {order.restaurant_branches ? `(${order.restaurant_branches.name})` : ''}</Text>
                  <Text style={[styles.orderStatus, { color: order.status === 'delivered' ? '#10B981' : primaryColor }]}>{order.status}</Text>
                </View>
                <Text style={[styles.orderDate, { textAlign: isRTL ? 'right' : 'left' }]}>{new Date(order.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</Text>
                <Text style={[styles.orderItems, { textAlign: isRTL ? 'right' : 'left' }]}>{order.order_items?.map((item: any) => item.name).join('، ') || 'عناصر الطلب'}</Text>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Text style={[styles.orderTotal, { textAlign: isRTL ? 'right' : 'left' }]}>{getText(`الإجمالي: ${order.total_amount} ر.س`, `Total: ${order.total_amount} SAR`)}</Text>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, backgroundColor: `${primaryColor}15`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Ionicons name="pulse-outline" size={14} color={primaryColor} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: primaryColor }}>
                      {getText('تتبع مباشر والتفاصيل', 'Live Track & Details')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
      )}
    </View>
  );

  const handleLanguageChange = (lang: 'ar' | 'en') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLanguage(lang);
  };

  const renderMoreTab = () => {
    const renderSettingItem = (
      icon: string,
      titleAr: string,
      titleEn: string,
      onPress: () => void,
      customRight?: React.ReactNode,
      hideBorder?: boolean
    ) => (
      <TouchableOpacity
        style={[
          { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
          !hideBorder && { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }
        ]}
        onPress={onPress}
      >
        <Ionicons name={icon as any} size={22} color="#64748B" />
        <Text style={{ flex: 1, fontSize: 16, color: '#334155', textAlign: isRTL ? 'right' : 'left', marginHorizontal: 12, fontWeight: '500' }}>
          {getText(titleAr, titleEn)}
        </Text>
        {customRight ? customRight : (
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#CBD5E1" />
        )}
      </TouchableOpacity>
    );

    const sectionTitle = (titleAr: string, titleEn: string) => (
      <Text style={{ textAlign: isRTL ? 'right' : 'left', marginHorizontal: 20, marginTop: 24, marginBottom: 8, color: '#0F172A', fontSize: 18, fontWeight: 'bold' }}>
        {getText(titleAr, titleEn)}
      </Text>
    );

    const languageToggle = (
      <View style={[styles.premiumToggleContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={[styles.premiumToggleButton, language === 'ar' && { backgroundColor: primaryColor, shadowColor: primaryColor, elevation: 4, shadowOpacity: 0.3, shadowRadius: 4 }]}
          onPress={() => handleLanguageChange('ar')}
        >
          <Text style={[styles.premiumToggleText, language === 'ar' && styles.premiumToggleTextActive]}>
            عربي
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.premiumToggleButton, language === 'en' && { backgroundColor: primaryColor, shadowColor: primaryColor, elevation: 4, shadowOpacity: 0.3, shadowRadius: 4 }]}
          onPress={() => handleLanguageChange('en')}
        >
          <Text style={[styles.premiumToggleText, language === 'en' && styles.premiumToggleTextActive]}>
            EN
          </Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <View style={styles.moreContainer}>
        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left', marginHorizontal: 20, marginTop: 16, color: '#1E293B', fontSize: 24, fontWeight: 'bold' }]}>
          {getText('المزيد', 'More')}
        </Text>

        <ScrollView style={styles.settingsList} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>

          {/* Tenant Identity Header (Drawer/Sidebar dynamic branding) */}
          <View style={{
            marginHorizontal: 16,
            marginTop: 8,
            marginBottom: 16,
            padding: 16,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#F1F5F9',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.03,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}>
              <Image
                source={restaurant?.logo_url ? { uri: restaurant.logo_url } : require('../../assets/store-logo.jpeg')}
                style={{ width: 48, height: 48, borderRadius: 24 }}
              />
            </View>
            <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1E293B', textAlign: isRTL ? 'right' : 'left' }}>
                {restaurant?.restaurant_name || restaurant?.name || 'مطعم'}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                {getText('تطبيق العميل المعتمد', 'Official Customer App')}
              </Text>
            </View>
            <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: primaryColor }}>
                {getText('نشط', 'Active')}
              </Text>
            </View>
          </View>

          {/* Section 1: My Account */}
          {sectionTitle('حسابي', 'My Account')}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
            {renderSettingItem('person-outline', 'الملف الشخصي', 'Profile', () => setIsProfileModalVisible(true))}
            {renderSettingItem(
              'location-outline',
              'العناوين المحفوظة',
              'Saved Addresses',
              () => setActiveSection('SavedAddresses'),
              <View style={{ flexDirection: rtlRow, alignItems: 'center', gap: 6 }}>
                {savedAddresses.length > 0 && (
                  <View style={{ backgroundColor: `${primaryColor}18`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: primaryColor }}>
                      {savedAddresses.length}
                    </Text>
                  </View>
                )}
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#CBD5E1" />
              </View>
            )}
            {renderSettingItem('notifications-outline', 'الإشعارات', 'Notifications', () => toggleNotifications(!pushEnabled), <Switch value={pushEnabled} onValueChange={toggleNotifications} trackColor={{ false: '#E2E8F0', true: primaryColor }} thumbColor="#FFFFFF" />)}
            {renderSettingItem('wallet-outline', 'المحفظة والرصيد', 'Wallet & Balance', () => {
              if (!session) setShowAuthModal(true);
              else setActiveSection('Wallet');
            }, undefined, true)}
          </View>

          {/* Section 2: Settings */}
          {sectionTitle('الإعدادات', 'Settings')}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
            {renderSettingItem('language-outline', 'لغة التطبيق', 'App Language', () => { }, languageToggle, true)}
          </View>

          {/* Section 3: Support & Info */}
          {sectionTitle('الدعم والمعلومات', 'Support & Info')}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
            {renderSettingItem('chatbubbles-outline', 'تواصل معنا', 'Contact Us', () => setActiveSection('Contact'))}
            {renderSettingItem('document-text-outline', 'الشروط والأحكام', 'Terms & Conditions', () => setIsTermsModalVisible(true))}
            {renderSettingItem('lock-closed-outline', 'سياسة الخصوصية', 'Privacy Policy', () => setIsPrivacyModalVisible(true))}
            {renderSettingItem('information-circle-outline', 'عن التطبيق', 'About the App', () => setActiveSection('About'), undefined, true)}
          </View>

          {/* Logout Button */}
          {session ? (
            <TouchableOpacity
              style={[styles.logoutButton, { flexDirection: isRTL ? 'row-reverse' : 'row', marginHorizontal: 16, marginTop: 32, borderRadius: 12 }]}
              onPress={async () => {
                await supabase.auth.signOut();
                setSession(null);
                setIsGuestBrowsing(false);
              }}
            >
              <Ionicons name="log-out-outline" size={24} color="#DC3545" />
              <Text style={styles.logoutButtonText}>{getText('تسجيل الخروج', 'Logout')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.logoutButton, { flexDirection: isRTL ? 'row-reverse' : 'row', marginHorizontal: 16, marginTop: 32, borderRadius: 12, backgroundColor: primaryColor, borderColor: primaryColor }]}
              onPress={() => setShowAuthModal(true)}
            >
              <Ionicons name="log-in-outline" size={24} color="#FFFFFF" />
              <Text style={[styles.logoutButtonText, { color: '#FFFFFF' }]}>{getText('تسجيل الدخول', 'Login')}</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </View>
    );
  };

  const renderMealCustomizationModal = () => {
    if (!selectedMeal) return null;

    const itemName = language === 'en'
      ? (selectedMeal?.name_en || selectedMeal?.name || selectedMeal?.name_ar || selectedMeal?.title || '')
      : (selectedMeal?.name || selectedMeal?.name_ar || selectedMeal?.title || '');

    const itemDesc = language === 'en'
      ? (selectedMeal?.description_en || selectedMeal?.description || '')
      : (selectedMeal?.description || '');

    const rawBasePrice = Number(selectedMeal?.original_price ?? selectedMeal?.price ?? 0);
    const activePromo = getActivePromotionForItem(selectedMeal?.id, promotions, selectedBranch, branches, deliveryMode);
    const hasDiscount = !!activePromo && Number(activePromo.discount_percentage) > 0;
    const discountPct = hasDiscount ? Number(activePromo.discount_percentage) : 0;
    const basePrice = hasDiscount
      ? calculateDiscountedPrice(rawBasePrice, discountPct)
      : rawBasePrice;

    let extraPrice = 0;
    Object.values(selectedChoices).forEach(choice => {
      if (Array.isArray(choice)) {
        choice.forEach(c => { extraPrice += (c?.extra_price || 0); });
      } else if (choice) {
        extraPrice += (choice?.extra_price || 0);
      }
    });

    const totalPrice = (basePrice + extraPrice) * mealQuantity;

    const handleChoiceSelect = (group: any, choice: any) => {
      const isMulti = group?.max_choices > 1;

      if (isMulti) {
        setSelectedChoices(prev => {
          const current = Array.isArray(prev[group.id]) ? prev[group.id] : [];
          const exists = current.find((c: any) => c.id === choice.id);
          if (exists) {
            return { ...prev, [group.id]: current.filter((c: any) => c.id !== choice.id) };
          } else {
            return { ...prev, [group.id]: [...current, choice] };
          }
        });
      } else {
        setSelectedChoices(prev => ({ ...prev, [group.id]: choice }));
      }
    };

    return (
      <Modal
        visible={!!selectedMeal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedMeal(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: SCREEN_HEIGHT * 0.9 }}>
            {selectedMeal && (
              <>
                {/* Header: Title + Close Button */}
                <View style={{ flexDirection: isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <TouchableOpacity
                    onPress={() => setSelectedMeal(null)}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
                  >
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1E293B', flex: 1, textAlign: isRTL ? 'right' : 'left', marginHorizontal: 10 }}>
                    {itemName}
                  </Text>
                </View>

                <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                  {itemDesc ? (
                    <Text style={{ fontSize: 15, color: '#64748B', textAlign: isRTL ? 'right' : 'left', marginBottom: 20 }}>
                      {itemDesc}
                    </Text>
                  ) : null}

                  {/* Promo Pricing & Countdown in Meal Modal */}
                  {hasDiscount && (
                    <View style={{ marginBottom: 16, alignSelf: isRTL ? 'flex-end' : 'flex-start' }}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#10B981' }}>
                          {basePrice} {getText('ر.س', 'SAR')}
                        </Text>
                        <Text style={[styles.originalPriceStrikethrough, { fontSize: 13 }]}>
                          {rawBasePrice} {getText('ر.س', 'SAR')}
                        </Text>
                        <View style={styles.discountTagPillInline}>
                          <Text style={styles.discountTagPillText}>
                            {discountPct}% {getText('خصم', 'OFF')}
                          </Text>
                        </View>
                        {!!activePromo?.end_date && (
                          <CircularHourglassCountdown
                            startDate={activePromo.start_date}
                            endDate={activePromo.end_date}
                            primaryColor={primaryColor}
                            onExpire={() => handlePromotionExpired(activePromo.id)}
                            style={isRTL ? { marginRight: 8 } : { marginLeft: 8 }}
                          />
                        )}
                      </View>
                    </View>
                  )}


                  {/* Quantity/Weight Section */}
                  <View style={{ marginBottom: 24, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E293B' }}>
                      {selectedMeal?.is_weighted ? getText('الكمية (كجم)', 'Quantity (kg)') : getText('الكمية', 'Quantity')}
                    </Text>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 4 }}>
                      <TouchableOpacity
                        style={{ backgroundColor: '#FFF', borderRadius: 8, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}
                        onPress={() => setMealQuantity(Math.max(selectedMeal?.is_weighted ? 0.5 : 1, mealQuantity - (selectedMeal?.is_weighted ? 0.5 : 1)))}
                      >
                        <Ionicons name="remove" size={20} color={primaryColor} />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginHorizontal: 16 }}>
                        {`${mealQuantity}`}
                      </Text>
                      <TouchableOpacity
                        style={{ backgroundColor: '#FFF', borderRadius: 8, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}
                        onPress={() => setMealQuantity(mealQuantity + (selectedMeal?.is_weighted ? 0.5 : 1))}
                      >
                        <Ionicons name="add" size={20} color={primaryColor} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Dynamic Options Section */}
                  {mealOptions.length > 0 ? (
                    <View style={{ marginBottom: 20 }}>
                      {mealOptions.map((group: any, index: number) => {
                        const groupName = group?.name || group?.name_ar || group?.name_en || '';
                        return (
                          <View key={String(index)} style={{ marginBottom: 20 }}>
                            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1E293B', textAlign: isRTL ? 'right' : 'left', marginBottom: 10 }}>
                              {groupName}
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                              {group.choices && group.choices.map((choice: any, cIndex: number) => {
                                const choiceName = choice?.name || choice?.name_ar || choice?.name_en || '';
                                const extraPriceAmt = choice?.extra_price || 0;
                                const isSelected = selectedChoices[group.id]?.id === choice.id ||
                                  (Array.isArray(selectedChoices[group.id]) &&
                                    selectedChoices[group.id].some((c: any) => c.id === choice.id));
                                return (
                                  <TouchableOpacity
                                    key={String(cIndex)}
                                    onPress={() => {
                                      const isMulti = group?.max_choices > 1;
                                      if (isMulti) {
                                        setSelectedChoices((prev: any) => {
                                          const current = Array.isArray(prev[group.id]) ? prev[group.id] : [];
                                          const exists = current.find((c: any) => c.id === choice.id);
                                          return {
                                            ...prev,
                                            [group.id]: exists
                                              ? current.filter((c: any) => c.id !== choice.id)
                                              : [...current, choice]
                                          };
                                        });
                                      } else {
                                        setSelectedChoices((prev: any) => ({ ...prev, [group.id]: choice }));
                                      }
                                    }}
                                    style={{
                                      paddingVertical: 8,
                                      paddingHorizontal: 18,
                                      borderWidth: 2,
                                      borderColor: isSelected ? primaryColor : '#CBD5E1',
                                      borderRadius: 20,
                                      backgroundColor: isSelected ? primaryColor : '#FFF',
                                    }}
                                  >
                                    <Text style={{ color: isSelected ? '#FFF' : '#334155', fontWeight: isSelected ? 'bold' : 'normal', textAlign: 'center' }}>
                                      {choiceName}{extraPriceAmt > 0 ? ` (+${extraPriceAmt})` : ''}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={{ paddingVertical: 16, paddingHorizontal: 12, backgroundColor: '#F8FAFC', borderRadius: 12, marginBottom: 20 }}>
                      <Text style={{ color: '#94A3B8', fontSize: 14, textAlign: isRTL ? 'right' : 'left' }}>
                        {getText('لا توجد خيارات إضافية لتخصيص هذا الصنف', 'No extra customization options for this item')}
                      </Text>
                    </View>
                  )}

                  {/* Special Instructions */}
                  <View style={{ marginBottom: 40 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E293B', textAlign: isRTL ? 'right' : 'left', marginBottom: 12 }}>
                      {getText('ملاحظات خاصة', 'Special Instructions')}
                    </Text>
                    <TextInput
                      style={[styles.cartModalNotesInput, { textAlign: isRTL ? 'right' : 'left', minHeight: 80 }]}
                      placeholder={getText('مثال: بدون بصل، زيادة صوص...', 'e.g. No onions, extra sauce...')}
                      placeholderTextColor="#9CA3AF"
                      multiline
                      value={specialInstructions}
                      onChangeText={setSpecialInstructions}
                    />
                  </View>
                </ScrollView>

                {/* Sticky Add to Cart Footer */}
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#FFF', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
                  <TouchableOpacity
                    style={{ backgroundColor: primaryColor, borderRadius: 12, paddingVertical: 16, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center' }}
                    onPress={() => {
                      const payload = {
                        ...selectedMeal,
                        cart_item_id: `${selectedMeal.id}-${Date.now()}`,
                        weight: selectedMeal.is_weighted ? mealQuantity : undefined,
                        quantity: selectedMeal.is_weighted ? 1 : mealQuantity,
                        selected_options: selectedChoices,
                        original_price: rawBasePrice,
                        final_price: selectedMeal.is_weighted ? totalPrice : basePrice + extraPrice,
                        discount_percentage: hasDiscount ? discountPct : undefined,
                        notes: specialInstructions
                      };
                      addToCart(payload);
                      setSelectedMeal(null);
                      setMealQuantity(1);
                      setSelectedChoices({});
                      setSpecialInstructions('');
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>
                      {getText('إضافة للسلة', 'Add to Cart')}
                    </Text>
                    <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>
                      {`${totalPrice} ${getText('ر.س', 'SAR')}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const handleSaveManualAddress = async () => {
    const userId = await getValidUserId();
    if (!userId) {
      RNAlert.alert('تنبيه', 'يجب تسجيل الدخول لحفظ العناوين');
      return;
    }
    try {
      const fullAddress = [manualAddress.neighborhood, manualAddress.street, manualAddress.building]
        .filter(Boolean)
        .join('، ');
      const newRecord = {
        user_id: userId,
        label: selectedAddressType,
        address_type: selectedAddressType,
        address_text: fullAddress,
      };
      const { data: insertedRow, error } = await supabase
        .from('user_addresses')
        .insert(newRecord)
        .select()
        .single();
      if (error) {
        console.warn('[Address] Manual insert warning:', error.message);
      }
      const savedItem = insertedRow || { id: `local_${Date.now()}`, ...newRecord, created_at: new Date().toISOString() };
      setSavedAddresses((prev) => {
        const next = [savedItem, ...prev];
        AsyncStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      await fetchSavedAddresses();
      setIsAddAddressModalVisible(false);
      setAddressEntryMode('selection');
      setManualAddress({ neighborhood: '', street: '', building: '' });
      RNAlert.alert('تم', 'تم حفظ العنوان بنجاح');
    } catch (e) {
      console.error(e);
      RNAlert.alert('خطأ', 'حدث خطأ أثناء حفظ العنوان');
    }
  };

  const renderAddAddressModal = () => (
    <Modal visible={isAddAddressModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsAddAddressModalVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 300 }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{getText('إضافة عنوان جديد', 'Add New Address')}</Text>
            <TouchableOpacity onPress={() => { setIsAddAddressModalVisible(false); setAddressEntryMode('selection'); }}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          
          {addressEntryMode === 'selection' ? (
            <View>
              <TouchableOpacity 
                style={{ backgroundColor: primaryColor, padding: 16, borderRadius: 12, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
                onPress={() => { setIsAddAddressModalVisible(false); setShowLocationModal(true); }}
              >
                <Ionicons name="map-outline" size={24} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', marginHorizontal: 12 }}>{getText('تحديد تلقائي عبر الخريطة', 'Auto-locate via Map')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ backgroundColor: '#F1F5F9', padding: 16, borderRadius: 12, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setAddressEntryMode('manual')}
              >
                <Ionicons name="pencil-outline" size={24} color={primaryColor} />
                <Text style={{ color: primaryColor, fontSize: 16, fontWeight: 'bold', marginHorizontal: 12 }}>{getText('إدخال يدوي', 'Manual Entry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TextInput style={[styles.profileInput, { textAlign: isRTL ? 'right' : 'left', marginBottom: 12 }]} placeholder={getText('الحي', 'Neighborhood')} value={manualAddress.neighborhood} onChangeText={t => setManualAddress({...manualAddress, neighborhood: t})} placeholderTextColor="#94A3B8" />
              <TextInput style={[styles.profileInput, { textAlign: isRTL ? 'right' : 'left', marginBottom: 12 }]} placeholder={getText('الشارع', 'Street')} value={manualAddress.street} onChangeText={t => setManualAddress({...manualAddress, street: t})} placeholderTextColor="#94A3B8" />
              <TextInput style={[styles.profileInput, { textAlign: isRTL ? 'right' : 'left', marginBottom: 24 }]} placeholder={getText('المبنى/الشقة', 'Building/Apt')} value={manualAddress.building} onChangeText={t => setManualAddress({...manualAddress, building: t})} placeholderTextColor="#94A3B8" />
              
              <TouchableOpacity style={{ backgroundColor: primaryColor, padding: 16, borderRadius: 12, alignItems: 'center' }} onPress={handleSaveManualAddress}>
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>{getText('حفظ العنوان', 'Save Address')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderMockSectionModal = () => (
    <Modal
      visible={activeSection !== null}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setActiveSection(null)}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 300 }}>
          {activeSection === 'Wallet' && (
            <View style={{ alignItems: 'center', marginTop: 20 }}>
              <Ionicons name="wallet" size={48} color={primaryColor} />
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 16 }}>{getText('الرصيد الحالي', 'Current Balance')}</Text>
              <Text style={{ fontSize: 24, color: primaryColor, fontWeight: 'bold', marginTop: 8 }}>0.00 ر.س</Text>
            </View>
          )}
          {activeSection === 'SavedAddresses' && (
            <View style={{ marginTop: 6, maxHeight: 460 }}>
              <View style={{ flexDirection: rtlRow, alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1E293B', textAlign: isRTL ? 'right' : 'left' }}>
                  {getText('العناوين المحفوظة', 'Saved Addresses')}
                </Text>
                <TouchableOpacity onPress={() => setActiveSection(null)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              {loadingSavedAddresses ? (
                <ActivityIndicator size="large" color={primaryColor} style={{ marginVertical: 28 }} />
              ) : savedAddresses.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 24, backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 }}>
                  <Ionicons name="location-outline" size={40} color="#94A3B8" />
                  <Text style={{ fontSize: 15, color: '#64748B', marginTop: 10, fontWeight: '600' }}>
                    {getText('لا توجد عناوين محفوظة بعد', 'No saved addresses yet')}
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 310, marginBottom: 12 }} showsVerticalScrollIndicator={false}>
                  {savedAddresses.map((addr: any, idx: number) => {
                    const addrTitle = addr.label || addr.address_type || getText('عنوان محفوظ', 'Saved Address');
                    const addrIcon =
                      addrTitle === 'العمل' || addrTitle === 'Work'
                        ? 'briefcase-outline'
                        : addrTitle === 'أخرى' || addrTitle === 'Other'
                          ? 'location-outline'
                          : 'home-outline';
                    return (
                      <TouchableOpacity
                        key={addr.id || idx}
                        activeOpacity={0.85}
                        onPress={() => {
                          if (addr.address_text) {
                            setDeliveryAddress(addr.address_text);
                            setCheckoutDeliveryAddress(addr.address_text);
                          }
                          if (typeof addr.latitude === 'number' && typeof addr.longitude === 'number') {
                            setSelectedLocation({ latitude: addr.latitude, longitude: addr.longitude });
                          }
                          setActiveSection(null);
                        }}
                        style={{
                          marginBottom: 10,
                          padding: 14,
                          backgroundColor: '#F8FAFC',
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: addr.is_default ? primaryColor : '#E2E8F0',
                        }}
                      >
                        <View style={{ flexDirection: rtlRow, alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <View style={{ flexDirection: rtlRow, alignItems: 'center', gap: 8 }}>
                            <Ionicons name={addrIcon as any} size={20} color={primaryColor} />
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B' }}>
                              {addrTitle}
                            </Text>
                          </View>
                          {addr.is_default && (
                            <View style={{ backgroundColor: `${primaryColor}18`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: primaryColor }}>
                                {getText('افتراضي', 'Default')}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={{ flexDirection: rtlRow, alignItems: 'center', gap: 10 }}>
                          {addr.photo_url ? (
                            <Image source={{ uri: addr.photo_url }} style={{ width: 42, height: 42, borderRadius: 8, backgroundColor: '#E2E8F0' }} resizeMode="cover" />
                          ) : null}
                          <Text style={{ flex: 1, fontSize: 13.5, color: '#475569', textAlign: isRTL ? 'right' : 'left' }}>
                            {addr.address_text || getText('موقع محدد على الخريطة', 'Pinned map location')}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <TouchableOpacity
                style={{
                  backgroundColor: primaryColor,
                  paddingVertical: 14,
                  borderRadius: 12,
                  flexDirection: rtlRow,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onPress={() => {
                  setActiveSection(null);
                  setShowLocationModal(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                  {getText('إضافة عنوان جديد', 'Add New Address')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {activeSection === 'Contact' && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }}>{getText('تواصل معنا', 'Contact Us')}</Text>
              
              {(!branches || branches.length === 0) && !restaurant?.contact_email ? (
                <View style={{ alignItems: 'center', marginTop: 20 }}>
                  <Ionicons name="information-circle-outline" size={48} color="#9CA3AF" />
                  <Text style={{ fontSize: 16, color: '#64748B', marginTop: 12 }}>{getText('جاري تحديث بيانات التواصل', 'Contact details are being updated')}</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 350 }}>
                  {branches && branches.length > 0 && (
                    Array.from(new Map(branches.map((item: any) => [item.branch_name, item])).values()).map((branch, index) => {
                      const cleanTiktokHandle = restaurant?.tiktok_handle ? (restaurant.tiktok_handle.startsWith('@') ? restaurant.tiktok_handle.substring(1) : restaurant.tiktok_handle) : '';
                      return (
                        <View key={branch.id || index} style={{ padding: 14, backgroundColor: '#F8FAFC', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B', textAlign: isRTL ? 'right' : 'left' }}>{branch.branch_name}</Text>
                          </View>
                          
                          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {branch.phone_number && (
                              <TouchableOpacity 
                                style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                                onPress={() => Linking.openURL(`tel:${branch.phone_number}`)}
                              >
                                <Ionicons name="call" size={16} color={primaryColor} style={{ marginHorizontal: 4 }} />
                                <Text style={{ fontSize: 14, color: primaryColor, fontWeight: '600' }}>{branch.phone_number}</Text>
                              </TouchableOpacity>
                            )}

                            {restaurant?.is_whatsapp_enabled && branch.whatsapp_number && (
                              <TouchableOpacity 
                                style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                                onPress={() => Linking.openURL(`https://wa.me/${branch.whatsapp_number}`)}
                              >
                                <FontAwesome5 name="whatsapp" size={16} color="#16A34A" style={{ marginHorizontal: 4 }} />
                                <Text style={{ fontSize: 14, color: '#16A34A', fontWeight: '600' }}>{getText('واتساب', 'WhatsApp')}</Text>
                              </TouchableOpacity>
                            )}

                            {restaurant?.is_tiktok_enabled && cleanTiktokHandle && (
                              <TouchableOpacity 
                                style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                                onPress={() => Linking.openURL(`https://tiktok.com/@${cleanTiktokHandle}`)}
                              >
                                <FontAwesome5 name="tiktok" size={16} color="#0F172A" style={{ marginHorizontal: 4 }} />
                                <Text style={{ fontSize: 14, color: '#0F172A', fontWeight: '600' }}>{getText('تيك توك', 'TikTok')}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })
                  )}
                  {restaurant?.contact_email && (
                    <View style={{ marginTop: 16, padding: 12, backgroundColor: '#F1F5F9', borderRadius: 8, alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, color: '#475569', fontWeight: 'bold' }}>✉️ {restaurant.contact_email}</Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          )}

          {activeSection === 'About' && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }}>{getText('عن التطبيق', 'About the App')}</Text>
              
              {isRestaurantLoading ? (
                <ActivityIndicator size="small" color={primaryColor} style={{ marginTop: 10 }} />
              ) : (
                <View style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, color: '#475569', lineHeight: 24, textAlign: 'center', fontWeight: 'bold' }}>
                    Powered by SmartFlow
                  </Text>
                </View>
              )}
            </View>
          )}



          <TouchableOpacity
            style={{ backgroundColor: primaryColor, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 40 }}
            onPress={() => setActiveSection(null)}
          >
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>{getText('إغلاق', 'Close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderOrganicPromoBanner = () => {
    // Build dynamic slides from Supabase offers & active promotions while preserving hero campaign design
    const dynamicSlides: Array<{
      id: string;
      title: string;
      subtitle?: string;
      cta: string;
      targetAction: () => void;
    }> = [
      {
        id: 'hero-ocean-offers',
        title: getText('عروض المحيط', 'Ocean Offers'),
        subtitle: offers[0]
          ? (isRTL ? (offers[0].title_ar || offers[0].title) : (offers[0].title || offers[0].title_ar))
          : undefined,
        cta: getText('تصفح العروض', 'Browse Offers'),
        targetAction: () => {
          if (promotions.length > 0) {
            setSelectedCategory('todays_offers');
          } else {
            setActiveTab('offers');
          }
        },
      },
    ];

    if (offers.length > 0) {
      offers.slice(0, 2).forEach((offer, idx) => {
        const offerTitle = isRTL ? (offer.title_ar || offer.title) : (offer.title || offer.title_ar);
        const offerSub = isRTL ? (offer.description_ar || offer.description) : (offer.description || offer.description_ar);
        if (offerTitle) {
          dynamicSlides.push({
            id: `offer-${offer.id || idx}`,
            title: offerTitle,
            subtitle: offerSub,
            cta: getText('تصفح العروض', 'Browse Offers'),
            targetAction: () => setActiveTab('offers'),
          });
        }
      });
    }

    if (dynamicSlides.length < 3 && promotions.length > 0) {
      const maxDiscount = Math.max(...promotions.map(p => Number(p.discount_percentage || 0)));
      if (maxDiscount > 0) {
        dynamicSlides.push({
          id: 'promo-max-discount',
          title: getText(`خصومات تصل إلى ${maxDiscount}%`, `Up to ${maxDiscount}% Off`),
          subtitle: getText('عروض حصرية لفترة محدودة', 'Limited-time exclusive deals'),
          cta: getText('تصفح العروض', 'Browse Offers'),
          targetAction: () => setSelectedCategory('todays_offers'),
        });
      }
    }

    while (dynamicSlides.length < 3) {
      const idx = dynamicSlides.length;
      dynamicSlides.push({
        id: `ocean-slide-${idx}`,
        title: idx === 1
          ? getText('طازج يومياً من البحر', 'Fresh Daily Catch')
          : getText('توصيل سريع لبابك', 'Fast Doorstep Delivery'),
        cta: getText('تصفح العروض', 'Browse Offers'),
        targetAction: () => {
          if (promotions.length > 0) {
            setSelectedCategory('todays_offers');
          } else {
            setActiveTab('offers');
          }
        },
      });
    }

    const slides = dynamicSlides.slice(0, 3);
    const effectiveShellWidth = Platform.OS === 'web' && windowWidth > 540 ? 460 : windowWidth;
    const slideWidth = bannerMeasuredWidth > 0 ? bannerMeasuredWidth : Math.max(280, effectiveShellWidth - 32);
    const slideHeight = 140;

    return (
      <View
        style={styles.organicBannerSection}
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width);
          if (w > 0 && w !== bannerMeasuredWidth) {
            setBannerMeasuredWidth(w);
          }
        }}
      >
        <ScrollView
          ref={bannerScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(e) => {
            const offsetX = e.nativeEvent.contentOffset.x;
            if (slideWidth > 0) {
              const page = Math.round(offsetX / slideWidth);
              if (page >= 0 && page < slides.length && page !== activeBannerSlide) {
                setActiveBannerSlide(page);
              }
            }
          }}
        >
          {slides.map((slide, idx) => {
            const gradId = `oceanBannerGrad_${idx}`;
            return (
              <View
                key={slide.id}
                style={{
                  width: slideWidth,
                  height: slideHeight,
                  position: 'relative',
                  borderRadius: 20,
                  overflow: 'hidden',
                  backgroundColor: primaryColor,
                }}
              >
                {/* Ocean Wave Backdrop anchored bottom-left with preserved aspect ratio */}
                <Svg
                  width={slideWidth}
                  height={slideHeight}
                  viewBox="0 0 380 184"
                  preserveAspectRatio="xMinYMax meet"
                  style={StyleSheet.absoluteFill}
                >
                  <Defs>
                    <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#076B74" />
                      <Stop offset="55%" stopColor={primaryColor} />
                      <Stop offset="100%" stopColor="#043E42" />
                    </LinearGradient>
                  </Defs>

                  <G>
                    {/* Deep Ocean Teal Background */}
                    <Path d="M 0,0 H 380 V 184 H 0 Z" fill={`url(#${gradId})`} />

                    {/* Outer Teal Ocean Swell */}
                    <Path
                      d="M -10,124 C 14,64 62,36 110,52 C 136,61 140,94 114,110 C 92,123 84,146 134,150 C 166,152 196,146 224,164 L 224,190 L -10,190 Z"
                      fill="#0C7D88"
                    />

                    {/* Mid Aqua Curling Wave */}
                    <Path
                      d="M -8,142 C 12,84 54,56 96,66 C 116,71 120,95 100,106 C 76,119 70,149 122,154 C 152,157 176,150 200,166 L 200,190 L -8,190 Z"
                      fill="#23A4B1"
                    />

                    {/* Bright Cyan Inner Wave Highlight */}
                    <Path
                      d="M 26,136 C 28,96 60,74 90,82 C 70,92 58,118 72,142 C 86,164 132,162 166,155 C 136,176 76,184 40,164 C 29,157 25,147 26,136 Z"
                      fill="#63CDD7"
                    />

                    {/* Crisp White Curling Wave Foam Crest */}
                    <Path
                      d="M -6,118 C 14,72 52,43 88,47 C 108,49 118,65 111,83 C 102,72 87,67 69,72 C 41,80 15,101 -6,127 Z"
                      fill="#FFFFFF"
                    />

                    {/* Lower Inner White Foam Ribbon */}
                    <Path
                      d="M 66,114 C 64,138 82,154 116,150 C 130,148 142,144 152,139 C 136,154 106,162 82,156 C 63,151 56,132 66,114 Z"
                      fill="#FFFFFF"
                      opacity={0.95}
                    />

                    {/* 3 Expressive Flying Water Droplets */}
                    <Path
                      d="M 106,42 C 104,31 109,20 114,22 C 118,24 114,35 106,42 Z"
                      fill="#BCEAEF"
                    />
                    <Path
                      d="M 113,47 C 120,34 133,22 139,26 C 144,30 130,42 113,47 Z"
                      fill="#BCEAEF"
                    />
                    <Path
                      d="M 116,55 C 123,50 132,49 133,53 C 134,57 124,58 116,55 Z"
                      fill="#BCEAEF"
                    />
                  </G>
                </Svg>

                {/* Right-Aligned Campaign Headline & Vibrant Orange CTA Pill */}
                <View
                  style={[
                    styles.organicBannerTextOverlay,
                    { alignItems: alignPhysicalRight },
                  ]}
                >
                  <Text
                    style={styles.organicBannerHeadline}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {slide.title}
                  </Text>
                  {!!slide.subtitle && idx > 0 && (
                    <Text style={styles.organicBannerSubtitle} numberOfLines={1}>
                      {slide.subtitle}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.organicBannerCtaPill}
                    onPress={slide.targetAction}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.organicBannerCtaText}>{slide.cta}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Pagination Dots Below Wavy Banner */}
        <View style={[styles.bannerPaginationRow, { flexDirection: rtlRow }]}>
          {slides.map((s, dotIdx) => {
            const isDotActive = activeBannerSlide === dotIdx;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => {
                  setActiveBannerSlide(dotIdx);
                  bannerScrollRef.current?.scrollTo({ x: dotIdx * slideWidth, animated: true });
                }}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                style={[
                  styles.bannerDot,
                  isDotActive
                    ? { backgroundColor: primaryColor, transform: [{ scale: 1.08 }] }
                    : { backgroundColor: '#AEE2D6' },
                ]}
              />
            );
          })}
        </View>
      </View>
    );
  };

  const renderMenuHeader = () => {
    const matchedBranch = branches?.find(
      (b: any) =>
        b.branch_name === selectedBranch ||
        b.name === selectedBranch ||
        b.id === selectedBranch
    );
    const activeBranchLabel =
      matchedBranch?.branch_name ||
      matchedBranch?.name ||
      selectedBranch ||
      branches?.[0]?.branch_name ||
      branches?.[0]?.name ||
      getText('الفرع الرئيسي', 'Main Branch');

    const displayRestaurantName =
      restaurant?.restaurant_name ||
      restaurant?.name ||
      getText('أسماك المحيط', 'Asmak Al Mohit');

    return (
      <View style={styles.menuHeader}>
        {/* 1. Top Pill-Shaped Location Selector ("التوصيل إلى / حدّد موقعك") */}
        <TouchableOpacity
          style={[styles.topLocationPill, { flexDirection: rtlRow }]}
          onPress={() => setShowLocationModal(true)}
          activeOpacity={0.88}
        >
          {/* Right Side: Vibrant Orange Pin + 2-Line Address Text */}
          <View style={[styles.topLocationRightGroup, { flexDirection: rtlRow }]}>
            <View style={styles.topLocationPinWrap}>
              <Svg width={25} height={31} viewBox="0 0 26 32">
                <Path
                  d="M 13,1 C 6.4,1 1,6.3 1,12.9 C 1,21.4 11.4,30.2 12.2,30.9 C 12.7,31.3 13.3,31.3 13.8,30.9 C 14.6,30.2 25,21.4 25,12.9 C 25,6.3 19.6,1 13,1 Z"
                  fill={ACCENT_ORANGE}
                />
                <Circle cx="13" cy="12.5" r="4.3" fill={BG_WARM} />
              </Svg>
            </View>
            <View style={{ flex: 1, alignItems: alignReadingStart }}>
              <Text style={[styles.topLocationSmallLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                {getText('التوصيل إلى', 'Deliver to')}
              </Text>
              <Text
                style={[styles.topLocationMainText, { textAlign: isRTL ? 'right' : 'left' }]}
                numberOfLines={1}
              >
                {deliveryAddress || getText('حدّد موقعك', 'Select Location')}
              </Text>
            </View>
          </View>

          {/* Left Side: Downward Chevron */}
          <Ionicons name="chevron-down" size={22} color={TEXT_TEAL_DARK} />
        </TouchableOpacity>

        {/* 2. Organic Wavy Promo Carousel + Pagination Dots */}
        {renderOrganicPromoBanner()}

        {/* 3. Restaurant Info Row (Below Banner: Circular Logo on Right, Divider, Name & Rating on Left) */}
        <View style={[styles.brandingHeader, { flexDirection: rtlRow }]}>
          <View style={styles.brandingLogoRing}>
            <Image
              source={
                restaurant?.logo_url
                  ? { uri: restaurant.logo_url }
                  : require('../../assets/store-logo.jpeg')
              }
              style={styles.brandingLogoImage}
              resizeMode="cover"
            />
          </View>

          <View style={styles.brandingVerticalDivider} />

          <View style={[styles.brandingInfo, { alignItems: alignReadingStart }]}>
            <Text
              style={[styles.brandingTitle, { textAlign: isRTL ? 'right' : 'left' }]}
              numberOfLines={1}
            >
              {displayRestaurantName}
            </Text>
            <View style={[styles.brandingMetaRow, { flexDirection: rtlRow }]}>
              <Ionicons name="star" size={17} color={STAR_GOLD} />
              <Text style={styles.brandingRatingValue}>4.8</Text>
              <Text style={styles.brandingSubtitle}>
                {`• ${getText('مفتوح', 'Open')} • 30 ${getText('دقيقة', 'mins')}`}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. Full-Width Soft Mint Pill Search Bar */}
        <View style={[styles.searchBarContainer, { flexDirection: rtlRow }]}>
          <Ionicons name="search-outline" size={22} color={TEXT_TEAL_DARK} />
          <TextInput
            style={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
            value={menuSearchQuery}
            onChangeText={setMenuSearchQuery}
            placeholder={getText('ابحث عن طبقك المفضل', 'Search for your favorite dish')}
            placeholderTextColor="#4F7779"
          />
          {menuSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setMenuSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={19} color={TEXT_TEAL_MUTED} />
            </TouchableOpacity>
          )}
        </View>

        {/* 5. Side-by-Side Pill Containers: Order Type Toggle (Right) + Divider + Branch Selector (Left) */}
        <View style={[styles.actionPillsRow, { flexDirection: rtlRow }]}>
          {/* Right Pill: Delivery / Pickup Toggle */}
          <View style={[styles.orderTypePillContainer, { flexDirection: rtlRow }]}>
            <TouchableOpacity
              style={[
                styles.orderTypeSegment,
                { flexDirection: rtlRow },
                deliveryMode === 'delivery' && [
                  styles.orderTypeSegmentActive,
                  { backgroundColor: primaryColor },
                ],
              ]}
              onPress={() => setDeliveryMode('delivery')}
              activeOpacity={0.9}
            >
              <Ionicons
                name="car"
                size={18}
                color={deliveryMode === 'delivery' ? '#FFFFFF' : TEXT_TEAL_DARK}
              />
              <Text
                style={[
                  styles.orderTypeSegmentText,
                  deliveryMode === 'delivery' && styles.orderTypeSegmentTextActive,
                ]}
              >
                {getText('توصيل', 'Delivery')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.orderTypeSegment,
                { flexDirection: rtlRow },
                deliveryMode === 'pickup' && [
                  styles.orderTypeSegmentActive,
                  { backgroundColor: primaryColor },
                ],
              ]}
              onPress={() => setDeliveryMode('pickup')}
              activeOpacity={0.9}
            >
              <Ionicons
                name="storefront"
                size={17}
                color={deliveryMode === 'pickup' ? '#FFFFFF' : TEXT_TEAL_DARK}
              />
              <Text
                style={[
                  styles.orderTypeSegmentText,
                  deliveryMode === 'pickup' && styles.orderTypeSegmentTextActive,
                ]}
              >
                {getText('استلام', 'Pickup')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Subtle Vertical Divider Between Pills */}
          <View style={styles.actionPillsDivider} />

          {/* Left Pill: Branch Selector Dropdown */}
          <TouchableOpacity
            style={[styles.branchPillContainer, { flexDirection: rtlRow }]}
            onPress={() => {
              if (branches && branches.length > 0) {
                setIsBranchDropdownOpen(!isBranchDropdownOpen);
              }
            }}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: rtlRow, alignItems: 'center', gap: 6, flex: 1 }}>
              <Ionicons name="storefront-outline" size={18} color={TEXT_TEAL_DARK} />
              <Text
                style={[styles.branchPillText, { textAlign: isRTL ? 'right' : 'left' }]}
                numberOfLines={1}
              >
                {activeBranchLabel}
              </Text>
            </View>
            <Ionicons
              name={isBranchDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={17}
              color={TEXT_TEAL_DARK}
            />
          </TouchableOpacity>
        </View>

        {/* Expandable Dynamic Branch Dropdown List (from Supabase branches) */}
        {isBranchDropdownOpen && branches && branches.length > 0 && (
          <View style={styles.branchDropdownCard}>
            {branches.map((b: any) => {
              const bName = b.branch_name || b.name;
              const isSel = selectedBranch === bName || selectedBranch === b.id;
              return (
                <TouchableOpacity
                  key={b.id || bName}
                  style={[
                    styles.branchDropdownOption,
                    { flexDirection: rtlRow },
                    isSel && { backgroundColor: PILL_MINT },
                  ]}
                  onPress={() => {
                    setSelectedBranch(bName);
                    setIsBranchDropdownOpen(false);
                  }}
                >
                  <Ionicons
                    name={isSel ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={isSel ? primaryColor : TEXT_TEAL_MUTED}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: isSel ? primaryColor : TEXT_TEAL_DARK,
                      fontWeight: isSel ? '800' : '600',
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  >
                    {bName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // FINAL CONDITIONAL RETURNS - Must be after all hooks and functions
  if (!isAppReady || !hasCheckedInitialSession) {
    return <AnimatedSplashScreen onFinish={handleSplashFinish} />;
  }

  if (!session && !isGuestBrowsing) {
    return (
      <LoginScreen
        initialName={customerName}
        initialPhone={customerPhone ? normalizePhone(customerPhone) : ''}
        onContinueAsGuest={() => setIsGuestBrowsing(true)}
        onLoginSuccess={(mockSession) => {
          if (mockSession) {
            setSession(mockSession as any);
            if (mockSession.user) {
              if (!customerPhone) {
                setCustomerPhone(mockSession.user.phone?.replace('+966', '0') || '');
              }
              if (!customerName && mockSession.user.user_metadata?.name) {
                setCustomerName(mockSession.user.user_metadata.name);
              }
            }
          }
          setIsGuestBrowsing(true);
        }}
      />
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <StatusBar style="dark" />

      <View
        style={[
          styles.mobileAppShell,
          { paddingTop: Platform.OS === 'android' && insets.top === 0 ? (RNStatusBar.currentHeight || 0) : 0 },
          Platform.OS === 'web' && windowWidth > 540 && styles.mobileAppShellDesktop,
        ]}
      >
        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'menu' && renderMenuTab()}
          {activeTab === 'offers' && renderOffersTab()}
          {activeTab === 'orders' && renderOrdersTab()}
          {activeTab === 'more' && renderMoreTab()}
        </View>

        {/* Floating Cart FAB (Opens Cart Summary Modal First) */}
        {cart.length > 0 && (
          <TouchableOpacity
            style={[
              styles.floatingCartFab,
              {
                backgroundColor: primaryColor,
                bottom: Math.max(90, insets.bottom + 80),
              },
            ]}
            onPress={() => setIsCartModalVisible(true)}
            activeOpacity={0.9}
          >
            <Ionicons name="cart-outline" size={26} color="#FFFFFF" />
            <View style={styles.floatingCartFabBadge}>
              <Text style={[styles.floatingCartFabBadgeText, { color: primaryColor }]}>{totalItems}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Floating Bottom Navigation Bar */}
        <View
          pointerEvents="box-none"
          style={[
            styles.bottomNavFloatingWrapper,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          <View style={[styles.bottomNav, { flexDirection: rtlRow }]}>
            {renderBottomNavItem('menu', 'restaurant', 'القائمة', 'Menu')}
            {renderBottomNavItem('offers', 'pricetag', 'العروض', 'Offers')}
            {renderBottomNavItem('orders', 'receipt', 'الطلبات', 'Orders')}
            {renderBottomNavItem('more', 'grid', 'المزيد', 'More')}
          </View>
        </View>
      </View>

      {/* Location Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.mapModalContainer}>
          <StatusBar style="dark" />

          {/* Top Section - Map (65% height) */}
          <View style={styles.mapTopSection}>
            {/* Map View with Google Maps forced */}
            {mapRegion ? (
              Platform.OS === 'web' ? (
                <View style={{ flex: 1, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
                  <Text>الخريطة التفاعلية مدعومة على الجوال فقط</Text>
                </View>
              ) : (
                <LocationModalMap
                  mapRef={mapRef}
                  initialRegion={mapRegion}
                  primaryColor={primaryColor}
                  onRegionChangeComplete={handleMapRegionChangeComplete}
                  onLocateMe={handleLocateMe}
                />
              )
            ) : (
              <View style={styles.mapLoadingContainer}>
                <ActivityIndicator size="large" color={primaryColor} />
                <Text style={styles.mapLoadingText}>{getText('جاري تحميل الخريطة...', 'Loading map...')}</Text>
              </View>
            )}

            {/* Floating Back Button - Top Right Corner */}
            <TouchableOpacity
              style={[styles.mapBackButton, { top: insets.top + 16, right: 16 }]}
              onPress={() => setShowLocationModal(false)}
            >
              <Ionicons
                name={isRTL ? "arrow-forward" : "arrow-back"}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          {/* Bottom Section - Bottom Sheet */}
          <View style={styles.mapBottomSheet}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {/* Title Text */}
              <Text style={styles.mapBottomSheetTitle}>
                {getText('حدد موقعك', 'Select Your Location')}
              </Text>

              {/* Search Bar */}
              <View style={[styles.mapSearchBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="search" size={20} color="#64748B" />
                <TextInput
                  style={[styles.mapSearchInput, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={getText('بحث...', 'Search...')}
                  placeholderTextColor="#94A3B8"
                  value={searchLocation}
                  onChangeText={setSearchLocation}
                />
              </View>

              {/* Address Type Chips Row */}
              <View style={[styles.addressChipsRow, { direction: 'ltr', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {([
                  { key: 'المنزل' as const, labelEn: 'Home', icon: 'home-outline' as const },
                  { key: 'العمل' as const, labelEn: 'Work', icon: 'briefcase-outline' as const },
                  { key: 'أخرى' as const, labelEn: 'Other', icon: 'location-outline' as const },
                ]).map((chip) => {
                  const isActive = addressLabel === chip.key;
                  return (
                    <TouchableOpacity
                      key={chip.key}
                      onPress={() => setAddressLabel(chip.key)}
                      style={[
                        styles.addressChip,
                        { flexDirection: rtlRow },
                        isActive && { borderColor: primaryColor, backgroundColor: `${primaryColor}15` },
                      ]}
                    >
                      <Ionicons
                        name={chip.icon}
                        size={16}
                        color={isActive ? primaryColor : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.addressChipText,
                          isActive && { color: primaryColor, fontWeight: '700' },
                        ]}
                      >
                        {getText(chip.key, chip.labelEn)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Default Address Toggle & Location Photo Row */}
              <View style={[styles.addressExtrasRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  onPress={() => setIsDefaultAddress((prev) => !prev)}
                  style={[
                    styles.addressToggleChip,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    isDefaultAddress && { borderColor: primaryColor, backgroundColor: `${primaryColor}15` },
                  ]}
                >
                  <Ionicons
                    name={isDefaultAddress ? 'star' : 'star-outline'}
                    size={16}
                    color={isDefaultAddress ? primaryColor : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.addressChipText,
                      isDefaultAddress && { color: primaryColor, fontWeight: '700' },
                    ]}
                  >
                    {getText('تعيين كعنوان افتراضي', 'Default Location')}
                  </Text>
                </TouchableOpacity>

                {!addressPhotoUri ? (
                  <TouchableOpacity
                    onPress={handlePickAddressPhoto}
                    style={[styles.addressPhotoBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  >
                    <Ionicons name="camera-outline" size={16} color="#475569" />
                    <Text style={styles.addressPhotoBtnText}>
                      {getText('إضافة صورة للموقع (اختياري)', 'Add Location Photo (Optional)')}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.addressPhotoPreviewRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Image source={{ uri: addressPhotoUri }} style={styles.addressPhotoThumb} />
                    <TouchableOpacity
                      onPress={() => setAddressPhotoUri(null)}
                      style={styles.addressPhotoRemoveBtn}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={[styles.mapActionButton, isSavingAddress && { opacity: 0.7 }]}
                disabled={isSavingAddress}
                onPress={async () => {
                  if (isSavingAddress) return;
                  setIsSavingAddress(true);
                  try {
                    const activeRegion = latestMapRegionRef.current ?? mapRegion;
                    const lat = activeRegion?.latitude ?? userLocation.latitude ?? DEFAULT_COORDS.latitude;
                    const lng = activeRegion?.longitude ?? userLocation.longitude ?? DEFAULT_COORDS.longitude;
                    let resolvedAddress = 'موقع محدد على الخريطة';

                    try {
                      const addressResults = await withTimeout(
                        Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }),
                        3000,
                        'reverseGeocodeAsync'
                      );
                      if (addressResults && addressResults.length > 0) {
                        const address = addressResults[0];
                        const formatted = [
                          address.street,
                          address.city,
                          address.region,
                          address.country,
                        ]
                          .filter(Boolean)
                          .join(', ');
                        if (formatted) {
                          resolvedAddress = formatted;
                        }
                      }
                    } catch (geoErr) {
                      console.warn('[Location] reverseGeocodeAsync timed out or failed, using fallback:', geoErr);
                      resolvedAddress = 'موقع محدد على الخريطة';
                    }

                    setSelectedLocation({ latitude: lat, longitude: lng });
                    setDeliveryAddress(resolvedAddress);
                    setCheckoutDeliveryAddress(resolvedAddress);

                    // Upload optional location photo to Supabase 'address-photos' bucket
                    let uploadedPhotoUrl: string | null = null;
                    if (addressPhotoUri) {
                      try {
                        const fileExt = addressPhotoUri.split('.').pop()?.toLowerCase() || 'jpg';
                        const safeExt = fileExt === 'png' ? 'png' : 'jpg';
                        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                        const rawUid = session?.user?.id;
                        const ownerPrefix =
                          typeof rawUid === 'string' &&
                          uuidRegex.test(rawUid) &&
                          rawUid !== '00000000-0000-0000-0000-000000000000'
                            ? rawUid
                            : 'guest';
                        const fileName = `${ownerPrefix}_${Date.now()}.${safeExt}`;
                        const res = await fetch(addressPhotoUri);
                        const arrayBuffer = await res.arrayBuffer();
                        const { error: uploadError } = await supabase.storage
                          .from('address-photos')
                          .upload(fileName, arrayBuffer, {
                            contentType: `image/${safeExt === 'png' ? 'png' : 'jpeg'}`,
                            upsert: true,
                          });
                        if (!uploadError) {
                          const { data: pubData } = supabase.storage
                            .from('address-photos')
                            .getPublicUrl(fileName);
                          uploadedPhotoUrl = pubData?.publicUrl || null;
                        } else {
                          console.warn('[AddressPhoto] Storage upload warning:', uploadError.message);
                        }
                      } catch (photoErr) {
                        console.warn('[AddressPhoto] Storage upload failed:', photoErr);
                      }
                    }

                    // Persist address to user_addresses if authenticated with a real user UUID
                    const validUserId = await getValidUserId();
                    const newAddressPayload = {
                      user_id: validUserId,
                      label: addressLabel,
                      address_type: addressLabel,
                      address_text: resolvedAddress,
                      is_default: isDefaultAddress,
                      photo_url: uploadedPhotoUrl,
                      latitude: lat,
                      longitude: lng,
                    };

                    let insertedRecord: any = null;
                    if (validUserId) {
                      try {
                        if (isDefaultAddress) {
                          await supabase
                            .from('user_addresses')
                            .update({ is_default: false })
                            .eq('user_id', validUserId);
                        }
                        const { data: insertedRow, error: addrError } = await supabase
                          .from('user_addresses')
                          .insert(newAddressPayload)
                          .select()
                          .single();
                        if (addrError) {
                          console.warn('[Address] Save warning:', addrError.message);
                        } else {
                          insertedRecord = insertedRow;
                        }
                      } catch (saveErr) {
                        console.warn('[Address] Save failed:', saveErr);
                      }
                    }

                    const fallbackRecord = insertedRecord || {
                      id: `local_${Date.now()}`,
                      ...newAddressPayload,
                      created_at: new Date().toISOString(),
                    };
                    setSavedAddresses((prev) => {
                      const base = isDefaultAddress
                        ? prev.map((item) => ({ ...item, is_default: false }))
                        : prev;
                      const next = [fallbackRecord, ...base];
                      AsyncStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
                      return next;
                    });
                    if (validUserId && insertedRecord) {
                      fetchSavedAddresses();
                    }
                  } catch (err) {
                    console.error('[Location] Unexpected error setting address:', err);
                  } finally {
                    setIsSavingAddress(false);
                    setAddressPhotoUri(null);
                    setShowLocationModal(false);
                  }
                }}
              >
                {isSavingAddress ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.mapActionButtonText}>
                    {getText('تعيين العنوان', 'Set Address')}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Auth Modal */}
      <Modal
        visible={showAuthModal}
        animationType="slide"
        onRequestClose={() => {
          setShowAuthModal(false);
          setResumeCheckout(false);
        }}
      >
        <LoginScreen 
          initialName={customerName}
          initialPhone={customerPhone ? normalizePhone(customerPhone) : ''} 
          onContinueAsGuest={() => {
            setIsGuestBrowsing(true);
            setShowAuthModal(false);
            setResumeCheckout(false);
          }}
          onLoginSuccess={(mockSession) => {
            if (mockSession) {
              setSession(mockSession as any);
              if (mockSession.user) {
                if (!customerPhone) {
                  setCustomerPhone(mockSession.user.phone?.replace('+966', '0') || '');
                }
                if (!customerName && mockSession.user.user_metadata?.name) {
                  setCustomerName(mockSession.user.user_metadata.name);
                }
              }
            }
            setShowAuthModal(false);
          }} 
        />
      </Modal>

      {/* Profile Modal */}
      <Modal
        visible={isProfileModalVisible}
        animationType="slide"
        onRequestClose={() => setIsProfileModalVisible(false)}
      >
        <SafeAreaView style={styles.profileModalContainer}>
          <StatusBar style="dark" />

          {/* Header */}
          <View style={[styles.profileModalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity onPress={() => setIsProfileModalVisible(false)}>
              <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.profileModalTitle}>{getText('تعديل الملف الشخصي', 'Edit Profile')}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.profileModalContent} showsVerticalScrollIndicator={false}>
            {/* Wallet Balance Section */}
            <View style={{ backgroundColor: '#EEF2FF', padding: 20, borderRadius: 16, marginBottom: 20, alignItems: 'center' }}>
              <Ionicons name="wallet-outline" size={32} color={primaryColor} style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 4 }}>
                {getText('رصيد المحفظة', 'Wallet Balance')}
              </Text>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: primaryColor }}>
                {walletBalance.toFixed(2)} {getText('ر.س', 'SAR')}
              </Text>
            </View>

            {/* Form Fields */}
            <View style={[styles.profileForm, { marginTop: 20 }]}>
              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>{getText('اسم', 'Name')}</Text>
                <TextInput
                  style={[styles.profileInput, { textAlign: 'right', writingDirection: 'rtl' }]}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>{getText('رقم الجوال', 'Phone')}</Text>
                <TextInput
                  style={[styles.profileInput, styles.profileInputDisabled, { textAlign: 'right', writingDirection: 'rtl' }]}
                  value={session?.user?.phone || ''}
                  editable={false}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>{getText('الايميل', 'Email')}</Text>
                <TextInput
                  style={[styles.profileInput, { textAlign: 'right', writingDirection: 'rtl' }]}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Gender Toggle */}
              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>{getText('الجنس', 'Gender')}</Text>
                <View style={[styles.genderToggle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      gender === 'ذكر' && styles.genderButtonActive,
                    ]}
                    onPress={() => setGender('ذكر')}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        gender === 'ذكر' && styles.genderButtonTextActive,
                      ]}
                    >
                      {getText('ذكر', 'Male')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      gender === 'أنثى' && styles.genderButtonActive,
                    ]}
                    onPress={() => setGender('أنثى')}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        gender === 'أنثى' && styles.genderButtonTextActive,
                      ]}
                    >
                      {getText('أنثى', 'Female')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Delete Account Section */}
              <View style={[styles.deleteAccountSection, { alignItems: 'center', justifyContent: 'center' }]}>
                <TouchableOpacity style={[styles.deleteAccountRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="trash-outline" size={20} color="#DC3545" />
                  <Text style={styles.deleteAccountText}>{getText('حذف الحساب', 'Delete Account')}</Text>
                </TouchableOpacity>
                <Text style={[styles.deleteAccountSubtext, { textAlign: 'center' }]}>
                  {getText('سيتم حذف البيانات الشخصية وتاريخ الطلبات ورصيد المحفظة.', 'Personal data, order history, and wallet balance will be deleted.')}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer Button */}
          <View style={styles.profileModalFooter}>
            <TouchableOpacity
              style={styles.profileConfirmButton}
              onPress={() => setIsProfileModalVisible(false)}
            >
              <Text style={styles.profileConfirmButtonText}>{getText('تأكيد', 'Confirm')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={isPrivacyModalVisible}
        animationType="slide"
        onRequestClose={() => setIsPrivacyModalVisible(false)}
      >
        <SafeAreaView style={styles.policyModalContainer}>
          <StatusBar style="dark" />

          {/* Header */}
          <View style={[styles.policyModalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity onPress={() => setIsPrivacyModalVisible(false)}>
              <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.policyModalTitle}>{getText('سياسة الخصوصية', 'Privacy Policy')}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.policyModalContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.policyText, { textAlign: 'right', writingDirection: 'rtl' }]}>
              {getText(`نحن في ${restaurant?.restaurant_name || restaurant?.name || 'المطعم'} نولي خصوصيتك أهمية بالغة.\n\nجمع البيانات: نقوم بجمع معلوماتك الأساسية (الاسم، رقم الجوال، الموقع الدقيق) لضمان توصيل الطلبات بكفاءة.\n\nاستخدام البيانات: تُستخدم بياناتك حصرياً لتحسين تجربة المستخدم ومعالجة الطلبات داخل منصة SmartFlow متعددة المستأجرين.\n\nحماية البيانات: نلتزم التزاماً تاماً بعدم مشاركة أو بيع بياناتك لأي أطراف ثالثة لأغراض تسويقية.\n\nحذف الحساب: يحق للمستخدم طلب حذف حسابه وبياناته نهائياً في أي وقت من خلال إعدادات الملف الشخصي.`,
                `At ${restaurant?.restaurant_name || restaurant?.name || 'Restaurant'}, we take your privacy seriously.\n\nData Collection: We collect your basic information (name, phone number, precise location) to ensure efficient order delivery.\n\nData Usage: Your data is used exclusively to improve user experience and process orders within the SmartFlow multi-tenant platform.\n\nData Protection: We are fully committed to not sharing or selling your data to any third parties for marketing purposes.\n\nAccount Deletion: Users have the right to request permanent deletion of their account and data at any time through profile settings.`)}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Terms & Conditions Modal */}
      <Modal
        visible={isTermsModalVisible}
        animationType="slide"
        onRequestClose={() => setIsTermsModalVisible(false)}
      >
        <SafeAreaView style={styles.policyModalContainer}>
          <StatusBar style="dark" />

          {/* Header */}
          <View style={[styles.policyModalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity onPress={() => setIsTermsModalVisible(false)}>
              <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.policyModalTitle}>{getText('الشروط والأحكام', 'Terms & Conditions')}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.policyModalContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.policyText, { textAlign: 'right', writingDirection: 'rtl' }]}>
              {getText(`تطبق هذه الشروط والأحكام على جميع مستخدمي تطبيق ${restaurant?.restaurant_name || restaurant?.name || 'المطعم'}.\n\nوصف الخدمة: هذا التطبيق هو منصة تقنية رائدة تقدم خدمات الطلب والتوصيل السريع لمنتجات ${restaurant?.restaurant_name || restaurant?.name || 'المطعم'}.\n\nآلية الدفع: تعتمد الخدمة حالياً على خيار (الدفع عند الاستلام) أو (الدفع في الفرع). يلتزم العميل التزاماً كاملاً بدفع قيمة الطلب.\n\nإخلاء المسؤولية: يُرجى التواصل معنا في حال وجود أي ملاحظات، ويقتصر دور منصة SmartFlow التقنية على تسهيل وإدارة عملية الطلب والتوصيل.\n\nنحتفظ بالحق في تحديث أو تعديل هذه الشروط في أي وقت، ويعتبر استمرارك في استخدام التطبيق موافقة صريحة عليها.`,
                `These terms and conditions apply to all users of the ${restaurant?.restaurant_name || restaurant?.name || 'Restaurant'} app.\n\nService Description: This app is a leading technology platform providing ordering and fast delivery services for ${restaurant?.restaurant_name || restaurant?.name || 'Restaurant'} products.\n\nPayment Mechanism: The service currently relies on (Cash on Delivery) or (Payment at Branch) options. The customer is fully committed to paying the order value.\n\nDisclaimer: Please contact us for any feedback, and the technical role of the SmartFlow platform is limited to facilitating and managing the ordering and delivery process.\n\nWe reserve the right to update or modify these terms at any time, and continued use of the app is considered explicit acceptance of them.`)}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Cart Checkout Modal */}
      {renderCartModal()}

      {/* Moyasar Secure Payment Modal */}
      {renderPaymentModal()}

      {/* Add Address Modal */}
      {renderAddAddressModal()}

      {/* Mock Section Modal */}
      {renderMockSectionModal()}

      {/* Meal Customization Modal */}
      {renderMealCustomizationModal()}

      {/* Order Tracking Modal */}
      {renderOrderTrackingModal()}

      {/* Order Success Modal */}
      {renderSuccessModal()}

      {/* Realtime Status Update Toast */}
      {renderStatusToast()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_WARM,
  },
  mobileAppShell: {
    flex: 1,
    width: '100%',
    backgroundColor: BG_WARM,
    position: 'relative',
  },
  mobileAppShellDesktop: {
    maxWidth: 460,
    alignSelf: 'center',
    overflow: 'hidden',
    shadowColor: '#053B3F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 6,
  },
  menuScrollRoot: {
    flex: 1,
  },
  menuScrollContent: {
    paddingBottom: 130,
    position: 'relative',
  },
  bgDecorTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 0,
  },
  bgDecorMidLeft: {
    position: 'absolute',
    top: 292,
    left: 0,
    zIndex: 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: BG_WARM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: TEXT_TEAL_MUTED,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: BG_WARM,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#DC3545',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  menuHeader: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    zIndex: 2,
  },
  topLocationPill: {
    width: '100%',
    backgroundColor: PILL_MINT,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    minHeight: 58,
  },
  topLocationRightGroup: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  topLocationPinWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  topLocationSmallLabel: {
    fontSize: 12.5,
    color: '#2B5B5E',
    fontWeight: '600',
    marginBottom: 1,
  },
  topLocationMainText: {
    fontSize: 16.5,
    color: TEXT_TEAL_DARK,
    fontWeight: '800',
    flexShrink: 1,
  },
  organicBannerSection: {
    width: '100%',
    marginTop: 4,
    marginBottom: 12,
  },
  organicBannerTextOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 18,
    left: '28%',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  organicBannerHeadline: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'right',
    letterSpacing: 0.2,
  },
  organicBannerSubtitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#D4F2EE',
    textAlign: 'right',
    marginTop: -2,
  },
  organicBannerCtaPill: {
    backgroundColor: ACCENT_ORANGE,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
  organicBannerCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  bannerPaginationRow: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
    marginBottom: 4,
  },
  bannerDot: {
    width: 8.5,
    height: 8.5,
    borderRadius: 5,
  },
  brandingHeader: {
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  brandingLogoRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2.5,
    borderColor: '#76C3B9',
    backgroundColor: '#FFFFFF',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#053B3F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  brandingLogoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  brandingVerticalDivider: {
    width: 1.5,
    height: 46,
    backgroundColor: '#DCE2DE',
    marginHorizontal: 14,
    borderRadius: 1,
  },
  brandingLogoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#76C3B9',
  },
  brandingInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  brandingTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: TEXT_TEAL_DARK,
    marginBottom: 5,
  },
  brandingMetaRow: {
    alignItems: 'center',
    gap: 5,
  },
  brandingRatingValue: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_TEAL_DARK,
  },
  brandingSubtitle: {
    fontSize: 14.5,
    color: '#2F5558',
    fontWeight: '600',
  },
  searchBarContainer: {
    backgroundColor: PILL_MINT,
    borderRadius: 999,
    paddingHorizontal: 18,
    height: 48,
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15.5,
    color: TEXT_TEAL_DARK,
    fontWeight: '600',
    paddingVertical: 0,
  },
  actionPillsRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  orderTypePillContainer: {
    flex: 1.05,
    backgroundColor: PILL_MINT,
    borderRadius: 999,
    padding: 4,
    height: 48,
    alignItems: 'center',
  },
  orderTypeSegment: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  orderTypeSegmentActive: {
    shadowColor: '#053B3F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 3,
  },
  orderTypeSegmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_TEAL_DARK,
  },
  orderTypeSegmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  actionPillsDivider: {
    width: 1.5,
    height: 26,
    backgroundColor: '#CBD8D4',
    borderRadius: 1,
  },
  branchPillContainer: {
    flex: 1,
    backgroundColor: PILL_MINT,
    borderRadius: 999,
    paddingHorizontal: 13,
    height: 48,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  branchPillText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_TEAL_DARK,
  },
  branchDropdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 2,
    marginBottom: 10,
    padding: 6,
    borderWidth: 1,
    borderColor: PILL_MINT,
    shadowColor: '#053B3F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  branchDropdownOption: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 10,
  },
  deliveryAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: PILL_MINT,
    borderRadius: 999,
    gap: 8,
  },
  deliveryAddressText: {
    flex: 1,
    fontSize: 14,
    color: TEXT_TEAL_DARK,
  },
  deliveryToggle: {
    backgroundColor: PILL_MINT,
    borderRadius: 999,
    padding: 5,
    marginBottom: 12,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    gap: 8,
  },
  toggleOptionActive: {
    elevation: 3,
  },
  toggleOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_TEAL_DARK,
  },
  toggleOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  branchList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  branchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  branchItemActive: {
    borderColor: '#E9ECEF',
  },
  branchIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#CBD5E1',
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  branchAddress: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  branchDetails: {
    gap: 8,
    marginTop: 4,
  },
  branchDetailText: {
    fontSize: 12,
    color: '#64748B',
  },
  branchStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  branchActions: {
    justifyContent: 'flex-end',
    gap: 12,
  },
  branchActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    flex: 1,
  },
  categoriesContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 6,
    marginBottom: 10,
    zIndex: 2,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryPill: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPillActive: {
    shadowColor: '#053B3F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 3,
  },
  categoryPillInactive: {
    backgroundColor: PILL_MINT,
  },
  categoryPillText: {
    fontSize: 15,
    fontWeight: '700',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  categoryPillTextInactive: {
    color: TEXT_TEAL_DARK,
    fontWeight: '700',
  },
  categoryItem: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: PILL_MINT,
  },
  categoryItemActive: {
    elevation: 3,
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_TEAL_DARK,
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  fromOurMenuHeader: {
    paddingHorizontal: 16,
    marginTop: 2,
    marginBottom: 12,
    alignItems: 'center',
    zIndex: 2,
  },
  fromOurMenuTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: TEXT_TEAL_DARK,
  },
  fromOurMenuSplash: {
    marginHorizontal: 4,
    marginTop: -8,
  },
  menuCardsWrapper: {
    paddingHorizontal: 16,
    zIndex: 2,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  menuContent: {
    paddingBottom: 120,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 44,
    backgroundColor: CARD_MINT,
    borderRadius: 24,
  },
  emptyText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: TEXT_TEAL_MUTED,
  },
  menuItem: {
    backgroundColor: CARD_MINT,
    borderRadius: 26,
    marginBottom: 14,
    padding: 12,
    alignItems: 'center',
    gap: 12,
  },
  menuItemImageContainer: {
    width: 106,
    height: 106,
    borderRadius: 20,
    backgroundColor: CARD_IMAGE_MINT,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  menuItemImage: {
    width: '100%',
    height: '100%',
  },
  menuItemPlaceholderBox: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    padding: 6,
  },
  menuItemPlaceholderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#356968',
  },
  discountTagPill: {
    position: 'absolute',
    top: 6,
    backgroundColor: ACCENT_ORANGE,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 3,
  },
  discountTagPillInline: {
    backgroundColor: ACCENT_ORANGE,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountTagPillText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  menuItemContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  menuItemTitle: {
    fontSize: 17.5,
    fontWeight: '800',
    color: TEXT_TEAL_DARK,
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 13,
    color: TEXT_TEAL_MUTED,
    lineHeight: 19,
    marginBottom: 8,
  },
  menuItemPrice: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  discountedPriceText: {
    fontSize: 17,
    fontWeight: '800',
  },
  originalPriceStrikethrough: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#789596',
    textDecorationLine: 'line-through',
  },
  menuItemActionZone: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingBottom: 6,
    paddingHorizontal: 2,
  },
  expressiveAddButton: {
    width: 56,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#053B3F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  expressiveCounterContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 4,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
  },
  expressiveCounterBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expressiveCounterMinusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PILL_MINT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expressiveCounterText: {
    fontSize: 15,
    fontWeight: '800',
    minWidth: 16,
    textAlign: 'center',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PILL_MINT,
    borderRadius: 999,
    padding: 4,
    gap: 12,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
    color: TEXT_TEAL_DARK,
  },
  floatingCartFab: {
    position: 'absolute',
    bottom: 90,
    left: 18,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#053B3F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 9999,
  },
  floatingCartFabBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  floatingCartFabBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  offersContainer: {
    flex: 1,
    backgroundColor: BG_WARM,
  },
  toggleContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  toggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  offersContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  offersSection: {
    gap: 16,
    paddingBottom: 110,
  },
  offerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  offerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  offerBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TEXT_TEAL_DARK,
    marginBottom: 4,
  },
  offerDescription: {
    fontSize: 14,
    color: TEXT_TEAL_MUTED,
    marginBottom: 8,
  },
  offerValidity: {
    fontSize: 12,
    color: '#94A3B8',
  },
  codesSection: {
    gap: 16,
    paddingBottom: 110,
  },
  codeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  codeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_TEAL_DARK,
    marginBottom: 12,
  },
  codeInput: {
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CARD_MINT,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  codeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TEXT_TEAL_DARK,
    fontFamily: 'monospace',
  },
  copyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  codeDescription: {
    fontSize: 12,
    color: TEXT_TEAL_MUTED,
  },
  ordersContainer: {
    flex: 1,
    backgroundColor: BG_WARM,
    padding: 16,
    paddingBottom: 110,
  },
  ordersTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT_TEAL_DARK,
    marginBottom: 16,
  },
  ordersContent: {
    gap: 16,
    paddingBottom: 110,
  },
  orderCard: {
    backgroundColor: CARD_MINT,
    borderRadius: 20,
    padding: 16,
  },
  orderHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TEXT_TEAL_DARK,
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 12,
    color: TEXT_TEAL_MUTED,
    marginBottom: 8,
  },
  orderItems: {
    fontSize: 14,
    color: TEXT_TEAL_DARK,
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TEXT_TEAL_DARK,
  },
  moreContainer: {
    flex: 1,
    backgroundColor: BG_WARM,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_TEAL_DARK,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  premiumToggleContainer: {
    backgroundColor: PILL_MINT,
    borderRadius: 999,
    padding: 4,
    width: 140,
  },
  premiumToggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_TEAL_DARK,
  },
  premiumToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  socialIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 20,
    backgroundColor: 'transparent',
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PILL_MINT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingItem: {
    alignItems: 'center',
    backgroundColor: CARD_MINT,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_TEAL_DARK,
    marginHorizontal: 12,
  },
  footer: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingBottom: 96,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: TEXT_TEAL_MUTED,
  },
  bottomNavFloatingWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  bottomNav: {
    width: '100%',
    backgroundColor: NAV_MINT,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 0,
    shadowColor: '#053B3F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  bottomNavActivePill: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 7,
  },
  bottomNavActiveText: {
    fontSize: 11.5,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  bottomNavItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 2,
  },
  bottomNavText: {
    fontSize: 11.5,
    color: TEXT_TEAL_DARK,
    fontWeight: '700',
  },
  // Splash Screen Styles
  splashContainer: {
    flex: 1,
    backgroundColor: BG_WARM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContent: {
    alignItems: 'center',
  },
  splashText: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_TEAL_DARK,
    marginTop: 16,
    marginBottom: 24,
  },
  splashLoader: {
    marginTop: 16,
  },
  // Map Modal Styles
  mapModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapTopSection: {
    flex: 0.52,
    position: 'relative',
  },
  mapBackButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  mapBottomSheet: {
    flex: 0.48,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  mapBottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 12,
  },
  addressChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  addressChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  addressExtrasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  addressToggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressPhotoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  addressPhotoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  addressPhotoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressPhotoThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  addressPhotoRemoveBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapSearchBar: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  mapSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  mapActionButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mapActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Legacy map styles for marker and loading
  mapView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  mapLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markerShadow: {
    position: 'absolute',
    bottom: -8,
    width: 24,
    height: 12,
    borderRadius: 12,
    opacity: 0.3,
  },
  // Profile Modal Styles
  profileModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  profileModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  profileModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  profileModalContent: {
    flex: 1,
  },
  profileSubtitleBanner: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    borderRadius: 8,
  },
  profileSubtitleText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  profileForm: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  profileField: {
    marginBottom: 24,
  },
  profileFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  profileInput: {
    fontSize: 16,
    color: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
  },
  profileInputDisabled: {
    backgroundColor: '#F8F9FA',
    color: '#94A3B8',
  },
  genderToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#00B4D8',
    borderColor: '#00B4D8',
  },
  genderButtonText: {
    fontSize: 14,
    color: '#64748B',
  },
  genderButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  deleteAccountSection: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  deleteAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  deleteAccountText: {
    fontSize: 16,
    color: '#DC3545',
    fontWeight: '600',
  },
  deleteAccountSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  profileModalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  profileConfirmButton: {
    backgroundColor: '#DC3545',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  profileConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Policy Modal Styles (Privacy & Terms)
  policyModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  policyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  policyModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  policyModalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  policyText: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#DC3545',
    fontWeight: '600',
  },
  cartModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cartModalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  cartModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    flexShrink: 1,
    paddingBottom: 24,
  },
  cartModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cartModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  cartModalItemsList: {
    paddingHorizontal: 24,
    maxHeight: '60%',
  },
  cartModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cartModalItemInfo: {
    flex: 1,
    paddingHorizontal: 12,
  },
  cartModalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  cartModalItemPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  cartModalItemStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 4,
    gap: 12,
  },
  cartModalItemButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  cartModalItemQuantity: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
    color: '#1E293B',
  },
  cartModalNotesContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  cartModalNotesLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  cartModalNotesInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1E293B',
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cartModalSummary: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  cartModalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartModalSummaryLabel: {
    fontSize: 15,
    color: '#64748B',
  },
  cartModalSummaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  cartModalSummaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cartModalSummaryTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  cartModalSummaryTotalValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  cartModalFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  cartCheckoutButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCheckoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
