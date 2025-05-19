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
import { downloadCSV } from '@/utils/downloadCSV';
import { supabase } from '@/utils/supabase';
import moment from 'moment';

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
  
      const grouped: Record<string, { label: string; paper: number; can: number; pet: number }> = {};
  
      for (let hour = 7; hour <= 21; hour++) {
        const hourStr = moment().hour(hour).minute(0).format('h A');
        grouped[hourStr] = { label: hourStr, paper: 0, can: 0, pet: 0 };
      }
  
      data.forEach(entry => {
        const hour = moment(entry.created_at).format('h A');
        const type = entry.object_type as 'paper' | 'can' | 'pet bottle';
  
        if (!grouped[hour]) {
          grouped[hour] = { label: hour, paper: 0, can: 0, pet: 0 };
        }
  
        if (type === 'paper') grouped[hour].paper++;
        if (type === 'can') grouped[hour].can++;
        if (type === 'pet bottle') grouped[hour].pet++;
      });
  
      const csvData = Object.values(grouped);
      const formattedDate = selectedDate.format('MMMM-D-YYYY'); // Format: Month-Day-Year
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
        <Text style={styles.title}>Hourly Collection Summary (7am - 9pm)</Text>

        <View style={styles.dateNav}>
          <TouchableOpacity onPress={() => handleDateNavigation('prev')}>
            <Text style={styles.navText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.dateText}>{selectedDate.format('MMMM D, YYYY')}</Text>
          <TouchableOpacity onPress={() => handleDateNavigation('next')}>
            <Text style={styles.navText}>{'>'}</Text>
          </TouchableOpacity>
        </View>

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
                width={chartWidth}
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
                  propsForLabels: {
                    fontSize: 10,
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
          )}
        </View>

        <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadCSV}>
          <Text style={styles.downloadText}>Download Hourly Data as CSV</Text>
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
    paddingHorizontal: 10,
  },
  dateNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  navText: {
    fontSize: 24,
    color: '#000',
    fontWeight: '600',
    paddingHorizontal: 20,
  },
  dateText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
    paddingHorizontal: 10,
  },
  chartWrapper: {
    height: 340,
    justifyContent: 'center',
  },
  scrollViewContent: {
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chart: {
    borderRadius: 8,
    marginHorizontal: 10,
  },
  downloadButton: {
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: '#000',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  downloadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 10,
  },
});

export default TimeSummary;
