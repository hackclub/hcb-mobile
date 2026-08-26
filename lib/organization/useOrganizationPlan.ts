import {
  OrganizationExpanded,
  Plan,
  PlanFeature,
} from "@/lib/types/Organization";
import { useOfflineSWR } from "@/lib/useOfflineSWR";

export function organizationPlanKey(id: string | undefined) {
  return id ? `organizations/${id}?expand=plan` : null;
}

export function planHasFeature(
  plan: Plan | undefined,
  feature: PlanFeature,
): boolean {
  if (!plan?.features) return true;
  return plan.features.includes(feature);
}

export function useOrganizationPlan(id: string | undefined) {
  const { data, isLoading, error } = useOfflineSWR<OrganizationExpanded>(
    organizationPlanKey(id),
  );

  const plan = data?.plan;

  return {
    plan,
    isLoading,
    error,
    hasFeature: (feature: PlanFeature) => planHasFeature(plan, feature),
  };
}
