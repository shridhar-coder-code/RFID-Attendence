import React, { useCallback, useState } from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, ClipboardList, Users, Settings } from 'lucide-react-native';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Orbitron_400Regular, Orbitron_700Bold, useFonts } from '@expo-google-fonts/orbitron';

import { AppThemeProvider, useAppTheme } from './src/theme/colors';
import SplashScreen from './src/screens/SplashScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import StudentListScreen from './src/screens/StudentListScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function AppTabs() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowIcon: true,
          tabBarLabelPosition: 'below-icon',
          tabBarLabelStyle: { fontFamily: 'Orbitron_400Regular', fontSize: 11 },
          tabBarActiveTintColor: theme.success,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarStyle: {
            height: 60 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 6),
            paddingTop: 6,
            backgroundColor: theme.cardBackground,
            borderTopColor: theme.border,
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="Attendance"
          component={AttendanceScreen}
          options={{
            tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="Students"
          component={StudentListScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
          }}
        />
      </Tab.Navigator>
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Orbitron_400Regular, Orbitron_700Bold });
  const [isShowSplash, setIsShowSplash] = useState(true);
  const finishSplash = useCallback(() => setIsShowSplash(false), []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        {isShowSplash ? (
          <SplashScreen onFinish={finishSplash} />
        ) : (
          <ThemedNavigation />
        )}
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedNavigation() {
  const { theme, isDark } = useAppTheme();
  const navigationTheme = isDark ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer
      theme={{
        ...navigationTheme,
        colors: {
          ...navigationTheme.colors,
          primary: theme.primary,
          background: theme.background,
          card: theme.cardBackground,
          text: theme.textPrimary,
          border: theme.border,
          notification: theme.danger,
        },
      }}
    >
      <AppTabs />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#090D16',
    alignItems: 'center',
    justifyContent: 'center',
  },
});