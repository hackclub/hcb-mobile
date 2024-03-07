/* eslint-env commonjs */

const appIcons = {
  Primary: "primary.png",
  Dev: "dev.png",
  "Open Late": "hack_night.png",
};

let appIconConfig = {};

Object.entries(appIcons).forEach(([icon, index]) => {
  appIconConfig[icon] = {
    image: `./assets/icons/${index}`,
  };
});

module.exports = {
  appIconConfig,
  appIcons,
};
