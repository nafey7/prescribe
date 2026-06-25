import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { TokenPair } from "./types";

const ACCESS_TOKEN_KEY = "prescribe.access_token";
const REFRESH_TOKEN_KEY = "prescribe.refresh_token";

export async function getStoredTokens() {
  if (Platform.OS === "web") {
    return {
      accessToken: getWebStorageValue(ACCESS_TOKEN_KEY),
      refreshToken: getWebStorageValue(REFRESH_TOKEN_KEY),
    };
  }

  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ]);

  return { accessToken, refreshToken };
}

export async function storeTokens(tokens: TokenPair) {
  if (Platform.OS === "web") {
    setWebStorageValue(ACCESS_TOKEN_KEY, tokens.access_token);
    setWebStorageValue(REFRESH_TOKEN_KEY, tokens.refresh_token);
    return;
  }

  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access_token),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token),
  ]);
}

export async function clearStoredTokens() {
  if (Platform.OS === "web") {
    removeWebStorageValue(ACCESS_TOKEN_KEY);
    removeWebStorageValue(REFRESH_TOKEN_KEY);
    return;
  }

  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

function getWebStorageValue(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setWebStorageValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Ignore unavailable storage in constrained web runtimes. */
  }
}

function removeWebStorageValue(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* Ignore unavailable storage in constrained web runtimes. */
  }
}
