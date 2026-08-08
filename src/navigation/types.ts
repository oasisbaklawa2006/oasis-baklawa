export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Catalogue: undefined;
  AiOrder: undefined;
  Cart: undefined;
  Checkout: undefined;
  Orders: { checkoutSuccess?: CheckoutSuccessSummary } | undefined;
  Documents: undefined;
  Dashboard: undefined;
};

export interface CheckoutSuccessSummary {
  orderNumber: string;
  salesOrderValue: number;
  advanceRequired: number;
  requestedDispatchDate?: string | null;
  isDuplicateSubmission: boolean;
}
