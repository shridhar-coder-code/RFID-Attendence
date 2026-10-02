import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Cpu,
  Info,
  RefreshCw,
  Save,
  School,
  Sheet,
  Sun,
  Moon,
  Monitor,
  Wifi,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme, type ThemeMode } from '../theme/colors';

const SETTINGS_KEY = '@rfid_attendance_settings';
const FIREBASE_DB_URL = 'https://rfid-attendence-ba2f8-default-rtdb.firebaseio.com';
const HARDWARE_POLL_INTERVAL_MS = 1000;
const HARDWARE_ONLINE_WINDOW_SECONDS = 8;
const EPOCH_TIMESTAMP_WINDOW_SECONDS = 2 * 365 * 24 * 60 * 60;

function toUnixSeconds(lastSeen: number | string | undefined) {
  if (typeof lastSeen === 'number') {
    return lastSeen > 1_000_000_000_000 ? lastSeen / 1000 : lastSeen;
  }

  if (typeof lastSeen !== 'string' || !lastSeen) return Number.NaN;

  const numericValue = Number(lastSeen);
  if (Number.isFinite(numericValue)) {
    return numericValue > 1_000_000_000_000 ? numericValue / 1000 : numericValue;
  }

  const parsedDate = Date.parse(lastSeen);
  return Number.isFinite(parsedDate) ? parsedDate / 1000 : Number.NaN;
}

function getHeartbeatValues(data: Record<string, unknown> | null) {
  if (!data) return [];

  const values: (number | string | undefined)[] = [
    data.lastSeen as number | string | undefined,
  ];
  const rootHeartbeat = data.lastHeartbeat;
  if (typeof rootHeartbeat === 'number' || typeof rootHeartbeat === 'string') {
    values.push(rootHeartbeat);
  }

  Object.values(data).forEach((device) => {
    if (typeof device !== 'object' || device === null) return;

    const status = device as Record<string, unknown>;
    if (typeof status.lastSeen === 'number' || typeof status.lastSeen === 'string') {
      values.push(status.lastSeen);
    }
    if (typeof status.lastHeartbeat === 'number' || typeof status.lastHeartbeat === 'string') {
      values.push(status.lastHeartbeat);
    }
  });

  return values.map(toUnixSeconds).filter(Number.isFinite);
}

type SavedSettings = {
  url?: string;
  name?: string;
  sync?: boolean;
};

export default function SettingsScreen() {
  const { theme, isDark, themeMode, setThemeMode } = useAppTheme();
  const [sheetUrl, setSheetUrl] = useState('');
  const [schoolName, setSchoolName] = useState('Greenwood High School');
  const [autoSync, setAutoSync] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const previousHeartbeatRef = useRef<string | null>(null);
  const lastHeartbeatChangeAtRef = useRef<number | null>(null);

  useEffect(() => {
    let isActive = true;

    AsyncStorage.getItem(SETTINGS_KEY)
      .then((savedSettings) => {
        if (!isActive || !savedSettings) return;

        const { url, name, sync } = JSON.parse(savedSettings) as SavedSettings;
        if (url) setSheetUrl(url);
        if (name) setSchoolName(name);
        if (sync !== undefined) setAutoSync(sync);
      })
      .catch((error: unknown) => {
        console.error('Failed to load settings from storage', error);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useFocusEffect(useCallback(() => {
    let isActive = true;
    let timeout: ReturnType<typeof setTimeout>;

    const checkHardwareStatus = async () => {
      try {
        const response = await fetch(`${FIREBASE_DB_URL}/hardwareStatus.json`);
        if (!response.ok) throw new Error(`Firebase returned ${response.status}`);

        const data: Record<string, unknown> | null = await response.json();
        const heartbeatValues = getHeartbeatValues(data);
        const currentSeconds = Math.floor(Date.now() / 1000);
        const epochHeartbeats = heartbeatValues.filter((value) => {
          const ageSeconds = currentSeconds - value;
          return (
            value > 1_000_000_000 &&
            Math.abs(ageSeconds) < EPOCH_TIMESTAMP_WINDOW_SECONDS
          );
        });

        if (isActive) {
          if (epochHeartbeats.length > 0) {
            const latestHeartbeat = Math.max(...epochHeartbeats);
            const ageSeconds = currentSeconds - latestHeartbeat;
            setIsConnected(ageSeconds >= 0 && ageSeconds < HARDWARE_ONLINE_WINDOW_SECONDS);
          } else if (heartbeatValues.length > 0) {
            const currentValue = heartbeatValues.join('|');
            const previousValue = previousHeartbeatRef.current;
            if (previousValue !== currentValue) {
              if (previousValue !== null) lastHeartbeatChangeAtRef.current = Date.now();
              previousHeartbeatRef.current = currentValue;
            }

            const lastChangedAt = lastHeartbeatChangeAtRef.current;
            setIsConnected(
              lastChangedAt !== null &&
                Date.now() - lastChangedAt < HARDWARE_ONLINE_WINDOW_SECONDS * 1000
            );
          } else {
            previousHeartbeatRef.current = null;
            lastHeartbeatChangeAtRef.current = null;
            setIsConnected(false);
          }
        }
      } catch {
        if (isActive) {
          previousHeartbeatRef.current = null;
          lastHeartbeatChangeAtRef.current = null;
          setIsConnected(false);
        }
      } finally {
        if (isActive) {
          timeout = setTimeout(() => void checkHardwareStatus(), HARDWARE_POLL_INTERVAL_MS);
        }
      }
    };

    void checkHardwareStatus();

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, []));

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const settingsData = {
        url: sheetUrl.trim(),
        name: schoolName.trim(),
        sync: autoSync,
      };

      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsData));
      Alert.alert('Settings Saved ✅', 'Your configuration has been updated successfully.');
    } catch {
      Alert.alert('Error ❌', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    const url = sheetUrl.trim();
    if (!url) {
      Alert.alert('Missing URL', 'Please enter a valid Google Sheets Webhook URL first.');
      return;
    }

    setTestingConnection(true);
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok || response.status === 302) {
        Alert.alert(
          'Connection Successful! 🎉',
          'App connected to Google Sheets Script successfully.'
        );
      } else {
        Alert.alert('Connection Warning ⚠️', `Received response code: ${response.status}`);
      }
    } catch {
      Alert.alert(
        'Connection Error ❌',
        'Could not reach Google Sheets Webhook. Ensure the URL is public and correctly deployed as a Web App.'
      );
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Settings</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>App Configuration &amp; Info</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.appearanceHeader}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Appearance / Theme</Text>
            <Text style={[styles.fieldHint, { color: theme.textSecondary }]}>Choose your preferred display theme</Text>
          </View>
          <View style={styles.themeOptionsRow}>
            {([
              { mode: 'light', label: 'Light', Icon: Sun },
              { mode: 'dark', label: 'Dark', Icon: Moon },
              { mode: 'system', label: 'System', Icon: Monitor },
            ] as const).map(({ mode, label, Icon }) => {
              const selected = themeMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => void setThemeMode(mode as ThemeMode)}
                  style={[
                    styles.themeButton,
                    {
                      backgroundColor: theme.background,
                      borderColor: selected ? theme.primary : theme.border,
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                >
                  <Icon size={18} color={selected ? theme.primary : theme.iconMuted} />
                  <Text style={[styles.themeButtonText, { color: theme.textPrimary }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
            <School size={20} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>School / Organization</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>School Name</Text>
            <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <TextInput
                style={[styles.input, { color: theme.textPrimary }]}
                placeholder="e.g. St. Xavier's Academy"
                placeholderTextColor={theme.textMuted}
                selectionColor={theme.primary}
                value={schoolName}
                onChangeText={setSchoolName}
              />
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
            <Sheet size={20} color={theme.success} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Google Sheets Integration</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Google Apps Script Webhook URL</Text>
            <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <TextInput
                style={[styles.input, { color: theme.textPrimary }]}
                placeholder="https://script.google.com/macros/s/..."
                placeholderTextColor={theme.textMuted}
                selectionColor={theme.primary}
                value={sheetUrl}
                onChangeText={setSheetUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
            <Text style={[styles.fieldHint, { color: theme.textMuted }]}>
              Scanned RFID attendance logs will sync directly to this spreadsheet.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: theme.badgeInBg }]}
            onPress={handleTestConnection}
            disabled={testingConnection}
            activeOpacity={0.7}
          >
            <RefreshCw size={16} color={theme.success} />
            <Text style={[styles.testButtonText, { color: theme.badgeInText }]}>
              {testingConnection ? 'Testing Connection...' : 'Test Webhook Connection'}
            </Text>
          </TouchableOpacity>

          <View style={[styles.toggleRow, { borderTopColor: theme.border }]}>
            <View style={styles.toggleTextContainer}>
              <Text style={[styles.toggleLabel, { color: theme.textPrimary }]}>Auto-Sync Scans</Text>
              <Text style={[styles.toggleSub, { color: theme.textSecondary }]}>
                Push RFID scan events immediately to Google Sheet
              </Text>
            </View>
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
              trackColor={{ false: theme.border, true: theme.badgeInBg }}
              thumbColor={autoSync ? theme.success : theme.textMuted}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: isDark ? theme.badgeInText : theme.primary, shadowColor: theme.primary }, saving && styles.disabledButton]}
          onPress={handleSaveSettings}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Save size={18} color={isDark ? theme.badgeInBg : '#FFFFFF'} />
          <Text style={[styles.saveButtonText, { color: isDark ? theme.badgeInBg : '#FFFFFF' }]}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
            <Cpu size={20} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Hardware Status</Text>
          </View>

          <View style={styles.statusList}>
            <View style={styles.statusItem}>
              <View style={styles.statusLeft}>
                <Wifi size={16} color={isConnected ? theme.success : theme.danger} />
                <Text style={[styles.statusLabel, { color: theme.textPrimary }]}>ESP32 Wi-Fi Module</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: isConnected ? theme.badgeInBg : theme.badgeOutBg },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: isConnected ? theme.badgeInText : theme.badgeOutText },
                  ]}
                >
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <View style={styles.statusLeft}>
                <Cpu size={16} color={isConnected ? theme.success : theme.danger} />
                <Text style={[styles.statusLabel, { color: theme.textPrimary }]}>RC522 RFID Reader</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: isConnected ? theme.badgeInBg : theme.badgeOutBg },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: isConnected ? theme.badgeInText : theme.badgeOutText },
                  ]}
                >
                  {isConnected ? 'Active' : 'Disconnected'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
            <Info size={20} color={theme.iconMuted} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>About Application</Text>
          </View>

          <View style={styles.aboutContent}>
            <Text style={[styles.appName, { color: theme.textPrimary }]}>RFID Smart Attendance System</Text>
            <Text style={[styles.appVersion, { color: theme.textSecondary }]}>Version 1.0.0 (Build 2026.10)</Text>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <Text style={[styles.aboutDesc, { color: theme.textSecondary }]}>
              An automated attendance management system connected with NodeMCU / ESP8266 and RC522
              RFID module. Real-time logging with live status indicators and Google Sheets
              integration.
            </Text>

            <View style={styles.infoRow}>
              <Text style={[styles.infoKey, { color: theme.textSecondary }]}>Developer:</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>IoT &amp; Mobile App Team</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoKey, { color: theme.textSecondary }]}>Hardware Supported:</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>ESP8266, ESP32, RC522 RFID</Text>
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
    gap: 16,
    paddingBottom: 40,
  },
  appearanceHeader: {
    gap: 4,
  },
  themeOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  themeButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  themeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  header: {
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  inputBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    fontSize: 14,
    color: '#1E293B',
  },
  fieldHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CCFBF1',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  testButtonText: {
    color: '#0F766E',
    fontWeight: '600',
    fontSize: 13,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  toggleTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  toggleSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusList: {
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusLabel: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  connectedBadge: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  connectedText: {
    color: '#047857',
  },
  aboutContent: {
    gap: 8,
  },
  appName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  appVersion: {
    fontSize: 13,
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  aboutDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    gap: 12,
  },
  infoKey: {
    fontSize: 13,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    flexShrink: 1,
    textAlign: 'right',
  },
});