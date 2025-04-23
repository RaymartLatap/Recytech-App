import { supabase } from '@/utils/supabase';
import moment from 'moment';

export async function fetchGroupedCounts(objectType: string, range: 'daily' | 'weekly' | 'monthly' | 'yearly') {
  let fromDate: string;
  let toDate: string;

  const now = moment();

  if (range === 'daily') {
    fromDate = now.startOf('isoWeek').toISOString();
    toDate = now.endOf('isoWeek').toISOString();
  } else if (range === 'weekly') {
    fromDate = now.startOf('month').toISOString();
    toDate = now.endOf('month').toISOString();
  } else if (range === 'monthly') {
    fromDate = now.startOf('year').toISOString();
    toDate = now.endOf('year').toISOString();
  } else {
    // Start from 2025 instead of 3 years ago
    fromDate = moment('2025-01-01').startOf('year').toISOString();
    toDate = now.endOf('year').toISOString();
  }

  const { data, error } = await supabase
    .from('detections_log')
    .select('created_at')
    .eq('object_type', objectType)
    .gte('created_at', fromDate)
    .lte('created_at', toDate);

  if (error) {
    console.error(error);
    return [];
  }

  const groupMap: Record<string, number> = {};

  data.forEach((entry) => {
    const date = moment(entry.created_at);
    let key: string;

    if (range === 'daily') {
      key = date.format('ddd'); // Mon, Tue, ...
    } else if (range === 'weekly') {
      const weekIndex = Math.floor((date.date() - 1) / 7);
      key = `Week ${weekIndex + 1}`;
    } else if (range === 'monthly') {
      key = date.format('MMM'); // Jan, Feb, ...
    } else {
      key = date.format('YYYY'); // 2025, 2026, ...
    }

    groupMap[key] = (groupMap[key] || 0) + 1;
  });

  let labels: string[] = [];
  if (range === 'daily') {
    labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  } else if (range === 'weekly') {
    labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
  } else if (range === 'monthly') {
    labels = moment.monthsShort(); // ['Jan', ..., 'Dec']
  } else {
    const startYear = 2025;
    const currentYear = moment().year();
    labels = Array.from({ length: currentYear - startYear + 1 }, (_, i) => String(startYear + i));
  }

  return labels.map((label) => ({
    date: label,
    count: groupMap[label] || 0,
  }));
}
