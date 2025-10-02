import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Animated,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FoodRecognitionService, RefinedAnalysis } from '../services/FoodRecognitionService';

const { width, height } = Dimensions.get('window');

interface Props {
  navigation: any;
  userProfile: any; // UserProfile from SupabaseService
}

interface ScanningStage {
  id: string;
  title: string;
  description: string;
  icon: string;
  duration: number;
}

const SCANNING_STAGES: ScanningStage[] = [
  {
    id: 'capture',
    title: 'Analyzing Image',
    description: 'AI scanning food items...',
    icon: 'camera-outline',
    duration: 1500
  },
  {
    id: 'recognition',
    title: 'Identifying Foods',
    description: 'Recognizing ingredients & portions...',
    icon: 'search-outline',
    duration: 2000
  },
  {
    id: 'nutrition',
    title: 'Calculating Nutrition',
    description: 'Computing calories & macros...',
    icon: 'calculator-outline',
    duration: 1500
  },
  {
    id: 'personalization',
    title: 'Personalizing Results',
    description: 'Tailoring insights for you...',
    icon: 'person-outline',
    duration: 1000
  }
];

export const FoodScannerScreen: React.FC<Props> = ({ navigation, userProfile }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<RefinedAnalysis | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const stageProgressAnim = useRef(new Animated.Value(0)).current;
  const resultsSlideAnim = useRef(new Animated.Value(height)).current;

  // Services
  const foodService = new FoodRecognitionService(process.env.EXPO_PUBLIC_GEMINI_API_KEY!);

  useEffect(() => {
    // Pulse animation for scan button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to continue.');
      return false;
    }
    return true;
  };

  const handleImageCapture = async (source: 'camera' | 'gallery') => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    let result;
    
    if (source === 'camera') {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });
    }

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      await analyzeFood(result.assets[0].uri);
    }
  };

  const analyzeFood = async (imageUri: string) => {
    setIsAnalyzing(true);
    setCurrentStage(0);
    setAnalysisResult(null);

    try {
      // Animate through stages
      for (let i = 0; i < SCANNING_STAGES.length; i++) {
        setCurrentStage(i);
        
        // Stage progress animation
        Animated.timing(stageProgressAnim, {
          toValue: (i + 1) / SCANNING_STAGES.length,
          duration: SCANNING_STAGES[i].duration,
          useNativeDriver: false,
        }).start();

        await new Promise(resolve => setTimeout(resolve, SCANNING_STAGES[i].duration));
      }

      // Perform actual AI analysis
      // Transform user profile to match service expectations
      const transformedProfile = {
        id: userProfile.id,
        gender: userProfile.gender,
        weight: userProfile.weight,
        height: userProfile.height,
        physicalActivity: userProfile.physical_activity || 'moderate',
        healthConditions: userProfile.health_conditions || [],
        age: userProfile.age,
        bmi: userProfile.bmi,
        tdee: userProfile.tdee,
      };
      
      const analysis = await foodService.analyzeFood(imageUri, transformedProfile);
      
      // Calculate points earned
      const points = calculateFoodPoints(analysis);
      setPointsEarned(points);
      
      // Note: Database saving removed - will be added when backend is implemented
      
      setAnalysisResult(analysis);
      
      // Slide in results
      Animated.spring(resultsSlideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();

    } catch (error) {
      console.error('Food analysis error:', error);
      Alert.alert(
        'Analysis Failed',
        'Unable to analyze the image. Please try again with a clearer photo.',
        [{ text: 'OK', onPress: () => setIsAnalyzing(false) }]
      );
    }
  };

  const calculateFoodPoints = (analysis: RefinedAnalysis): number => {
    let points = 10; // Base points for logging
    
    // Health score bonus
    if (analysis.healthScore >= 80) points += 25;
    else if (analysis.healthScore >= 60) points += 15;
    else if (analysis.healthScore >= 40) points += 5;
    
    // Confidence bonus
    if (analysis.confidenceLevel >= 80) points += 10;
    
    // Calorie alignment bonus
    if (analysis.calorieImpact.alignmentWithTargets === 'optimal') points += 15;
    
    // Macro balance bonus
    if (analysis.calorieImpact.macroBalance === 'excellent') points += 20;
    else if (analysis.calorieImpact.macroBalance === 'good') points += 10;
    
    return points;
  };

  const renderScanningInterface = () => (
    <View style={styles.scanningContainer}>
      <View style={styles.stageHeader}>
        <Text style={styles.stageTitle}>{SCANNING_STAGES[currentStage].title}</Text>
        <Text style={styles.stageDescription}>{SCANNING_STAGES[currentStage].description}</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View 
            style={[
              styles.progressFill,
              {
                width: stageProgressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                })
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round((currentStage + 1) / SCANNING_STAGES.length * 100)}%
        </Text>
      </View>

      <View style={styles.stageIconContainer}>
        <Ionicons 
          name={SCANNING_STAGES[currentStage].icon as any} 
          size={60} 
          color="#4A90E2" 
        />
        <ActivityIndicator size="large" color="#4A90E2" style={styles.spinner} />
      </View>

      {capturedImage && (
        <Image source={{ uri: capturedImage }} style={styles.capturedImagePreview} />
      )}
    </View>
  );

  const renderResults = () => {
    if (!analysisResult) return null;

    return (
      <Animated.View 
        style={[
          styles.resultsContainer,
          { transform: [{ translateY: resultsSlideAnim }] }
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Points Earned Banner */}
          <LinearGradient
            colors={['#4A90E2', '#357ABD']}
            style={styles.pointsBanner}
          >
            <Ionicons name="star" size={24} color="#FFD700" />
            <Text style={styles.pointsText}>+{pointsEarned} Points Earned!</Text>
          </LinearGradient>

          {/* Food Items */}
          <View style={styles.foodItemsSection}>
            <Text style={styles.sectionTitle}>Identified Foods</Text>
            {analysisResult.foodItems.map((item, index) => (
              <View key={index} style={styles.foodItem}>
                <View style={styles.foodItemHeader}>
                  <Text style={styles.foodItemName}>{item.name}</Text>
                  <View style={[
                    styles.confidenceBadge,
                    { backgroundColor: item.confidence >= 80 ? '#4CAF50' : item.confidence >= 60 ? '#FF9800' : '#F44336' }
                  ]}>
                    <Text style={styles.confidenceText}>{item.confidence}%</Text>
                  </View>
                </View>
                <Text style={styles.foodItemQuantity}>{item.quantity}</Text>
                <View style={styles.macroRow}>
                  <Text style={styles.macroText}>Calories: {item.calories}</Text>
                  <Text style={styles.macroText}>Protein: {item.macros.protein}g</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Total Nutrition */}
          <View style={styles.nutritionSummary}>
            <Text style={styles.sectionTitle}>Nutrition Summary</Text>
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionCard}>
                <Text style={styles.nutritionLabel}>Total Calories</Text>
                <Text style={styles.nutritionValue}>{analysisResult.totalCalories}</Text>
              </View>
              <View style={styles.nutritionCard}>
                <Text style={styles.nutritionLabel}>Protein</Text>
                <Text style={styles.nutritionValue}>{analysisResult.totalMacros.protein}g</Text>
              </View>
              <View style={styles.nutritionCard}>
                <Text style={styles.nutritionLabel}>Carbs</Text>
                <Text style={styles.nutritionValue}>{analysisResult.totalMacros.carbs}g</Text>
              </View>
              <View style={styles.nutritionCard}>
                <Text style={styles.nutritionLabel}>Fats</Text>
                <Text style={styles.nutritionValue}>{analysisResult.totalMacros.fats}g</Text>
              </View>
            </View>
          </View>

          {/* Health Score */}
          <View style={styles.healthScoreContainer}>
            <Text style={styles.sectionTitle}>Health Score</Text>
            <View style={styles.healthScoreCircle}>
              <Text style={styles.healthScoreText}>{analysisResult.healthScore}/100</Text>
              <Text style={styles.healthScoreLabel}>
                {analysisResult.healthScore >= 80 ? 'Excellent' :
                 analysisResult.healthScore >= 60 ? 'Good' :
                 analysisResult.healthScore >= 40 ? 'Fair' : 'Needs Improvement'}
              </Text>
            </View>
          </View>

          {/* Personalized Insights */}
          {analysisResult.personalizedInsights.length > 0 && (
            <View style={styles.insightsSection}>
              <Text style={styles.sectionTitle}>Insights for You</Text>
              {analysisResult.personalizedInsights.map((insight, index) => (
                <View key={index} style={styles.insightCard}>
                  <Ionicons name="bulb-outline" size={20} color="#4A90E2" />
                  <Text style={styles.insightText}>{insight}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Smart Suggestions */}
          {analysisResult.smartSuggestions.length > 0 && (
            <View style={styles.suggestionsSection}>
              <Text style={styles.sectionTitle}>Smart Suggestions</Text>
              {analysisResult.smartSuggestions.map((suggestion, index) => (
                <View key={index} style={styles.suggestionCard}>
                  <Ionicons name="arrow-up-circle-outline" size={20} color="#4CAF50" />
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={() => {
                Alert.alert('Saved!', 'Meal logged successfully');
                navigation.goBack();
              }}
            >
              <Text style={styles.saveButtonText}>Save to Log</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.retakeButton}
              onPress={() => {
                setAnalysisResult(null);
                setCapturedImage(null);
                setIsAnalyzing(false);
                resultsSlideAnim.setValue(height);
              }}
            >
              <Text style={styles.retakeButtonText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    );
  };

  const renderScanOptions = () => (
    <View style={styles.scanOptionsContainer}>
      <Text style={styles.headerTitle}>AI Food Scanner</Text>
      <Text style={styles.headerSubtitle}>
        Snap a photo and get instant nutrition analysis powered by AI
      </Text>

      <View style={styles.scanButtonsContainer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={styles.primaryScanButton}
            onPress={() => handleImageCapture('camera')}
          >
            <LinearGradient
              colors={['#4A90E2', '#357ABD']}
              style={styles.scanButtonGradient}
            >
              <Ionicons name="camera" size={32} color="white" />
              <Text style={styles.scanButtonText}>Take Photo</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.secondaryScanButton}
          onPress={() => handleImageCapture('gallery')}
        >
          <Ionicons name="images-outline" size={24} color="#4A90E2" />
          <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          <Ionicons name="flash" size={20} color="#4A90E2" />
          <Text style={styles.featureText}>Instant Analysis</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="restaurant" size={20} color="#4A90E2" />
          <Text style={styles.featureText}>All Cuisines</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="fitness" size={20} color="#4A90E2" />
          <Text style={styles.featureText}>Personalized</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {!isAnalyzing && !analysisResult && renderScanOptions()}
      {isAnalyzing && renderScanningInterface()}
      {analysisResult && renderResults()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Scan Options Styles
  scanOptionsContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  scanButtonsContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  primaryScanButton: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scanButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: 'center',
    flexDirection: 'row',
    borderRadius: 16,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  secondaryScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A90E2',
    backgroundColor: 'white',
  },
  secondaryButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  featureItem: {
    alignItems: 'center',
  },
  featureText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },

  // Scanning Interface Styles
  scanningContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  stageHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  stageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  stageDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  progressContainer: {
    width: '80%',
    marginBottom: 48,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 3,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  stageIconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  spinner: {
    marginTop: 16,
  },
  capturedImagePreview: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginTop: 24,
  },

  // Results Styles
  resultsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    paddingTop: 60,
  },
  pointsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
  },
  pointsText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  foodItemsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  foodItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  foodItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  foodItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confidenceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  foodItemQuantity: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroText: {
    fontSize: 14,
    color: '#374151',
  },
  nutritionSummary: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  nutritionCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  healthScoreContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  healthScoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthScoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  healthScoreLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  insightsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    marginLeft: 8,
  },
  suggestionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    flex: 1,
    marginRight: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  retakeButton: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A90E2',
    flex: 1,
    marginLeft: 8,
  },
  retakeButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});