import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  StyleSheet,
} from "react-native";

import { NetworkLog, networkLogger } from "../../lib/devtools/networkLogger";

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

type StatusFilter = "all" | "2xx" | "3xx" | "4xx" | "5xx" | "error";

const statusFilters: { key: StatusFilter; label: string; color: string }[] = [
  { key: "all", label: "All", color: "#8e8e93" },
  { key: "2xx", label: "2xx", color: "#30d158" },
  { key: "3xx", label: "3xx", color: "#ff9f0a" },
  { key: "4xx", label: "4xx", color: "#ff453a" },
  { key: "5xx", label: "5xx", color: "#ff453a" },
  { key: "error", label: "Err", color: "#ff453a" },
];

function getStatusColor(status?: number): string {
  if (!status) return "#8e8e93";
  if (status >= 200 && status < 300) return "#30d158";
  if (status >= 300 && status < 400) return "#ff9f0a";
  if (status >= 400) return "#ff453a";
  return "#8e8e93";
}

function formatDuration(ms?: number): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

function getShortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

function matchesStatusFilter(log: NetworkLog, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "error") return !!log.error;
  if (!log.status) return false;
  const prefix = filter.charAt(0);
  return String(log.status).startsWith(prefix);
}

function maskSensitive(key: string, value: string): string {
  const lowerKey = key.toLowerCase();
  if (
    lowerKey === "authorization" ||
    lowerKey.includes("token") ||
    lowerKey.includes("secret")
  ) {
    if (value.length > 20) {
      return value.substring(0, 10) + "..." + value.substring(value.length - 5);
    }
  }
  return value;
}

function formatBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

export default function NetworkInspector({ colors }: Props) {
  const [logs, setLogs] = useState<NetworkLog[]>(networkLogger.getLogs());
  const [selectedLog, setSelectedLog] = useState<NetworkLog | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    return networkLogger.subscribe(setLogs);
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch = searchQuery
        ? log.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.method.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesStatus = matchesStatusFilter(log, statusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [logs, searchQuery, statusFilter]);

  const renderItem = ({ item }: { item: NetworkLog }) => (
    <Pressable
      style={{
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 8,
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
      onPress={() => setSelectedLog(item)}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 4,
            backgroundColor: colors.primary + "20",
          }}
        >
          <Text
            style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}
          >
            {item.method}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: getStatusColor(item.status),
          }}
          numberOfLines={1}
        >
          {item.status || "pending"}
        </Text>
        <Text style={{ fontSize: 12, marginLeft: "auto", color: colors.muted }}>
          {formatDuration(item.duration)}
        </Text>
      </View>
      <Text
        style={{ fontSize: 14, marginBottom: 4, color: colors.text }}
        numberOfLines={1}
      >
        {getShortUrl(item.url)}
      </Text>
      <Text style={{ fontSize: 12, color: colors.muted }}>
        {formatTime(item.startTime)}
      </Text>
      {item.error && (
        <Text
          style={{ color: "#ff453a", fontSize: 12, marginTop: 4 }}
          numberOfLines={1}
        >
          {item.error}
        </Text>
      )}
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ padding: 12, paddingBottom: 8, backgroundColor: colors.card }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            gap: 8,
            backgroundColor: colors.background,
          }}
        >
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput
            style={{ flex: 1, fontSize: 14, padding: 0, color: colors.text }}
            placeholder="Search URL or method..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={{ paddingBottom: 8, backgroundColor: colors.card }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
        >
          {statusFilters.map((f) => (
            <Pressable
              key={f.key}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor:
                  statusFilter === f.key ? f.color + "30" : "transparent",
              }}
              onPress={() => setStatusFilter(f.key)}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: statusFilter === f.key ? f.color : colors.muted,
                }}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
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
          {filteredLogs.length}
          {filteredLogs.length !== logs.length ? ` / ${logs.length}` : ""}{" "}
          requests
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => setLogs(networkLogger.getLogs())}
            style={{ paddingHorizontal: 12, paddingVertical: 6 }}
          >
            <Ionicons name="refresh" size={18} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => networkLogger.clear()}
            style={{ paddingHorizontal: 12, paddingVertical: 6 }}
          >
            <Text style={{ color: colors.primary }}>Clear</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: "center" }}>
            <Text style={{ color: colors.muted }}>No network requests yet</Text>
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
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: colors.text,
                  }}
                >
                  Request Details
                </Text>
                <Pressable onPress={() => setSelectedLog(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>
              <ScrollView style={{ flex: 1, padding: 12 }}>
                <Section title="General" colors={colors}>
                  <Row label="URL" value={selectedLog.url} colors={colors} />
                  <Row
                    label="Method"
                    value={selectedLog.method}
                    colors={colors}
                  />
                  <Row
                    label="Status"
                    value={`${selectedLog.status || "-"} ${selectedLog.statusText || ""}`}
                    colors={colors}
                  />
                  <Row
                    label="Duration"
                    value={formatDuration(selectedLog.duration)}
                    colors={colors}
                  />
                  <Row
                    label="Time"
                    value={formatTime(selectedLog.startTime)}
                    colors={colors}
                  />
                </Section>

                {selectedLog.requestHeaders &&
                  Object.keys(selectedLog.requestHeaders).length > 0 && (
                    <Section title="Request Headers" colors={colors}>
                      {Object.entries(selectedLog.requestHeaders).map(
                        ([key, value]) => (
                          <Row
                            key={key}
                            label={key}
                            value={maskSensitive(key, value)}
                            colors={colors}
                          />
                        ),
                      )}
                    </Section>
                  )}

                {selectedLog.requestBody && (
                  <Section title="Request Body" colors={colors}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "JetBrainsMono-Regular",
                        color: colors.text,
                      }}
                    >
                      {formatBody(selectedLog.requestBody)}
                    </Text>
                  </Section>
                )}

                {selectedLog.responseHeaders &&
                  Object.keys(selectedLog.responseHeaders).length > 0 && (
                    <Section title="Response Headers" colors={colors}>
                      {Object.entries(selectedLog.responseHeaders).map(
                        ([key, value]) => (
                          <Row
                            key={key}
                            label={key}
                            value={value}
                            colors={colors}
                          />
                        ),
                      )}
                    </Section>
                  )}

                {selectedLog.responseBody && (
                  <Section title="Response Body" colors={colors}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "JetBrainsMono-Regular",
                        color: colors.text,
                      }}
                    >
                      {formatBody(selectedLog.responseBody)}
                    </Text>
                  </Section>
                )}

                {selectedLog.error && (
                  <Section title="Error" colors={colors}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "JetBrainsMono-Regular",
                        color: "#ff453a",
                      }}
                    >
                      {selectedLog.error}
                    </Text>
                  </Section>
                )}
              </ScrollView>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: Props["colors"];
}) {
  return (
    <View
      style={{
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        backgroundColor: colors.card,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          marginBottom: 8,
          color: colors.text,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: Props["colors"];
}) {
  return (
    <View
      style={{
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ fontSize: 12, marginBottom: 2, color: colors.muted }}>
        {label}
      </Text>
      <Text style={{ fontSize: 14, color: colors.text }} selectable>
        {value}
      </Text>
    </View>
  );
}
