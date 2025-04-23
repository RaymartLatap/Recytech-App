import { useEffect, useState } from 'react';
import { StyleSheet, SectionList, RefreshControl } from 'react-native';
import { View, Text } from '@/components/Themed';
import { supabase } from '@/utils/supabase';
import { format, isToday, isYesterday } from 'date-fns';

export type Notification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
};

export type Section = {
  title: string;
  data: Notification[];
};

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();

    const subscription = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchNotifications = async () => {
    setRefreshing(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setNotifications(data);
    setRefreshing(false);
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const groupNotifications = (): Section[] => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const earlier: Notification[] = [];

    notifications.forEach((n) => {
      const date = new Date(n.created_at);
      if (isToday(date)) {
        today.push(n);
      } else if (isYesterday(date)) {
        yesterday.push(n);
      } else {
        earlier.push(n);
      }
    });

    const sections: Section[] = [];
    if (today.length) sections.push({ title: 'Today', data: today });
    if (yesterday.length) sections.push({ title: 'Yesterday', data: yesterday });
    if (earlier.length) sections.push({ title: 'Earlier', data: earlier });

    return sections;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      <SectionList
        sections={groupNotifications()}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchNotifications} />}
        renderItem={({ item }) => (
          <View style={[styles.card, item.read ? styles.readCard : styles.unreadCard]}>
            <Text style={[styles.cardTitle, item.read && styles.readText]}>{item.title}</Text>
            <Text style={item.read && styles.readText}>{item.message}</Text>
            <Text style={[styles.timestamp, item.read && styles.readText]}>
              {format(new Date(item.created_at), 'PPPp')}
            </Text>
            <View style={styles.actions}>
              {!item.read && (
                <Text style={styles.readAction} onPress={() => markAsRead(item.id)}>
                  ✅ Mark as Read
                </Text>
              )}
            </View>
          </View>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 6,
  },
  card: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  unreadCard: { backgroundColor: '#d0e8ff' },
  readCard: { backgroundColor: '#e0e0e0' },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  timestamp: { marginTop: 6, fontSize: 12, color: '#666' },
  readText: { color: '#888' },
  actions: {
    backgroundColor: '#d0e8ff',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 12,
    borderRadius: 10,
    padding: 4,
  },
  readAction: {
    backgroundColor: '#add8e6', // Light blue
    color: '#000',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    fontWeight: '600',
    fontSize: 12,
  },
});
