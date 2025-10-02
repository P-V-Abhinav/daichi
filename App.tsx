import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens
import { DashboardScreen } from './src/screens/DashboardScreen';
import { FoodScannerScreen } from './src/screens/FoodScannerScreen';
import { MindChatScreen } from './src/screens/MindChatScreenSimple';
import { ProfileScreen, UserProfile } from './src/screens/ProfileScreen';

// Enhanced user profile that includes new profile structure
const createEnhancedProfile = (mockProfile: any): UserProfile => ({
  id: mockProfile.id,
  name: mockProfile.name,
  age: mockProfile.age,
  gender: mockProfile.gender,
  weight: mockProfile.weight,
  height: mockProfile.height,
  activityLevel: mockProfile.physical_activity,
  healthGoals: ['Better Sleep', 'Improved Energy'],
  healthConditions: mockProfile.health_conditions,
  dietaryPreferences: ['Vegetarian'],
  bmi: mockProfile.bmi,
  dailyCalorieTarget: 2200,
  dailyProteinTarget: 90,
  dailyCarbTarget: 275,
  dailyFatTarget: 73,
  notifications: true,
  darkMode: false,
  units: 'metric'
});

// Mock user profile for demo
const mockUserProfile = {
  id: 'demo-user-1',
  created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
  updated_at: new Date().toISOString(),
  name: 'Alex Johnson',
  email: 'alex@demo.com',
  gender: 'male' as const,
  age: 28,
  weight: 75,
  height: 175,
  physical_activity: 'moderate' as const,
  health_conditions: ['High Blood Pressure'],
  bmi: 24.5,
  tdee: 2200,
  streak_count: 7,
  total_points: 650,
  current_badges: ['First Steps', 'Food Explorer', 'Mind Champion', 'Consistency King'],
  onboarding_completed: true,
  // Additional gamification data
  weekly_goal_progress: {
    food_scans: { current: 12, target: 15 },
    mind_checks: { current: 3, target: 5 },
    streak_days: { current: 7, target: 7 }
  },
  current_level: 3,
  level_progress: 65, // percentage to next level
  mood_trend: 'improving', // 'improving', 'stable', 'declining'
  last_mind_check: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
};

type Screen = 'Dashboard' | 'FoodScanner' | 'MindChat' | 'Profile';

// Bottom Navigation Component with Safe Area Support
const BottomNavigation: React.FC<{
  currentScreen: Screen;
  onScreenChange: (screen: Screen) => void;
}> = ({ currentScreen, onScreenChange }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <TouchableOpacity 
        style={styles.tabItem} 
        onPress={() => onScreenChange('Dashboard')}
      >
        <Ionicons 
          name="home" 
          size={24} 
          color={currentScreen === 'Dashboard' ? '#6C5CE7' : '#95a5a6'} 
        />
        <Text style={[
          styles.tabLabel,
          currentScreen === 'Dashboard' && styles.tabLabelActive
        ]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.tabItem} 
        onPress={() => onScreenChange('FoodScanner')}
      >
        <Ionicons 
          name="camera" 
          size={24} 
          color={currentScreen === 'FoodScanner' ? '#6C5CE7' : '#95a5a6'} 
        />
        <Text style={[
          styles.tabLabel,
          currentScreen === 'FoodScanner' && styles.tabLabelActive
        ]}>Food</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.tabItem} 
        onPress={() => onScreenChange('MindChat')}
      >
        <Ionicons 
          name="chatbubbles" 
          size={24} 
          color={currentScreen === 'MindChat' ? '#6C5CE7' : '#95a5a6'} 
        />
        <Text style={[
          styles.tabLabel,
          currentScreen === 'MindChat' && styles.tabLabelActive
        ]}>Mind</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('Dashboard');
  const [userProfile, setUserProfile] = useState<UserProfile>(createEnhancedProfile(mockUserProfile));

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    console.log('Profile updated:', updatedProfile);
  };

  const renderScreen = () => {
    const navigationMock = {
      navigate: (screen: Screen) => setCurrentScreen(screen),
      goBack: () => setCurrentScreen('Dashboard'),
    };

    switch (currentScreen) {
      case 'Dashboard':
        return (
          <DashboardScreen 
            navigation={navigationMock} 
            userProfile={userProfile}
            onNavigateToProfile={() => setCurrentScreen('Profile')}
          />
        );
      case 'FoodScanner':
        return (
          <FoodScannerScreen 
            navigation={navigationMock} 
            userProfile={userProfile} 
          />
        );
      case 'MindChat':
        return (
          <MindChatScreen 
            navigation={navigationMock} 
            userProfile={userProfile} 
          />
        );
      case 'Profile':
        return (
          <ProfileScreen 
            navigation={navigationMock} 
            userProfile={userProfile}
            onProfileUpdate={handleProfileUpdate}
          />
        );
      default:
        return (
          <DashboardScreen 
            navigation={navigationMock} 
            userProfile={userProfile}
            onNavigateToProfile={() => setCurrentScreen('Profile')}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar style="dark" />
        {renderScreen()}
        
        {/* Bottom Navigation Bar with Safe Area Support */}
        <BottomNavigation 
          currentScreen={currentScreen} 
          onScreenChange={setCurrentScreen} 
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingBottom: 10,
    paddingTop: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    color: '#95a5a6',
  },
  tabLabelActive: {
    color: '#6C5CE7',
    fontWeight: '600',
  },
});
