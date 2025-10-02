import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Props {
  navigation: any;
  userProfile: any;
}

interface GameificationData {
  totalPoints: number;
  currentStreak: number;
  achievements: any[];
  weeklyProgress: {
    foodLogs: any[];
    mindScores: any[];
  };
  nextMilestone: {
    type: 'points' | 'streak' | 'achievement';
    target: number;
    current: number;
    description: string;
  };
}

export const DashboardScreen: React.FC<Props> = ({ navigation, userProfile }) => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [gamificationData, setGameificationData] = useState<GameificationData | null>(null);
  const [loading, setLoading] = useState(true);

  // Animation refs
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    loadDashboardData();
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Mock data for demo (database removed)
      const data = {
        profile: userProfile,
        recentFoodLogs: [],
        recentMindScores: [],
        achievements: [
          {
            badge_name: 'First Steps',
            category: 'streak',
            description: 'Completed first check-in',
            points_value: 50,
          },
          {
            badge_name: 'Food Explorer',
            category: 'food',
            description: 'Scanned 5 meals',
            points_value: 100,
          },
        ],
      };
      
      setDashboardData(data);
      
      // Calculate gamification data
      const gamification = calculateGamificationData(data);
      setGameificationData(gamification);
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateGamificationData = (data: any): GameificationData => {
    const totalPoints = data.profile.total_points || 0;
    const currentStreak = data.profile.streak_count || 0;
    const achievements = data.achievements || [];

    // Calculate next milestone
    let nextMilestone;
    if (totalPoints < 100) {
      nextMilestone = {
        type: 'points' as const,
        target: 100,
        current: totalPoints,
        description: 'First Century Badge'
      };
    } else if (totalPoints < 500) {
      nextMilestone = {
        type: 'points' as const,
        target: 500,
        current: totalPoints,
        description: 'Wellness Champion Badge'
      };
    } else if (currentStreak < 7) {
      nextMilestone = {
        type: 'streak' as const,
        target: 7,
        current: currentStreak,
        description: 'Weekly Warrior Badge'
      };
    } else {
      nextMilestone = {
        type: 'streak' as const,
        target: 30,
        current: currentStreak,
        description: 'Monthly Master Badge'
      };
    }

    return {
      totalPoints,
      currentStreak,
      achievements,
      weeklyProgress: data.weeklyProgress,
      nextMilestone
    };
  };

  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.headerContent}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.userName}>{userProfile.name || 'Wellness Champion'}!</Text>
      </View>
      
      <TouchableOpacity style={styles.profileButton}>
        <Ionicons name="person-circle-outline" size={32} color="#4A90E2" />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderPointsAndStreak = () => {
    if (!gamificationData) return null;

    return (
      <Animated.View 
        style={[
          styles.pointsStreakContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={['#4A90E2', '#357ABD']}
          style={styles.pointsCard}
        >
          <View style={styles.pointsContent}>
            <Ionicons name="star" size={28} color="#FFD700" />
            <View style={styles.pointsText}>
              <Text style={styles.pointsNumber}>{gamificationData.totalPoints.toLocaleString()}</Text>
              <Text style={styles.pointsLabel}>Total Points</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.streakCard}>
          <View style={styles.streakContent}>
            <Ionicons name="flame" size={28} color="#FF6B35" />
            <View style={styles.streakText}>
              <Text style={styles.streakNumber}>{gamificationData.currentStreak}</Text>
              <Text style={styles.streakLabel}>Day Streak</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderNextMilestone = () => {
    if (!gamificationData) return null;

    const { nextMilestone } = gamificationData;
    const progress = (nextMilestone.current / nextMilestone.target) * 100;

    return (
      <Animated.View 
        style={[
          styles.milestoneContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={styles.milestoneTitle}>Next Milestone</Text>
        <Text style={styles.milestoneDescription}>{nextMilestone.description}</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View 
              style={[
                styles.progressFill,
                { width: `${progress}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {nextMilestone.current}/{nextMilestone.target}
          </Text>
        </View>
      </Animated.View>
    );
  };

  const renderQuickActions = () => (
    <Animated.View 
      style={[
        styles.quickActionsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      
      <View style={styles.actionsGrid}>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('FoodScanner')}
        >
          <LinearGradient
            colors={['#4CAF50', '#45A049']}
            style={styles.actionGradient}
          >
            <Ionicons name="camera" size={32} color="white" />
            <Text style={styles.actionText}>Scan Food</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('MindChat')}
        >
          <LinearGradient
            colors={['#9C27B0', '#8E24AA']}
            style={styles.actionGradient}
          >
            <Ionicons name="chatbubble-ellipses" size={32} color="white" />
            <Text style={styles.actionText}>Mind Check</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('Progress')}
        >
          <LinearGradient
            colors={['#FF9800', '#FB8C00']}
            style={styles.actionGradient}
          >
            <Ionicons name="analytics" size={32} color="white" />
            <Text style={styles.actionText}>Progress</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('Community')}
        >
          <LinearGradient
            colors={['#2196F3', '#1976D2']}
            style={styles.actionGradient}
          >
            <Ionicons name="people" size={32} color="white" />
            <Text style={styles.actionText}>Community</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderRecentAchievements = () => {
    if (!gamificationData || gamificationData.achievements.length === 0) return null;

    const recentAchievements = gamificationData.achievements.slice(0, 3);

    return (
      <Animated.View 
        style={[
          styles.achievementsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Achievements</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Achievements')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {recentAchievements.map((achievement, index) => (
          <View key={achievement.id} style={styles.achievementCard}>
            <View style={styles.achievementIcon}>
              <Ionicons 
                name={getAchievementIcon(achievement.category)} 
                size={24} 
                color="#4A90E2" 
              />
            </View>
            <View style={styles.achievementContent}>
              <Text style={styles.achievementName}>{achievement.badge_name}</Text>
              <Text style={styles.achievementDescription}>{achievement.description}</Text>
            </View>
            <View style={styles.achievementPoints}>
              <Text style={styles.achievementPointsText}>+{achievement.points_value}</Text>
            </View>
          </View>
        ))}
      </Animated.View>
    );
  };

  const renderTodaysProgress = () => {
    if (!dashboardData) return null;

    const todaysFoodLogs = dashboardData.todaysFoodLogs || [];
    const latestMindScore = dashboardData.latestMindScore;
    
    const totalCaloriesToday = todaysFoodLogs.reduce((sum: number, log: any) => 
      sum + (log.total_calories || 0), 0
    );
    
    const targetCalories = userProfile.tdee || 2000;
    const calorieProgress = (totalCaloriesToday / targetCalories) * 100;

    return (
      <Animated.View 
        style={[
          styles.todaysProgressContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={styles.sectionTitle}>Today's Progress</Text>
        
        <View style={styles.progressGrid}>
          {/* Calorie Progress */}
          <View style={styles.progressCard}>
            <View style={styles.progressCardHeader}>
              <Ionicons name="flame-outline" size={20} color="#FF6B35" />
              <Text style={styles.progressCardTitle}>Calories</Text>
            </View>
            <Text style={styles.progressCardValue}>
              {totalCaloriesToday}/{targetCalories}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressBarFill,
                  { 
                    width: `${Math.min(100, calorieProgress)}%`,
                    backgroundColor: calorieProgress > 100 ? '#F44336' : '#4CAF50'
                  }
                ]} 
              />
            </View>
          </View>

          {/* Mind Score */}
          <View style={styles.progressCard}>
            <View style={styles.progressCardHeader}>
              <Ionicons name="bulb-outline" size={20} color="#9C27B0" />
              <Text style={styles.progressCardTitle}>Mind Score</Text>
            </View>
            <Text style={styles.progressCardValue}>
              {latestMindScore ? latestMindScore.overall_score : '--'}/100
            </Text>
            <Text style={styles.progressCardSubtext}>
              {latestMindScore 
                ? new Date(latestMindScore.created_at).toLocaleDateString()
                : 'Take assessment'
              }
            </Text>
          </View>

          {/* Meals Logged */}
          <View style={styles.progressCard}>
            <View style={styles.progressCardHeader}>
              <Ionicons name="restaurant-outline" size={20} color="#4CAF50" />
              <Text style={styles.progressCardTitle}>Meals</Text>
            </View>
            <Text style={styles.progressCardValue}>
              {todaysFoodLogs.length}/3
            </Text>
            <Text style={styles.progressCardSubtext}>
              logged today
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  const getAchievementIcon = (category: string) => {
    switch (category) {
      case 'food': return 'restaurant';
      case 'mind': return 'bulb';
      case 'streak': return 'flame';
      case 'social': return 'people';
      default: return 'trophy';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="fitness" size={64} color="#4A90E2" />
          <Text style={styles.loadingText}>Loading your wellness dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderHeader()}
        {renderPointsAndStreak()}
        {renderNextMilestone()}
        {renderTodaysProgress()}
        {renderQuickActions()}
        {renderRecentAchievements()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#6B7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  profileButton: {
    padding: 8,
  },

  // Points and Streak
  pointsStreakContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  pointsCard: {
    flex: 1,
    borderRadius: 16,
    marginRight: 8,
    overflow: 'hidden',
  },
  pointsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  pointsText: {
    marginLeft: 12,
  },
  pointsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  pointsLabel: {
    fontSize: 14,
    color: 'white',
    opacity: 0.8,
  },
  streakCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  streakText: {
    marginLeft: 12,
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  streakLabel: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Milestone
  milestoneContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  milestoneTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  milestoneDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },

  // Quick Actions
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 52) / 2,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },

  // Today's Progress
  todaysProgressContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  progressGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: (width - 56) / 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  progressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressCardTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  progressCardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  progressCardSubtext: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Achievements
  achievementsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementContent: {
    flex: 1,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  achievementPoints: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  achievementPointsText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});