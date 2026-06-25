import { Platform } from "react-native";

const DEFAULT_API_URL = Platform.select({
  android: "http://10.0.2.2:8000/api",
  default: "http://localhost:8000/api",
});

export function getApiBaseUrl() {
  return stripTrailingSlash(process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL);
}

function stripTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
