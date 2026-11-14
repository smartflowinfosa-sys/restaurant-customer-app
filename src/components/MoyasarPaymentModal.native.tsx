import React, { useMemo } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CreditCard, PaymentConfig } from 'react-native-moyasar-sdk';
import type { MoyasarPaymentModalProps } from './MoyasarPaymentModal';

export default function MoyasarPaymentModal({
  visible,
  onClose,
  amount,
  orderId,
  displayOrderId,
  deliveryType = 'delivery',
  primaryColor = '#00B4D8',
  isRTL = true,
  getText = (ar, _en) => ar,
  onPaymentResult,
}: MoyasarPaymentModalProps) {
  const paymentConfig = useMemo(() => {
    if (!orderId) return null;
    const publishableApiKey = (process.env.EXPO_PUBLIC_MOYASAR_PUBLISHABLE_KEY || '').trim();
    if (!publishableApiKey) {
      console.error('[Moyasar] Missing EXPO_PUBLIC_MOYASAR_PUBLISHABLE_KEY');
      return null;
    }

    try {
      return new PaymentConfig({
        publishableApiKey,
        amount: Math.round(Number(amount) * 100),
        currency: 'SAR',
        description: `Order #${orderId}`,
        metadata: { order_id: orderId },
      });
    } catch (err) {
      console.error('[Moyasar] Error creating PaymentConfig:', err);
      return null;
    }
  }, [amount, orderId]);

  if (!orderId || !paymentConfig) return null;

  const displayNum = displayOrderId || orderId.slice(0, 8);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.paymentModalSafeOverlay}>
        <View style={styles.paymentModalContainer}>
          {/* Header */}
          <View style={[styles.paymentModalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.paymentModalHeaderTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="shield-checkmark" size={24} color="#10B981" />
              <View>
                <Text style={styles.paymentModalTitle}>
                  {getText('الدفع الإلكتروني الآمن', 'Secure Payment Gateway')}
                </Text>
                <Text style={styles.paymentModalSubtitle}>
                  {getText('مدعوم بواسطة ميسر (Moyasar)', 'Powered by Moyasar')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.paymentModalCloseButton}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Order Summary Strip */}
          <View style={[styles.paymentModalOrderBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View>
              <Text style={styles.paymentModalOrderNum}>
                {getText(`طلب #${displayNum}`, `Order #${displayNum}`)}
              </Text>
              <Text style={styles.paymentModalOrderDesc}>
                {deliveryType === 'delivery'
                  ? getText('توصيل للمنزل', 'Home Delivery')
                  : getText('استلام من الفرع', 'Branch Pickup')}
              </Text>
            </View>
            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
              <Text style={styles.paymentModalAmountLabel}>
                {getText('المبلغ الإجمالي', 'Total Amount')}
              </Text>
              <Text style={[styles.paymentModalAmountValue, { color: primaryColor }]}>
                {Number(amount).toFixed(2)} {getText('ر.س', 'SAR')}
              </Text>
            </View>
          </View>

          {/* CreditCard Component */}
          <ScrollView
            keyboardShouldPersistTaps="always"
            contentContainerStyle={{ flexGrow: 1, backgroundColor: '#FFFFFF' }}
            style={{ flex: 1, backgroundColor: '#FFFFFF' }}
          >
            <View style={{ direction: 'ltr', width: '100%', backgroundColor: '#FFFFFF' }}>
              <CreditCard
                paymentConfig={paymentConfig}
                onPaymentResult={onPaymentResult}
                style={{
                  container: {
                    backgroundColor: '#FFFFFF',
                  },
                  textInputs: {
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                  },
                  textInputsPlaceholderColor: '#94A3B8',
                  paymentButton: {
                    backgroundColor: primaryColor,
                    borderRadius: 14,
                    height: 52,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: 18,
                  },
                  paymentButtonText: {
                    fontSize: 16,
                    fontWeight: '700',
                    color: '#FFFFFF',
                  },
                }}
              />
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  paymentModalSafeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  paymentModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '92%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 24,
  },
  paymentModalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  paymentModalHeaderTitleRow: {
    alignItems: 'center',
    gap: 12,
  },
  paymentModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  paymentModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  paymentModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentModalOrderBar: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentModalOrderNum: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  paymentModalOrderDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  paymentModalAmountLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  paymentModalAmountValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
});

