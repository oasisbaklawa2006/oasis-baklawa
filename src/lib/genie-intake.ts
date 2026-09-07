import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { invokeGenieOrderParse, type GenieParseMode } from "@/lib/genie-order-parse";

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

async function readBase64FromUri(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

export async function parseGenieIntake(
  mode: GenieParseMode,
  options: { text?: string }
): Promise<{ productName: string; quantity: number; uom: string }[]> {
  if (mode === "text") {
    const lines = await invokeGenieOrderParse({ mode, text: options.text ?? "", locale: "en-IN" });
    return lines;
  }

  if (mode === "image") {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Photo access is required to parse a PO image with Oasis Genie.");
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.base64) {
      throw new Error("No image selected.");
    }
    const asset = result.assets[0];
    const contentBase64 = asset.base64;
    if (!contentBase64) {
      throw new Error("Could not read the selected image.");
    }
    return invokeGenieOrderParse({
      mode: "image",
      mimeType: asset.mimeType ?? undefined,
      fileName: asset.fileName ?? "po-image.jpg",
      contentBase64,
      locale: "en-IN",
    });
  }

  if (mode === "document") {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: [
        "application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "text/csv",
      ],
    });
    if (result.canceled || !result.assets[0]?.uri) {
      throw new Error("No document selected.");
    }
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_DOCUMENT_BYTES) {
      throw new Error("Document is too large. Choose a file under 10 MB.");
    }
    const contentBase64 = await readBase64FromUri(asset.uri);
    return invokeGenieOrderParse({
      mode: "document",
      mimeType: asset.mimeType ?? "application/octet-stream",
      fileName: asset.name,
      contentBase64,
      locale: "en-IN",
    });
  }

  throw new Error(
    "Voice ordering requires a verified ai-order-parse audio contract. Hindi, English, and Hinglish are supported once Core certifies the edge function."
  );
}
