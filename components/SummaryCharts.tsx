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
import { MaterialIcons } from '@expo/vector-icons';

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
  
      // First create all possible groups for the range
      const allGroups: Record<string, { label: string; paper: number; can: number; 'pet bottle': number }> = {};
      
      if (range === 'daily') {
        // For daily, create entries for each day in the week
        const currentDate = start.clone();
        while (currentDate.isSameOrBefore(end)) {
          const dateStr = currentDate.format('YYYY-MM-DD');
          allGroups[dateStr] = { label: dateStr, paper: 0, can: 0, 'pet bottle': 0 };
          currentDate.add(1, 'day');
        }
      } else if (range === 'weekly') {
        // For weekly, create entries for each week in the month
        const currentWeekStart = start.clone().startOf('isoWeek');
        const monthEnd = end.clone();
        while (currentWeekStart.isSameOrBefore(monthEnd, 'month')) {
          const weekStart = currentWeekStart.format('YYYY-MM-DD');
          const weekEnd = currentWeekStart.clone().endOf('isoWeek').format('YYYY-MM-DD');
          const weekLabel = `${weekStart} to ${weekEnd}`;
          allGroups[weekLabel] = { label: weekLabel, paper: 0, can: 0, 'pet bottle': 0 };
          currentWeekStart.add(1, 'week');
        }
      } else if (range === 'monthly') {
        // For monthly, create entries for each month in the year
        const currentMonth = start.clone();
        while (currentMonth.isSameOrBefore(end, 'year')) {
          const monthLabel = currentMonth.format('YYYY-MM');
          allGroups[monthLabel] = { label: monthLabel, paper: 0, can: 0, 'pet bottle': 0 };
          currentMonth.add(1, 'month');
        }
      } else {
        // For yearly, create entries for each year from start to end
        const currentYear = start.clone();
        while (currentYear.isSameOrBefore(end, 'year')) {
          const yearLabel = currentYear.format('YYYY');
          allGroups[yearLabel] = { label: yearLabel, paper: 0, can: 0, 'pet bottle': 0 };
          currentYear.add(1, 'year');
        }
      }
  
      // Now populate the data we have
      data.forEach(entry => {
        if (!groupFn) throw new Error(`Invalid activeTab: ${activeTab}`);
        const group = groupFn(entry);
        const type = entry.object_type as 'paper' | 'can' | 'pet bottle';
  
        if (allGroups[group]) {
          allGroups[group][type]++;
        }
      });
  
      const csvData = Object.values(allGroups);
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
            <TouchableOpacity 
              onPress={() => handleWeekNavigation('prev')}
              style={styles.navButton}
            >
              <MaterialIcons name="chevron-left" size={28} color="black" />
            </TouchableOpacity>
            <Text style={styles.currentWeekText}>{getWeekRange(currentWeek)}</Text>
            <TouchableOpacity 
              onPress={() => handleWeekNavigation('next')}
              style={styles.navButton}
            >
              <MaterialIcons name="chevron-right" size={28} color="black" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.chartWrapper}>
          {loading || !chartData ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#black" />
              <Text style={styles.loadingText}>Loading data...</Text>
            </View>
          ) : (
            <>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.scrollViewContent}
              >
                <LineChart
                  data={chartData}
                  width={calculateChartWidth()}
                  height={440}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: '5',
                      strokeWidth: '2',
                      stroke: '#ffffff',
                    },
                    propsForLabels: {
                      fontSize: 11,
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
              <View style={styles.legendContainer}>
                {['Paper', 'Can', 'PET Bottles'].map((item, index) => (
                  <View key={item} style={styles.legendItem}>
                    <View 
                      style={[
                        styles.legendColor, 
                        { 
                          backgroundColor: chartData.datasets[index].color(1),
                          borderColor: '#fff',
                        }
                      ]} 
                    />
                    <Text style={[styles.legendText, { color: 'black' }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.downloadButton, { backgroundColor: 'black' }]} 
          onPress={handleDownloadCSV}
          disabled={loading}
        >
          <MaterialIcons name="file-download" size={20} color="#4facfe" />
          <Text style={[styles.downloadText, { color: 'white' }]}>Download as CSV</Text>
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
    padding: 16,
    marginTop: 20,
    borderRadius: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: 'black',
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingBottom: 6,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderColor: 'black',
  },
  tabText: {
    fontSize: 14,
    color: 'rgba(83, 77, 77, 0.7)',
  },
  activeTabText: {
    fontSize: 13,
    color: 'black',
    fontWeight: 'bold',
  },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(14, 11, 11, 0.2)',
  },
  currentWeekText: {
    fontSize: 16,
    color: 'black',
    fontWeight: '600',
  },
  chartWrapper: {
    height: 420,
    justifyContent: 'center',
    marginBottom: 16,
  },
  scrollViewContent: {
    paddingRight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: 'black',
  },
  chart: {
    borderRadius: 12,
    paddingRight: 30,
    marginTop: 5,
  },
  downloadButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  downloadText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 4,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 6,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 11,
    color: 'black',
  },
});

export default SummaryCharts;