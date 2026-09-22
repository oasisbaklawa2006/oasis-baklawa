import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import {
  assertKnownBoundedFileSize,
  resolveGenieMediaMimeType,
} from "@/lib/genie-media-contract";
import { invokeGenieOrderParse, type GenieParseMode } from "@/lib/genie-order-parse";

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

async function readBase64FromUri(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

export async function parseGenieIntake(
  mode: GenieParseMode,
  options: { text?: string }
): Promise<{ productName: string; quantity: number; uom: string }[]> {
  if (mode === "text") {
    return invokeGenieOrderParse({ mode, text: options.text ?? "", locale: "en-IN" });
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
    const mimeType = resolveGenieMediaMimeType("image", asset.mimeType, asset.fileName);
    return invokeGenieOrderParse({
      mode: "image",
      mimeType,
      fileName: asset.fileName ?? undefined,
      contentBase64,
      locale: "en-IN",
    });
  }

  if (mode === "audio") {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: "audio/*",
    });
    if (result.canceled || !result.assets[0]?.uri) {
      throw new Error("No voice note selected.");
    }
    const asset = result.assets[0];
    assertKnownBoundedFileSize(asset.size, MAX_AUDIO_BYTES, "Voice note");
    const mimeType = resolveGenieMediaMimeType("audio", asset.mimeType, asset.name);
    const contentBase64 = await readBase64FromUri(asset.uri);
    return invokeGenieOrderParse({
      mode: "audio",
      mimeType,
      fileName: asset.name,
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
        "application/json",
        "application/rtf",
        "text/plain",
        "text/csv",
        "text/html",
        "text/css",
        "text/xml",
        "text/rtf",
        "text/markdown",
      ],
    });
    if (result.canceled || !result.assets[0]?.uri) {
      throw new Error("No document selected.");
    }
    const asset = result.assets[0];
    assertKnownBoundedFileSize(asset.size, MAX_DOCUMENT_BYTES, "Document");
    const mimeType = resolveGenieMediaMimeType("document", asset.mimeType, asset.name);
    const contentBase64 = await readBase64FromUri(asset.uri);
    return invokeGenieOrderParse({
      mode: "document",
      mimeType,
      fileName: asset.name,
      contentBase64,
      locale: "en-IN",
    });
  }

  throw new Error("Unsupported Oasis Genie intake mode.");
}
