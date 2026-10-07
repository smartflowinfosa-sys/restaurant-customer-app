import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  I18nManager
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface LoginScreenProps {
  onLoginSuccess?: (mockSession?: any) => void;
  initialPhone?: string;
  initialName?: string;
}

export default function LoginScreen({ onLoginSuccess, initialPhone = '', initialName = '' }: LoginScreenProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  // Ensures text alignment and layout is appropriate
  const isRTL = I18nManager.isRTL; 

  const handleSendOTP = async () => {
    // 1. Reset previous errors
    setErrors({});
    
    // 2. Strict Client-Side Validation
    if (!name || name.trim() === '') {
      setErrors({ name: 'يرجى إدخال الاسم بالكامل' });
      return;
    }
    if (!phone || phone.trim() === '') {
      setErrors({ phone: 'يرجى إدخال رقم الجوال' });
      return;
    }

    // 3. Execution with strictly safe UI unlocking
    try {
      setIsLoading(true);

      const normalizePhone = (p: string) => {
        let clean = p.trim();
        if (clean.startsWith('+966')) clean = clean.slice(4);
        if (clean.startsWith('05')) clean = clean.slice(1);
        return clean;
      };
      const cleanPhone = normalizePhone(phone);

      // --- DEVELOPER BYPASS ---
      if (cleanPhone === '592150604') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setStep(2);
        return;
      }
      // ------------------------

      // Format phone to international standard required by Supabase
      const formattedPhone = '+966' + cleanPhone;
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;

      // Success: Move to OTP input step
      setStep(2); 

    } catch (error: any) {
      console.error('OTP Error:', error);
      let errorMessage = error.message || 'حدث خطأ أثناء إرسال الرمز، يرجى المحاولة لاحقاً.';
      if (errorMessage.includes('Unsupported phone provider')) {
        errorMessage = 'خدمة تسجيل الدخول معطلة حالياً من الخادم.';
      }
      // Display the specific Supabase error on the UI
      setErrors({ form: errorMessage });
    } finally {
      // CRITICAL: This unlocks the button and stops the freeze even if it fails
      setIsLoading(false); 
    }
  };

  const handleVerifyOtp = async () => {
    setErrors({});
    const cleanedOtp = otp.trim();

    if (cleanedOtp.length !== 6) {
      setErrors({ form: 'الرمز غير صحيح (يجب أن يتكون من 6 أرقام)' });
      return;
    }

    const normalizePhone = (p: string) => {
      let clean = p.trim();
      if (clean.startsWith('+966')) clean = clean.slice(4);
      if (clean.startsWith('05')) clean = clean.slice(1);
      return clean;
    };
    const cleanPhone = normalizePhone(phone);

    // --- DEVELOPER BYPASS ---
    if (cleanPhone === '592150604' && cleanedOtp === '123456') {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      const mockSession = {
        user: {
          id: 'mock-dev-id',
          phone: '+966592150604',
          user_metadata: { name: name }
        }
      };
      setIsLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess(mockSession);
      }
      return;
    }
    // ------------------------

    setIsLoading(true);
    try {
      const formattedPhone = '+966' + cleanPhone;
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: cleanedOtp,
        type: 'sms',
      });

      if (error) throw error;

      if (data?.session) {
        // If name was provided during guest login, we could potentially update the profile here.
        // supabase.from('customers').upsert({ id: data.session.user.id, name, phone: formattedPhone })
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        setErrors({ form: 'تعذر تسجيل الدخول، يرجى المحاولة مرة أخرى' });
      }
    } catch (err: any) {
      setErrors({ form: err.message || 'الرمز غير صحيح' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={60} color="#00B4D8" />
          <Text style={styles.title}>
            {step === 1 ? 'تسجيل الدخول' : 'رمز التحقق'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1 
              ? 'أدخل بياناتك للمتابعة' 
              : `أرسلنا رمز التحقق إلى +966 ${phone}`}
          </Text>
        </View>

        {errors.form ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errors.form}</Text>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.inputSection}>
            <Text style={styles.label}>الاسم</Text>
            <TextInput
              style={[styles.input, errors.name && { borderColor: '#EF4444' }]}
              placeholder="الاسم الكامل"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors({ ...errors, name: null });
              }}
              textAlign={isRTL ? "right" : "left"}
            />
            {errors.name && <Text style={styles.inlineError}>{errors.name}</Text>}

            <Text style={styles.label}>رقم الجوال</Text>
            <View style={[styles.phoneInputContainer, errors.phone && { borderColor: '#EF4444' }, { flexDirection: 'row' }]}>
              {/* LTR enforcement for the prefix */}
              <View style={styles.prefixContainer}>
                <Text style={styles.prefixText}>+966</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="5XXXXXXXX"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(text) => {
                  setPhone(text.replace(/[^0-9]/g, ''));
                  if (errors.phone) setErrors({ ...errors, phone: null });
                }}
                maxLength={9}
                textAlign="left"
              />
            </View>
            {errors.phone && <Text style={styles.inlineError}>{errors.phone}</Text>}

            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]} 
              onPress={handleSendOTP}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>إرسال الرمز</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputSection}>
            <Text style={styles.label}>أدخل رمز التحقق (OTP)</Text>
            <TextInput
              style={[styles.otpInput, errors.form && { borderColor: '#EF4444' }]}
              placeholder="123456"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              value={otp}
              onChangeText={(text) => {
                setOtp(text.replace(/[^0-9]/g, ''));
                if (errors.form) setErrors({ ...errors, form: null });
              }}
              maxLength={6}
              textAlign="center"
            />
            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]} 
              onPress={handleVerifyOtp}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>تأكيد الدخول</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                setStep(1);
                setOtp('');
                setErrors({});
              }}
            >
              <Text style={styles.backButtonText}>تعديل البيانات</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Tailwind gray-100 equivalent
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
  },
  inlineError: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    textAlign: 'right',
  },
  inputSection: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
    textAlign: 'right', // Standard alignment for Arabic labels
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 16,
  },
  phoneInputContainer: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
    marginBottom: 16,
    ...(Platform.OS === 'web' ? { direction: 'ltr' } : {}),
  },
  prefixContainer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    borderRightWidth: 1.5,
    borderRightColor: '#E5E7EB',
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    color: '#1E293B',
    textAlign: 'left',
  },
  otpInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    fontSize: 24,
    fontWeight: '700',
    paddingVertical: 16,
    color: '#1E293B',
    marginBottom: 24,
    letterSpacing: 8,
  },
  button: {
    backgroundColor: '#00B4D8',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#00B4D8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  }
});
