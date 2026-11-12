import React from 'react';

export interface MoyasarPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  amount: number;
  orderId: string;
  displayOrderId?: string;
  deliveryType?: string;
  primaryColor?: string;
  isRTL?: boolean;
  getText?: (ar: string, en: string) => string;
  onPaymentResult: (paymentResult: any) => void;
}

export default function MoyasarPaymentModal(
  props: MoyasarPaymentModalProps
): React.JSX.Element | null;

