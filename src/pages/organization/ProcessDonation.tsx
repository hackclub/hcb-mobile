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
                    title={status == "ready" || status == "loading" ? "Cancel" : "Done"}
                    color={palette.primary}
                    onPress={() => navigation.goBack()}
                />
            ),
        });
    }, [status]);

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
                flex: 1,
                paddingBottom: 40
            }}>
                <Text style={{ color: palette.muted, fontSize: 20 }}>Donation amount</Text>
                <Text
                    style={{
                        fontSize: 50,
                    }}
                >
                    ${(payment?.amount / 100).toFixed(2)}
                </Text>

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
                flex: 1,
                paddingBottom: 40
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
                flex: 1,
                paddingBottom: 40
            }}>
                <ActivityIndicator size="large" style={{
                    margin: 20
                }} />
                <Text style={{
                    fontSize: 20,
                    fontWeight: "600",
                    paddingBottom: 10
                }}>Processing</Text>
                <Text style={{
                    fontSize: 16
                }}>Please wait...</Text>


            </View> : <View style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
                marginBottom: 40
            }}>
                <Ionicons name="close-circle-outline" size={100} color={palette.warning} />
                <Text style={{
                    fontSize: 20,
                    fontWeight: "600",
                    paddingBottom: 10
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
