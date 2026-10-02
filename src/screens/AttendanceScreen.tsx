import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Search,
  User,
} from 'lucide-react-native';
import {
  FlatList,
  ListRenderItemInfo,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ATTENDANCE_POLL_INTERVAL_MS,
  fetchAttendance,
  type AttendanceRecord,
} from '../services/api';
import { useAppTheme } from '../theme/colors';

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';

  return date
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    .toLowerCase();
}

function AttendanceRow({ item }: { item: AttendanceRecord }) {
  const { theme } = useAppTheme();
  const isIn = item.status === 'IN';
  const badgeBackground = isIn ? theme.badgeInBg : theme.badgeOutBg;
  const badgeForeground = isIn ? theme.badgeInText : theme.badgeOutText;

  return (
    <View
      style={[
        styles.logCard,
        { backgroundColor: theme.cardBackground, borderColor: theme.border },
      ]}
    >
      <View style={styles.leftSection}>
        <View style={[styles.avatar, { backgroundColor: badgeBackground }]}>
          <User size={20} color={isIn ? theme.success : theme.danger} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.studentName, { color: theme.textPrimary }]}>{item.student}</Text>
          <Text style={[styles.rollNo, { color: theme.textSecondary }]}>
            {item.rollNo ? `Roll No: ${item.rollNo}` : `UID: ${item.uid}`}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <View style={[styles.statusBadge, { backgroundColor: badgeBackground }]}>
          {isIn ? (
            <ArrowDownLeft size={14} color={badgeForeground} />
          ) : (
            <ArrowUpRight size={14} color={badgeForeground} />
          )}
          <Text style={[styles.statusText, { color: badgeForeground }]}>{item.status}</Text>
        </View>

        <View style={styles.timeContainer}>
          <Clock size={12} color={theme.textMuted} />
          <Text style={[styles.timestamp, { color: theme.textMuted }]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function AttendanceScreen() {
  const { theme } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      let timeout: ReturnType<typeof setTimeout>;

      const updateAttendance = async (): Promise<void> => {
        try {
          const data = await fetchAttendance();
          if (isActive) setLogs(data);
        } finally {
          if (isActive) {
            timeout = setTimeout(() => void updateAttendance(), ATTENDANCE_POLL_INTERVAL_MS);
          }
        }
      };

      void updateAttendance();
      return () => {
        isActive = false;
        clearTimeout(timeout);
      };
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setLogs(await fetchAttendance());
    } finally {
      setRefreshing(false);
    }
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredLogs = logs.filter(
    (item) =>
      item.student.toLowerCase().includes(normalizedQuery) ||
      item.rollNo.toLowerCase().includes(normalizedQuery) ||
      item.uid.toLowerCase().includes(normalizedQuery) ||
      item.status.toLowerCase().includes(normalizedQuery) ||
      item.timestamp.toLowerCase().includes(normalizedQuery)
  );

  const renderAttendanceItem = ({ item }: ListRenderItemInfo<AttendanceRecord>) => (
    <AttendanceRow item={item} />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Attendance Log</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          Real-time RFID Scan Feed
        </Text>
      </View>

      <View
        style={[
          styles.searchContainer,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
        ]}
      >
        <Search size={18} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder="Search student, roll no, or UID..."
          placeholderTextColor={theme.textMuted}
          selectionColor={theme.primary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search attendance records"
          returnKeyType="search"
        />
      </View>

      <FlatList
        style={{ backgroundColor: theme.background }}
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        renderItem={renderAttendanceItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              No attendance records found
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
    flexGrow: 1,
  },
  logCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    justifyContent: 'center',
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  rollNo: {
    fontSize: 13,
    marginTop: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestamp: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
  },
});