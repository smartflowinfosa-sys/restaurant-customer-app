import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Dimensions,
  Alert as RNAlert,
  TextInput,
  I18nManager,
  Linking,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from './lib/supabase';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

// Hardcoded restaurant ID for testing
const RESTAURANT_ID = '22222222-2222-2222-2222-222222222222';

// Turquoise color scheme
const TURQUOISE_COLOR = '#00B4D8';
const WHITE_COLOR = '#FFFFFF';

// Default coordinates (Jeddah)
const DEFAULT_COORDS = {
  latitude: 21.5433,
  longitude: 39.1728,
};

// Force categories as specified
const FORCED_CATEGORIES = ['الكل', 'التباسي', 'الاسماك', 'الوجبات', 'المقبلات', 'الارز', 'المشروبات'];

// Static mock items as specified
const STATIC_MOCK_ITEMS = [
  {
    id: 'mock-1',
    restaurant_id: RESTAURANT_ID,
    title: 'لمة هامور',
    description: 'لحم هامور طازج مشوي مع البهارات العربية',
    price: 99,
    category: 'التباسي',
    image_url: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=400&h=300&fit=crop',
  },
  {
    id: 'mock-2',
    restaurant_id: RESTAURANT_ID,
    title: 'لمة شعور',
    description: 'لحم شعور طازج مشوي مع التوابل الخاصة',
    price: 99,
    category: 'التباسي',
    image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop',
  },
  {
    id: 'mock-3',
    restaurant_id: RESTAURANT_ID,
    title: 'لمة قاروص',
    description: 'لحم قاروص طازج مشوي مع الليمون والثوم',
    price: 99,
    category: 'التباسي',
    image_url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop',
  },
];

interface Restaurant {
  id: string;
  name: string;
  primary_color: string;
}

interface MenuItem {
  id: string;
  restaurant_id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
}

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function App() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('menu');
  const [offersSection, setOffersSection] = useState('offers');
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedBranch, setSelectedBranch] = useState('فرع الصفا');
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [userLocation, setUserLocation] = useState(DEFAULT_COORDS);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchLocation, setSearchLocation] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const hasRequestedPermissions = useRef(false);

  const primaryColor = TURQUOISE_COLOR;
  const isRTL = language === 'ar';

  useEffect(() => {
    fetchData();
    requestPermissions();
  }, []);

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

      // Fetch restaurant details
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', RESTAURANT_ID)
        .single();

      if (restaurantError) throw restaurantError;
      setRestaurant(restaurantData);

      // Fetch menu items
      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID);

      if (itemsError) throw itemsError;
      
      // Combine DB items with static mock items
      const combinedItems = [...(itemsData || []), ...STATIC_MOCK_ITEMS];
      setMenuItems(combinedItems);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter items by category
  const filteredItems = selectedCategory === 'الكل' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const addToCart = (item: MenuItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(cartItem =>
          cartItem.id === itemId
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        );
      }
      return prevCart.filter(cartItem => cartItem.id !== itemId);
    });
  };

  const getItemQuantity = (itemId: string) => {
    const item = cart.find(cartItem => cartItem.id === itemId);
    return item?.quantity || 0;
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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

  const renderCategory = (category: string) => {
    const isActive = selectedCategory === category;
    
    return (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryItem,
          isActive && styles.categoryItemActive,
        ]}
        onPress={() => setSelectedCategory(category)}
      >
        <Text
          style={[
            styles.categoryText,
            isActive && { color: primaryColor },
          ]}
        >
          {category}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderMenuItem = ({ item }: { item: MenuItem }) => {
    const quantity = getItemQuantity(item.id);
    
    return (
      <View style={[styles.menuItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Image source={{ uri: item.image_url }} style={styles.menuItemImage} />
        <View style={[styles.menuItemContent, isRTL ? { marginRight: 0, marginLeft: 12 } : { marginRight: 12, marginLeft: 0 }]}>
          <Text style={[styles.menuItemTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{item.title}</Text>
          <Text style={[styles.menuItemDescription, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={[styles.menuItemPrice, { color: primaryColor, textAlign: isRTL ? 'right' : 'left' }]}>
            {item.price} ر.س
          </Text>
        </View>
        <View style={styles.quantitySelector}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => addToCart(item)}
          >
            <Ionicons name="add" size={20} color={primaryColor} />
          </TouchableOpacity>
          <Text style={[styles.quantityText, { color: primaryColor }]}>
            {quantity > 0 ? `${item.price} ر.س` : `${item.price} ر.س`}
          </Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => removeFromCart(item.id)}
            disabled={quantity === 0}
          >
            <Ionicons 
              name="remove" 
              size={20} 
              color={quantity > 0 ? primaryColor : '#CBD5E1'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderBottomNavItem = (tabId: string, iconName: string, labelAr: string, labelEn: string) => {
    const isActive = activeTab === tabId;
    
    return (
      <TouchableOpacity
        style={styles.bottomNavItem}
        onPress={() => setActiveTab(tabId)}
      >
        <Ionicons
          name={iconName as any}
          size={24}
          color={isActive ? primaryColor : '#94A3B8'}
        />
        <Text
          style={[
            styles.bottomNavText,
            isActive && { color: primaryColor },
          ]}
        >
          {getText(labelAr, labelEn)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderMenuTab = () => (
    <>
      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.categoriesList, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          {FORCED_CATEGORIES.map(renderCategory)}
        </ScrollView>
      </View>

      {/* Menu Items */}
      <ScrollView 
        style={styles.menuContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.menuContent}
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{getText('لا توجد أصناف في هذه الفئة', 'No items in this category')}</Text>
          </View>
        ) : (
          filteredItems.map((item) => (
            <View key={item.id}>
              {renderMenuItem({ item })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <View style={styles.floatingCartContainer}>
          <TouchableOpacity style={[styles.floatingCart, { backgroundColor: primaryColor }]}>
            <View style={[styles.floatingCartContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
              <Text style={styles.floatingCartText}>
                {totalPrice} ر.س | {totalItems} {getText('الأصناف', 'items')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

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
      <ScrollView style={styles.offersContent} showsVerticalScrollIndicator={false}>
        {offersSection === 'offers' ? (
          <View style={styles.offersSection}>
            <View style={styles.offerCard}>
              <View style={[styles.offerBadge, { backgroundColor: primaryColor }]}>
                <Text style={styles.offerBadgeText}>{getText('خصم 20%', '20% Off')}</Text>
              </View>
              <Text style={[styles.offerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('عرض خاص على الأسماك', 'Special Fish Offer')}</Text>
              <Text style={[styles.offerDescription, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('احصل على خصم 20% على جميع أنواع الأسماك', 'Get 20% off on all fish types')}</Text>
              <Text style={[styles.offerValidity, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('صالح حتى 30 سبتمبر', 'Valid until September 30')}</Text>
            </View>
            <View style={styles.offerCard}>
              <View style={[styles.offerBadge, { backgroundColor: primaryColor }]}>
                <Text style={styles.offerBadgeText}>{getText('وجبة مجانية', 'Free Meal')}</Text>
              </View>
              <Text style={[styles.offerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('اشتري وجبة واحصل على مجانية', 'Buy one get one free')}</Text>
              <Text style={[styles.offerDescription, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('عند شراء وجبتين احصل على الثالثة مجاناً', 'Buy 2 meals, get 1 free')}</Text>
              <Text style={[styles.offerValidity, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('صالح لفترة محدودة', 'Valid for limited time')}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.codesSection}>
            <View style={styles.codeCard}>
              <Text style={[styles.codeTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('كود الخصم', 'Discount Code')}</Text>
              <View style={[styles.codeInput, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.codeText}>SEAFOOD20</Text>
                <TouchableOpacity style={[styles.copyButton, { backgroundColor: primaryColor }]}>
                  <Text style={styles.copyButtonText}>{getText('نسخ', 'Copy')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.codeDescription, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('خصم 20% على الطلب الأول', '20% off first order')}</Text>
            </View>
            <View style={styles.codeCard}>
              <Text style={[styles.codeTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('كود التوصيل المجاني', 'Free Delivery Code')}</Text>
              <View style={[styles.codeInput, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.codeText}>FREEDEL</Text>
                <TouchableOpacity style={[styles.copyButton, { backgroundColor: primaryColor }]}>
                  <Text style={styles.copyButtonText}>{getText('نسخ', 'Copy')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.codeDescription, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('توصيل مجاني للطلبات فوق 100 ر.س', 'Free delivery on orders over 100 SAR')}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const renderOrdersTab = () => (
    <View style={styles.ordersContainer}>
      <Text style={[styles.ordersTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('طلباتي السابقة', 'My Previous Orders')}</Text>
      <ScrollView style={styles.ordersContent} showsVerticalScrollIndicator={false}>
        <View style={styles.orderCard}>
          <View style={[styles.orderHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.orderNumber}>{getText('طلب #1234', 'Order #1234')}</Text>
            <Text style={[styles.orderStatus, { color: primaryColor }]}>{getText('قيد التجهيز', 'Preparing')}</Text>
          </View>
          <Text style={[styles.orderDate, { textAlign: isRTL ? 'right' : 'left' }]}>15 سبتمبر 2026</Text>
          <Text style={[styles.orderItems, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('لمة هامور، لمة شعور', 'Hamour, Shour Fish')}</Text>
          <Text style={[styles.orderTotal, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('الإجمالي: 198 ر.س', 'Total: 198 SAR')}</Text>
        </View>
        <View style={styles.orderCard}>
          <View style={[styles.orderHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.orderNumber}>{getText('طلب #1233', 'Order #1233')}</Text>
            <Text style={[styles.orderStatus, { color: '#10B981' }]}>{getText('تم التوصيل', 'Delivered')}</Text>
          </View>
          <Text style={[styles.orderDate, { textAlign: isRTL ? 'right' : 'left' }]}>10 سبتمبر 2026</Text>
          <Text style={[styles.orderItems, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('بيتزا مارغريتا، عصير برتقال', 'Margherita Pizza, Orange Juice')}</Text>
          <Text style={[styles.orderTotal, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('الإجمالي: 47 ر.س', 'Total: 47 SAR')}</Text>
        </View>
      </ScrollView>
    </View>
  );

  const renderMoreTab = () => (
    <View style={styles.moreContainer}>
      {/* Language Toggle */}
      <View style={[styles.languageToggle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={[
            styles.languageButton,
            language === 'ar' && { backgroundColor: primaryColor },
          ]}
          onPress={() => setLanguage('ar')}
        >
          <Text
            style={[
              styles.languageText,
              language === 'ar' && styles.languageTextActive,
            ]}
          >
            العربية
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.languageButton,
            language === 'en' && { backgroundColor: primaryColor },
          ]}
          onPress={() => setLanguage('en')}
        >
          <Text
            style={[
              styles.languageText,
              language === 'en' && styles.languageTextActive,
            ]}
          >
            English
          </Text>
        </TouchableOpacity>
      </View>

      {/* Social Icons - TikTok and WhatsApp ONLY */}
      <View style={styles.socialIcons}>
        <TouchableOpacity 
          style={styles.socialButton}
          onPress={() => Linking.openURL('https://tiktok.com')}
        >
          <FontAwesome5 name="tiktok" size={24} color={primaryColor} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.socialButton}
          onPress={() => Linking.openURL('https://wa.me/1234567890')}
        >
          <FontAwesome5 name="whatsapp" size={24} color={primaryColor} />
        </TouchableOpacity>
      </View>

      {/* Settings List */}
      <ScrollView style={styles.settingsList} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="person-outline" size={24} color="#64748B" />
          <Text style={[styles.settingText, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('الملف الشخصي', 'Profile')}</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#CBD5E1" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="call-outline" size={24} color="#64748B" />
          <Text style={[styles.settingText, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('اتصل بنا', 'Contact Us')}</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#CBD5E1" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="location-outline" size={24} color="#64748B" />
          <Text style={[styles.settingText, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('العناوين', 'Addresses')}</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#CBD5E1" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="card-outline" size={24} color="#64748B" />
          <Text style={[styles.settingText, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('طرق الدفع', 'Payment Methods')}</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#CBD5E1" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="notifications-outline" size={24} color="#64748B" />
          <Text style={[styles.settingText, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('الإشعارات', 'Notifications')}</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#CBD5E1" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="help-circle-outline" size={24} color="#64748B" />
          <Text style={[styles.settingText, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('المساعدة والدعم', 'Help & Support')}</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#CBD5E1" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="settings-outline" size={24} color="#64748B" />
          <Text style={[styles.settingText, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('الإعدادات', 'Settings')}</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#CBD5E1" />
        </TouchableOpacity>
      </ScrollView>

      {/* Footer Brand */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>بواسطة smartflow</Text>
      </View>
    </View>
  );

  const renderMenuHeader = () => (
    <View style={styles.menuHeader}>
      {/* Delivery/Pickup Toggle */}
      <View style={[styles.deliveryToggle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={[
            styles.toggleOption,
            deliveryMode === 'delivery' && styles.toggleOptionActive,
            deliveryMode === 'delivery' && { backgroundColor: primaryColor },
          ]}
          onPress={() => setDeliveryMode('delivery')}
        >
          <Ionicons 
            name="car" 
            size={24} 
            color={deliveryMode === 'delivery' ? '#FFFFFF' : primaryColor} 
          />
          <Text
            style={[
              styles.toggleOptionText,
              deliveryMode === 'delivery' && styles.toggleOptionTextActive,
            ]}
          >
            {getText('توصيل', 'Delivery')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleOption,
            deliveryMode === 'pickup' && styles.toggleOptionActive,
            deliveryMode === 'pickup' && { backgroundColor: primaryColor },
          ]}
          onPress={() => setDeliveryMode('pickup')}
        >
          <Ionicons 
            name="storefront" 
            size={24} 
            color={deliveryMode === 'pickup' ? '#FFFFFF' : primaryColor} 
          />
          <Text
            style={[
              styles.toggleOptionText,
              deliveryMode === 'pickup' && styles.toggleOptionTextActive,
            ]}
          >
            {getText('استلام', 'Pickup')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Location Selector */}
      <TouchableOpacity 
        style={styles.locationSelector}
        onPress={() => setShowLocationModal(true)}
      >
        <View style={[styles.locationContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="location-outline" size={20} color={primaryColor} />
          <Text style={[styles.locationText, { textAlign: isRTL ? 'right' : 'left' }]}>
            {deliveryMode === 'delivery' ? getText('موقع التوصيل', 'Delivery Location') : selectedBranch}
          </Text>
          <Ionicons name="chevron-down" size={20} color={primaryColor} />
        </View>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>{getText('جاري التحميل...', 'Loading...')}</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar style="light" />
        <Text style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('حدث خطأ:', 'Error occurred:')} {error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: primaryColor }]}
          onPress={fetchData}
        >
          <Text style={styles.retryButtonText}>{getText('إعادة المحاولة', 'Retry')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'menu' && (
          <>
            {renderMenuHeader()}
            {renderMenuTab()}
          </>
        )}
        {activeTab === 'offers' && renderOffersTab()}
        {activeTab === 'orders' && renderOrdersTab()}
        {activeTab === 'more' && renderMoreTab()}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={[styles.bottomNav, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {renderBottomNavItem('menu', 'restaurant', 'القائمة', 'Menu')}
        {renderBottomNavItem('offers', 'pricetag', 'العروض', 'Offers')}
        {renderBottomNavItem('orders', 'receipt', 'الطلبات', 'Orders')}
        {renderBottomNavItem('more', 'grid', 'المزيد', 'More')}
      </View>

      {/* Location Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {deliveryMode === 'delivery' ? getText('حدد موقع التوصيل', 'Set Delivery Location') : getText('اختر الفرع', 'Select Branch')}
              </Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            {deliveryMode === 'delivery' ? (
              /* Delivery Mode - Show Map with Google Maps forced */
              <View style={styles.mapContainer}>
                {/* Search Location Input */}
                <View style={[styles.searchLocationContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="search" size={20} color="#64748B" />
                  <TextInput
                    style={[styles.searchLocationInput, { textAlign: isRTL ? 'right' : 'left' }]}
                    placeholder={getText('حدد موقعك', 'Search Location')}
                    placeholderTextColor="#94A3B8"
                    value={searchLocation}
                    onChangeText={setSearchLocation}
                  />
                </View>

                {/* Map View with Google Maps forced */}
                {locationLoading ? (
                  <View style={styles.mapLoadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                    <Text style={styles.mapLoadingText}>{getText('جاري تحديد موقعك...', 'Locating you...')}</Text>
                  </View>
                ) : (
                  <MapView
                    style={styles.mapView}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={{
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                      latitudeDelta: 0.0922,
                      longitudeDelta: 0.0421,
                    }}
                    region={{
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                      latitudeDelta: 0.0922,
                      longitudeDelta: 0.0421,
                    }}
                  >
                    <Marker
                      coordinate={{
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                      }}
                      title={getText('موقعك الحالي', 'Your Current Location')}
                      description={getText('موقع التوصيل', 'Delivery Location')}
                    >
                      <View style={styles.customMarker}>
                        <View style={[styles.markerPin, { backgroundColor: primaryColor }]}>
                          <Ionicons name="location" size={24} color="#FFFFFF" />
                        </View>
                        <View style={[styles.markerShadow, { backgroundColor: primaryColor }]} />
                      </View>
                    </Marker>
                  </MapView>
                )}

                {/* Auto-Locate Button */}
                <TouchableOpacity 
                  style={[styles.autoLocateButton, { backgroundColor: primaryColor }]}
                  onPress={handleAutoLocate}
                >
                  <Ionicons name="navigate" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              /* Pickup Mode - Show Branches */
              <View style={styles.branchList}>
                {/* Branch 1: الصفا */}
                <TouchableOpacity 
                  style={[
                    styles.branchItem,
                    selectedBranch === 'فرع الصفا' && styles.branchItemActive,
                  ]}
                  onPress={() => {
                    setSelectedBranch('فرع الصفا');
                    setShowLocationModal(false);
                  }}
                >
                  <View style={[styles.branchIndicator, selectedBranch === 'فرع الصفا' && { backgroundColor: primaryColor }]} />
                  <View style={[styles.branchInfo, isRTL ? { marginRight: 0, marginLeft: 12 } : { marginRight: 12, marginLeft: 0 }]}>
                    <Text style={[styles.branchName, { textAlign: isRTL ? 'right' : 'left' }]}>فرع الصفا</Text>
                    <Text style={[styles.branchAddress, { textAlign: isRTL ? 'right' : 'left' }]}>شارع الامير سعود الفيصل</Text>
                    <View style={[styles.branchDetails, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={styles.branchDetailText}>08:00 ص - 12:00 م</Text>
                      <Text style={styles.branchDetailText}>•</Text>
                      <Text style={styles.branchDetailText}>2.5 كم</Text>
                    </View>
                  </View>
                  <View style={[styles.branchActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity 
                      style={styles.branchActionButton}
                      onPress={() => Linking.openURL('https://maps.google.com')}
                    >
                      <Ionicons name="map" size={20} color={primaryColor} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.branchActionButton}
                      onPress={() => {
                        RNAlert.alert(
                          getText('ساعات العمل', 'Working Hours'),
                          getText('08:00 ص - 12:00 م', '08:00 AM - 12:00 PM'),
                          [{ text: getText('حسناً', 'OK') }]
                        );
                      }}
                    >
                      <Ionicons name="time" size={20} color={primaryColor} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>

                {/* Branch 2: النسيم */}
                <TouchableOpacity 
                  style={[
                    styles.branchItem,
                    selectedBranch === 'فرع النسيم' && styles.branchItemActive,
                  ]}
                  onPress={() => {
                    setSelectedBranch('فرع النسيم');
                    setShowLocationModal(false);
                  }}
                >
                  <View style={[styles.branchIndicator, selectedBranch === 'فرع النسيم' && { backgroundColor: primaryColor }]} />
                  <View style={[styles.branchInfo, isRTL ? { marginRight: 0, marginLeft: 12 } : { marginRight: 12, marginLeft: 0 }]}>
                    <Text style={[styles.branchName, { textAlign: isRTL ? 'right' : 'left' }]}>فرع النسيم</Text>
                    <Text style={[styles.branchAddress, { textAlign: isRTL ? 'right' : 'left' }]}>شارع ام المومنين حبيبة</Text>
                    <View style={[styles.branchDetails, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={styles.branchDetailText}>10:00 ص - 11:30 م</Text>
                      <Text style={styles.branchDetailText}>•</Text>
                      <Text style={styles.branchDetailText}>5.0 كم</Text>
                    </View>
                  </View>
                  <View style={[styles.branchActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity 
                      style={styles.branchActionButton}
                      onPress={() => Linking.openURL('https://maps.google.com')}
                    >
                      <Ionicons name="map" size={20} color={primaryColor} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.branchActionButton}
                      onPress={() => {
                        RNAlert.alert(
                          getText('ساعات العمل', 'Working Hours'),
                          getText('10:00 ص - 11:30 م', '10:00 AM - 11:30 PM'),
                          [{ text: getText('حسناً', 'OK') }]
                        );
                      }}
                    >
                      <Ionicons name="time" size={20} color={primaryColor} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Browse Menu Button (Delivery mode only) */}
            {deliveryMode === 'delivery' && (
              <TouchableOpacity 
                style={[styles.browseMenuButton, { backgroundColor: primaryColor }]}
                onPress={() => setShowLocationModal(false)}
              >
                <Text style={styles.browseMenuButtonText}>{getText('تصفح القائمة', 'Browse Menu')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6C757D',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  orderSelectionContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  deliveryToggle: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 6,
    marginBottom: 20,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  toggleOptionActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleOptionTextActive: {
    color: '#FFFFFF',
  },
  deliveryFlow: {
    flex: 1,
  },
  pickupFlow: {
    flex: 1,
  },
  mapContainer: {
    height: 400,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  searchLocationContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  searchLocationInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  mapView: {
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
  autoLocateButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  browseMenuButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  browseMenuButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  branchList: {
    gap: 16,
    marginBottom: 20,
  },
  branchCard: {
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
  branchCardActive: {
    borderColor: '#E9ECEF',
  },
  branchSelectionArea: {
    alignItems: 'center',
    marginBottom: 12,
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
  confirmBranchButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBranchButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  simpleHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginHorizontal: 12,
  },
  headerSpacer: {
    width: 24,
  },
  tabContent: {
    flex: 1,
  },
  categoriesContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryItem: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  categoryItemActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  menuContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6C757D',
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 8,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 8,
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'center',
  },
  floatingCartContainer: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  floatingCart: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingCartContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  floatingCartText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  offersContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  },
  offersSection: {
    gap: 16,
  },
  offerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    borderRadius: 8,
    marginBottom: 12,
  },
  offerBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  offerDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  offerValidity: {
    fontSize: 12,
    color: '#94A3B8',
  },
  codesSection: {
    gap: 16,
  },
  codeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    color: '#1E293B',
    marginBottom: 12,
  },
  codeInput: {
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  codeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    fontFamily: 'monospace',
  },
  copyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  codeDescription: {
    fontSize: 12,
    color: '#64748B',
  },
  ordersContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  ordersTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  ordersContent: {
    gap: 16,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  orderHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  orderItems: {
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  moreContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  languageToggle: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  languageText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  languageTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  socialIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingItem: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    marginHorizontal: 12,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  bottomNav: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-around',
  },
  bottomNavItem: {
    alignItems: 'center',
    gap: 4,
  },
  bottomNavText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});