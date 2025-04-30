import { Stack } from 'expo-router';
import React, { Component, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import moment from 'moment';
import { supabase } from '@/utils/supabase';

const PaperBinBarChart = () => {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [activeTab, setActiveTab] = useState('Daily');
  const [chartData, setChartData] = useState<{ value: number; label: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      let start, end;
      const now = moment();

      if (activeTab === 'Daily') {
        start = now.clone().startOf('isoWeek').add(currentWeek, 'weeks');
        end = now.clone().endOf('isoWeek').add(currentWeek, 'weeks');
      } else if (activeTab === 'Weekly') {
        start = now.clone().startOf('month');
        end = now.clone().endOf('month');
      } else if (activeTab === 'Monthly') {
        start = now.clone().startOf('year');
        end = now.clone().endOf('year');
      } else {
        start = now.clone().subtract(3, 'years').startOf('year');
        end = now.clone().endOf('year');
      }

      const { data, error } = await supabase
        .from('detections_log')
        .select('created_at')
        .eq('object_type', 'paper')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) {
        console.error('Supabase fetch error:', error.message);
        return;
      }

      let result = [];

      if (activeTab === 'Daily') {
        const counts = Array(7).fill(0);
        data.forEach(entry => {
          const index = moment(entry.created_at).isoWeekday() - 1;
          if (index >= 0) counts[index]++;
        });
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        result = labels.map((label, idx) => ({ label, value: counts[idx] }));
      } else if (activeTab === 'Weekly') {
        const weekCounts = [0, 0, 0, 0];
        data.forEach(entry => {
          const day = moment(entry.created_at).date();
          const index = Math.min(3, Math.floor((day - 1) / 7));
          weekCounts[index]++;
        });
        result = weekCounts.map((count, i) => ({ label: `Week ${i + 1}`, value: count }));
      } else if (activeTab === 'Monthly') {
        const monthCounts = Array(12).fill(0);
        data.forEach(entry => {
          const index = moment(entry.created_at).month();
          monthCounts[index]++;
        });
        result = monthCounts.map((count, i) => ({
          label: moment().month(i).format('MMM'),
          value: count,
        }));
      } else {
        const yearGroups: { [year: string]: number } = {};
        data.forEach(entry => {
          const year = moment(entry.created_at).year();
          yearGroups[year] = (yearGroups[year] || 0) + 1;
        });
        result = Object.entries(yearGroups).map(([year, count]) => ({
          label: year,
          value: count,
        }));
      }

      setChartData(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // initial load

    const channel = supabase
      .channel('paper-detections')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'detections_log',
          filter: 'object_type=eq.paper',
        },
        (payload) => {
          console.log('New paper detection:', payload);
          fetchData(); // refresh chart
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel); // cleanup
    };
  }, [activeTab, currentWeek]);

  const getChartStyles = () => {
    const common = { yAxisTextStyle: { color: 'gray' }, yAxisLabelWidth: 30 };
    switch (activeTab) {
      case 'Daily': return { ...common, barWidth: 30, spacing: 18, frontColor: '#4CAF50' };
      case 'Weekly': return { ...common, barWidth: 40, spacing: 25, frontColor: '#2196F3' };
      case 'Monthly': return { ...common, barWidth: 40, spacing: 20, frontColor: '#FF9800' };
      case 'Yearly': return { ...common, barWidth: 45, spacing: 20, frontColor: '#9C27B0' };
      default: return common;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {['Daily', 'Weekly', 'Monthly', 'Yearly'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => {
              setActiveTab(tab);
              setCurrentWeek(0); // reset week
            }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Daily' && (
        <View style={styles.weekSelector}>
          <TouchableOpacity onPress={() => setCurrentWeek(prev => prev - 1)}>
            <Text style={styles.arrow}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.weekRange}>
            {moment().startOf('isoWeek').add(currentWeek, 'weeks').format('MMM D')} -{' '}
            {moment().endOf('isoWeek').add(currentWeek, 'weeks').format('MMM D')}
          </Text>
          <TouchableOpacity
            onPress={() => setCurrentWeek(prev => Math.min(prev + 1, 0))}
            disabled={currentWeek === 0}
          >
            <Text style={[styles.arrow, currentWeek === 0 && { opacity: 0.3 }]}>▶</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.title}>Paper Bin Collection ({activeTab})</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" />
      ) : (
        <BarChart
          data={chartData}
          {...getChartStyles()}
          yAxisThickness={1}
          xAxisThickness={1}
          hideRules={false}
          noOfSections={4}
          maxValue={Math.max(...chartData.map(item => item.value), 10)}
        />
      )}
    </View>
  );
};

export class examplescreen extends Component {
  render() {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ title: 'Paper Bin Collection' }} />
        <PaperBinBarChart />
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

export default examplescreen;
