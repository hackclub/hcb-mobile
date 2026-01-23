import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";

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
          } catch (error) {
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
    <View style={styles.container}>
      <View style={[styles.segmentContainer, { backgroundColor: colors.card }]}>
        <Pressable
          style={[
            styles.segment,
            storageType === "async" && { backgroundColor: colors.primary },
          ]}
          onPress={() => setStorageType("async")}
        >
          <Text
            style={[
              styles.segmentText,
              { color: storageType === "async" ? "#fff" : colors.muted },
            ]}
          >
            AsyncStorage
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.segment,
            storageType === "secure" && { backgroundColor: colors.primary },
          ]}
          onPress={() => setStorageType("secure")}
        >
          <Text
            style={[
              styles.segmentText,
              { color: storageType === "secure" ? "#fff" : colors.muted },
            ]}
          >
            SecureStore
          </Text>
        </Pressable>
      </View>

      <View style={[styles.toolbar, { backgroundColor: colors.card }]}>
        <Text style={[styles.count, { color: colors.muted }]}>
          {items.filter((i) => i.value !== null).length} items
        </Text>
        <Pressable onPress={loadData} style={styles.refreshButton}>
          <Ionicons name="refresh" size={18} color={colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {items.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setSelectedItem(item)}
            >
              <View style={styles.itemHeader}>
                <Text style={[styles.itemKey, { color: colors.text }]} numberOfLines={1}>
                  {item.key}
                </Text>
                {item.sensitive && (
                  <Ionicons name="lock-closed" size={14} color={colors.muted} />
                )}
              </View>
              <Text
                style={[
                  styles.itemValue,
                  { color: item.value === null ? colors.muted : colors.text },
                ]}
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
        <View style={[styles.detailContainer, { backgroundColor: colors.background }]}>
          {selectedItem && (
            <>
              <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailTitle, { color: colors.text }]} numberOfLines={1}>
                  {selectedItem.key}
                </Text>
                <Pressable onPress={() => setSelectedItem(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>

              <View style={[styles.detailToolbar, { borderBottomColor: colors.border }]}>
                {selectedItem.sensitive && (
                  <Pressable
                    style={[styles.toolbarButton, { backgroundColor: colors.card }]}
                    onPress={() => setShowSensitive(!showSensitive)}
                  >
                    <Ionicons
                      name={showSensitive ? "eye-off" : "eye"}
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={{ color: colors.primary, marginLeft: 6 }}>
                      {showSensitive ? "Hide" : "Show"}
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.toolbarButton, { backgroundColor: "#ff453a20" }]}
                  onPress={() => handleDelete(selectedItem.key)}
                >
                  <Ionicons name="trash" size={18} color="#ff453a" />
                  <Text style={{ color: "#ff453a", marginLeft: 6 }}>Delete</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.detailContent}>
                <View style={[styles.valueContainer, { backgroundColor: colors.card }]}>
                  <Text
                    style={[styles.valueText, { color: colors.text }]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentContainer: {
    flexDirection: "row",
    margin: 12,
    borderRadius: 8,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  count: {
    fontSize: 14,
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    gap: 8,
  },
  item: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  itemKey: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  itemValue: {
    fontSize: 13,
    fontFamily: "JetBrainsMono-Regular",
  },
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    marginRight: 12,
  },
  detailToolbar: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  toolbarButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  detailContent: {
    flex: 1,
    padding: 12,
  },
  valueContainer: {
    padding: 12,
    borderRadius: 8,
  },
  valueText: {
    fontSize: 13,
    fontFamily: "JetBrainsMono-Regular",
  },
});
