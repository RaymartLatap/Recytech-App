import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text, Image, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import SummaryCharts from '@/components/SummaryCharts';
import { Ionicons } from '@expo/vector-icons'; // Add this import

type BinCardProps = {
  objectType: string;
  count: number;
  imageUrl: string;
  onPress: () => void;
};

const BinCard = ({ objectType, count, imageUrl, onPress }: BinCardProps) => (
  <Pressable onPress={onPress} style={styles.binCard}>
    <Image source={{ uri: imageUrl }} style={styles.image} />
    <View style={styles.cardContent}>
      <Text style={styles.title}>{objectType}</Text>
    </View>
    <View style={styles.circle}>
      <Text style={styles.circleText}>{count}</Text>
    </View>
    <Ionicons name="chevron-forward" size={24} color="#333" style={styles.arrow} />
  </Pressable>
);

export default function RecyclingBinsScreen() {
  const router = useRouter();
  const [counts, setCounts] = useState({
    paper: 0,
    petBottle: 0,
    cans: 0,
  });

  const fetchCounts = async () => {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  
    const { data, error } = await supabase.from('detections').select('*');
    if (error) {
      console.error('Error fetching detections:', error);
      return;
    }
  
    const updatedCounts = await Promise.all(
      data.map(async (item) => {
        const lastUpdated = item.last_updated?.slice(0, 10);
  
        if (lastUpdated !== today) {
          // Log yesterday's count
          await supabase.from('detections_log').insert({
            object_type: item.object_type,
            count: item.count,
            created_at: new Date(), // Optional: use server time
          });
  
          // Reset count
          await supabase
            .from('detections')
            .update({ count: 0, last_updated: today })
            .eq('id', item.id);
        }
  
        return {
          id: item.id,
          object_type: item.object_type,
          count: item.count,
        };
      })
    );
  
    const pet = updatedCounts.find((c) => c?.object_type === 'pet bottle');
    const paper = updatedCounts.find((c) => c?.object_type === 'paper');
    const can = updatedCounts.find((c) => c?.object_type === 'can');
  
    setCounts({
      petBottle: pet?.count || 0,
      paper: paper?.count || 0,
      cans: can?.count || 0,
    });
  };

  useEffect(() => {
    fetchCounts();

    const channel = supabase
      .channel('realtime:detections')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'detections',
        },
        (payload) => {
          const { id, count } = payload.new;
          setCounts((prev) => {
            if (id === 1) return { ...prev, petBottle: count };
            if (id === 2) return { ...prev, paper: count };
            if (id === 3) return { ...prev, cans: count };
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.trashBinCard}>
        <Text style={styles.header}>Trashbins</Text>
        <BinCard
          objectType="Paper"
          count={counts.paper}
          imageUrl="https://mujhbmfszwchxwhmdhjl.supabase.co/storage/v1/object/public/bin-logo//paper.png"
          onPress={() => router.push("/(tabs)/dashboard/paperbin")}
        />
        <BinCard
          objectType="Pet Bottle"
          count={counts.petBottle}
          imageUrl="https://mujhbmfszwchxwhmdhjl.supabase.co/storage/v1/object/public/bin-logo//pet-bottle.png"
          onPress={() => router.push("/(tabs)/dashboard/petbottlebin")}
        />
        <BinCard
          objectType="Cans"
          count={counts.cans}
          imageUrl="https://mujhbmfszwchxwhmdhjl.supabase.co/storage/v1/object/public/bin-logo/can.png"
          onPress={() => router.push("/(tabs)/dashboard/canbin")}
        />
      </LinearGradient>
      <SummaryCharts />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  trashBinCard: {
    padding: 16,
    borderRadius: 12,
    elevation: 3,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#fff',
  },
  binCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#ffffff90',
    padding: 12,
    borderRadius: 8,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
  },
  title: {
    fontSize: 20,
    margin: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  arrow: {
    marginLeft: 'auto',
    color: '#333',
  },
});
