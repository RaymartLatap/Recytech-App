import { Stack } from 'expo-router';
import React, { Component, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import moment from 'moment';
import { supabase } from '@/utils/supabase';

const PetBottleBarChart = () => {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [activeTab, setActiveTab] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [dailyData, setDailyData] = useState<{ value: number; label: string }[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ value: number; label: string }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ value: number; label: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const getWeekRange = (weekOffset: number) => {
    const start = moment().startOf('isoWeek').add(weekOffset, 'weeks');
    const end = start.clone().endOf('isoWeek');
    return `${start.format('MMM D')} - ${end.format('D')}`;
  };

  const fetchDailyData = async (weekOffset: number) => {
    setLoading(true);
    try {
      const start = moment().startOf('isoWeek').add(weekOffset, 'weeks');
      const end = start.clone().endOf('isoWeek');

      const { data, error } = await supabase
        .from('detections_log')
        .select('created_at')
        .eq('object_type', 'pet bottle')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const counts = Array(7).fill(0);
      data.forEach(entry => {
        const day = moment(entry.created_at).isoWeekday() - 1;
        if (day >= 0 && day < 7) counts[day]++;
      });

      const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      setDailyData(labels.map((label, i) => ({ label, value: counts[i] })));
    } catch (err) {
      console.error('Fetch daily error:', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyData = async () => {
    setLoading(true);
    try {
      const start = moment().startOf('month');
      const end = moment().endOf('month');

      const { data, error } = await supabase
        .from('detections_log')
        .select('created_at')
        .eq('object_type', 'pet bottle')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const weeks = [0, 0, 0, 0];
      data.forEach(entry => {
        const day = moment(entry.created_at).date();
        if (day <= 7) weeks[0]++;
        else if (day <= 14) weeks[1]++;
        else if (day <= 21) weeks[2]++;
        else weeks[3]++;
      });

      setWeeklyData(weeks.map((value, i) => ({ label: `Week ${i + 1}`, value })));
    } catch (err) {
      console.error('Fetch weekly error:', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyData = async () => {
    setLoading(true);
    try {
      const start = moment().startOf('year');
      const end = moment().endOf('year');

      const { data, error } = await supabase
        .from('detections_log')
        .select('created_at')
        .eq('object_type', 'pet bottle')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const months = Array(12).fill(0);
      data.forEach(entry => {
        const month = moment(entry.created_at).month();
        months[month]++;
      });

      setMonthlyData(months.map((value, i) => ({
        label: moment().month(i).format('MMM'),
        value,
      })));
    } catch (err) {
      console.error('Fetch monthly error:', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Daily') fetchDailyData(currentWeek);
    if (activeTab === 'Weekly') fetchWeeklyData();
    if (activeTab === 'Monthly') fetchMonthlyData();
  }, [activeTab, currentWeek]);

  const chartStyles = {
    Daily: { barWidth: 30, spacing: 18, frontColor: '#4CAF50' },
    Weekly: { barWidth: 40, spacing: 25, frontColor: '#2196F3' },
    Monthly: { barWidth: 50, spacing: 30, frontColor: '#FF9800' },
  };

  const chartData =
    activeTab === 'Daily' ? dailyData :
    activeTab === 'Weekly' ? weeklyData :
    monthlyData;

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {['Daily', 'Weekly', 'Monthly'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab as typeof activeTab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.title}>Pet Bottle Collection ({activeTab})</Text>

      {activeTab === 'Daily' && (
        <View style={styles.weekSelector}>
          <TouchableOpacity onPress={() => setCurrentWeek(currentWeek - 1)}>
            <Text style={styles.arrow}>{'\u25C0'}</Text>
          </TouchableOpacity>
          <Text style={styles.weekRange}>{getWeekRange(currentWeek)}</Text>
          <TouchableOpacity onPress={() => setCurrentWeek(currentWeek < 0 ? currentWeek + 1 : currentWeek)}>
            <Text style={styles.arrow}>{'\u25B6'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />
      ) : (
        <BarChart
          data={chartData}
          {...chartStyles[activeTab]}
          yAxisTextStyle={{ color: 'gray' }}
          yAxisLabelWidth={30}
          yAxisColor="#ccc"
          yAxisThickness={1}
          xAxisThickness={1}
          hideRules={false}
          noOfSections={4}
          maxValue={Math.max(...chartData.map(item => item.value), 10)}
          isAnimated
          animationDuration={800}
        />
      )}
    </View>
  );
};

export class PetBottleScreen extends Component {
  render() {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ title: 'Pet Bottle Collection' }} />
        <PetBottleBarChart />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  arrow: {
    fontSize: 18,
    color: '#4CAF50',
    marginHorizontal: 10,
  },
  weekRange: {
    fontSize: 14,
    color: 'gray',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd',
    paddingBottom: 10,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderColor: '#4CAF50',
  },
  tabText: {
    fontSize: 16,
    color: 'gray',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});

export default PetBottleScreen;
