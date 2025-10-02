import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  weight: number; // kg
  height: number; // cm
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  healthGoals: string[];
  healthConditions: string[];
  dietaryPreferences: string[];
  // Calculated fields
  bmi?: number;
  dailyCalorieTarget?: number;
  dailyProteinTarget?: number;
  dailyCarbTarget?: number;
  dailyFatTarget?: number;
  // Preferences
  notifications: boolean;
  darkMode: boolean;
  units: 'metric' | 'imperial';
}

const defaultProfile: UserProfile = {
  id: '1',
  name: 'User',
  age: 25,
  gender: 'other',
  weight: 70,
  height: 170,
  activityLevel: 'moderate',
  healthGoals: [],
  healthConditions: [],
  dietaryPreferences: [],
  notifications: true,
  darkMode: false,
  units: 'metric',
};

interface Props {
  navigation: any;
  userProfile: UserProfile;
  onProfileUpdate: (profile: UserProfile) => void;
}

export const ProfileScreen: React.FC<Props> = ({ navigation, userProfile, onProfileUpdate }) => {
  const [profile, setProfile] = useState<UserProfile>(userProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile>(userProfile);

  useEffect(() => {
    setProfile(userProfile);
    setEditedProfile(userProfile);
  }, [userProfile]);

  useEffect(() => {
    // Calculate derived values when profile changes
    if (profile.weight && profile.height) {
      const heightInMeters = profile.height / 100;
      const bmi = profile.weight / (heightInMeters * heightInMeters);
      const updatedProfile = {
        ...profile,
        bmi: Math.round(bmi * 10) / 10,
        ...calculateNutritionTargets(profile)
      };
      setProfile(updatedProfile);
    }
  }, [profile.weight, profile.height, profile.age, profile.gender, profile.activityLevel]);

  const saveProfile = async () => {
    try {
      const updatedProfile = {
        ...editedProfile,
        ...calculateNutritionTargets(editedProfile)
      };
      
      onProfileUpdate(updatedProfile);
      setProfile(updatedProfile);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  const calculateNutritionTargets = (userProfile: UserProfile) => {
    // Calculate BMR using Mifflin-St Jeor Equation
    let bmr;
    if (userProfile.gender === 'male') {
      bmr = 10 * userProfile.weight + 6.25 * userProfile.height - 5 * userProfile.age + 5;
    } else {
      bmr = 10 * userProfile.weight + 6.25 * userProfile.height - 5 * userProfile.age - 161;
    }

    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };

    const tdee = bmr * activityMultipliers[userProfile.activityLevel];
    
    // Macro targets (general guidelines)
    const dailyCalorieTarget = Math.round(tdee);
    const dailyProteinTarget = Math.round(userProfile.weight * 1.2); // 1.2g per kg
    const dailyCarbTarget = Math.round((dailyCalorieTarget * 0.45) / 4); // 45% of calories
    const dailyFatTarget = Math.round((dailyCalorieTarget * 0.30) / 9); // 30% of calories

    return {
      dailyCalorieTarget,
      dailyProteinTarget,
      dailyCarbTarget,
      dailyFatTarget
    };
  };

  const toggleHealthGoal = (goal: string) => {
    setEditedProfile(prev => ({
      ...prev,
      healthGoals: prev.healthGoals.includes(goal)
        ? prev.healthGoals.filter(g => g !== goal)
        : [...prev.healthGoals, goal]
    }));
  };

  const toggleHealthCondition = (condition: string) => {
    setEditedProfile(prev => ({
      ...prev,
      healthConditions: prev.healthConditions.includes(condition)
        ? prev.healthConditions.filter(c => c !== condition)
        : [...prev.healthConditions, condition]
    }));
  };

  const toggleDietaryPreference = (preference: string) => {
    setEditedProfile(prev => ({
      ...prev,
      dietaryPreferences: prev.dietaryPreferences.includes(preference)
        ? prev.dietaryPreferences.filter(p => p !== preference)
        : [...prev.dietaryPreferences, preference]
    }));
  };

  const renderEditableField = (
    label: string,
    value: string | number,
    onChangeText: (text: string) => void,
    keyboardType: 'default' | 'numeric' = 'default',
    suffix?: string
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {isEditing ? (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={value.toString()}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
          {suffix && <Text style={styles.suffix}>{suffix}</Text>}
        </View>
      ) : (
        <Text style={styles.fieldValue}>
          {value} {suffix}
        </Text>
      )}
    </View>
  );

  const renderPickerField = (
    label: string,
    value: string,
    options: { label: string; value: string }[],
    onSelect: (value: string) => void
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {isEditing ? (
        <View style={styles.pickerContainer}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.pickerOption,
                value === option.value && styles.pickerOptionSelected
              ]}
              onPress={() => onSelect(option.value)}
            >
              <Text style={[
                styles.pickerOptionText,
                value === option.value && styles.pickerOptionTextSelected
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={styles.fieldValue}>
          {options.find(opt => opt.value === value)?.label || value}
        </Text>
      )}
    </View>
  );

  const renderMultiSelectField = (
    label: string,
    selectedItems: string[],
    options: string[],
    onToggle: (item: string) => void
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {isEditing ? (
        <View style={styles.multiSelectContainer}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.multiSelectOption,
                selectedItems.includes(option) && styles.multiSelectOptionSelected
              ]}
              onPress={() => onToggle(option)}
            >
              <Text style={[
                styles.multiSelectOptionText,
                selectedItems.includes(option) && styles.multiSelectOptionTextSelected
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={styles.fieldValue}>
          {selectedItems.length > 0 ? selectedItems.join(', ') : 'None selected'}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          onPress={() => {
            if (isEditing) {
              saveProfile();
            } else {
              setIsEditing(true);
              setEditedProfile(profile);
            }
          }}
        >
          <Ionicons 
            name={isEditing ? "checkmark" : "create-outline"} 
            size={24} 
            color="#4A90E2" 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Basic Information</Text>
          
          {renderEditableField(
            'Name',
            isEditing ? editedProfile.name : profile.name,
            (text) => setEditedProfile(prev => ({ ...prev, name: text }))
          )}
          
          {renderEditableField(
            'Age',
            isEditing ? editedProfile.age : profile.age,
            (text) => setEditedProfile(prev => ({ ...prev, age: parseInt(text) || 0 })),
            'numeric',
            'years'
          )}
          
          {renderPickerField(
            'Gender',
            isEditing ? editedProfile.gender : profile.gender,
            [
              { label: 'Male', value: 'male' },
              { label: 'Female', value: 'female' },
              { label: 'Other', value: 'other' }
            ],
            (value) => setEditedProfile(prev => ({ ...prev, gender: value as any }))
          )}
        </View>

        {/* Physical Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📏 Physical Metrics</Text>
          
          {renderEditableField(
            'Weight',
            isEditing ? editedProfile.weight : profile.weight,
            (text) => setEditedProfile(prev => ({ ...prev, weight: parseFloat(text) || 0 })),
            'numeric',
            'kg'
          )}
          
          {renderEditableField(
            'Height',
            isEditing ? editedProfile.height : profile.height,
            (text) => setEditedProfile(prev => ({ ...prev, height: parseFloat(text) || 0 })),
            'numeric',
            'cm'
          )}
          
          {profile.bmi && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>BMI</Text>
              <View style={styles.bmiContainer}>
                <Text style={[styles.bmiValue, {
                  color: profile.bmi < 18.5 ? '#FF9800' :
                         profile.bmi < 25 ? '#4CAF50' :
                         profile.bmi < 30 ? '#FF9800' : '#F44336'
                }]}>
                  {profile.bmi}
                </Text>
                <Text style={styles.bmiCategory}>
                  {profile.bmi < 18.5 ? 'Underweight' :
                   profile.bmi < 25 ? 'Normal' :
                   profile.bmi < 30 ? 'Overweight' : 'Obese'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Activity & Lifestyle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏃 Activity & Lifestyle</Text>
          
          {renderPickerField(
            'Activity Level',
            isEditing ? editedProfile.activityLevel : profile.activityLevel,
            [
              { label: 'Sedentary (desk job)', value: 'sedentary' },
              { label: 'Light (1-3 days/week)', value: 'light' },
              { label: 'Moderate (3-5 days/week)', value: 'moderate' },
              { label: 'Active (6-7 days/week)', value: 'active' },
              { label: 'Very Active (2x/day)', value: 'very_active' }
            ],
            (value) => setEditedProfile(prev => ({ ...prev, activityLevel: value as any }))
          )}
        </View>

        {/* Health Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Health Goals</Text>
          {renderMultiSelectField(
            'Goals',
            isEditing ? editedProfile.healthGoals : profile.healthGoals,
            ['Weight Loss', 'Weight Gain', 'Muscle Building', 'Better Sleep', 'Stress Management', 'Improved Energy', 'Better Digestion'],
            toggleHealthGoal
          )}
        </View>

        {/* Health Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏥 Health Conditions</Text>
          {renderMultiSelectField(
            'Conditions',
            isEditing ? editedProfile.healthConditions : profile.healthConditions,
            ['Diabetes', 'Hypertension', 'Heart Disease', 'Allergies', 'Anxiety', 'Depression', 'Arthritis', 'None'],
            toggleHealthCondition
          )}
        </View>

        {/* Dietary Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🥗 Dietary Preferences</Text>
          {renderMultiSelectField(
            'Preferences',
            isEditing ? editedProfile.dietaryPreferences : profile.dietaryPreferences,
            ['Vegetarian', 'Vegan', 'Gluten-Free', 'Keto', 'Paleo', 'Mediterranean', 'Low-Carb', 'Low-Fat'],
            toggleDietaryPreference
          )}
        </View>

        {/* Daily Targets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Daily Nutrition Targets</Text>
          
          <View style={styles.targetsGrid}>
            <View style={styles.targetCard}>
              <Text style={styles.targetValue}>{profile.dailyCalorieTarget || 2000}</Text>
              <Text style={styles.targetLabel}>Calories</Text>
            </View>
            <View style={styles.targetCard}>
              <Text style={styles.targetValue}>{profile.dailyProteinTarget || 60}g</Text>
              <Text style={styles.targetLabel}>Protein</Text>
            </View>
            <View style={styles.targetCard}>
              <Text style={styles.targetValue}>{profile.dailyCarbTarget || 250}g</Text>
              <Text style={styles.targetLabel}>Carbs</Text>
            </View>
            <View style={styles.targetCard}>
              <Text style={styles.targetValue}>{profile.dailyFatTarget || 70}g</Text>
              <Text style={styles.targetLabel}>Fats</Text>
            </View>
          </View>
        </View>

        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ App Preferences</Text>
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Notifications</Text>
            <Switch
              value={isEditing ? editedProfile.notifications : profile.notifications}
              onValueChange={(value) => setEditedProfile(prev => ({ ...prev, notifications: value }))}
              disabled={!isEditing}
            />
          </View>
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Dark Mode</Text>
            <Switch
              value={isEditing ? editedProfile.darkMode : profile.darkMode}
              onValueChange={(value) => setEditedProfile(prev => ({ ...prev, darkMode: value }))}
              disabled={!isEditing}
            />
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  suffix: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickerOptionSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  pickerOptionTextSelected: {
    color: 'white',
  },
  multiSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  multiSelectOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  multiSelectOptionSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  multiSelectOptionText: {
    fontSize: 12,
    color: '#374151',
  },
  multiSelectOptionTextSelected: {
    color: 'white',
  },
  bmiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bmiValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 12,
  },
  bmiCategory: {
    fontSize: 14,
    color: '#6B7280',
  },
  targetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  targetCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  targetValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 4,
  },
  targetLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  switchLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
  bottomSpacing: {
    height: 40,
  },
});