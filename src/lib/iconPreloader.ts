const IconPreloader = {
  "default":     require("../../assets/icon.png"),
  "dark-green":  require("../../assets/icons/logo-alt-1-neon.png"),
  "dark-purple": require("../../assets/icons/logo-alt-2-neon.png"),
} as const

export type IconNames = keyof typeof IconPreloader

export default IconPreloader