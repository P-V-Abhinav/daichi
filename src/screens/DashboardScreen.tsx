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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GoogleGenerativeAI } from '@google/generative-ai';

const { width } = Dimensions.get('window');

interface Props {
  navigation: any;
  userProfile: any;
  onNavigateToProfile?: () => void;
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

export const DashboardScreen: React.FC<Props> = ({ navigation, userProfile, onNavigateToProfile }) => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [gamificationData, setGameificationData] = useState<GameificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<null | {
    riskFlags: string[];
    wellnessSummary: string;
    priorityFocus: string[];
    dailySuggestions: string[];
    nutritionAlignment: string;
    mindPattern: string;
    readinessScore: number;
  }>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Animation refs
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    loadDashboardData();
    runPersonalizedAnalysis();
    
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
        recentFoodLogs: [
          {
            id: 1,
            food_name: 'Grilled Chicken Salad',
            total_calories: 380,
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            health_score: 85,
            meal_type: 'lunch'
          },
          {
            id: 2,
            food_name: 'Masala Chai & Biscuits',
            total_calories: 150,
            created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
            health_score: 65,
            meal_type: 'snack'
          },
          {
            id: 3,
            food_name: 'Idli Sambar',
            total_calories: 320,
            created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), // Yesterday
            health_score: 90,
            meal_type: 'breakfast'
          }
        ],
        recentMindScores: [
          {
            id: 1,
            overall_score: 78,
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
            emotional_state: 'optimistic',
            stress_level: 'moderate'
          },
          {
            id: 2,
            overall_score: 85,
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
            emotional_state: 'energetic',
            stress_level: 'low'
          }
        ],
        achievements: [
          {
            id: 1,
            badge_name: 'First Steps',
            category: 'streak',
            description: 'Completed first wellness check-in! 🎉',
            points_value: 50,
            earned_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 2,
            badge_name: 'Food Explorer',
            category: 'food',
            description: 'Scanned 5 different meals 📸',
            points_value: 100,
            earned_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 3,
            badge_name: 'Mind Champion',
            category: 'mind',
            description: 'Completed 3 mind check-ins this week 🧠',
            points_value: 150,
            earned_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 4,
            badge_name: 'Consistency King',
            category: 'streak',
            description: 'Maintained 7-day wellness streak! 🔥',
            points_value: 200,
            earned_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          }
        ],
        todaysFoodLogs: [
          {
            id: 1,
            food_name: 'Grilled Chicken Salad',
            total_calories: 380,
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 2,
            food_name: 'Masala Chai & Biscuits',
            total_calories: 150,
            created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          }
        ],
        latestMindScore: {
          overall_score: 78,
          emotional_state: 'optimistic',
          stress_level: 'moderate'
        }
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

  const runPersonalizedAnalysis = async () => {
    if (!userProfile) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-lite',
        generationConfig: { temperature: 0.4, maxOutputTokens: 400 }
      });

      const prompt = `You are a holistic health coach producing a concise dashboard summary.

USER PROFILE JSON:
${JSON.stringify(userProfile, null, 2)}

RECENT FOOD (if any): ${JSON.stringify((dashboardData?.recentFoodLogs || []).slice(0,3))}
RECENT MIND CHECKS (if any): ${JSON.stringify((dashboardData?.recentMindScores || []).slice(0,2))}

Return STRICT JSON ONLY:
{
  "riskFlags": ["max 4 short risk signals"],
  "wellnessSummary": "one sentence holistic snapshot (<=22 words)",
  "priorityFocus": ["3 short focus areas"],
  "dailySuggestions": ["suggestion 1 (<=10 words)", "suggestion 2", "suggestion 3"],
  "nutritionAlignment": "short note on current nutrition alignment",
  "mindPattern": "short observation on mental pattern",
  "readinessScore": 0-100
}`;

      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) text = jsonMatch[0];
      const parsed = JSON.parse(text);
      setAnalysisData({
        riskFlags: parsed.riskFlags || [],
        wellnessSummary: parsed.wellnessSummary || 'Balanced baseline today.',
        priorityFocus: parsed.priorityFocus || [],
        dailySuggestions: parsed.dailySuggestions || ['Hydrate well','Take a mindful pause','Light movement break'],
        nutritionAlignment: parsed.nutritionAlignment || 'Nutrition pattern pending more scans.',
        mindPattern: parsed.mindPattern || 'Stable emotional tone with moderate stress modulation.',
        readinessScore: Math.max(0, Math.min(100, parsed.readinessScore || 60))
      });
    } catch (e:any) {
      console.error('Analysis error', e);
      setAnalysisError('Could not refresh insights');
      setAnalysisData({
        riskFlags: ['insufficient-data'],
        wellnessSummary: 'Baseline stable — keep consistent routines.',
        priorityFocus: ['Sleep consistency','Balanced meals','Light activity'],
        dailySuggestions: ['Drink water now','Stretch 2 mins','Deep breaths'],
        nutritionAlignment: 'Need more meal scans for pattern.',
        mindPattern: 'Limited mood entries—add a mind check.',
        readinessScore: 62
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const renderPersonalizedAnalysis = () => (
    <View style={styles.analysisContainer}>
      <View style={styles.analysisHeaderRow}>
        <Text style={styles.sectionTitle}>Personalized Snapshot</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={runPersonalizedAnalysis} disabled={analysisLoading}>
          <Ionicons name={analysisLoading ? 'sync' : 'refresh'} size={18} color={analysisLoading ? '#9CA3AF' : '#2563EB'} />
          <Text style={[styles.refreshText, analysisLoading && { color: '#9CA3AF' }]}>{analysisLoading ? 'Updating' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>
      {analysisError && <Text style={styles.errorText}>{analysisError}</Text>}
      <View style={styles.readinessCard}>
        <Text style={styles.readinessLabel}>Readiness</Text>
        <Text style={styles.readinessScore}>{analysisData?.readinessScore ?? '--'}</Text>
        <View style={styles.readinessBarTrack}>
          <View style={[styles.readinessBarFill,{width:`${analysisData ? analysisData.readinessScore : 0}%`}]}/>
        </View>
        <Text style={styles.readinessSummary}>{analysisData?.wellnessSummary || 'Loading summary...'}</Text>
      </View>
      <View style={styles.fixedRowBoxes}>
        <View style={styles.fixedBox}>
          <Text style={styles.fixedBoxTitle}>Focus</Text>
          {(analysisData?.priorityFocus || []).slice(0,3).map(f => (
            <Text key={f} style={styles.fixedItem}>• {f}</Text>
          ))}
        </View>
        <View style={styles.fixedBox}>
          <Text style={styles.fixedBoxTitle}>Risks</Text>
          {(analysisData?.riskFlags || []).slice(0,4).map(r => (
            <Text key={r} style={styles.riskItem}>• {r}</Text>
          ))}
        </View>
      </View>
      <View style={styles.suggestionPanel}>
        <Text style={styles.suggestionTitle}>Daily Suggestions</Text>
        <View style={styles.suggestionsRow}>
          {(analysisData?.dailySuggestions || []).slice(0,3).map(s => (
            <View key={s} style={styles.suggestionPill}>
              <Text style={styles.suggestionPillText}>{s}</Text>
            </View>
          ))}
        </View>
        <View style={styles.inlineMeta}>
          <Text style={styles.metaLine}>Nutrition: {analysisData?.nutritionAlignment}</Text>
          <Text style={styles.metaLine}>Mind: {analysisData?.mindPattern}</Text>
        </View>
      </View>
    </View>
  );

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
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Header with Hamburger Menu */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.hamburgerButton}
          onPress={onNavigateToProfile}
        >
          <Ionicons name="menu" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>YouMatter AI</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderHeader()}
  {renderPersonalizedAnalysis()}
  {renderPointsAndStreak()}
        {renderNextMilestone()}
        {renderTodaysProgress()}
        {renderQuickActions()}
        {renderRecentAchievements()}
      </ScrollView>
    </SafeAreaView>
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
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  hamburgerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  notificationButton: {
    padding: 4,
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
  // Analysis Section
  analysisContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  analysisHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshText: {
    marginLeft: 4,
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '500'
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginBottom: 8,
  },
  readinessCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  readinessLabel: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
    marginBottom: 4,
  },
  readinessScore: {
    fontSize: 40,
    fontWeight: '700',
    color: '#0C4A6E',
  },
  readinessBarTrack: {
    height: 6,
    backgroundColor: '#E0F2FE',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 8,
  },
  readinessBarFill: {
    height: '100%',
    backgroundColor: '#0284C7'
  },
  readinessSummary: {
    fontSize: 13,
    color: '#0C4A6E',
    lineHeight: 18,
  },
  fixedRowBoxes: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  fixedBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  fixedBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  fixedItem: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  riskItem: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 4,
  },
  suggestionPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  suggestionPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  suggestionPillText: {
    fontSize: 12,
    color: '#4338CA',
    fontWeight: '500'
  },
  inlineMeta: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  metaLine: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
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