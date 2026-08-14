import { useWindowDimensions } from "react-native";
import {
  getCatalogueColumns,
  getContentWidth,
  getDeviceClass,
  isLargePhoneWidth,
  type DeviceClass,
} from "./layout-utils";

export type { DeviceClass };
export { getCatalogueColumns, getContentWidth, getDeviceClass, layout } from "./layout-utils";

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const deviceClass = getDeviceClass(width, height);
  const contentWidth = getContentWidth(width);
  const isTablet = deviceClass !== "phone";
  const catalogueColumns = getCatalogueColumns(deviceClass);

  return {
    width,
    height,
    deviceClass,
    contentWidth,
    isTablet,
    catalogueColumns,
    isLargePhone: isLargePhoneWidth(width, isTablet),
  };
}
