import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { View, Text, StatusBar, Button, ActivityIndicator } from "react-native";
import useSWR from "swr";

import StyledButton from "../../components/Button";
import { StackParamList } from "../../lib/NavigatorParamList";
import { OrganizationExpanded } from "../../lib/types/Organization";
import { palette } from "../../theme";

type Props = NativeStackScreenProps<StackParamList, "ProcessDonation">;

const SectionHeader = ({ title, subtitle }: { title: string, subtitle?: string }) => {
    const { colors } = useTheme();

    return (
        <>
            <Text
                style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    marginBottom: subtitle ? 10 : 16,
                    color: colors.text,
                }}
            >
                {title}
            </Text>
            {subtitle && (
                <Text style={{ color: palette.muted, fontSize: 16, marginBottom: 16 }}>{subtitle}</Text>
            )}
        </>
    );
};

function Stat({
    title,
    value,
}: {
    title: string;
    value: string | undefined;
}) {
    const { colors: themeColors } = useTheme();
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (copied) {
            const timeout = setTimeout(() => setCopied(false), 2000);
            return () => clearTimeout(timeout);
        }
    }, [copied]);

    return (
        <View>
            <Text style={{ color: palette.muted, fontSize: 16 }}>{title}</Text>
            <View
                style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}
            >
                <Text
                    style={{
                        color: themeColors.text,
                        fontFamily: "JetBrains Mono",
                        fontSize: 30,
                    }}
                >
                    {value}
                </Text>
            </View>
        </View>
    );
}

export default function ProcessDonationPage({
    navigation,
    route: {
        params: { orgId, payment, collectPayment },
    },
}: Props) {
    const { data: organization } = useSWR<OrganizationExpanded>(
        `organizations/${orgId}`,
    );

    const [status, setStatus] = useState<"ready" | "loading" | "success" | "error">("ready");

    useEffect(() => {
        navigation.setOptions({
            headerLeft: () => (
                <Button
                    title="Done"
                    color={palette.primary}
                    onPress={() => navigation.goBack()}
                />
            ),
        });
    }, []);

    return (
        <View
            style={{
                padding: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
            }}
        >
            <StatusBar barStyle="light-content" />



            {status == "ready" ? <View style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1
            }}>
                <Stat
                    title="Donation amount"
                    value={"$" + (payment?.amount / 100).toFixed(2)}
                />
                <StyledButton onPress={async () => {
                    setStatus("loading");
                    const status = await collectPayment();
                    setStatus(status ? "success" : "error");
                }} style={{
                    marginBottom: 10,
                    position: 'absolute',
                    bottom: 30,
                    width: '100%'
                }}>
                    Use Tap to Pay
                </StyledButton>
            </View> : status == "success" ? <View style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1
            }}>
                <Ionicons name="checkmark-circle-outline" size={100} color={palette.success} />
                <Text style={{
                    fontSize: 20,
                    fontWeight: "600",
                    marginBottom: 10
                }}>Success</Text>
                <Text style={{
                    fontSize: 16
                }}>{"$" + (payment?.amount / 100).toFixed(2)} donation completed successfully</Text>

                <StyledButton onPress={navigation.goBack} style={{
                    position: 'absolute',
                    bottom: 30,
                    width: '100%'
                }}>
                    Done
                </StyledButton>
            </View> : status == "loading" ? <View style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1
            }}>
                <Text style={{
                    marginBottom: 20,
                    fontSize: 20,
                }}>Processing...</Text>
                <ActivityIndicator size="large" />

            </View> : <View style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1
            }}>
                <Ionicons name="close-circle-outline" size={100} color={palette.warning} />
                <Text style={{
                    fontSize: 20,
                    fontWeight: "600",
                    marginBottom: 10
                }}>Error</Text>
                <Text style={{
                    fontSize: 16
                }}>{"$" + (payment?.amount / 100).toFixed(2)} donation encountered an error</Text>

                <StyledButton onPress={navigation.goBack} style={{
                    position: 'absolute',
                    bottom: 30,
                    width: '100%'
                }}>
                    Close
                </StyledButton>
            </View>}
            {/* <Text>{JSON.stringify(payment, null, 2)}</Text> */}
        </View>
    );
}
