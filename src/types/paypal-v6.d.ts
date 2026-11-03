/** Minimal typing for the PayPal JS SDK v6 surface this app uses. */

interface PayPalV6ApproveData {
  readonly orderId: string;
}

interface PayPalV6SessionOptions {
  readonly onApprove: (data: PayPalV6ApproveData) => Promise<void> | void;
  readonly onCancel?: (data: unknown) => void;
  readonly onError?: (error: unknown) => void;
}

interface PayPalV6StartOptions {
  readonly presentationMode: 'auto' | 'popup' | 'modal' | 'payment-handler';
}

interface PayPalV6PaymentSession {
  start(options: PayPalV6StartOptions, createOrder: Promise<{ orderId: string }>): Promise<void>;
}

interface PayPalV6Instance {
  createPayPalOneTimePaymentSession(options: PayPalV6SessionOptions): PayPalV6PaymentSession;
}

interface PayPalV6CreateInstanceOptions {
  readonly clientToken: string;
  readonly components: readonly string[];
  readonly pageType?: 'checkout' | 'product-details' | 'cart' | 'mini-cart' | 'home';
}

interface PayPalV6Namespace {
  createInstance(options: PayPalV6CreateInstanceOptions): Promise<PayPalV6Instance>;
}

interface Window {
  paypal?: PayPalV6Namespace;
}
