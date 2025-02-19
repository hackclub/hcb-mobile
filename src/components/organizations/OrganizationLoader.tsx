import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import useSWR from "swr";

import { StackParamList } from "../../lib/NavigatorParamList";
import Organization from "../../lib/types/Organization";

const OrganizationLoader = () => {
  const navigation = useNavigation<NativeStackNavigationProp<StackParamList>>();
  type RouteParams = {
    params: {
      orgId: string;
    };
  };
  const route = useRoute<RouteProp<RouteParams, "params">>();
  const { params } = route;
  console.log(params);
  const { data: organizations } = useSWR<Organization[]>("user/organizations");

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        if (organizations) {
          const org = organizations.find((org) => org.id === params.orgId);
          console.log("orgfound", org);
          if (org) {
            navigation.replace("Event", { orgId: org.id, organization: org });
            return;
          }
        }

        const response = await fetch(
          `https://hcb.hackclub.com/api/v3/organizations/${params.orgId}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        const org = await response.json();
        console.log(org);

        // Navigate to the actual Event screen with resolved org.id
        navigation.replace("Event", { orgId: org.id });
      } catch (error) {
        console.error("Failed to fetch event:", error);
      }
    };

    fetchEvent();
  }, [navigation, organizations, params.orgId]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
};

export default OrganizationLoader;
