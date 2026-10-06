import { callRpc } from "@/lib/rpc";
import type {
  CustomerDeliveryAddress,
  CustomerPackagingOffer,
  CustomerPrivateLabelProduct,
  CustomerSavedTransporter,
  CustomerShippingPreference,
} from "@/types/database.types";

export type UpsertDeliveryAddressInput = {
  addressId: string;
  label: string;
  streetAddress: string;
  city: string;
  state: string;
  pincode: string;
  contactPerson?: string | null;
  contactPhone?: string | null;
  isDefault?: boolean;
};

export type UpsertSavedTransporterInput = {
  transporterId: string;
  transporterName: string;
  accountNumber?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
};

export async function fetchCustomerDeliveryAddresses(): Promise<CustomerDeliveryAddress[]> {
  return await callRpc("customer_delivery_addresses_v1");
}

export async function upsertCustomerDeliveryAddress(
  input: UpsertDeliveryAddressInput
): Promise<CustomerDeliveryAddress> {
  const rows = await callRpc("customer_upsert_delivery_address_v1", {
    p_address_id: input.addressId,
    p_label: input.label,
    p_street_address: input.streetAddress,
    p_city: input.city,
    p_state: input.state,
    p_pincode: input.pincode,
    p_contact_person: input.contactPerson ?? null,
    p_contact_phone: input.contactPhone ?? null,
    p_is_default: input.isDefault ?? false,
  });
  const row = rows[0];
  if (!row) throw new Error("Address save did not return a governed result.");
  return row;
}

export async function deleteCustomerDeliveryAddress(addressId: string): Promise<void> {
  const deleted = await callRpc("customer_delete_delivery_address_v1", {
    p_address_id: addressId,
  });
  if (deleted !== true) throw new Error("Address could not be deleted.");
}

export async function fetchCustomerShippingPreference(): Promise<CustomerShippingPreference | null> {
  const rows = await callRpc("customer_shipping_preferences_v1");
  return rows[0] ?? null;
}

export async function fetchCustomerSavedTransporters(): Promise<CustomerSavedTransporter[]> {
  return await callRpc("customer_saved_transporters_v1");
}

export async function upsertCustomerSavedTransporter(
  input: UpsertSavedTransporterInput
): Promise<CustomerSavedTransporter> {
  const rows = await callRpc("customer_upsert_saved_transporter_v1", {
    p_transporter_id: input.transporterId,
    p_transporter_name: input.transporterName,
    p_account_number: input.accountNumber ?? null,
    p_is_default: input.isDefault ?? false,
    p_is_active: input.isActive ?? true,
  });
  const row = rows[0];
  if (!row) throw new Error("Transporter save did not return a governed result.");
  return row;
}

export async function deleteCustomerSavedTransporter(transporterId: string): Promise<void> {
  const deleted = await callRpc("customer_delete_saved_transporter_v1", {
    p_transporter_id: transporterId,
  });
  if (deleted !== true) throw new Error("Transporter could not be deleted.");
}

export async function fetchCustomerPrivateLabelProducts(): Promise<CustomerPrivateLabelProduct[]> {
  return await callRpc("customer_private_label_products_v1");
}

export async function fetchCustomerPackagingOffers(): Promise<CustomerPackagingOffer[]> {
  return await callRpc("customer_packaging_offers_v1");
}
