import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';

export async function registerForPushNotificationsAsync() {
  let token;

  // Only run on physical devices
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Ask for permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo push token:', token);

    // Save token to Supabase (prevent duplicates)
    const { data, error } = await supabase
      .from('expo_tokens')
      .select('expo_token')
      .eq('expo_token', token)
      .single();

    if (!data && !error) {
      await supabase.from('expo_tokens').insert({ expo_token: token });
      console.log('Token saved to Supabase');
    } else {
      console.log('Token already exists or failed to insert');
    }
  } else {
    console.warn('Must use physical device for Push Notifications');
  }

  return token;
}
