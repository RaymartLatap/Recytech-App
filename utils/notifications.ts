import { supabase } from './supabase';

export const sendPushNotification = async (
  expoPushToken: string,
  title: string,
  message: string
) => {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title,
        body: message,
        priority: 'high',
      }),
    });

    const data = await response.json();

    if (data?.errors) {
      console.error('Expo push error:', data.errors);
    } else {
      console.log('Push notification sent:', data);
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

export const sendPushNotificationToAllDevices = async (
  title: string,
  message: string
) => {
  try {
    const { data: tokens, error } = await supabase
      .from('expo_tokens')
      .select('expo_token');

    if (error) {
      console.error('Error fetching tokens:', error);
      return;
    }

    if (!tokens || tokens.length === 0) {
      console.log('No expo tokens found.');
      return;
    }

    const messages = tokens.map((t) => ({
      to: t.expo_token,
      sound: 'default',
      title,
      body: message,
      priority: 'high',
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('Push notifications sent to all devices:', result);
  } catch (error) {
    console.error('Error sending push notifications to all devices:', error);
  }
};
