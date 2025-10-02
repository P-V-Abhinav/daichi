import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Screens
import { DashboardScreen } from './src/screens/DashboardScreen';
import { FoodScannerScreen } from './src/screens/FoodScannerScreen';
import { MindChatScreen } from './src/screens/MindChatScreenSimple';

// Mock user profile for demo
const mockUserProfile = {
  id: 'demo-user-1',
  created_at: new Date().toISOString(),
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
  streak_count: 5,
  total_points: 350,
  current_badges: ['First Steps', 'Food Explorer'],
  onboarding_completed: true,
};

type Screen = 'Dashboard' | 'FoodScanner' | 'MindChat';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('Dashboard');

  const renderScreen = () => {
    const navigationMock = {
      navigate: (screen: Screen) => setCurrentScreen(screen),
      goBack: () => setCurrentScreen('Dashboard'),
    };

    switch (currentScreen) {
      case 'Dashboard':
        return <DashboardScreen navigation={navigationMock} userProfile={mockUserProfile} />;
      case 'FoodScanner':
        return <FoodScannerScreen navigation={navigationMock} userProfile={mockUserProfile} />;
      case 'MindChat':
        return <MindChatScreen navigation={navigationMock} userProfile={mockUserProfile} />;
      default:
        return <DashboardScreen navigation={navigationMock} userProfile={mockUserProfile} />;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      {renderScreen()}
      
      {/* Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => setCurrentScreen('Dashboard')}
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
          onPress={() => setCurrentScreen('FoodScanner')}
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
          onPress={() => setCurrentScreen('MindChat')}
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
    </View>
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
