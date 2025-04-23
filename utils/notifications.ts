// utils/notification.ts

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
