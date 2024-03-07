/* eslint-env commonjs */

const appIcons = {
  Default: "default.png",
  "Cash Money": "cash-money.png",
  "Open Late": "hack-night.png",
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
