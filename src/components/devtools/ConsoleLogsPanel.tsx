import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
} from "react-native";

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

  const filteredLogs =
    filter === "all" ? logs : logs.filter((log) => log.type === filter);

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderItem = ({ item }: { item: ConsoleLog }) => (
    <Pressable
      style={{
        padding: 10,
        borderRadius: 6,
        borderLeftWidth: 3,
        marginBottom: 6,
        backgroundColor: colors.card,
        borderLeftColor: getLogColor(item.type),
      }}
      onPress={() => setSelectedLog(item)}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <Ionicons
          name={getLogIcon(item.type)}
          size={14}
          color={getLogColor(item.type)}
        />
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: getLogColor(item.type),
          }}
        >
          {item.type.toUpperCase()}
        </Text>
        <Text style={{ fontSize: 11, marginLeft: "auto", color: colors.muted }}>
          {formatTime(item.timestamp)}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 12,
          fontFamily: "JetBrainsMono-Regular",
          lineHeight: 18,
          color: colors.text,
        }}
        numberOfLines={3}
      >
        {item.message}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: "row",
          padding: 8,
          gap: 6,
          backgroundColor: colors.card,
        }}
      >
        {filters.map((f) => (
          <Pressable
            key={f.key}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              backgroundColor:
                filter === f.key ? f.color + "30" : "transparent",
            }}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: filter === f.key ? f.color : colors.muted,
              }}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: colors.card,
        }}
      >
        <Text style={{ fontSize: 14, color: colors.muted }}>
          {filteredLogs.length} logs
        </Text>
        <Pressable
          onPress={() => consoleLogger.clear()}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text style={{ color: colors.primary }}>Clear</Text>
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, gap: 6 }}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: "center" }}>
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
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {selectedLog && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Ionicons
                    name={getLogIcon(selectedLog.type)}
                    size={20}
                    color={getLogColor(selectedLog.type)}
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                      color: getLogColor(selectedLog.type),
                    }}
                  >
                    {selectedLog.type.toUpperCase()}
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedLog(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>

              <View
                style={{
                  margin: 12,
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: colors.card,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ fontSize: 14, color: colors.muted }}>
                    Time
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: colors.text,
                    }}
                  >
                    {formatFullTime(selectedLog.timestamp)}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ fontSize: 14, color: colors.muted }}>
                    Length
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: colors.text,
                    }}
                  >
                    {selectedLog.message.length} chars
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  paddingHorizontal: 12,
                  paddingBottom: 12,
                  gap: 12,
                }}
              >
                <Pressable
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: colors.card,
                  }}
                  onPress={() => handleCopy(selectedLog.message)}
                >
                  <Ionicons
                    name={copied ? "checkmark" : "copy"}
                    size={18}
                    color={copied ? "#30d158" : colors.primary}
                  />
                  <Text
                    style={{
                      color: copied ? "#30d158" : colors.primary,
                      marginLeft: 6,
                    }}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Text>
                </Pressable>
              </View>

              <ScrollView style={{ flex: 1, padding: 12 }}>
                <View
                  style={{
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: colors.card,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "JetBrainsMono-Regular",
                      lineHeight: 20,
                      color: colors.text,
                    }}
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
