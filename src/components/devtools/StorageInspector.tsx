import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Modal, Alert, ActivityIndicator } from "react-native";

import { SECURE_STORE_KEYS, ASYNC_STORAGE_KEYS } from "../../lib/devtools/storageKeys";

interface Props {
  colors: {
    background: string;
    card: string;
    text: string;
    muted: string;
    border: string;
    primary: string;
  };
}

type StorageType = "async" | "secure";

interface StorageItem {
  key: string;
  value: string | null;
  sensitive?: boolean;
}

export default function StorageInspector({ colors }: Props) {
  const [storageType, setStorageType] = useState<StorageType>("async");
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
  const [showSensitive, setShowSensitive] = useState(false);

  const loadAsyncStorage = useCallback(async () => {
    const results: StorageItem[] = [];
    const allKeys = await AsyncStorage.getAllKeys();

    for (const key of ASYNC_STORAGE_KEYS) {
      const value = await AsyncStorage.getItem(key);
      results.push({ key, value });
    }

    for (const key of allKeys) {
      if (!ASYNC_STORAGE_KEYS.includes(key as typeof ASYNC_STORAGE_KEYS[number])) {
        const value = await AsyncStorage.getItem(key);
        results.push({ key, value });
      }
    }

    return results;
  }, []);

  const loadSecureStore = useCallback(async () => {
    const results: StorageItem[] = [];

    for (const { key, sensitive } of SECURE_STORE_KEYS) {
      try {
        const value = await SecureStore.getItemAsync(key, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        });
        results.push({ key, value, sensitive });
      } catch {
        results.push({ key, value: null, sensitive });
      }
    }

    return results;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = storageType === "async" ? await loadAsyncStorage() : await loadSecureStore();
      setItems(data);
    } catch (error) {
      console.error("Failed to load storage:", error);
    }
    setLoading(false);
  }, [storageType, loadAsyncStorage, loadSecureStore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = (key: string) => {
    Alert.alert("Delete Item", `Are you sure you want to delete "${key}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            if (storageType === "async") {
              await AsyncStorage.removeItem(key);
            } else {
              await SecureStore.deleteItemAsync(key);
            }
            loadData();
            setSelectedItem(null);
          } catch {
            Alert.alert("Error", "Failed to delete item");
          }
        },
      },
    ]);
  };

  const formatValue = (value: string | null, sensitive?: boolean): string => {
    if (value === null) return "[null]";
    if (sensitive && !showSensitive) {
      return value.length > 10 ? "••••••••••" : "•".repeat(value.length);
    }
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", margin: 12, borderRadius: 8, padding: 4, backgroundColor: colors.card }}>
        <Pressable
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 6,
            alignItems: "center",
            backgroundColor: storageType === "async" ? colors.primary : "transparent",
          }}
          onPress={() => setStorageType("async")}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: storageType === "async" ? "#fff" : colors.muted }}>
            AsyncStorage
          </Text>
        </Pressable>
        <Pressable
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 6,
            alignItems: "center",
            backgroundColor: storageType === "secure" ? colors.primary : "transparent",
          }}
          onPress={() => setStorageType("secure")}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: storageType === "secure" ? "#fff" : colors.muted }}>
            SecureStore
          </Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.card }}>
        <Text style={{ fontSize: 14, color: colors.muted }}>
          {items.filter((i) => i.value !== null).length} items
        </Text>
        <Pressable onPress={loadData} style={{ padding: 8 }}>
          <Ionicons name="refresh" size={18} color={colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 8 }}>
          {items.map((item) => (
            <Pressable
              key={item.key}
              style={{ padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8, backgroundColor: colors.card, borderColor: colors.border }}
              onPress={() => setSelectedItem(item)}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", flex: 1, color: colors.text }} numberOfLines={1}>
                  {item.key}
                </Text>
                {item.sensitive && <Ionicons name="lock-closed" size={14} color={colors.muted} />}
              </View>
              <Text
                style={{ fontSize: 13, fontFamily: "JetBrainsMono-Regular", color: item.value === null ? colors.muted : colors.text }}
                numberOfLines={2}
              >
                {item.value === null ? "[not set]" : formatValue(item.value, item.sensitive)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={!!selectedItem}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {selectedItem && (
            <>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontSize: 16, fontWeight: "bold", flex: 1, marginRight: 12, color: colors.text }} numberOfLines={1}>
                  {selectedItem.key}
                </Text>
                <Pressable onPress={() => setSelectedItem(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>

              <View style={{ flexDirection: "row", padding: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                {selectedItem.sensitive && (
                  <Pressable
                    style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.card }}
                    onPress={() => setShowSensitive(!showSensitive)}
                  >
                    <Ionicons name={showSensitive ? "eye-off" : "eye"} size={18} color={colors.primary} />
                    <Text style={{ color: colors.primary, marginLeft: 6 }}>{showSensitive ? "Hide" : "Show"}</Text>
                  </Pressable>
                )}
                <Pressable
                  style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#ff453a20" }}
                  onPress={() => handleDelete(selectedItem.key)}
                >
                  <Ionicons name="trash" size={18} color="#ff453a" />
                  <Text style={{ color: "#ff453a", marginLeft: 6 }}>Delete</Text>
                </Pressable>
              </View>

              <ScrollView style={{ flex: 1, padding: 12 }}>
                <View style={{ padding: 12, borderRadius: 8, backgroundColor: colors.card }}>
                  <Text
                    style={{ fontSize: 13, fontFamily: "JetBrainsMono-Regular", color: colors.text }}
                    selectable={!selectedItem.sensitive || showSensitive}
                  >
                    {formatValue(selectedItem.value, selectedItem.sensitive)}
                  </Text>
                </View>
              </ScrollView>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}
