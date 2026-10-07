import * as SecureStore from "expo-secure-store"

export const STORAGE_KEYS = {
  sessionToken: "contraponha.session",
  theme: "contraponha.theme",
  locale: "contraponha.locale",
} as const

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

interface WriteParams {
  key: StorageKey
  value: string | null
}

export function readStored(key: StorageKey): Promise<string | null> {
  return SecureStore.getItemAsync(key)
}

export async function writeStored({ key, value }: WriteParams): Promise<void> {
  if (value === null) {
    await SecureStore.deleteItemAsync(key)

    return
  }

  await SecureStore.setItemAsync(key, value)
}
