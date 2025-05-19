import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchGroupedCounts } from '@/utils/fetchGroupedCounts';
import { downloadCSV } from '@/utils/downloadCSV';
import { supabase } from '@/utils/supabase';
import moment from 'moment';

const screenWidth = Dimensions.get('window').width;

const rangeLabels = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const SummaryCharts: React.FC = () => {
  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<moment.Moment>(moment());

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [paper, can, pet] = await Promise.all([
        fetchGroupedCounts('paper', range, currentWeek.isoWeek()),
        fetchGroupedCounts('can', range, currentWeek.isoWeek()),
        fetchGroupedCounts('pet bottle', range, currentWeek.isoWeek()),
      ]);

      const labels = paper.map((entry) => entry.date);

      setChartData({
        labels,
        datasets: [
          {
            data: paper.map((entry) => entry.count),
            color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
            strokeWidth: 2,
          },
          {
            data: can.map((entry) => entry.count),
            color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
            strokeWidth: 2,
          },
          {
            data: pet.map((entry) => entry.count),
            color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
            strokeWidth: 2,
          },
        ],
        legend: ['Paper', 'Can', 'PET Bottles'],
      });
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const now = moment();
      let start, end;
  
      if (range === 'daily') {
        const selectedWeekStart = currentWeek.clone().startOf('isoWeek');
        const selectedWeekEnd = currentWeek.clone().endOf('isoWeek');
        start = selectedWeekStart;
        end = selectedWeekEnd;
      } else if (range === 'weekly') {
        start = now.clone().startOf('month');
        end = now.clone().endOf('month');
      } else if (range === 'monthly') {
        start = now.clone().startOf('year');
        end = now.clone().endOf('year');
      } else {
        start = moment('2025-01-01').startOf('year');
        end = now.clone().endOf('year');
      }
  
      const { data, error } = await supabase
        .from('detections_log')
        .select('created_at, object_type')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
  
      if (error) {
        console.error('CSV fetch error:', error.message);
        Alert.alert('Error', 'Failed to fetch data for CSV');
        return;
      }
  
      if (!data || data.length === 0) {
        Alert.alert('No Data', 'No records found for this range.');
        return;
      }
  
      const activeTab = rangeLabels[range];
  
      const groupFn = {
        Daily: (d: { created_at: moment.MomentInput }) =>
          moment(d.created_at).format('YYYY-MM-DD'),
  
        Weekly: (d: { created_at: moment.MomentInput }) => {
          const date = moment(d.created_at);
          const weekStart = date.clone().startOf('isoWeek').format('YYYY-MM-DD');
          const weekEnd = date.clone().endOf('isoWeek').format('YYYY-MM-DD');
          return `${weekStart} to ${weekEnd}`;
        },
  
        Monthly: (d: { created_at: moment.MomentInput }) =>
          moment(d.created_at).format('YYYY-MM'),
  
        Yearly: (d: { created_at: moment.MomentInput }) =>
          moment(d.created_at).format('YYYY'),
      }[activeTab];
  
      const grouped: Record<string, { label: string; paper: number; can: number; 'pet bottle': number }> = {};
  
      data.forEach(entry => {
        if (!groupFn) throw new Error(`Invalid activeTab: ${activeTab}`);
        const group = groupFn(entry);
        const type = entry.object_type as 'paper' | 'can' | 'pet bottle';
  
        if (!grouped[group]) {
          grouped[group] = { label: group, paper: 0, can: 0, 'pet bottle': 0 };
        }
        grouped[group][type]++;
      });
  
      const csvData = Object.values(grouped);
      await downloadCSV(csvData, 'combined_bins', range);
    } catch (err) {
      console.error('Download error:', err);
      Alert.alert('Error', 'An unexpected error occurred while downloading.');
    }
  };
  

  const handleWeekNavigation = (direction: 'prev' | 'next') => {
    const newWeek = direction === 'prev' ? currentWeek.clone().subtract(1, 'week') : currentWeek.clone().add(1, 'week');
    setCurrentWeek(newWeek);
  };

  const getWeekRange = (date: moment.Moment) => {
    const startOfWeek = date.clone().startOf('isoWeek');
    const endOfWeek = date.clone().endOf('isoWeek');
    const startFormatted = startOfWeek.format('MMMM D');
    const endFormatted = endOfWeek.format('MMMM D');
    return `${startFormatted} - ${endFormatted}`;
  };

  useEffect(() => {
    fetchAllData();
  }, [range, currentWeek]);

  // Calculate chart width based on number of data points
  const calculateChartWidth = () => {
    if (!chartData) return screenWidth - 70;
    const minWidth = screenWidth - 70;
    const pointWidth = 60; // Width per data point
    const calculatedWidth = chartData.labels.length * pointWidth;
    return Math.max(calculatedWidth, minWidth);
  };

  return (
    <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.gradient}>
      <View style={styles.container}>
        <Text style={styles.title}>Trash Collection Summary</Text>

        <View style={styles.tabBar}>
          {Object.keys(rangeLabels).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.tab, range === r && styles.activeTab]}
              onPress={() => setRange(r as any)}
            >
              <Text style={[styles.tabText, range === r && styles.activeTabText]}>
                {rangeLabels[r as keyof typeof rangeLabels]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {range === 'daily' && (
          <View style={styles.weekNav}>
            <TouchableOpacity onPress={() => handleWeekNavigation('prev')}>
              <Text style={styles.weekNavText}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.currentWeekText}>{getWeekRange(currentWeek)}</Text>
            <TouchableOpacity onPress={() => handleWeekNavigation('next')}>
              <Text style={styles.weekNavText}>{'>'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.chartWrapper}>
          {loading || !chartData ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000" />
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true}
              contentContainerStyle={styles.scrollViewContent}
            >
              <LineChart
                data={chartData}
                width={calculateChartWidth()}
                height={320}
                chartConfig={{
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  propsForDots: {
                    r: '5',
                    strokeWidth: '2',
                    stroke: '#000',
                  },
                }}
                bezier
                style={styles.chart}
                fromZero
                withHorizontalLabels={true}
                segments={chartData.labels.length > 10 ? 4 : 5}
                xLabelsOffset={-10}
                yLabelsOffset={10}
              />
            </ScrollView>
          )}
        </View>

        <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadCSV}>
          <Text style={styles.downloadText}>Download All as CSV</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginHorizontal: 16,
    marginTop: 20,
    marginLeft: 0,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  gradient: {
    flex: 1,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#ddd',
    paddingBottom: 6,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderColor: '#000',
  },
  tabText: {
    fontSize: 13,
    color: 'gray',
  },
  activeTabText: {
    fontSize: 16,
    color: '#000',
    fontWeight: 'bold',
  },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  weekNavText: {
    fontSize: 24,
    color: '#000',
    fontWeight: '600',
  },
  currentWeekText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  chartWrapper: {
    height: 340,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollViewContent: {
    paddingRight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chart: {
    borderRadius: 8,
    alignSelf: 'center',
  },
  downloadButton: {
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: '#000',
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SummaryCharts;