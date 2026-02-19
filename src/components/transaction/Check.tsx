import { View, Image, StyleSheet, Dimensions } from "react-native";
import { Text } from "components/Text";

import useSWR from "swr";
import { ToWords } from "to-words";

import { OrganizationExpanded } from "../../lib/types/Organization";
import { useIsDark } from "../../lib/useColorScheme";
import palette from "../../styles/palette";

const screenWidth = Dimensions.get("window").width;
const checkRatio = 3.2 / 6;
const checkWidth = screenWidth * 0.9;
const checkHeight = checkWidth * checkRatio;

interface CheckComponentProps {
  checkNumber?: string;
  date: string;
  recipientName: string;
  amount: number;
  memo?: string;
  editable?: boolean;
  orgId?: string;
}

export default function CheckComponent({
  checkNumber,
  date,
  recipientName,
  amount,
  memo,
  orgId,
}: CheckComponentProps) {
  amount = Math.abs(amount);
  date = new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const { data: organization } = useSWR<OrganizationExpanded>(
    `organizations/${orgId}`,
  );

  const isDark = useIsDark();

  const renderMoneyAmount = (amount: number): string => `$${amount.toFixed(2)}`;
  const toWords = new ToWords({
    localeCode: "en-US",
    converterOptions: {
      ignoreDecimal: false,
      ignoreZeroCurrency: false,
    },
  });
  const amountInWords = toWords.convert(amount);
  // Dynamic styles based on the color scheme
  const styles = getStyles(isDark);

  return (
    <View style={styles.container}>
      {/* Check Number and Date */}
      <View style={styles.headerContainer}>
        <Text style={styles.checkNumber}>{checkNumber || "----"}</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={styles.label}>Date:</Text>
          <View
            style={{
              borderBottomWidth: 2,
              borderBottomColor: isDark
                ? palette.slate[500]
                : palette.slate[400],
            }}
          >
            <Text style={[styles.dateText, styles.handwriting]}>{date}</Text>
          </View>
        </View>
      </View>

      {/* Pay to the Order Of */}
      <View style={[styles.row, { gap: 10 }]}>
        <Text style={[styles.label, { fontSize: 10, marginRight: 0 }]}>
          Pay to the{"\n"}order of
        </Text>
        <View
          style={[
            styles.flexGrow,
            {
              borderBottomWidth: 2,
              borderBottomColor: isDark
                ? palette.slate[500]
                : palette.slate[400],
            },
          ]}
        >
          <Text style={styles.handwriting}>{recipientName}</Text>
        </View>
        <Text style={styles.amountInput}>$</Text>
        <Text style={styles.amount}>
          {renderMoneyAmount(amount).replace("$", "")}
        </Text>
      </View>

      {/* Amount in Words */}
      <View style={[styles.row, { gap: 12 }]}>
        <View
          style={[
            styles.flexGrow,
            {
              borderBottomWidth: 2,
              borderBottomColor: isDark
                ? palette.slate[500]
                : palette.slate[400],
            },
          ]}
        >
          <Text numberOfLines={1} style={styles.handwriting}>
            {amountInWords}
          </Text>
        </View>
        <Text style={styles.label}>Dollars</Text>
      </View>

      {/* Memo */}
      <View style={[styles.row, styles.memoContainer, { marginBottom: 0 }]}>
        <Text style={styles.label}>Memo</Text>
        <View
          style={[
            styles.flexGrow,
            {
              borderBottomWidth: 2,
              borderBottomColor: isDark
                ? palette.slate[500]
                : palette.slate[400],
            },
          ]}
        >
          <Text style={styles.handwriting}>{memo}</Text>
        </View>
        <Image
          source={require("../../../assets/zach-signature.png")}
          style={styles.signature}
        />
      </View>

      {/* Signature and Account Details */}
      <View style={{ flexDirection: "row" }}>
        <Text style={styles.accountDetails}>
          &#9286;
          {checkNumber?.padStart(10, "0") || "0000000000"} &#9286;
          {organization?.routing_number || "111111111"} &#9286;
          {organization?.account_number?.slice(0, 3) || "123"}[HIDDEN] &#9286;
        </Text>
      </View>
    </View>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      width: checkWidth,
      height: checkHeight,
      backgroundColor: isDark ? "#193046" : "#E2ECF5",
      padding: 12,
      marginVertical: 12,
      shadowColor: isDark ? "#000" : "#888",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 6,
      borderWidth: 1,
      borderColor: isDark ? "#ccc" : "#bbb",
      overflow: "visible",
    },
    headerContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    checkNumber: {
      fontFamily: "check-font",
      fontSize: 14,
      textAlign: "right",
      marginBottom: 8,
      color: isDark ? palette.slate[300] : palette.slate[700],
    },
    dateText: {
      fontSize: 16,
      color: isDark ? palette.slate[300] : palette.slate[700],
      fontFamily: "Damion",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    label: {
      fontSize: 12,
      fontWeight: "bold",
      textTransform: "uppercase",
      marginRight: 4,
      color: isDark ? palette.slate[300] : palette.slate[700],
    },
    handwriting: {
      fontFamily: "Damion",
      fontSize: 16,
      borderBottomWidth: 2,
      borderBottomColor: isDark ? palette.slate[500] : palette.slate[400],
      paddingRight: 8,
      color: isDark ? "#fff" : "#000",
      textDecorationColor: isDark ? palette.slate[500] : palette.slate[400],
    },
    amountInput: {
      fontFamily: "Damion",
      fontSize: 18,
      maxWidth: 120,
      color: isDark ? "#fff" : "#000",
      textAlign: "right",
    },
    amount: {
      fontFamily: "Damion",
      fontSize: 18,
      maxWidth: 120,
      color: isDark ? "#fff" : "#000",
      textAlign: "right",
      borderWidth: 1,
      borderColor: isDark ? palette.slate[500] : palette.slate[400],
      paddingHorizontal: 4,
    },
    memoContainer: {
      gap: 8,
      alignItems: "center",
    },
    flexGrow: {
      flexGrow: 1,
      maxWidth: "75%",
    },
    signature: {
      height: 40,
      width: 60,
      tintColor: isDark ? palette.slate[100] : palette.slate[500],
    },
    accountDetails: {
      fontFamily: "check-font",
      fontSize: 12,
      color: isDark ? palette.slate[300] : palette.slate[700],
      textAlign: "left",
      flex: 1,
    },
  });
