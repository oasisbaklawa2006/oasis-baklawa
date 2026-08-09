import type { NavigatorScreenParams } from "@react-navigation/native";

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
  Support: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  AccessPending: undefined;
  AccessRejected: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  ProductDetail: { productId: string };
  OrderDetail: { orderId: string };
  QuickOrder: undefined;
  AiOrder: undefined;
  Cart: undefined;
  Checkout: undefined;
  Documents: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
