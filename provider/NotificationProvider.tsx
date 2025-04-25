import React, { useEffect, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '@/utils/registerPushToken';
import { sendPushNotification } from '@/utils/notifications';
import { supabase } from '@/utils/supabase';

// Optional: Setup foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

type Props = {
  children: ReactNode;
};

const NotificationProvider = ({ children }: Props) => {
  useEffect(() => {
    let expoPushToken: string | null = null;

    const setup = async () => {
      expoPushToken = (await registerForPushNotificationsAsync()) ?? null;
    };

    const handleSupabaseNotification = () => {
      const channel = supabase
        .channel('notifications_channel')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          async (payload) => {
            const { title, message, expo_token } = payload.new;

            // Use the token from DB, or fallback to local token
            const tokenToUse = expo_token || expoPushToken;

            if (tokenToUse) {
              await sendPushNotification(tokenToUse, title, message);
            } else {
              console.warn('No expo token available to send notification.');
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setup();
    const unsubscribe = handleSupabaseNotification();

    return () => {
      unsubscribe();
    };
  }, []);

  return <>{children}</>;
};

export default NotificationProvider;
