const IconPreloader = {
  default: require("../../assets/icons/logo-ios.png"),
  "dark-mode": require("../../assets/icons/logo-dark-mode.png"),
  "dark-green": require("../../assets/icons/logo-alt-1-neon.png"),
  "dark-purple": require("../../assets/icons/logo-alt-2-neon.png"),
  "logo-outernet": require("../../assets/icons/logo-outernet.png"),
  "logo-sinerider": require("../../assets/icons/logo-sinerider.png"),
  "logo-slash-z": require("../../assets/icons/logo-slash-z.png"),
  "logo-sprig-village": require("../../assets/icons/logo-sprig-village.png"),
  "logo-flagship": require("../../assets/icons/logo-flagship.png"),
  "logo-hack-night-2": require("../../assets/icons/logo-hack-night-2.png"),
  "logo-hack-night": require("../../assets/icons/logo-hack-night.png"),
  "logo-418": require("../../assets/icons/logo-418.png"),
} as const;

export type IconNames = keyof typeof IconPreloader;

export default IconPreloader;
