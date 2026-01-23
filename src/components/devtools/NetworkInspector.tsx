import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
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
      style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => setSelectedLog(item)}
    >
      <View style={styles.itemHeader}>
        <View style={[styles.methodBadge, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.method, { color: colors.primary }]}>{item.method}</Text>
        </View>
        <Text
          style={[styles.status, { color: getStatusColor(item.status) }]}
          numberOfLines={1}
        >
          {item.status || "pending"}
        </Text>
        <Text style={[styles.duration, { color: colors.muted }]}>
          {formatDuration(item.duration)}
        </Text>
      </View>
      <Text style={[styles.url, { color: colors.text }]} numberOfLines={1}>
        {getShortUrl(item.url)}
      </Text>
      <Text style={[styles.time, { color: colors.muted }]}>{formatTime(item.startTime)}</Text>
      {item.error && (
        <Text style={styles.error} numberOfLines={1}>
          {item.error}
        </Text>
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
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

      <View style={[styles.filterBar, { backgroundColor: colors.card }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {statusFilters.map((f) => (
            <Pressable
              key={f.key}
              style={[
                styles.filterButton,
                statusFilter === f.key && { backgroundColor: f.color + "30" },
              ]}
              onPress={() => setStatusFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: statusFilter === f.key ? f.color : colors.muted },
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.toolbar, { backgroundColor: colors.card }]}>
        <Text style={[styles.count, { color: colors.muted }]}>
          {filteredLogs.length}{filteredLogs.length !== logs.length ? ` / ${logs.length}` : ""} requests
        </Text>
        <Pressable onPress={() => networkLogger.clear()} style={styles.clearButton}>
          <Text style={{ color: colors.primary }}>Clear</Text>
        </Pressable>
      </View>

      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
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
        <View style={[styles.detailContainer, { backgroundColor: colors.background }]}>
          {selectedLog && (
            <>
              <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailTitle, { color: colors.text }]}>Request Details</Text>
                <Pressable onPress={() => setSelectedLog(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>
              <ScrollView style={styles.detailContent}>
              <Section title="General" colors={colors}>
                <Row label="URL" value={selectedLog.url} colors={colors} />
                <Row label="Method" value={selectedLog.method} colors={colors} />
                <Row label="Status" value={`${selectedLog.status || "-"} ${selectedLog.statusText || ""}`} colors={colors} />
                <Row label="Duration" value={formatDuration(selectedLog.duration)} colors={colors} />
                <Row label="Time" value={formatTime(selectedLog.startTime)} colors={colors} />
              </Section>

              {selectedLog.requestHeaders && Object.keys(selectedLog.requestHeaders).length > 0 && (
                <Section title="Request Headers" colors={colors}>
                  {Object.entries(selectedLog.requestHeaders).map(([key, value]) => (
                    <Row key={key} label={key} value={maskSensitive(key, value)} colors={colors} />
                  ))}
                </Section>
              )}

              {selectedLog.requestBody && (
                <Section title="Request Body" colors={colors}>
                  <Text style={[styles.bodyText, { color: colors.text }]}>
                    {formatBody(selectedLog.requestBody)}
                  </Text>
                </Section>
              )}

              {selectedLog.responseHeaders && Object.keys(selectedLog.responseHeaders).length > 0 && (
                <Section title="Response Headers" colors={colors}>
                  {Object.entries(selectedLog.responseHeaders).map(([key, value]) => (
                    <Row key={key} label={key} value={value} colors={colors} />
                  ))}
                </Section>
              )}

              {selectedLog.responseBody && (
                <Section title="Response Body" colors={colors}>
                  <Text style={[styles.bodyText, { color: colors.text }]}>
                    {formatBody(selectedLog.responseBody)}
                  </Text>
                </Section>
              )}

              {selectedLog.error && (
                <Section title="Error" colors={colors}>
                  <Text style={[styles.bodyText, { color: "#ff453a" }]}>{selectedLog.error}</Text>
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
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
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
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]} selectable>
        {value}
      </Text>
    </View>
  );
}

function maskSensitive(key: string, value: string): string {
  const lowerKey = key.toLowerCase();
  if (lowerKey === "authorization" || lowerKey.includes("token") || lowerKey.includes("secret")) {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  filterBar: {
    paddingBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 12,
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
    gap: 8,
    marginBottom: 6,
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  method: {
    fontSize: 12,
    fontWeight: "600",
  },
  status: {
    fontSize: 14,
    fontWeight: "600",
  },
  duration: {
    fontSize: 12,
    marginLeft: "auto",
  },
  url: {
    fontSize: 14,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
  },
  error: {
    color: "#ff453a",
    fontSize: 12,
    marginTop: 4,
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
  detailTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  detailContent: {
    flex: 1,
    padding: 12,
  },
  section: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  row: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 14,
  },
  bodyText: {
    fontSize: 12,
    fontFamily: "JetBrainsMono-Regular",
  },
});
