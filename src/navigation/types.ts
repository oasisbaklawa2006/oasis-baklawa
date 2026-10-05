import type { NavigatorScreenParams } from "@react-navigation/native";
import type { CustomerOrderStatus } from "@/types/database.types";

export type MainTabParamList = {
  Catalogue: undefined;
  Orders:
    | {
        checkoutSuccess?: {
          orderNumber: string;
          salesOrderValue: number;
          advanceRequired: number;
          isDuplicateSubmission: boolean;
        };
      }
    | undefined;
  Dashboard: undefined;
  Support: { orderId?: string } | undefined;
  Account: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  AccessPending: { message?: string } | undefined;
  AccessRejected: { message?: string } | undefined;
  SessionRecovery: { message: string };
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  ProductDetail: { productId: string };
  OrderDetail: { orderId: string; order?: CustomerOrderStatus };
  QuickOrder: undefined;
  AiOrder: undefined;
  Cart: undefined;
  CommercialReview: undefined;
  Checkout: undefined;
  OrderConfirmation: { orderId: string };
  Documents: undefined;
  Statement: undefined;
  Quotations: undefined;
  QuotationDetail: { quotationId: string; quotationNumber: string };
  OrderPayment: { orderId: string; orderNumber: string };
  DeliveredClosure: { orderId: string };
  CommunicationLog: { entityId: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
