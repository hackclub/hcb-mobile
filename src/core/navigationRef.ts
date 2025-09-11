import { NavigationContainerRef } from "@react-navigation/native";

import { TabParamList } from "../lib/NavigatorParamList";

export const navRef = {
  current: null as NavigationContainerRef<TabParamList> | null,
};
