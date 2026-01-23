import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,

  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDevTools } from "../../lib/devtools/DevToolsContext";

import AuthStatePanel from "./AuthStatePanel";
import ConsoleLogsPanel from "./ConsoleLogsPanel";
import NetworkInspector from "./NetworkInspector";
import StorageInspector from "./StorageInspector";

type Tab = "network" | "storage" | "auth" | "console";

const tabs: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "network", label: "Network", icon: "globe-outline" },
  { key: "storage", label: "Storage", icon: "folder-outline" },
  { key: "auth", label: "Auth", icon: "key-outline" },
  { key: "console", label: "Console", icon: "terminal-outline" },
];

export default function DevToolsPanel() {
  const { isOpen, close } = useDevTools();
  const [activeTab, setActiveTab] = useState<Tab>("network");
  const isDark = useColorScheme() === "dark";

  const colors = {
    background: isDark ? "#1c1c1e" : "#f2f2f7",
    card: isDark ? "#2c2c2e" : "#ffffff",
    text: isDark ? "#ffffff" : "#000000",
    muted: isDark ? "#8e8e93" : "#6c6c70",
    border: isDark ? "#38383a" : "#c6c6c8",
    primary: "#ec3750",
  };

  const renderContent = () => {
    switch (activeTab) {
      case "network":
        return <NetworkInspector colors={colors} />;
      case "storage":
        return <StorageInspector colors={colors} />;
      case "auth":
        return <AuthStatePanel colors={colors} />;
      case "console":
        return <ConsoleLogsPanel colors={colors} />;
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.container}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Dev Tools</Text>
            <Pressable onPress={close} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={[styles.tabBar, { backgroundColor: colors.card }]}>
            {tabs.map((tab) => (
              <Pressable
                key={tab.key}
                style={[
                  styles.tab,
                  activeTab === tab.key && { backgroundColor: colors.primary },
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon}
                  size={18}
                  color={activeTab === tab.key ? "#fff" : colors.muted}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: activeTab === tab.key ? "#fff" : colors.muted },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.content}>{renderContent()}</View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 4,
  },
  tabBar: {
    flexDirection: "row",
    padding: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
});
