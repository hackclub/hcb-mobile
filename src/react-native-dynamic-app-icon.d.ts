declare module "react-native-dynamic-app-icon" {
  declare const AppIcon: {
    setAppIcon: (name: string) => string;
    getIconName: (callback: (result: { iconName: string }) => void) => void;
  };

  export default AppIcon;
}
