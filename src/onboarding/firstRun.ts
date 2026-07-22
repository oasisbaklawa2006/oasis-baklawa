import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_RUN_COMPLETE_KEY = 'oasis.customer.firstRunComplete.v1';
const BAKLAVA_FAMILIARITY_KEY = 'oasis.customer.baklavaFamiliarity.v1';

export type BaklavaFamiliarity = 'new' | 'familiar';

export async function hasCompletedFirstRun(): Promise<boolean> {
  return (await AsyncStorage.getItem(FIRST_RUN_COMPLETE_KEY)) === 'true';
}

export async function completeFirstRun(familiarity: BaklavaFamiliarity): Promise<void> {
  await AsyncStorage.multiSet([
    [FIRST_RUN_COMPLETE_KEY, 'true'],
    [BAKLAVA_FAMILIARITY_KEY, familiarity],
  ]);
}

export async function getBaklavaFamiliarity(): Promise<BaklavaFamiliarity | null> {
  const value = await AsyncStorage.getItem(BAKLAVA_FAMILIARITY_KEY);
  return value === 'new' || value === 'familiar' ? value : null;
}

export async function resetFirstRun(): Promise<void> {
  await AsyncStorage.multiRemove([FIRST_RUN_COMPLETE_KEY, BAKLAVA_FAMILIARITY_KEY]);
}
