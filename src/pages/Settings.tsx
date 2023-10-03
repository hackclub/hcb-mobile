import { useContext, useEffect, useState } from "react";
import {
  ScrollView,
  Image,
  Text,
  View,
  TouchableHighlight,
} from "react-native";
import AppIcon from "react-native-dynamic-app-icon";

import Button from "../components/Button";
import AuthContext from "../auth";
import IconPreloader, { IconNames } from "../lib/iconPreloader";
import { palette } from "../theme";

type IconSwitcherProps = {
  iconName: IconNames;
  activeIcon: IconNames;
  iconIndex: string;
  setActiveIcon: Function;
  customName?: string;
};

function IconSwitcherButton({
  iconName,
  activeIcon,
  iconIndex,
  customName,
  setActiveIcon,
}: IconSwitcherProps) {
  const handlePress = () => {
    AppIcon.setAppIcon(iconIndex);
    setActiveIcon(iconIndex);
  };

  const isActiveIcon = () => {
    return activeIcon === iconIndex;
  };

  const preloadedImage = IconPreloader[iconName];

  return (
    <>
      <TouchableHighlight
        underlayColor={palette.smoke}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <View>
          <Image source={preloadedImage} style={{ width: 48, height: 48 }} />
          <Text>
            {customName || iconName}
            {isActiveIcon() && (
              <Text style={{ color: palette.muted }}>(Active)</Text>
            )}
          </Text>
        </View>
      </TouchableHighlight>
    </>
  );
}

const IconSwitcher = () => {
  const [activeIcon, setActiveIcon] = useState<IconNames>("default");

  useEffect(() => {
    AppIcon.getIconName((icon: any) => {
      setActiveIcon(icon.iconName);
    });
  }, []);

  return (
    <>
      <IconSwitcherButton
        setActiveIcon={setActiveIcon}
        customName="HCB Primary"
        iconName="default"
        iconIndex="0"
        activeIcon={activeIcon}
      />
      <IconSwitcherButton
        setActiveIcon={setActiveIcon}
        customName="Dark Mode"
        iconName="dark-mode"
        iconIndex="1"
        activeIcon={activeIcon}
      />
      <IconSwitcherButton
        setActiveIcon={setActiveIcon}
        customName="Neon Green"
        iconName="dark-green"
        iconIndex="2"
        activeIcon={activeIcon}
      />
      <IconSwitcherButton
        setActiveIcon={setActiveIcon}
        customName="Grape flavor?"
        iconName="dark-purple"
        iconIndex="3"
        activeIcon={activeIcon}
      />
      <IconSwitcherButton
        setActiveIcon={setActiveIcon}
        customName="Outernet"
        iconName="logo-outernet"
        iconIndex="4"
        activeIcon={activeIcon}
      />
      <IconSwitcherButton
        setActiveIcon={setActiveIcon}
        customName="Sinerider"
        iconName="logo-sinerider"
        iconIndex="5"
        activeIcon={activeIcon}
      />
      <IconSwitcherButton
        setActiveIcon={setActiveIcon}
        customName="Slash-Z"
        iconName="logo-slash-z"
        iconIndex="6"
        activeIcon={activeIcon}
      />
      <IconSwitcherButton
        setActiveIcon={setActiveIcon}
        customName="Sprig Village"
        iconName="logo-sprig-village"
        iconIndex="7"
        activeIcon={activeIcon}
      />
      <IconSwitcherButton
        setActiveIcon={setActiveIcon}
        customName="Flagship"
        iconName="logo-flagship"
        iconIndex="8"
        activeIcon={activeIcon}
      />
      <IconSwitcherButton
        setActiveIcon={setActiveIcon}
        customName="Hack Night"
        iconName="logo-hack-night-2"
        iconIndex="9"
        activeIcon={activeIcon}
      />
      <IconSwitcherButton
        setActiveIcon={setActiveIcon}
        customName="Hack Night Alt"
        iconName="logo-hack-night"
        iconIndex="10"
        activeIcon={activeIcon}
      />
      <IconSwitcherButton
        setActiveIcon={setActiveIcon}
        customName="Error: 418"
        iconName="logo-418"
        iconIndex="11"
        activeIcon={activeIcon}
      />
    </>
  );
};

const LogoutButton = () => {
  const { setToken } = useContext(AuthContext);

  return <Button onPress={() => setToken("")}>Log out</Button>;
};

export default function SettingsPage() {
  return (
    <ScrollView>
      <IconSwitcher />

      <LogoutButton />
    </ScrollView>
  );
}
