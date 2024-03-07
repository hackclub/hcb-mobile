const appIcons = {
  "Primary": "primary.png",
  "Dev": "dev.png",
  "Open Late": "hack_night.png"
  // "Nostalgic Pebble": "outernet.png",
}


let appIconConfig = {}
Object.entries(appIcons).forEach(([icon, index]) => {
  appIconConfig[icon] = {
    image: `./assets/icons/${index}`,
    // prerendered: true
  }
})
module.exports= {
  appIconConfig,
  appIcons
}