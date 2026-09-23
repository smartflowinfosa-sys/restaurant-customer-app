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
  Platform,
  LayoutAnimation,
  UIManager,
  KeyboardAvoidingView,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
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

interface Category {
  id: string;
  name?: string;
  name_ar?: string;
  name_en?: string;
  title?: string;
}

interface Restaurant {
  id: string;
  name: string;
  primary_color: string;
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
  category?: string;
  category_id?: string;
  image_url: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CustomerScreen() {
  // ALL HOOKS MUST BE DECLARED FIRST - Strict Rules of Hooks
  const [restaurant, setRestaurant] = useState<Restaurant | null>({
    id: RESTAURANT_ID,
    name: 'SmartFlow Restaurant',
    primary_color: TURQUOISE_COLOR,
  });
  const [categories, setCategories] = useState<Category[]>([{ id: 'all', name: 'الكل' }]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('menu');
  const [offersSection, setOffersSection] = useState('offers');
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('pickup');
  const [selectedBranch, setSelectedBranch] = useState('فرع الصفا');
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
  const [phoneError, setPhoneError] = useState('');
  const [successOrderNumber, setSuccessOrderNumber] = useState<string | null>(null);
  const [gender, setGender] = useState('ذكر');
  const hasRequestedPermissions = useRef(false);
  const insets = useSafeAreaInsets();

  const primaryColor = TURQUOISE_COLOR;
  const isRTL = language === 'ar';

  // ALL USEEFFECT HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  useEffect(() => {
    fetchData();
    // requestPermissions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppReady(true);
    }, 2000);
    return () => clearTimeout(timer);
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

  useEffect(() => {
    if (showLocationModal) {
      setLocationLoading(true);
      (async () => {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            console.log('Location permission denied');
            setLocationLoading(false);
            return;
          }
          let location = await Location.getCurrentPositionAsync({});
          setMapRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          setLocationLoading(false);
        } catch (error) {
          console.error('Error getting location:', error);
          // Fallback to default coordinates if location fails
          setMapRegion({
            latitude: DEFAULT_COORDS.latitude,
            longitude: DEFAULT_COORDS.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
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

      // Fetch restaurant details
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', RESTAURANT_ID)
        .single();

      if (restaurantError) throw restaurantError;
      setRestaurant(restaurantData);

      const activeRestaurantId = process.env.EXPO_PUBLIC_ACTIVE_RESTAURANT_ID;

      // Fetch categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', activeRestaurantId);

      if (!catError && catData) {
        setCategories([{ id: 'all', name: 'الكل', name_en: 'All' }, ...catData]);
      }

      // Fetch menu items
      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('user_id', activeRestaurantId);

      if (itemsError) throw itemsError;

      setMenuItems(itemsData || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter items by category
  const filteredItems = !selectedCategory || selectedCategory === 'all' || selectedCategory === 'الكل'
    ? menuItems
    : menuItems.filter(item => item.category_id === selectedCategory || item.category === selectedCategory);

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

  const renderCategory = (category: Category) => {
    const isActive = selectedCategory === category.id;
    const categoryName = language === 'en'
      ? (category.name_en || category.name || category.title || category.name_ar || 'بدون اسم')
      : (category.name || category.title || category.name_ar || 'بدون اسم');

    return (
      <TouchableOpacity
        key={category.id}
        style={[
          styles.categoryItem,
          isActive && [
            styles.categoryItemActive,
            { backgroundColor: primaryColor, boxShadow: `0px 4px 12px ${primaryColor}66` }
          ],
          { transform: [{ scaleX: isRTL ? -1 : 1 }] }
        ]}
        onPress={() => setSelectedCategory(category.id)}
      >
        <Text
          style={[
            styles.categoryText,
            isActive && styles.categoryTextActive,
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

    return (
      <View style={[styles.menuItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Image source={{ uri: item.image_url }} style={styles.menuItemImage} resizeMode="cover" />
        <View style={[styles.menuItemContent, isRTL ? { marginRight: 0, marginLeft: 12 } : { marginRight: 12, marginLeft: 0 }]}>
          <Text style={[styles.menuItemTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{itemName}</Text>
          <Text style={[styles.menuItemDescription, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
            {itemDesc}
          </Text>
          <Text style={[styles.menuItemPrice, { color: primaryColor, textAlign: isRTL ? 'right' : 'left' }]}>
            {item.price} {getText('ر.س', 'SAR')}
          </Text>
        </View>
        <View style={[styles.quantitySelector, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => addToCart(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add" size={18} color={primaryColor} />
          </TouchableOpacity>
          <Text style={[styles.quantityText, { color: primaryColor }]}>
            {quantity > 0 ? quantity : 0}
          </Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => removeFromCart(item.id)}
            disabled={quantity === 0}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="remove"
              size={18}
              color={quantity > 0 ? primaryColor : '#9CA3AF'}
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
          color={isActive ? primaryColor : '#6B7280'}
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

  const handlePlaceOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      RNAlert.alert('تنبيه', 'يرجى إدخال الاسم ورقم الجوال');
      return;
    }

    const saudiPhoneRegex = /^05\d{8}$/;
    if (!saudiPhoneRegex.test(customerPhone.trim())) {
      setPhoneError('الرجاء إدخال رقم جوال سعودي صحيح (مثال: 05XXXXXXXX)');
      return;
    }

    setPhoneError('');

    try {
      setIsSubmitting(true);

      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const deliveryFee = deliveryMode === 'delivery' ? 10 : 0;
      const total = subtotal + deliveryFee;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_name: customerName,
          customer_phone: customerPhone,
          total_amount: total,
          delivery_mode: deliveryMode
        }])
        .select()
        .single();

      if (orderError) throw new Error(orderError.message);

      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw new Error(itemsError.message);

      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setIsCartModalVisible(false);
      setSuccessOrderNumber(String(order.display_id));
    } catch (error: any) {
      console.error(error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCartModal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = deliveryMode === 'delivery' ? 10 : 0;
    const total = subtotal + deliveryFee;

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
          <View style={styles.cartModalContent}>

            {/* Header */}
            <View style={[styles.cartModalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.cartModalTitle}>{getText('سلة المشتريات', 'Your Cart')}</Text>
              <TouchableOpacity onPress={() => setIsCartModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>

            {/* Cart Items List */}
            <ScrollView style={styles.cartModalItemsList} showsVerticalScrollIndicator={false}>
              {cart.map((item) => (
                <View key={item.id} style={[styles.cartModalItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.cartModalItemInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.cartModalItemTitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                      {language === 'en' ? (item.name_en || item.name || item.name_ar || item.title) : (item.name || item.name_ar || item.title)}
                    </Text>
                    <Text style={[styles.cartModalItemPrice, { color: primaryColor }]}>
                      {item.price} {getText('ر.س', 'SAR')}
                    </Text>
                  </View>

                  {/* Stepper */}
                  <View style={[styles.cartModalItemStepper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity
                      style={styles.cartModalItemButton}
                      onPress={() => addToCart(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="add" size={16} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.cartModalItemQuantity}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.cartModalItemButton}
                      onPress={() => removeFromCart(item.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="remove" size={16} color="#1F2937" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* ORDER SUMMARY */}
              <View style={{ paddingVertical: 15, paddingHorizontal: 10, borderTopWidth: 1, borderColor: '#E5E7EB', marginVertical: 15, backgroundColor: '#FAFAFA', borderRadius: 8 }}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#4B5563', fontSize: 14 }}>
                    {isRTL ? 'المجموع الفرعي' : 'Subtotal'}
                  </Text>
                  <Text style={{ color: '#4B5563', fontSize: 14 }}>
                    {`${subtotal} ${isRTL ? 'ر.س' : 'SAR'}`}
                  </Text>
                </View>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#4B5563', fontSize: 14 }}>
                    {isRTL ? 'رسوم التوصيل' : 'Delivery Fee'}
                  </Text>
                  <Text style={{ color: '#4B5563', fontSize: 14 }}>
                    {`${deliveryFee} ${isRTL ? 'ر.س' : 'SAR'}`}
                  </Text>
                </View>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: '#E5E7EB' }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: primaryColor }}>
                    {isRTL ? 'الإجمالي' : 'Total'}
                  </Text>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: primaryColor }}>
                    {`${total} ${isRTL ? 'ر.س' : 'SAR'}`}
                  </Text>
                </View>
              </View>

              {/* Customer Details */}
              <View style={styles.cartModalNotesContainer}>
                <Text style={[styles.cartModalNotesLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {getText('معلومات العميل', 'Customer Details')}
                </Text>
                <TextInput
                  style={[styles.cartModalNotesInput, { textAlign: isRTL ? 'right' : 'left', minHeight: 48, marginBottom: 12 }]}
                  placeholder={getText('الاسم الكامل', 'Full Name')}
                  placeholderTextColor="#9CA3AF"
                  value={customerName}
                  onChangeText={setCustomerName}
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
                  <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, textAlign: isRTL ? 'right' : 'left' }}>
                    {phoneError}
                  </Text>
                ) : null}
              </View>

              {/* Order Notes */}
              <View style={[styles.cartModalNotesContainer, { marginTop: 0 }]}>
                <Text style={[styles.cartModalNotesLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {getText('ملاحظات الطلب', 'Order Notes')}
                </Text>
                <TextInput
                  style={[styles.cartModalNotesInput, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={getText('هل لديك أي طلبات خاصة؟', 'Any special requests?')}
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              </View>


            </ScrollView>

            {/* Checkout Button */}
            <View style={styles.cartModalFooter}>
              <TouchableOpacity
                style={[styles.cartCheckoutButton, { backgroundColor: primaryColor }, isSubmitting && { opacity: 0.7 }]}
                onPress={handlePlaceOrder}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.cartCheckoutButtonText}>{getText('تنفيذ الطلب', 'Place Order')}</Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const renderSuccessModal = () => (
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
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginBottom: 8, textAlign: 'center' }}>
            {getText('تم إرسال طلبك بنجاح!', 'Order Placed Successfully!')}
          </Text>

          {/* Subtitle */}
          <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 6, textAlign: 'center' }}>
            {getText('رقم طلبك هو', 'Your order number is')}
          </Text>

          {/* Order ID */}
          <View style={{ backgroundColor: '#F1F5F9', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24, marginBottom: 28 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: primaryColor, letterSpacing: 1, textAlign: 'center' }}>
              {successOrderNumber}
            </Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={{ backgroundColor: primaryColor, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 48, width: '100%', alignItems: 'center' }}
            onPress={() => setSuccessOrderNumber(null)}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>
              {getText('حسناً', 'Great!')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderMenuTab = () => (
    <>
      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.categoriesList, { flexDirection: 'row' }]}
          style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
        >
          {categories.map(renderCategory)}
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
        <TouchableOpacity
          style={[styles.floatingCartFab, { backgroundColor: primaryColor }]}
          onPress={() => setIsCartModalVisible(true)}
        >
          <Ionicons name="cart-outline" size={28} color="#FFFFFF" />
          <View style={styles.floatingCartFabBadge}>
            <Text style={[styles.floatingCartFabBadgeText, { color: primaryColor }]}>{totalItems}</Text>
          </View>
        </TouchableOpacity>
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

  const handleLanguageChange = (lang: 'ar' | 'en') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLanguage(lang);
  };

  const renderMoreTab = () => (
    <View style={styles.moreContainer}>
      <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left', marginHorizontal: 16, marginTop: 16, color: '#1E293B', fontSize: 22, fontWeight: 'bold' }]}>
        {getText('الإعدادات', 'Settings')}
      </Text>

      {/* Settings List */}
      <ScrollView style={styles.settingsList} showsVerticalScrollIndicator={false}>

        {/* Premium Language Toggle */}
        <View style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row', padding: 12 }]}>
          <View style={{ flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
            <Ionicons name="language-outline" size={24} color={primaryColor} />
            <Text style={[styles.settingText, { textAlign: isRTL ? 'right' : 'left' }]}>
              {getText('لغة التطبيق', 'App Language')}
            </Text>
          </View>

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
        </View>

        <TouchableOpacity
          style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => setIsProfileModalVisible(true)}
        >
          <Ionicons name="person-outline" size={24} color="#64748B" />
          <Text style={[styles.settingText, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('الملف الشخصي', 'Profile')}</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#CBD5E1" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => setIsPrivacyModalVisible(true)}
        >
          <Ionicons name="lock-closed-outline" size={24} color="#64748B" />
          <Text style={[styles.settingText, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('سياسة الخصوصية', 'Privacy Policy')}</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#CBD5E1" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => setIsTermsModalVisible(true)}
        >
          <Ionicons name="document-text-outline" size={24} color="#64748B" />
          <Text style={[styles.settingText, { textAlign: isRTL ? 'right' : 'left' }]}>{getText('الشروط والأحكام', 'Terms & Conditions')}</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#CBD5E1" />
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          <Ionicons name="log-out-outline" size={24} color="#DC3545" />
          <Text style={styles.logoutButtonText}>{getText('تسجيل الخروج', 'Logout')}</Text>
        </TouchableOpacity>
        {/* Social Icons */}
        <View style={styles.socialIcons}>
          <TouchableOpacity style={styles.socialButton} onPress={() => Linking.openURL('https://tiktok.com')}>
            <FontAwesome5 name="tiktok" size={24} color={primaryColor} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton} onPress={() => Linking.openURL('https://wa.me/1234567890')}>
            <FontAwesome5 name="whatsapp" size={24} color={primaryColor} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  const renderMenuHeader = () => (
    <View style={styles.menuHeader}>
      {/* Restaurant Branding Header */}
      <View style={[styles.brandingHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.brandingLogoPlaceholder}>
          <Ionicons name="restaurant" size={32} color={primaryColor} />
        </View>
        <View style={[styles.brandingInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.brandingTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {restaurant?.name || 'SmartFlow Restaurant'}
          </Text>
          <Text style={[styles.brandingSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {`⭐ 4.8 • ${getText('مفتوح', 'Open')} • 30 ${getText('دقيقة', 'mins')}`}
          </Text>
        </View>
      </View>

      {/* Modern Search Bar */}
      <View style={[styles.searchBarContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
          placeholder={getText('ابحث عن أطباقك المفضلة...', 'Search for your favorite dishes...')}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Delivery/Pickup Toggle */}
      <View style={[styles.deliveryToggle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={[
            styles.toggleOption,
            deliveryMode === 'delivery' && styles.toggleOptionActive,
            deliveryMode === 'delivery' && { backgroundColor: primaryColor },
          ]}
          onPress={() => {
            setDeliveryMode('delivery');
            setShowLocationModal(true);
          }}
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

      {/* Delivery Address Display */}
      {deliveryMode === 'delivery' && deliveryAddress && (
        <View style={[styles.deliveryAddressContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="location" size={16} color={primaryColor} />
          <Text style={[styles.deliveryAddressText, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
            {deliveryAddress}
          </Text>
        </View>
      )}

    </View>
  );

  // FINAL CONDITIONAL RETURNS - Must be after all hooks and functions
  if (!isAppReady) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashContent}>
          <Ionicons name="restaurant" size={80} color={primaryColor} />
          <Text style={styles.splashText}>SmartFlow</Text>
          <ActivityIndicator size="large" color={primaryColor} style={styles.splashLoader} />
        </View>
      </View>
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
                (() => {
                  const Maps = require('react-native-maps');
                  const MapView = Maps.default;
                  const { Marker, PROVIDER_GOOGLE } = Maps;
                  return (
                    <MapView
                      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                      style={{ flex: 1 }}
                      region={mapRegion}
                      showsUserLocation={true}
                      onRegionChangeComplete={(region: Region) => setMapRegion(region)}
                    >
                      <Marker
                        coordinate={mapRegion}
                        title={getText('موقعك الحالي', 'Your Current Location')}
                        description={getText('موقع التوصيل', 'Delivery Location')}
                        draggable
                        onDragEnd={(e: any) => {
                          setMapRegion({
                            ...mapRegion,
                            latitude: e.nativeEvent.coordinate.latitude,
                            longitude: e.nativeEvent.coordinate.longitude,
                          });
                        }}
                      >
                        <View style={styles.customMarker}>
                          <View style={[styles.markerPin, { backgroundColor: primaryColor }]}>
                            <Ionicons name="location" size={24} color="#FFFFFF" />
                          </View>
                          <View style={[styles.markerShadow, { backgroundColor: primaryColor }]} />
                        </View>
                      </Marker>
                    </MapView>
                  );
                })()
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

          {/* Bottom Section - Bottom Sheet (35% height) */}
          <View style={styles.mapBottomSheet}>
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

            {/* Action Button */}
            <TouchableOpacity
              style={styles.mapActionButton}
              onPress={async () => {
                if (mapRegion) {
                  try {
                    const addressResults = await Location.reverseGeocodeAsync({
                      latitude: mapRegion.latitude,
                      longitude: mapRegion.longitude,
                    });
                    if (addressResults && addressResults.length > 0) {
                      const address = addressResults[0];
                      const formattedAddress = [
                        address.street,
                        address.city,
                        address.region,
                        address.country,
                      ].filter(Boolean).join(', ') || 'تم تحديد الموقع من الخريطة';
                      setDeliveryAddress(formattedAddress);
                    } else {
                      setDeliveryAddress('تم تحديد الموقع من الخريطة');
                    }
                  } catch (error) {
                    console.error('Error reverse geocoding:', error);
                    setDeliveryAddress('تم تحديد الموقع من الخريطة');
                  }
                }
                setShowLocationModal(false);
              }}
            >
              <Text style={styles.mapActionButtonText}>
                {getText('تعيين العنوان', 'Set Address')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
            {/* Subtitle Banner */}
            <View style={styles.profileSubtitleBanner}>
              <Text style={styles.profileSubtitleText}>
                {getText('أهلاً! ابق ملفك الشخصي محدثاً لنستطيع خدمتك بأفضل شكل ممكن', 'Welcome! Keep your profile updated so we can serve you better')}
              </Text>
            </View>

            {/* Form Fields */}
            <View style={styles.profileForm}>
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
                  value="+966 50 123 4567"
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
              {getText('نحن في شركة SmartFlow نولي خصوصيتك أهمية بالغة.\n\nجمع البيانات: نقوم بجمع معلوماتك الأساسية (الاسم، رقم الجوال، الموقع الدقيق) لضمان توصيل الطلبات بكفاءة.\n\nاستخدام البيانات: تُستخدم بياناتك حصرياً لتحسين تجربة المستخدم ومعالجة الطلبات داخل منصة SmartFlow متعددة المستأجرين.\n\nحماية البيانات: نلتزم التزاماً تاماً بعدم مشاركة أو بيع بياناتك لأي أطراف ثالثة لأغراض تسويقية.\n\nحذف الحساب: يحق للمستخدم طلب حذف حسابه وبياناته نهائياً في أي وقت من خلال إعدادات الملف الشخصي.',
                'At SmartFlow, we take your privacy seriously.\n\nData Collection: We collect your basic information (name, phone number, precise location) to ensure efficient order delivery.\n\nData Usage: Your data is used exclusively to improve user experience and process orders within the SmartFlow multi-tenant platform.\n\nData Protection: We are fully committed to not sharing or selling your data to any third parties for marketing purposes.\n\nAccount Deletion: Users have the right to request permanent deletion of their account and data at any time through profile settings.')}
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
              {getText('مرحباً بك في منصة SmartFlow. باستخدامك للتطبيق، فإنك توافق على الشروط التالية:\n\nوصف الخدمة: تطبيق SmartFlow هو منصة تقنية رائدة تربط بين العملاء والمطاعم لتقديم خدمات الطلب والتوصيل السريع.\n\nآلية الدفع: تعتمد الخدمة حالياً على خيار (الدفع عند الاستلام) أو (الدفع في الفرع). يلتزم العميل التزاماً كاملاً بدفع قيمة الطلب للمندوب أو لمقدم الخدمة.\n\nإخلاء المسؤولية: شركة SmartFlow غير مسؤولة عن جودة أو سلامة الأطعمة المقدمة من المطاعم، ويقتصر دورنا التقني على تسهيل وإدارة عملية الطلب والتوصيل.\n\nيحق لـ SmartFlow تحديث أو تعديل هذه الشروط في أي وقت، ويعتبر استمرارك في استخدام التطبيق موافقة صريحة عليها.',
                'Welcome to the SmartFlow platform. By using the app, you agree to the following terms:\n\nService Description: The SmartFlow app is a leading technology platform connecting customers with restaurants to provide ordering and fast delivery services.\n\nPayment Mechanism: The service currently relies on (Cash on Delivery) or (Payment at Branch) options. The customer is fully committed to paying the order value to the delivery person or service provider.\n\nDisclaimer: SmartFlow is not responsible for the quality or safety of food provided by restaurants, and our technical role is limited to facilitating and managing the ordering and delivery process.\n\nSmartFlow reserves the right to update or modify these terms at any time, and continued use of the app is considered explicit acceptance of them.')}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Cart Checkout Modal */}
      {renderCartModal()}

      {/* Order Success Modal */}
      {renderSuccessModal()}
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
  menuHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  brandingHeader: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    marginTop: 8,
  },
  brandingLogoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  brandingInfo: {
    flex: 1,
  },
  brandingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  brandingSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  searchBarContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  deliveryAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    gap: 8,
  },
  deliveryAddressText: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  deliveryToggle: {
    backgroundColor: '#F3F4F6',
    borderRadius: 30,
    padding: 6,
    marginBottom: 12,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  toggleOptionActive: {
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  toggleOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryItemActive: {
    borderWidth: 0,
    elevation: 6,
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4B5563',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  menuItemImage: {
    width: 88,
    height: 88,
    borderRadius: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  menuItemPrice: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
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
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
    color: '#1F2937',
  },
  floatingCartFab: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.3)',
    elevation: 8,
    zIndex: 10,
  },
  floatingCartFabBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
    elevation: 4,
  },
  floatingCartFabBadgeText: {
    fontSize: 12,
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
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  premiumToggleContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    width: 140,
  },
  premiumToggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  premiumToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
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
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    justifyContent: 'space-around',
    boxShadow: '0px -4px 10px rgba(0, 0, 0, 0.05)',
  },
  bottomNavItem: {
    alignItems: 'center',
    gap: 4,
  },
  bottomNavText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Splash Screen Styles
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContent: {
    alignItems: 'center',
  },
  splashText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
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
    flex: 0.65,
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
    flex: 0.35,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
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
    marginBottom: 16,
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
