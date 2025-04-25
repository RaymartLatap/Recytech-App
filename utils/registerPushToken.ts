// utils/registerPushToken.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';

export const registerForPushNotificationsAsync = async () => {
  let token: string | undefined = undefined;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }

    const { data: expoToken } = await Notifications.getExpoPushTokenAsync();
    token = expoToken;

    if (token) {
      // Check if token already exists
      const { data: existing, error } = await supabase
        .from('expo_tokens')
        .select('id')
        .eq('expo_token', token)
        .maybeSingle();

      if (!existing && !error) {
        // Insert only if it's new
        await supabase.from('expo_tokens').insert({ expo_token: token });
      }
    }
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
};
