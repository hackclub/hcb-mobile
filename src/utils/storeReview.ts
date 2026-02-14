import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";

const REVIEW_PROMPT_KEY = "review_prompt_data";
const MIN_DAYS_BEFORE_PROMPT = 7; // Wait at least 7 days before first prompt
const MIN_APP_OPENS_BEFORE_PROMPT = 5; // Wait at least 5 app opens
const MIN_DAYS_BETWEEN_PROMPTS = 90; // Don't prompt more than once every 90 days

interface ReviewPromptData {
  firstOpenDate: string;
  appOpens: number;
  lastPromptDate: string | null;
  hasRated: boolean;
}

async function getReviewData(): Promise<ReviewPromptData> {
  try {
    const data = await AsyncStorage.getItem(REVIEW_PROMPT_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading review data", error);
  }

  const initialData: ReviewPromptData = {
    firstOpenDate: new Date().toISOString(),
    appOpens: 0,
    lastPromptDate: null,
    hasRated: false,
  };

  await saveReviewData(initialData);
  return initialData;
}

async function saveReviewData(data: ReviewPromptData): Promise<void> {
  try {
    await AsyncStorage.setItem(REVIEW_PROMPT_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving review data", error);
  }
}

export async function trackAppOpen(): Promise<void> {
  const data = await getReviewData();
  data.appOpens += 1;
  await saveReviewData(data);
}

async function shouldPromptForReview(): Promise<boolean> {
  const data = await getReviewData();

  if (data.hasRated) {
    return false;
  }

  const now = new Date();
  const firstOpen = new Date(data.firstOpenDate);
  const daysSinceFirstOpen = Math.floor(
    (now.getTime() - firstOpen.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSinceFirstOpen < MIN_DAYS_BEFORE_PROMPT) {
    return false;
  }

  if (data.appOpens < MIN_APP_OPENS_BEFORE_PROMPT) {
    return false;
  }

  if (data.lastPromptDate) {
    const lastPrompt = new Date(data.lastPromptDate);
    const daysSinceLastPrompt = Math.floor(
      (now.getTime() - lastPrompt.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceLastPrompt < MIN_DAYS_BETWEEN_PROMPTS) {
      return false;
    }
  }

  return true;
}

export async function maybeRequestReview(): Promise<void> {
  try {
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) {
      return;
    }

    const shouldPrompt = await shouldPromptForReview();
    if (!shouldPrompt) {
      return;
    }

    const data = await getReviewData();
    data.lastPromptDate = new Date().toISOString();
    await saveReviewData(data);

    await StoreReview.requestReview();
  } catch (error) {
    console.error("Error in maybeRequestReview", error);
  }
}

export async function markAsRated(): Promise<void> {
  const data = await getReviewData();
  data.hasRated = true;
  await saveReviewData(data);
}

export async function resetReviewTracking(): Promise<void> {
  await AsyncStorage.removeItem(REVIEW_PROMPT_KEY);
}
