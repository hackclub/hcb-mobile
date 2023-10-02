
import { ScrollView, Image, Text } from "react-native";
import { useContext, useEffect, useState } from "react";
import Button from "../components/Button";
import AuthContext from "../auth";
import IconPreloader, { IconNames } from "../lib/iconPreloader"
import AppIcon from "react-native-dynamic-app-icon";

type IconSwitcherProps = { iconName: IconNames, activeIcon: IconNames, iconIndex: string, setActiveIcon: Function };

function IconSwitcherButton({iconName, activeIcon, iconIndex, setActiveIcon}: IconSwitcherProps) {
  const handlePress = () => {
    AppIcon.setAppIcon(iconIndex)
    setActiveIcon(iconIndex.toString())
    console.log({iconIndex, activeIcon})
  }

  const isActiveIcon = () => {
    // console.log({activeIcon, iconIndex})
    return activeIcon === iconIndex
  }

  const preloadedImage = IconPreloader[iconName]

  return(
    <>
      <Button onPress={handlePress} loading={isActiveIcon()}>
        <Image
          source={preloadedImage} 
          style={{ width: 96, height: 96 }}
          />
          <Text>
            {iconName}
            {isActiveIcon() && <Text>(Active)</Text>}
          </Text>
      </Button>
    </>
  )
}

const IconSwitcher = () => {
  const [activeIcon, setActiveIcon] = useState<IconNames>('default')

  useEffect(() => {
    AppIcon.getIconName((icon: IconNames) => {
      console.log("Current icon is " + icon)
      setActiveIcon(icon)
    })
  })

  return(
    <>
      <IconSwitcherButton setActiveIcon={setActiveIcon} iconName="default" iconIndex="0" activeIcon={activeIcon} />
      <IconSwitcherButton setActiveIcon={setActiveIcon} iconName="dark-red" iconIndex="1" activeIcon={activeIcon} />
      <IconSwitcherButton setActiveIcon={setActiveIcon} iconName="dark-green" iconIndex="2" activeIcon={activeIcon} />
      <IconSwitcherButton setActiveIcon={setActiveIcon} iconName="dark-purple" iconIndex="3" activeIcon={activeIcon} />
    </>
  )
}

const LogoutButton = () => {
  const { setToken } = useContext(AuthContext);

  return(
    <Button onPress={() => setToken("")}>
      Log out
    </Button>
  )
}

export default function SettingsPage() {
  return (
    <ScrollView>
      <IconSwitcher />

      <LogoutButton />
    </ScrollView>
  )
}