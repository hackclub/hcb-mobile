import * as ExpoWidgets from '@thedev132/expo-widgets';
import { format } from "date-fns";
import { ReactNode, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { useSWRConfig } from "swr";

import AuthContext from "../auth/auth";
import { PaginatedResponse } from "../lib/types/HcbApiObject";
import Organization, {
  OrganizationExpanded,
} from "../lib/types/Organization";
import Transaction from "../lib/types/Transaction";
import { useOfflineSWR } from "../lib/useOfflineSWR";

interface OrgWidgetData {
  organizationName: string;
  organizationSlug: string;
  organizationId: string;
  balanceCents: number;
  iconUrl: string | null;
  lastUpdated: string;
  transactionHistory: Array<{
    date: string;
    amountCents: number;
  }>;
}


export function WidgetProvider({ children }: { children: ReactNode }) {
  const { tokens } = useContext(AuthContext);
  const { fetcher } = useSWRConfig();
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  // Fetch user's organizations list
  const { data: organizations } = useOfflineSWR<Organization[]>(
    tokens?.accessToken ? "user/organizations" : null,
    {
      fallbackData: [],
      refreshInterval: 30000, // Refresh every 30 seconds when app is active
    },
  );

  // Fetch and update widget data for all organizations
  useEffect(() => {
    if (!organizations || !fetcher) {
      console.log("No organizations or fetcher found");
      return;
    }

    // Throttle updates to every 30 seconds
    const now = Date.now();
    if (now - lastUpdate < 30000) {
      return;
    }

    const updateWidgets = async () => {
      try {
        const allWidgetData: Record<string, OrgWidgetData> = {};
        
        // Fetch data for all organizations
        await Promise.all(
          organizations.map(async (org) => {
            try {
              // Fetch org details and transactions using SWR fetcher
              const [orgDetails, transactionsData] = await Promise.all([
                fetcher(`organizations/${org.id}`) as Promise<OrganizationExpanded>,
                fetcher(`organizations/${org.id}/transactions?limit=30`) as Promise<PaginatedResponse<Transaction>>,
              ]);

              // Process transactions for the graph
              const transactionHistory = transactionsData?.data
                ?.filter(t => !t.pending && !t.declined)
                .slice(0, 15)
                .reverse()
                .map(t => ({
                  date: t.date,
                  amountCents: t.amount_cents,
                })) || [];

              allWidgetData[orgDetails.id] = {
                organizationName: orgDetails.name,
                organizationSlug: orgDetails.slug,
                organizationId: orgDetails.id,
                balanceCents: orgDetails.balance_cents || 0,
                iconUrl: orgDetails.icon || null,
                lastUpdated: format(new Date(), "MMM d, h:mm a"),
                transactionHistory,
              };
            } catch (error) {
              console.error(`Failed to fetch data for org ${org.id}:`, error);
            }
          })
        );

        // Save all data as a single object
        const widgetPayload = {
          organizations: organizations.map(org => ({
            id: org.id,
            name: org.name,
          })),
          data: allWidgetData,
        };

        console.log(`Saving widget data for ${widgetPayload.organizations.length} organizations`);
        
        if (Platform.OS === "android") {
          ExpoWidgets.setWidgetData(JSON.stringify(widgetPayload), "com.hackclub.hcb");
        } else {
          ExpoWidgets.setWidgetData(JSON.stringify(widgetPayload));
        }
        
        console.log("Widget data saved successfully");
      setLastUpdate(Date.now());
      } catch (error) {
        console.error("Failed to update widgets:", error);
      }
    };

    updateWidgets();
  }, [organizations, fetcher, lastUpdate]);

  return <>{children}</>;
}

