import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import moment from 'moment';

export async function downloadCSV(data: any[], fileName: string, range: string) {
  if (!data.length) {
    Alert.alert('No Data', 'There is no data to export.');
    return;
  }

  const csvHeader = 'label,paper,can,pet bottle';

  // 🔁 Convert each row to CSV with full date format (YYYY-MM-DD)
  const csvRows = data.map(row => {
    const dateLabel = moment(row.label).format('YYYY-MM-DD');
    return `${dateLabel},${row.paper || 0},${row.can || 0},${row['pet bottle'] || 0}`;
  });

  // ➕ Total row
  const totalPaper = data.reduce((sum, row) => sum + (row.paper || 0), 0);
  const totalCan = data.reduce((sum, row) => sum + (row.can || 0), 0);
  const totalPet = data.reduce((sum, row) => sum + (row['pet bottle'] || 0), 0);
  const totalRow = `total,${totalPaper},${totalCan},${totalPet}`;

  const csvContent = [csvHeader, ...csvRows, totalRow].join('\n');
  const fileNameWithRange = `${fileName}_${range}.csv`;

  try {
    let fileUri = '';

    if (Platform.OS === 'android') {
      // Ask SAF for folder
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (!permissions.granted) {
        Alert.alert('Permission Denied', 'Cannot save file without storage permission.');
        return;
      }

      const dirUri = permissions.directoryUri;

      const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
        dirUri,
        fileNameWithRange,
        'text/csv'
      );

      await FileSystem.writeAsStringAsync(safUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      console.log('CSV saved to SAF:', safUri);

      // Copy to local file:// URI for sharing
      const localUri = `${FileSystem.documentDirectory}${fileNameWithRange}`;
      await FileSystem.writeAsStringAsync(localUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      fileUri = localUri;

    } else {
      // iOS or other platform
      fileUri = `${FileSystem.documentDirectory}${fileNameWithRange}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }

    // Share CSV if available
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    } else {
      Alert.alert('Saved', 'CSV saved but sharing is not available.');
    }

  } catch (error) {
    console.error('Error exporting CSV:', error);
    Alert.alert('Export Error', 'Please select a folder other than Downloads (e.g., Documents).');
  }
}
