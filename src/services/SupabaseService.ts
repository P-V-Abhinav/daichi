import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Database Types
export interface UserProfile {
  id: string;
  created_at: string;
  updated_at: string;
  email?: string;
  name?: string;
  gender: 'male' | 'female';
  age: number;
  weight: number; // kg
  height: number; // cm
  physical_activity: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  health_conditions: string[];
  bmi?: number;
  tdee?: number;
  streak_count: number;
  total_points: number;
  current_badges: string[];
  onboarding_completed: boolean;
}

export interface FoodLog {
  id: string;
  user_id: string;
  created_at: string;
  image_url?: string;
  analysis_data: any; // JSON field for FoodAnalysis
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  total_calories: number;
  health_score: number;
  cuisine_type: string;
  confidence_level: number;
  points_earned: number;
}

export interface MindScore {
  id: string;
  user_id: string;
  created_at: string;
  overall_score: number;
  vitality_score: number;
  emotional_score: number;
  social_score: number;
  stress_score: number;
  purpose_score: number;
  insights: string[];
  recommendations: string[];
  trend_indicator: 'improving' | 'stable' | 'concerning';
  conversation_data: any; // JSON field for conversation history
  confidence_level: number;
  points_earned: number;
}

export interface Achievement {
  id: string;
  user_id: string;
  badge_name: string;
  earned_at: string;
  category: 'food' | 'mind' | 'streak' | 'social';
  description: string;
  points_value: number;
}

export interface UserStreak {
  id: string;
  user_id: string;
  streak_type: 'food_logging' | 'mind_check' | 'combined';
  current_count: number;
  best_count: number;
  last_activity: string;
  created_at: string;
}

export class SupabaseService {
  private supabase;

  constructor() {
    const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = Constants.expoConfig?.extra?.supabaseKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // User Profile Management
  async createUserProfile(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile> {
    const profileData = {
      ...profile,
      bmi: this.calculateBMI(profile.weight, profile.height),
      tdee: this.calculateTDEE({
        ...profile,
        id: '',
        created_at: '',
        updated_at: '',
        bmi: 0,
        tdee: 0,
      }),
      streak_count: 0,
      total_points: 0,
      current_badges: [],
      onboarding_completed: true
    };
    
    const { data, error } = await this.supabase
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return data;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    // Recalculate BMI and TDEE if weight/height/activity changed
    if (updates.weight || updates.height || updates.physical_activity) {
      const currentProfile = await this.getUserProfile(userId);
      if (currentProfile) {
        updates.bmi = this.calculateBMI(
          updates.weight || currentProfile.weight, 
          updates.height || currentProfile.height
        );
        updates.tdee = this.calculateTDEE({
          ...currentProfile,
          ...updates
        } as UserProfile);
      }
    }

    const { data, error } = await this.supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Food Logging
  async saveFoodLog(
    userId: string, 
    analysisData: any, 
    imageUrl?: string, 
    pointsEarned: number = 0
  ): Promise<FoodLog> {
    const { data, error } = await this.supabase
      .from('food_logs')
      .insert({
        user_id: userId,
        image_url: imageUrl,
        analysis_data: analysisData,
        meal_type: analysisData.mealType,
        total_calories: analysisData.totalCalories,
        health_score: analysisData.healthScore,
        cuisine_type: analysisData.cuisineType,
        confidence_level: analysisData.confidenceLevel,
        points_earned: pointsEarned
      })
      .select()
      .single();

    if (error) throw error;

    // Update user's total points and streak
    await this.updateUserPointsAndStreak(userId, pointsEarned, 'food_logging');

    return data;
  }

  async getFoodLogs(
    userId: string, 
    limit: number = 10, 
    offset: number = 0
  ): Promise<FoodLog[]> {
    const { data, error } = await this.supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  async getTodaysFoodLogs(userId: string): Promise<FoodLog[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await this.supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', today)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Mind Score Management
  async saveMindScore(
    userId: string,
    mindScore: any,
    conversationData: any,
    pointsEarned: number = 0
  ): Promise<MindScore> {
    const { data, error } = await this.supabase
      .from('mind_scores')
      .insert({
        user_id: userId,
        overall_score: mindScore.overallScore,
        vitality_score: mindScore.dimensionScores.vitality,
        emotional_score: mindScore.dimensionScores.emotional,
        social_score: mindScore.dimensionScores.social,
        stress_score: mindScore.dimensionScores.stress,
        purpose_score: mindScore.dimensionScores.purpose,
        insights: mindScore.insights,
        recommendations: mindScore.microRecommendations,
        trend_indicator: mindScore.trendIndicator,
        conversation_data: conversationData,
        confidence_level: mindScore.confidenceLevel,
        points_earned: pointsEarned
      })
      .select()
      .single();

    if (error) throw error;

    // Update user's total points and streak
    await this.updateUserPointsAndStreak(userId, pointsEarned, 'mind_check');

    return data;
  }

  async getMindScores(
    userId: string, 
    limit: number = 10, 
    offset: number = 0
  ): Promise<MindScore[]> {
    const { data, error } = await this.supabase
      .from('mind_scores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  async getLatestMindScore(userId: string): Promise<MindScore | null> {
    const { data, error } = await this.supabase
      .from('mind_scores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  // Achievement System
  async awardAchievement(
    userId: string,
    badgeName: string,
    category: 'food' | 'mind' | 'streak' | 'social',
    description: string,
    pointsValue: number
  ): Promise<Achievement | null> {
    // Check if user already has this achievement
    const existing = await this.supabase
      .from('achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('badge_name', badgeName)
      .single();

    if (existing.data) {
      return existing.data as Achievement; // Already has this achievement
    }

    const { data, error } = await this.supabase
      .from('achievements')
      .insert({
        user_id: userId,
        badge_name: badgeName,
        category,
        description,
        points_value: pointsValue
      })
      .select()
      .single();

    if (error) throw error;

    // Update user's badges and points
    await this.updateUserBadges(userId, badgeName, pointsValue);

    return data;
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    const { data, error } = await this.supabase
      .from('achievements')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Streak Management
  async updateUserPointsAndStreak(
    userId: string, 
    points: number, 
    activityType: 'food_logging' | 'mind_check'
  ): Promise<void> {
    // Update total points
    await this.supabase.rpc('increment_user_points', {
      user_id: userId,
      points_to_add: points
    });

    // Update or create streak
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existingStreak } = await this.supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .eq('streak_type', activityType)
      .single();

    if (existingStreak) {
      const lastActivity = new Date(existingStreak.last_activity);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      let newCount = existingStreak.current_count;
      
      if (diffDays === 1) {
        // Consecutive day - increment streak
        newCount++;
      } else if (diffDays === 0) {
        // Same day - no change to streak
        return;
      } else {
        // Broken streak - reset to 1
        newCount = 1;
      }

      const newBest = Math.max(existingStreak.best_count, newCount);

      await this.supabase
        .from('user_streaks')
        .update({
          current_count: newCount,
          best_count: newBest,
          last_activity: today
        })
        .eq('id', existingStreak.id);

      // Update user profile streak count
      await this.supabase
        .from('user_profiles')
        .update({ streak_count: newCount })
        .eq('id', userId);

    } else {
      // Create new streak
      await this.supabase
        .from('user_streaks')
        .insert({
          user_id: userId,
          streak_type: activityType,
          current_count: 1,
          best_count: 1,
          last_activity: today
        });

      await this.supabase
        .from('user_profiles')
        .update({ streak_count: 1 })
        .eq('id', userId);
    }
  }

  // Analytics & Insights
  async getUserDashboardData(userId: string): Promise<{
    profile: UserProfile;
    todaysFoodLogs: FoodLog[];
    latestMindScore: MindScore | null;
    achievements: Achievement[];
    weeklyProgress: any;
  }> {
    const [profile, todaysFoodLogs, latestMindScore, achievements] = await Promise.all([
      this.getUserProfile(userId),
      this.getTodaysFoodLogs(userId),
      this.getLatestMindScore(userId),
      this.getUserAchievements(userId)
    ]);

    // Calculate weekly progress
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: weeklyFood } = await this.supabase
      .from('food_logs')
      .select('created_at, total_calories, health_score')
      .eq('user_id', userId)
      .gte('created_at', weekAgo.toISOString());

    const { data: weeklyMind } = await this.supabase
      .from('mind_scores')
      .select('created_at, overall_score')
      .eq('user_id', userId)
      .gte('created_at', weekAgo.toISOString());

    return {
      profile: profile!,
      todaysFoodLogs,
      latestMindScore,
      achievements,
      weeklyProgress: {
        foodLogs: weeklyFood || [],
        mindScores: weeklyMind || []
      }
    };
  }

  // Private helper methods
  private calculateBMI(weight: number, height: number): number {
    const heightInMeters = height / 100;
    return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
  }

  private calculateTDEE(profile: UserProfile): number {
    // Mifflin-St Jeor Equation
    let bmr: number;
    if (profile.gender === 'male') {
      bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    } else {
      bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    }

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };

    return Math.round(bmr * activityMultipliers[profile.physical_activity]);
  }

  private async updateUserBadges(userId: string, newBadge: string, points: number): Promise<void> {
    const profile = await this.getUserProfile(userId);
    if (!profile) return;

    const updatedBadges = [...profile.current_badges, newBadge];
    const updatedPoints = profile.total_points + points;

    await this.supabase
      .from('user_profiles')
      .update({
        current_badges: updatedBadges,
        total_points: updatedPoints
      })
      .eq('id', userId);
  }
}