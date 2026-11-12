import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Image,
  Platform,
  I18nManager,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import {
  useFonts,
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRestaurant } from '../contexts/RestaurantContext';

// Material Expressive Color Palette — Synced with Home Screen
const BG_WARM_OFFWHITE = '#F9F9F6';
const OUTER_WEB_BACKDROP = '#EFEFE9';
const DARK_TEAL = '#055055';
const TEXT_TEAL_DARK = '#053B3F';
const MEDIUM_GRAY = '#64748B';
const PLACEHOLDER_TEAL_GRAY = '#5B7B7C';
const SOFT_MINT_SURFACE = '#E2F3EE';
const SOFT_MINT_ACCENT = '#D0EBE3';
const SOFT_PASTEL_CORAL = '#F38454'; // Soft pastel orange (Coral), never harsh or dark

// Top Ocean Wave Colors (Dark Teal & Turquoise — matching Home Screen banner)
const OCEAN_DARK_START = '#076B74';
const OCEAN_DARK_MID = '#055055';
const OCEAN_DARK_END = '#043E42';
const OCEAN_TURQUOISE_MID = '#0E8490';
const OCEAN_TURQUOISE_SOFT = '#27A8B5';
const OCEAN_TURQUOISE_LIGHT = '#6AD0DA';

const ASMAK_LOGO_CIRCLE = require('../../assets/asmak-logo-circle.png');

const OTP_RESEND_COOLDOWN_SECONDS = 60;
const RATE_LIMIT_ERROR_MESSAGE =
  'تجاوزت الحد المسموح من المحاولات. الرجاء المحاولة بعد 10 دقائق.';

const RATE_LIMIT_ERROR_CODES = new Set([
  'over_request_rate_limit',
  'over_sms_send_rate_limit',
  'over_email_send_rate_limit',
  'too_many_requests',
]);

/** Detects HTTP 429 and Supabase Auth rate-limit error signatures. */
function isSupabaseRateLimitError(err: any): boolean {
  if (!err) return false;
  const status = Number(err.status ?? err.statusCode);
  if (status === 429) return true;

  const code = String(err.code ?? '').toLowerCase();
  if (RATE_LIMIT_ERROR_CODES.has(code)) return true;

  const text = `${err.name ?? ''} ${err.message ?? ''} ${
    typeof err === 'string' ? err : ''
  }`.toLowerCase();
  return /too many requests|rate[_ ]?limit|only request this after|too many attempts|limit exceeded|\b429\b/.test(
    text
  );
}

/** Maps Supabase Auth errors into user-friendly Arabic messages. */
function mapSupabaseAuthError(
  err: any,
  action: 'send_otp' | 'verify_otp'
): { message: string; isRateLimit: boolean } {
  if (isSupabaseRateLimitError(err)) {
    return { message: RATE_LIMIT_ERROR_MESSAGE, isRateLimit: true };
  }

  const code = String(err?.code ?? '').toLowerCase();
  const rawMsg = String(err?.message ?? '').toLowerCase();

  if (
    code === 'phone_provider_disabled' ||
    code === 'provider_disabled' ||
    rawMsg.includes('unsupported phone provider') ||
    rawMsg.includes('phone logins are disabled')
  ) {
    return { message: 'خدمة تسجيل الدخول معطلة حالياً من الخادم.', isRateLimit: false };
  }

  if (code === 'otp_expired' || rawMsg.includes('expired')) {
    return {
      message: 'انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد.',
      isRateLimit: false,
    };
  }

  if (code === 'sms_send_failed' || rawMsg.includes('sms_send_failed')) {
    return {
      message: 'تعذر إرسال رسالة التحقق النصية حالياً، يرجى المحاولة بعد قليل.',
      isRateLimit: false,
    };
  }

  if (
    code === 'request_timeout' ||
    err?.name === 'AuthRetryableFetchError' ||
    rawMsg.includes('failed to fetch') ||
    rawMsg.includes('network') ||
    rawMsg.includes('timeout')
  ) {
    return {
      message: 'تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
      isRateLimit: false,
    };
  }

  if (
    action === 'verify_otp' &&
    (code === 'invalid_credentials' ||
      code === 'validation_failed' ||
      rawMsg.includes('invalid') ||
      rawMsg.includes('token') ||
      rawMsg.includes('otp'))
  ) {
    return {
      message: 'رمز التحقق غير صحيح، يرجى التأكد والمحاولة مرة أخرى.',
      isRateLimit: false,
    };
  }

  const fallback =
    action === 'send_otp'
      ? 'حدث خطأ أثناء إرسال الرمز، يرجى المحاولة لاحقاً.'
      : 'الرمز غير صحيح، يرجى المحاولة مرة أخرى.';
  return { message: err?.message || fallback, isRateLimit: false };
}

export interface LoginScreenProps {
  onLoginSuccess?: (mockSession?: any) => void;
  onContinueAsGuest?: () => void;
  initialPhone?: string;
  initialName?: string;
}

export default function LoginScreen({
  onLoginSuccess,
  onContinueAsGuest,
  initialPhone = '',
  initialName = '',
}: LoginScreenProps) {
  const { restaurant } = useRestaurant();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; form?: string }>({});
  const [toast, setToast] = useState<{
    message: string;
    type: 'error' | 'success';
  } | null>(null);

  const isMountedRef = useRef(true);
  // Synchronous mutex guarantees zero duplicate API calls even on sub-millisecond double taps
  const isSubmittingRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastAnimY = useRef(new Animated.Value(-96)).current;
  const toastAnimOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const isCountingDown = countdown > 0;

  // Decrement OTP cooldown every second and clear interval on unmount or completion
  useEffect(() => {
    if (!isCountingDown) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isCountingDown]);

  const hideToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(toastAnimY, {
        toValue: -96,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(toastAnimOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (isMountedRef.current) {
        setToast(null);
      }
    });
  }, [toastAnimOpacity, toastAnimY]);

  const showToast = useCallback(
    (message: string, type: 'error' | 'success' = 'error') => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }

      setToast({ message, type });
      toastAnimY.setValue(-96);
      toastAnimOpacity.setValue(0);

      Animated.parallel([
        Animated.spring(toastAnimY, {
          toValue: 0,
          tension: 70,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(toastAnimOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      toastTimerRef.current = setTimeout(() => {
        hideToast();
      }, type === 'error' ? 6000 : 3500);
    },
    [hideToast, toastAnimOpacity, toastAnimY]
  );

  const startResendCooldown = useCallback(() => {
    setCountdown(OTP_RESEND_COOLDOWN_SECONDS);
  }, []);

  // Responsive shell sizing (centered mobile frame on wide desktop web, full width on mobile)
  const isWideWeb = Platform.OS === 'web' && windowWidth > 540;
  const shellWidth = isWideWeb ? 460 : Math.max(320, windowWidth);
  const shellHeight = Math.max(660, windowHeight);

  // Top section strictly occupies ~35% (within 30%–40%) of screen height
  const topSectionHeight = Math.round(Math.min(Math.max(shellHeight * 0.35, 236), 296));
  const waveHeight = Math.round(topSectionHeight * 0.78);
  const logoSize = Math.min(Math.round(shellWidth * 0.27), 114);

  // Ensure physical LTR alignment inside phone pill (+966 on left, icon on right)
  const physicalLtrRow: 'row' | 'row-reverse' = I18nManager.isRTL ? 'row-reverse' : 'row';

  const normalizePhone = (raw: string) => {
    let clean = raw.replace(/[^0-9]/g, '');
    if (clean.startsWith('966')) clean = clean.slice(3);
    if (clean.startsWith('05')) clean = clean.slice(1);
    else if (clean.startsWith('0')) clean = clean.slice(1);
    return clean;
  };

  const requestOtp = async (isResend: boolean) => {
    if (isSubmittingRef.current || isLoading || isResending || countdown > 0) return;

    setErrors({});

    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrors({ phone: 'يرجى إدخال رقم جوال صحيح (مثال: 5XXXXXXXX)' });
      return;
    }

    isSubmittingRef.current = true;
    if (isResend) {
      setIsResending(true);
    } else {
      setIsLoading(true);
    }

    try {
      // --- DEVELOPER BYPASS ---
      if (cleanPhone === '592150604') {
        await new Promise((resolve) => setTimeout(resolve, 800));
        if (!isMountedRef.current) return;
        startResendCooldown();
        if (isResend) {
          showToast('تم إعادة إرسال رمز التحقق بنجاح', 'success');
        } else {
          setStep(2);
        }
        return;
      }
      // ------------------------

      const formattedPhone = '+966' + cleanPhone;
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;
      if (!isMountedRef.current) return;

      startResendCooldown();
      if (isResend) {
        showToast('تم إعادة إرسال رمز التحقق بنجاح', 'success');
      } else {
        setStep(2);
      }
    } catch (error: any) {
      console.error('OTP Error:', error);
      if (!isMountedRef.current) return;

      const { message, isRateLimit } = mapSupabaseAuthError(error, 'send_otp');
      setErrors({ form: message });

      if (isRateLimit) {
        showToast(message, 'error');
        if (isResend) {
          startResendCooldown();
        }
      }
    } finally {
      isSubmittingRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsResending(false);
      }
    }
  };

  const handleSendOTP = () => requestOtp(false);
  const handleResendOTP = () => requestOtp(true);

  const handleVerifyOtp = async () => {
    if (isSubmittingRef.current || isLoading || isResending) return;

    setErrors({});
    const cleanedOtp = otp.trim();

    if (cleanedOtp.length !== 6) {
      setErrors({ form: 'الرمز غير صحيح (يجب أن يتكون من 6 أرقام)' });
      return;
    }

    const cleanPhone = normalizePhone(phone);
    isSubmittingRef.current = true;
    setIsLoading(true);

    // --- DEVELOPER BYPASS ---
    if (cleanPhone === '592150604' && cleanedOtp === '123456') {
      try {
        await new Promise((resolve) => setTimeout(resolve, 700));
        const mockSession = {
          user: {
            id: '00000000-0000-0000-0000-000000000000',
            phone: '+966592150604',
            user_metadata: { name: initialName || '' },
          },
        };
        if (onLoginSuccess) {
          onLoginSuccess(mockSession);
        }
      } finally {
        isSubmittingRef.current = false;
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
      return;
    }
    // ------------------------

    try {
      const formattedPhone = '+966' + cleanPhone;
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: cleanedOtp,
        type: 'sms',
      });

      if (error) throw error;
      if (!isMountedRef.current) return;

      if (data?.session) {
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        setErrors({ form: 'تعذر تسجيل الدخول، يرجى المحاولة مرة أخرى' });
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;

      const { message, isRateLimit } = mapSupabaseAuthError(err, 'verify_otp');
      setErrors({ form: message });

      if (isRateLimit) {
        showToast(message, 'error');
      }
    } finally {
      isSubmittingRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleGuestPress = () => {
    if (onContinueAsGuest) {
      onContinueAsGuest();
    } else if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  const fontBold = fontsLoaded
    ? { fontFamily: 'Cairo_700Bold' as const }
    : { fontWeight: '700' as const };
  const fontSemiBold = fontsLoaded
    ? { fontFamily: 'Cairo_600SemiBold' as const }
    : { fontWeight: '600' as const };
  const fontRegular = fontsLoaded
    ? { fontFamily: 'Cairo_400Regular' as const }
    : { fontWeight: '400' as const };

  const logoSource =
    restaurant?.logo_url && !logoLoadFailed
      ? { uri: restaurant.logo_url }
      : ASMAK_LOGO_CIRCLE;

  const isBusy = isLoading || isResending;
  const isSendOtpDisabled = isBusy || countdown > 0;
  const isErrorToast = toast?.type === 'error';

  return (
    <View style={styles.outerViewport}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={[styles.mobileShell, isWideWeb && styles.mobileShellDesktop]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Floating Material Expressive Toast / Alert Banner (Cross-Platform Web + Mobile) */}
        {toast ? (
          <Animated.View
            style={[
              styles.toastWrapper,
              {
                top: Math.max(insets.top + 12, 16),
                opacity: toastAnimOpacity,
                transform: [{ translateY: toastAnimY }],
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={hideToast}
              style={[
                styles.toastCard,
                { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse' },
                isErrorToast ? styles.toastCardError : styles.toastCardSuccess,
              ]}
            >
              <View
                style={[
                  styles.toastIconBadge,
                  isErrorToast ? styles.toastIconBadgeError : styles.toastIconBadgeSuccess,
                ]}
              >
                <Ionicons
                  name={isErrorToast ? 'warning-outline' : 'checkmark-circle-outline'}
                  size={20}
                  color={isErrorToast ? '#DC2626' : DARK_TEAL}
                />
              </View>
              <Text
                style={[
                  styles.toastMessageText,
                  fontSemiBold,
                  isErrorToast ? styles.toastTextError : styles.toastTextSuccess,
                ]}
              >
                {toast.message}
              </Text>
              <Ionicons
                name="close"
                size={18}
                color={isErrorToast ? '#B91C1C' : '#5B7B7C'}
              />
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 28, 36) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── TOP (30–40%): Static Organic Ocean Waves + Asmak Al Mohit Logo (No Food Images) ── */}
          <View style={[styles.topHeaderSection, { height: topSectionHeight }]}>
            <View style={[styles.waveBackdrop, { height: waveHeight }]}>
              <Svg
                width="100%"
                height="100%"
                viewBox="0 0 420 225"
                preserveAspectRatio="none"
                style={StyleSheet.absoluteFill}
              >
                <Defs>
                  <LinearGradient id="staticOceanTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={OCEAN_DARK_START} />
                    <Stop offset="55%" stopColor={OCEAN_DARK_MID} />
                    <Stop offset="100%" stopColor={OCEAN_DARK_END} />
                  </LinearGradient>
                </Defs>

                {/* Soft Mint Under-Wave Accent */}
                <Path
                  d="M 0,174 C 86,220 170,214 252,188 C 328,164 380,176 420,196 L 420,222 C 366,204 312,192 238,212 C 154,232 72,224 0,200 Z"
                  fill={SOFT_MINT_ACCENT}
                />

                {/* Deep Teal Ocean Canopy */}
                <Path
                  d="M 0,0 H 420 V 162 C 366,196 298,204 214,182 C 136,161 66,172 0,196 Z"
                  fill="url(#staticOceanTealGrad)"
                />

                {/* Mid Turquoise Ocean Wave */}
                <Path
                  d="M -10,98 C 56,52 134,58 200,98 C 266,136 344,142 430,108 L 430,166 C 368,198 296,205 214,182 C 136,161 66,172 -10,198 Z"
                  fill={OCEAN_TURQUOISE_MID}
                />

                {/* Soft Turquoise Flowing Ribbon */}
                <Path
                  d="M -10,136 C 46,90 110,86 168,118 C 224,149 298,160 430,130 L 430,168 C 366,199 294,205 212,182 C 136,161 64,173 -10,198 Z"
                  fill={OCEAN_TURQUOISE_SOFT}
                />

                {/* Light Turquoise Crest Highlight */}
                <Path
                  d="M -8,162 C 44,124 104,120 158,146 C 110,146 58,162 -8,194 Z"
                  fill={OCEAN_TURQUOISE_LIGHT}
                  opacity={0.82}
                />

                {/* Subtle White Ocean Foam Ribbon */}
                <Path
                  d="M 18,144 C 60,114 108,111 148,130 C 106,124 60,132 18,155 Z"
                  fill="#FFFFFF"
                  opacity={0.85}
                />
              </Svg>
            </View>

            {/* Centered Official Circular Asmak Al Mohit Logo */}
            <View
              style={[
                styles.logoCircleFrame,
                {
                  width: logoSize,
                  height: logoSize,
                  borderRadius: logoSize / 2,
                },
              ]}
            >
              <Image
                source={logoSource}
                style={{
                  width: logoSize - 8,
                  height: logoSize - 8,
                  borderRadius: (logoSize - 8) / 2,
                }}
                resizeMode="contain"
                onError={() => setLogoLoadFailed(true)}
              />
            </View>
          </View>

          {/* ── MIDDLE & BOTTOM: Clean, Spacious Typography & Pill Inputs ── */}
          <View style={styles.bodySection}>
            {/* Copywriting Block */}
            <View style={styles.copywritingContainer}>
              <Text style={[styles.mainTitle, fontBold]}>
                {step === 1 ? 'طعم البحر.. واصل لبيتك 🌊' : 'رمز التحقق'}
              </Text>
              <Text style={[styles.subtitle, fontRegular]}>
                {step === 1
                  ? 'استمتع بألذ المأكولات البحرية'
                  : `أدخل الرمز المرسل إلى +966 ${normalizePhone(phone)}`}
              </Text>
            </View>

            {/* Error Banner */}
            {errors.form ? (
              <View
                style={[
                  styles.errorBannerPill,
                  { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse' },
                ]}
              >
                <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
                <Text style={[styles.errorBannerText, fontSemiBold]}>{errors.form}</Text>
              </View>
            ) : null}

            {step === 1 ? (
              <View style={styles.inputsWrapper}>
                {/* Full-Width Pill-Shaped Phone Input with Soft Mint Background & Subtle +966 */}
                <View
                  style={[
                    styles.phoneInputPill,
                    { flexDirection: physicalLtrRow },
                    isInputFocused && styles.pillFocused,
                    !!errors.phone && styles.pillError,
                  ]}
                >
                  <View style={styles.countryCodePill}>
                    <Text style={[styles.countryCodeText, fontSemiBold]}>+966</Text>
                  </View>

                  <TextInput
                    style={[
                      styles.phoneInputField,
                      fontSemiBold,
                      { textAlign: phone.length > 0 ? 'left' : 'right' },
                      Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                    ]}
                    placeholder="رقم الجوال"
                    placeholderTextColor={PLACEHOLDER_TEAL_GRAY}
                    keyboardType="phone-pad"
                    editable={!isBusy}
                    value={phone}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    onChangeText={(text) => {
                      setPhone(text.replace(/[^0-9]/g, ''));
                      if (errors.phone || errors.form) setErrors({});
                    }}
                    maxLength={10}
                    returnKeyType="done"
                    onSubmitEditing={handleSendOTP}
                  />

                  <Ionicons
                    name="call-outline"
                    size={20}
                    color={DARK_TEAL}
                    style={styles.trailingPhoneIcon}
                  />
                </View>

                {errors.phone ? (
                  <Text style={[styles.inlineErrorText, fontSemiBold]}>{errors.phone}</Text>
                ) : null}

                {/* Large Pill-Shaped Primary Login / Send OTP Button (Soft Pastel Coral-Orange) */}
                <TouchableOpacity
                  style={[styles.loginPillButton, isSendOtpDisabled && styles.buttonDisabled]}
                  onPress={handleSendOTP}
                  disabled={isSendOtpDisabled}
                  activeOpacity={0.88}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.loginPillButtonText, fontBold]}>
                      {countdown > 0 ? `إعادة الإرسال بعد ${countdown} ثانية` : 'تسجيل الدخول'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Transparent Text-Only Guest Button (Dark Teal) */}
                <TouchableOpacity
                  style={styles.guestButton}
                  onPress={handleGuestPress}
                  disabled={isBusy}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.guestButtonText, fontBold]}>المتابعة كزائر</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.inputsWrapper}>
                {/* Full-Width Pill-Shaped OTP Input */}
                <View
                  style={[
                    styles.otpInputPill,
                    isInputFocused && styles.pillFocused,
                    !!errors.form && styles.pillError,
                  ]}
                >
                  <TextInput
                    style={[
                      styles.otpInputField,
                      fontBold,
                      Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                    ]}
                    placeholder="• • • • • •"
                    placeholderTextColor="#7A9E9C"
                    keyboardType="number-pad"
                    editable={!isBusy}
                    value={otp}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    onChangeText={(text) => {
                      setOtp(text.replace(/[^0-9]/g, ''));
                      if (errors.form) setErrors({});
                    }}
                    maxLength={6}
                    textAlign="center"
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyOtp}
                  />
                </View>

                {/* Large Pill-Shaped Confirm Button (Soft Pastel Coral-Orange) */}
                <TouchableOpacity
                  style={[styles.loginPillButton, isBusy && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={isBusy}
                  activeOpacity={0.88}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.loginPillButtonText, fontBold]}>تأكيد الدخول</Text>
                  )}
                </TouchableOpacity>

                {/* Resend OTP Pill Button with 60-Second Cooldown Timer */}
                <TouchableOpacity
                  style={[
                    styles.resendPillButton,
                    { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse' },
                    isSendOtpDisabled && styles.resendPillButtonDisabled,
                  ]}
                  onPress={handleResendOTP}
                  disabled={isSendOtpDisabled}
                  activeOpacity={0.8}
                >
                  {isResending ? (
                    <ActivityIndicator size="small" color={DARK_TEAL} />
                  ) : (
                    <>
                      <Ionicons
                        name={countdown > 0 ? 'time-outline' : 'refresh-outline'}
                        size={18}
                        color={isSendOtpDisabled ? PLACEHOLDER_TEAL_GRAY : DARK_TEAL}
                      />
                      <Text
                        style={[
                          styles.resendButtonText,
                          fontSemiBold,
                          isSendOtpDisabled && styles.resendButtonTextDisabled,
                        ]}
                      >
                        {countdown > 0
                          ? `إعادة الإرسال بعد ${countdown} ثانية`
                          : 'إعادة إرسال الرمز'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Transparent Secondary Action */}
                <TouchableOpacity
                  style={styles.guestButton}
                  onPress={() => {
                    setStep(1);
                    setOtp('');
                    setErrors({});
                  }}
                  disabled={isBusy}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.guestButtonText, fontSemiBold]}>تعديل رقم الجوال</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerViewport: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? OUTER_WEB_BACKDROP : BG_WARM_OFFWHITE,
    alignItems: 'center',
  },
  mobileShell: {
    flex: 1,
    width: '100%',
    backgroundColor: BG_WARM_OFFWHITE,
    overflow: 'hidden',
  },
  mobileShellDesktop: {
    maxWidth: 460,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  scrollContent: {
    flexGrow: 1,
  },
  topHeaderSection: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  waveBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  logoCircleFrame: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#76C3B9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TEXT_TEAL_DARK,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 4,
  },
  bodySection: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 26,
    alignItems: 'center',
  },
  copywritingContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 34,
  },
  mainTitle: {
    fontSize: 27,
    lineHeight: 40,
    color: DARK_TEAL,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 26,
    color: MEDIUM_GRAY,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  errorBannerPill: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 13.5,
    textAlign: 'center',
    flexShrink: 1,
  },
  inputsWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  phoneInputPill: {
    width: '100%',
    height: 58,
    backgroundColor: SOFT_MINT_SURFACE,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBE6DF',
  },
  pillFocused: {
    borderColor: DARK_TEAL,
    backgroundColor: '#DAF0EA',
  },
  pillError: {
    borderColor: '#EF4444',
  },
  countryCodePill: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { direction: 'ltr' as any } : {}),
  },
  countryCodeText: {
    fontSize: 14.5,
    color: DARK_TEAL,
    letterSpacing: 0.3,
  },
  phoneInputField: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 16,
    color: TEXT_TEAL_DARK,
  },
  trailingPhoneIcon: {
    marginHorizontal: 8,
  },
  inlineErrorText: {
    width: '100%',
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'right',
    marginTop: 6,
    paddingHorizontal: 14,
  },
  otpInputPill: {
    width: '100%',
    height: 60,
    backgroundColor: SOFT_MINT_SURFACE,
    borderRadius: 999,
    paddingHorizontal: 22,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CBE6DF',
  },
  otpInputField: {
    width: '100%',
    height: '100%',
    fontSize: 22,
    color: TEXT_TEAL_DARK,
    letterSpacing: 10,
  },
  loginPillButton: {
    width: '100%',
    height: 58,
    backgroundColor: SOFT_PASTEL_CORAL,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    shadowColor: SOFT_PASTEL_CORAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  loginPillButtonText: {
    color: '#FFFFFF',
    fontSize: 17.5,
  },
  resendPillButton: {
    marginTop: 14,
    minHeight: 44,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: SOFT_MINT_SURFACE,
    borderWidth: 1.5,
    borderColor: '#76C3B9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resendPillButtonDisabled: {
    backgroundColor: '#EDF6F3',
    borderColor: '#CBE6DF',
  },
  resendButtonText: {
    color: DARK_TEAL,
    fontSize: 14.5,
  },
  resendButtonTextDisabled: {
    color: PLACEHOLDER_TEAL_GRAY,
  },
  guestButton: {
    backgroundColor: 'transparent',
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestButtonText: {
    color: DARK_TEAL,
    fontSize: 16,
  },
  toastWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    elevation: 16,
  },
  toastCard: {
    alignItems: 'center',
    gap: 10,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 8,
  },
  toastCardError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  toastCardSuccess: {
    backgroundColor: SOFT_MINT_SURFACE,
    borderColor: '#76C3B9',
  },
  toastIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastIconBadgeError: {
    backgroundColor: '#FEE2E2',
  },
  toastIconBadgeSuccess: {
    backgroundColor: '#FFFFFF',
  },
  toastMessageText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'right',
  },
  toastTextError: {
    color: '#991B1B',
  },
  toastTextSuccess: {
    color: TEXT_TEAL_DARK,
  },
});
