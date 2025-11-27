import { useEffect, useState, memo } from 'react';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useIsTeen } from '../utils/age';

const PROMO_BANNER_CLICKED_KEY = '@promoBannerClicked';

const PromoBanner = memo(() => {
  const isTeen = useIsTeen();
  const [isVisible, setIsVisible] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    const checkVisibility = async () => {
      const December = new Date().getMonth() === 12;
      const hasBeenClicked = await AsyncStorage.getItem(
        PROMO_BANNER_CLICKED_KEY,
      );

      if (isTeen && December && !hasBeenClicked) {
        setIsVisible(true);
      }
    };

    checkVisibility();
  }, [isTeen]);

  const handlePress = async () => {
    try {
      await AsyncStorage.setItem(PROMO_BANNER_CLICKED_KEY, 'true');
      setIsVisible(false);
    } catch (e) {
      console.error('Error saving promo banner click', e);
    }
    Linking.openURL('https://hackclub.com/stickers/');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.primary },
      ]}
    >
      <Text style={[styles.title, { color: colors.primary }]}>
        Claim your free HCB stickers!
      </Text>
      <Text style={[styles.subtitle, { color: colors.text }]}>
        Are you a teenager? Fill out the form to get free stickers!
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
});

export default PromoBanner;
