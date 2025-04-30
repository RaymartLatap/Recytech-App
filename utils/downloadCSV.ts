import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import moment from 'moment';

export async function downloadCSV(data: any[], fileName: string, range: string) {
  if (!data.length) {
    Alert.alert('No Data', 'There is no data to export.');
    return;
  }

  const csvHeader = 'label,paper,can,pet bottle';

  const csvRows = data.map(row => {
    let dateLabel = row.label;

    // Only reformat if it's a single date
    if (!dateLabel.includes('to')) {
      const m = moment(dateLabel);
      dateLabel = m.isValid() ? m.format('YYYY-MM-DD') : dateLabel;
    }

    return `${dateLabel},${row.paper || 0},${row.can || 0},${row['pet bottle'] || 0}`;
  });

  const totalPaper = data.reduce((sum, row) => sum + (row.paper || 0), 0);
  const totalCan = data.reduce((sum, row) => sum + (row.can || 0), 0);
  const totalPet = data.reduce((sum, row) => sum + (row['pet bottle'] || 0), 0);
  const totalRow = `total,${totalPaper},${totalCan},${totalPet}`;

  const csvContent = [csvHeader, ...csvRows, totalRow].join('\n');
  const fileNameWithRange = `${fileName}_${range}.csv`;

  try {
    let fileUri = '';

    if (Platform.OS === 'android') {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions.granted) {
        Alert.alert('Permission Denied', 'Cannot save file without storage permission.');
        return;
      }

      const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        fileNameWithRange,
        'text/csv'
      );

      await FileSystem.writeAsStringAsync(safUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const localUri = `${FileSystem.documentDirectory}${fileNameWithRange}`;
      await FileSystem.writeAsStringAsync(localUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      fileUri = localUri;

    } else {
      fileUri = `${FileSystem.documentDirectory}${fileNameWithRange}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Share Trash Summary CSV',
      });
    } else {
      Alert.alert('Exported', 'CSV saved successfully.');
    }

  } catch (err) {
    console.error('CSV write error:', err);
    Alert.alert('Error', 'Failed to write or share the CSV file.');
  }
}
