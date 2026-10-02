import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Circle, Svg } from 'react-native-svg';
import { UserCheck, Users, UserX } from 'lucide-react-native';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '../components/app-text';
import { fetchStats } from '../services/api';
import { useAppTheme, type ThemePalette } from '../theme/colors';

type DashboardStats = {
  total: number;
  present: number;
  absent: number;
};

type PieChartProps = {
  present: number;
  absent: number;
  theme: ThemePalette;
};

const DASHBOARD_POLL_INTERVAL_MS = 3000;

function PieChart({ present, absent, theme }: PieChartProps) {
  const total = present + absent;
  if (total === 0) return null;

  const radius = 60;
  const strokeWidth = 20;
  const center = radius + strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const presentLength = circumference * (present / total);

  return (
    <View style={styles.chartContainer}>
      <Svg
        height={center * 2}
        width={center * 2}
        viewBox={`0 0 ${center * 2} ${center * 2}`}
      >
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.danger}
          strokeWidth={strokeWidth}
          fill="transparent"
          transform={`rotate(-90 ${center} ${center})`}
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.success}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${presentLength} ${circumference - presentLength}`}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.chartCenterLabel}>
          <Text style={[styles.chartPercentText, { color: theme.textPrimary }]}>
          {Math.round((present / total) * 100)}%
        </Text>
        <Text style={[styles.chartSubText, { color: theme.textSecondary }]}>Present</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { theme } = useAppTheme();
  const [stats, setStats] = useState<DashboardStats>({ total: 0, present: 0, absent: 0 });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const refreshStats = useCallback(async () => {
    setLoading(true);
    const data = await fetchStats();
    setStats(data);
    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    let isActive = true;
    let timeout: ReturnType<typeof setTimeout>;

    const updateStats = async (): Promise<void> => {
      try {
        const data = await fetchStats();
        if (!isActive) return;

        setStats(data);
        setLastUpdated(new Date().toLocaleTimeString());
        setLoading(false);
      } finally {
        if (isActive) {
          timeout = setTimeout(() => void updateStats(), DASHBOARD_POLL_INTERVAL_MS);
        }
      }
    };

    void updateStats();

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, []));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshStats}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Attendance Dashboard</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>RFID Attendance Tracker</Text>
          <Text style={[styles.lastUpdated, { color: theme.textMuted }]}>
            {lastUpdated ? `Last updated: ${lastUpdated}` : 'Loading attendance...'}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.card, styles.totalCard, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderLeftColor: theme.accent }]}>
            <View style={styles.cardHeader}>
              <Users size={24} color={theme.accent} />
              <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Total Registered Students</Text>
            </View>
            <Text style={[styles.cardValue, { color: theme.accent }]}>
              {stats.total}
            </Text>
          </View>

          <View style={[styles.card, styles.presentCard, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderLeftColor: theme.success }]}>
            <View style={styles.cardHeader}>
              <UserCheck size={24} color={theme.success} />
              <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Present Today</Text>
            </View>
            <Text style={[styles.cardValue, { color: theme.success }]}>
              {stats.present}
            </Text>
          </View>

          <View style={[styles.card, styles.absentCard, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderLeftColor: theme.danger }]}>
            <View style={styles.cardHeader}>
              <UserX size={24} color={theme.danger} />
              <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Absent Today</Text>
            </View>
            <Text style={[styles.cardValue, { color: theme.danger }]}>
              {stats.absent}
            </Text>
          </View>
        </View>

        <View style={[styles.chartCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Attendance Overview</Text>
          <View style={styles.chartSection}>
            <PieChart
              present={stats.present}
              absent={stats.absent}
              theme={theme}
            />

            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
                <View>
                  <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>Present</Text>
                  <Text style={[styles.legendValue, { color: theme.textPrimary }]}>
                    {stats.present} Students
                  </Text>
                </View>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.danger }]} />
                <View>
                  <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>Absent</Text>
                  <Text style={[styles.legendValue, { color: theme.textPrimary }]}>
                    {stats.absent} Students
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  totalCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  presentCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  absentCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  totalValue: {
    color: '#3B82F6',
  },
  presentValue: {
    color: '#10B981',
  },
  absentValue: {
    color: '#EF4444',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  chartSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 20,
  },
  chartContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCenterLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPercentText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  chartSubText: {
    fontSize: 12,
    color: '#64748B',
  },
  legendContainer: {
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  presentDot: {
    backgroundColor: '#10B981',
  },
  absentDot: {
    backgroundColor: '#EF4444',
  },
  legendLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  legendValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
});