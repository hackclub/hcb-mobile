import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useState, useEffect, useRef } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Modal, ScrollView } from "react-native";

import { ConsoleLog, consoleLogger } from "../../lib/devtools/consoleLogger";

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

type FilterType = "all" | "log" | "warn" | "error" | "info";

const filters: { key: FilterType; label: string; color: string }[] = [
  { key: "all", label: "All", color: "#8e8e93" },
  { key: "log", label: "Log", color: "#8e8e93" },
  { key: "info", label: "Info", color: "#0a84ff" },
  { key: "warn", label: "Warn", color: "#ff9f0a" },
  { key: "error", label: "Error", color: "#ff453a" },
];

function getLogColor(type: ConsoleLog["type"]): string {
  switch (type) {
    case "error":
      return "#ff453a";
    case "warn":
      return "#ff9f0a";
    case "info":
      return "#0a84ff";
    default:
      return "#8e8e93";
  }
}

function getLogIcon(type: ConsoleLog["type"]): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "error":
      return "close-circle";
    case "warn":
      return "warning";
    case "info":
      return "information-circle";
    default:
      return "chevron-forward";
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatFullTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export default function ConsoleLogsPanel({ colors }: Props) {
  const [logs, setLogs] = useState<ConsoleLog[]>(consoleLogger.getLogs());
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedLog, setSelectedLog] = useState<ConsoleLog | null>(null);
  const [copied, setCopied] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    return consoleLogger.subscribe(setLogs);
  }, []);

  const filteredLogs = filter === "all" ? logs : logs.filter((log) => log.type === filter);

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderItem = ({ item }: { item: ConsoleLog }) => {
    return (
      <Pressable
        style={[styles.item, { backgroundColor: colors.card, borderLeftColor: getLogColor(item.type) }]}
        onPress={() => setSelectedLog(item)}
      >
        <View style={styles.itemHeader}>
          <Ionicons name={getLogIcon(item.type)} size={14} color={getLogColor(item.type)} />
          <Text style={[styles.type, { color: getLogColor(item.type) }]}>
            {item.type.toUpperCase()}
          </Text>
          <Text style={[styles.time, { color: colors.muted }]}>{formatTime(item.timestamp)}</Text>
        </View>
        <Text
          style={[styles.message, { color: colors.text }]}
          numberOfLines={3}
        >
          {item.message}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.filterBar, { backgroundColor: colors.card }]}>
        {filters.map((f) => (
          <Pressable
            key={f.key}
            style={[
              styles.filterButton,
              filter === f.key && { backgroundColor: f.color + "30" },
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === f.key ? f.color : colors.muted },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.toolbar, { backgroundColor: colors.card }]}>
        <Text style={[styles.count, { color: colors.muted }]}>{filteredLogs.length} logs</Text>
        <Pressable onPress={() => consoleLogger.clear()} style={styles.clearButton}>
          <Text style={{ color: colors.primary }}>Clear</Text>
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: colors.muted }}>No console logs yet</Text>
          </View>
        }
      />

      <Modal
        visible={!!selectedLog}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedLog(null)}
      >
        <View style={[styles.detailContainer, { backgroundColor: colors.background }]}>
          {selectedLog && (
            <>
              <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
                <View style={styles.detailHeaderLeft}>
                  <Ionicons
                    name={getLogIcon(selectedLog.type)}
                    size={20}
                    color={getLogColor(selectedLog.type)}
                  />
                  <Text style={[styles.detailType, { color: getLogColor(selectedLog.type) }]}>
                    {selectedLog.type.toUpperCase()}
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedLog(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>

              <View style={[styles.detailMeta, { backgroundColor: colors.card }]}>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.muted }]}>Time</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>
                    {formatFullTime(selectedLog.timestamp)}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.muted }]}>Length</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>
                    {selectedLog.message.length} chars
                  </Text>
                </View>
              </View>

              <View style={[styles.detailActions, { borderBottomColor: colors.border }]}>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: colors.card }]}
                  onPress={() => handleCopy(selectedLog.message)}
                >
                  <Ionicons
                    name={copied ? "checkmark" : "copy"}
                    size={18}
                    color={copied ? "#30d158" : colors.primary}
                  />
                  <Text style={{ color: copied ? "#30d158" : colors.primary, marginLeft: 6 }}>
                    {copied ? "Copied!" : "Copy"}
                  </Text>
                </Pressable>
              </View>

              <ScrollView style={styles.detailContent}>
                <View style={[styles.messageContainer, { backgroundColor: colors.card }]}>
                  <Text
                    style={[styles.detailMessage, { color: colors.text }]}
                    selectable
                  >
                    {selectedLog.message}
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
  filterBar: {
    flexDirection: "row",
    padding: 8,
    gap: 6,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterText: {
    fontSize: 13,
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
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  list: {
    padding: 12,
    gap: 6,
  },
  item: {
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    marginBottom: 6,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  type: {
    fontSize: 11,
    fontWeight: "700",
  },
  time: {
    fontSize: 11,
    marginLeft: "auto",
  },
  message: {
    fontSize: 12,
    fontFamily: "JetBrainsMono-Regular",
    lineHeight: 18,
  },
  empty: {
    padding: 40,
    alignItems: "center",
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
  detailHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailType: {
    fontSize: 16,
    fontWeight: "bold",
  },
  detailMeta: {
    margin: 12,
    borderRadius: 8,
    padding: 12,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  metaLabel: {
    fontSize: 14,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  detailActions: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  detailContent: {
    flex: 1,
    padding: 12,
  },
  messageContainer: {
    borderRadius: 8,
    padding: 12,
  },
  detailMessage: {
    fontSize: 13,
    fontFamily: "JetBrainsMono-Regular",
    lineHeight: 20,
  },
});
