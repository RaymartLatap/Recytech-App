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
import { downloadCSV } from '@/utils/downloadCSVHourly';
import { supabase } from '@/utils/supabase';
import moment from 'moment';
import { MaterialIcons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth * 1.5; // Increased width for scrolling

const TimeSummary: React.FC = () => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<moment.Moment>(moment());

  const fetchTimeData = async () => {
    setLoading(true);
    try {
      const startOfDay = selectedDate.clone().startOf('day').add(7, 'hours');
      const endOfDay = selectedDate.clone().startOf('day').add(21, 'hours');

      const { data, error } = await supabase
        .from('detections_log')
        .select('created_at, object_type')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      if (error) throw error;

      const hourlyData: Record<string, { paper: number; can: number; pet: number }> = {};

      for (let hour = 7; hour <= 21; hour++) {
        const hourStr = moment().hour(hour).minute(0).format('h A');
        hourlyData[hourStr] = { paper: 0, can: 0, pet: 0 };
      }

      data.forEach(entry => {
        const hour = moment(entry.created_at).format('h A');
        const type = entry.object_type as 'paper' | 'can' | 'pet bottle';

        if (!hourlyData[hour]) {
          hourlyData[hour] = { paper: 0, can: 0, pet: 0 };
        }

        if (type === 'paper') hourlyData[hour].paper++;
        if (type === 'can') hourlyData[hour].can++;
        if (type === 'pet bottle') hourlyData[hour].pet++;
      });

      const labels = Object.keys(hourlyData).sort((a, b) => {
        return moment(a, 'h A').valueOf() - moment(b, 'h A').valueOf();
      });
      const paperData = labels.map(hour => hourlyData[hour].paper);
      const canData = labels.map(hour => hourlyData[hour].can);
      const petData = labels.map(hour => hourlyData[hour].pet);

      setChartData({
        labels,
        datasets: [
          {
            data: paperData,
            color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
            strokeWidth: 2,
          },
          {
            data: canData,
            color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
            strokeWidth: 2,
          },
          {
            data: petData,
            color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
            strokeWidth: 2,
          },
        ],
        legend: ['Paper', 'Can', 'PET Bottles'],
      });
    } catch (error) {
      console.error('Error fetching time data:', error);
      Alert.alert('Error', 'Failed to fetch time-based data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const startOfDay = selectedDate.clone().startOf('day').add(7, 'hours');
      const endOfDay = selectedDate.clone().startOf('day').add(21, 'hours');
  
      const { data, error } = await supabase
        .from('detections_log')
        .select('created_at, object_type')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());
  
      if (error) throw error;
  
      if (!data || data.length === 0) {
        Alert.alert('No Data', 'No records found for this time range.');
        return;
      }
  
      // Define the grouping function for hourly data
      const groupFn = (entry: { created_at: moment.MomentInput }) => 
        moment(entry.created_at).format('h A');
  
      const grouped: Record<string, { 
        label: string; 
        paper: number; 
        can: number; 
        'pet bottle': number 
      }> = {};
  
      // Initialize all hours from 7 AM to 9 PM
      for (let hour = 7; hour <= 21; hour++) {
        const hourStr = moment().hour(hour).minute(0).format('h A');
        grouped[hourStr] = { label: hourStr, paper: 0, can: 0, 'pet bottle': 0 };
      }
  
      // Populate with actual data
      data.forEach(entry => {
        const group = groupFn(entry);
        const type = entry.object_type as 'paper' | 'can' | 'pet bottle';
  
        if (!grouped[group]) {
          grouped[group] = { label: group, paper: 0, can: 0, 'pet bottle': 0 };
        }
        grouped[group][type]++;
      });
  
      // Convert to array and sort by time
      const csvData = Object.values(grouped).sort((a, b) => {
        return moment(a.label, 'h A').valueOf() - moment(b.label, 'h A').valueOf();
      });
  
      const formattedDate = selectedDate.format('MMMM-D-YYYY');
      await downloadCSV(csvData, `${formattedDate}_Hourly_Collection`, 'hourly');
    } catch (err) {
      console.error('Download error:', err);
      Alert.alert('Error', 'An unexpected error occurred while downloading.');
    }
  };

  const handleDateNavigation = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? selectedDate.clone().subtract(1, 'day') 
      : selectedDate.clone().add(1, 'day');
    setSelectedDate(newDate);
  };

  useEffect(() => {
    fetchTimeData();
  }, [selectedDate]);

  return (
    <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.gradient}>
      <View style={styles.container}>
        <Text style={styles.title}>Hourly Collection Summary</Text>
        <Text style={styles.subtitle}>7:00 AM - 9:00 PM</Text>

        <View style={styles.dateNav}>
          <TouchableOpacity 
            onPress={() => handleDateNavigation('prev')}
            style={styles.navButton}
          >
            <MaterialIcons name="chevron-left" size={28} color="black" />
          </TouchableOpacity>
          
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{selectedDate.format('MMMM D, YYYY')}</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => handleDateNavigation('next')}
            style={styles.navButton}
          >
            <MaterialIcons name="chevron-right" size={28} color="black" />
          </TouchableOpacity>
        </View>

        <View style={styles.chartWrapper}>
          {loading || !chartData ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
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
                  data={{
                    labels: chartData.labels,
                    datasets: chartData.datasets,
                  }}
                  width={chartWidth}
                  height={390}
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
                  withHorizontalLabels={true}
                  withVerticalLabels={true}
                  segments={4}
                  formatYLabel={(value) => `${Math.round(Number(value))}`}
                  fromZero={true}
                  verticalLabelRotation={-45}
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
          <Text style={[styles.downloadText, { color: 'white' }]}>Download Hourly Data</Text>
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
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: 'black',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    color: 'black',
    marginBottom: 20,
  },
  dateNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(23, 17, 17, 0.2)',
  },
  dateContainer: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'black',
  },
  chartWrapper: {
    height: 380,
    justifyContent: 'center',
    marginBottom: 16,
  },
  scrollViewContent: {
    paddingBottom: 10,
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
    marginTop: 10,
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
  },
});

export default TimeSummary;
