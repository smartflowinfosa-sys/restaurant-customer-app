import React from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
}: MoyasarPaymentModalProps) {
  if (!orderId) return null;

  const displayNum = displayOrderId || orderId.slice(0, 8);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.headerTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="shield-checkmark" size={24} color="#10B981" />
              <View>
                <Text style={styles.title}>
                  {getText('الدفع الإلكتروني الآمن', 'Secure Payment Gateway')}
                </Text>
                <Text style={styles.subtitle}>
                  {getText('مدعوم بواسطة ميسر (Moyasar)', 'Powered by Moyasar')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeIconBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Order Info Bar */}
          <View style={[styles.orderBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View>
              <Text style={styles.orderNum}>
                {getText(`طلب #${displayNum}`, `Order #${displayNum}`)}
              </Text>
              <Text style={styles.orderDesc}>
                {deliveryType === 'delivery'
                  ? getText('توصيل للمنزل', 'Home Delivery')
                  : getText('استلام من الفرع', 'Branch Pickup')}
              </Text>
            </View>
            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
              <Text style={styles.amountLabel}>
                {getText('المبلغ الإجمالي', 'Total Amount')}
              </Text>
              <Text style={[styles.amountValue, { color: primaryColor }]}>
                {Number(amount).toFixed(2)} {getText('ر.س', 'SAR')}
              </Text>
            </View>
          </View>

          {/* Web Fallback Notice */}
          <View style={styles.body}>
            <View style={styles.iconCircle}>
              <Ionicons name="phone-portrait-outline" size={38} color={primaryColor} />
            </View>
            <Text style={styles.noticeTitle}>
              {getText(
                'الدفع الإلكتروني متاح عبر تطبيق الجوال فقط',
                'Online Card Payment is Available on Mobile App Only'
              )}
            </Text>
            <Text style={styles.noticeDescription}>
              {getText(
                'الدفع الإلكتروني بالبطاقة البنكية أو مدى عبر بوابة ميسر (Moyasar) متاح حصرياً عبر تطبيق الجوال (Android / iOS). يمكنك استخدام خيار الدفع عند الاستلام (كاش) عبر المتصفح أو إتمام الدفع من خلال تطبيق الجوال.',
                'Online credit card / Mada payment via Moyasar is available exclusively on our mobile app (Android / iOS). Please use Cash on Delivery on web or complete payment via the mobile app.'
              )}
            </Text>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: primaryColor }]}
            >
              <Text style={styles.closeButtonText}>
                {getText('إغلاق والعودة للسلة', 'Close & Return to Cart')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 460,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  headerTitleRow: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBar: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNum: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  orderDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  amountLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  body: {
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },
  noticeDescription: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  closeButton: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

