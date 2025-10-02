import { GoogleGenerativeAI } from '@google/generative-ai';
import * as FileSystem from 'expo-file-system';

export interface UserProfile {
  id: string;
  gender: 'male' | 'female';
  weight: number; // kg
  height: number; // cm
  physicalActivity: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  healthConditions: string[];
  age: number;
  bmi?: number;
  tdee?: number; // Total Daily Energy Expenditure
}

export interface FoodItem {
  name: string;
  quantity: string;
  confidence: number; // 0-100
  calories: number;
  macros: {
    protein: number; // grams
    carbs: number;
    fats: number;
    fiber: number;
    sugar: number;
  };
  micronutrients: {
    vitamins: Record<string, number>;
    minerals: Record<string, number>;
  };
  cookingMethod: string;
}

export interface FoodAnalysis {
  foodItems: FoodItem[];
  totalCalories: number;
  totalMacros: {
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  cuisineType: string; // Auto-detected regional preference
  dietaryTags: string[]; // vegetarian, vegan, gluten-free, etc.
  communityClassification: string; // Maharashtrian, South Indian, etc.
  healthScore: number; // 0-100 based on user's health conditions
  confidenceLevel: number; // Overall analysis confidence
  personalizedInsights: string[];
  smartSuggestions: string[];
  nutritionalWarnings: string[];
  calorieImpact: {
    percentageOfDailyGoal: number;
    alignmentWithTargets: 'under' | 'optimal' | 'over';
    macroBalance: 'poor' | 'good' | 'excellent';
  };
}

export interface RefinedAnalysis extends FoodAnalysis {
  userSpecificRecommendations: string[];
  healthConditionAlerts: string[];
  alternativeSuggestions: Array<{
    item: string;
    replacement: string;
    benefit: string;
  }>;
}

export class FoodRecognitionService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.3, // Lower for more consistent analysis
        maxOutputTokens: 2048,
      }
    });
  }

  /**
   * Step 1: Initial Food Recognition
   * Uses Gemini 2.5 Flash's multimodal capabilities for comprehensive food analysis
   */
  async analyzeFoodImage(imageUri: string): Promise<FoodAnalysis> {
    const prompt = `You are an expert nutritionist AI with deep knowledge of global cuisines and nutrition science.

ANALYZE THIS FOOD IMAGE WITH PRECISION:

1. FOOD IDENTIFICATION:
   - Identify ALL visible food items with confidence scores (0-100)
   - Estimate portion sizes in grams using visual cues (plate size, utensils, comparison objects)
   - Identify cooking methods (fried, grilled, steamed, raw, baked, sautéed)

2. NUTRITIONAL ANALYSIS:
   - Calculate detailed macronutrients for each item:
     * Calories (kcal)
     * Protein (g)
     * Carbohydrates (g)
     * Fats (g)
     * Fiber (g)
     * Sugar (g)
   - Estimate key micronutrients (vitamins A, C, D, B12, minerals like iron, calcium)

3. CULTURAL & DIETARY CLASSIFICATION:
   - Regional cuisine identification (Indian, Chinese, Italian, etc.)
   - Sub-regional classification (South Indian, Maharashtrian, Punjabi, etc.)
   - Meal type based on composition and typical eating patterns
   - Dietary tags (vegetarian, non-vegetarian, vegan, gluten-free, dairy-free)

4. HEALTH ASSESSMENT:
   - Overall health score (0-100) based on nutritional density
   - Cooking method health impact
   - Balanced meal assessment

5. CONFIDENCE & QUALITY:
   - Overall analysis confidence level
   - Individual item confidence scores
   - Any uncertainties or assumptions made

RETURN STRICTLY AS JSON IN THIS EXACT FORMAT:
{
  "foodItems": [
    {
      "name": "item name",
      "quantity": "estimated amount in grams",
      "confidence": 0-100,
      "calories": 0,
      "macros": {
        "protein": 0,
        "carbs": 0,
        "fats": 0,
        "fiber": 0,
        "sugar": 0
      },
      "micronutrients": {
        "vitamins": {"A": 0, "C": 0, "D": 0, "B12": 0},
        "minerals": {"iron": 0, "calcium": 0, "potassium": 0}
      },
      "cookingMethod": "method"
    }
  ],
  "totalCalories": 0,
  "totalMacros": {
    "protein": 0,
    "carbs": 0,
    "fats": 0,
    "fiber": 0
  },
  "mealType": "breakfast/lunch/dinner/snack",
  "cuisineType": "cuisine name",
  "dietaryTags": ["vegetarian", "high-protein", etc],
  "communityClassification": "specific regional classification",
  "healthScore": 0-100,
  "confidenceLevel": 0-100,
  "personalizedInsights": ["insight 1", "insight 2"],
  "smartSuggestions": ["suggestion 1", "suggestion 2"],
  "nutritionalWarnings": ["warning if any"]
}`;

    try {
      // Convert image to proper format for Gemini
      const imageData = await this.prepareImageData(imageUri);
      
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageData
          }
        }
      ]);

      const response = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid AI response format');
      }

      const analysis: FoodAnalysis = JSON.parse(jsonMatch[0]);
      
      // Validate and sanitize the response
      return this.validateAndSanitizeAnalysis(analysis);
      
    } catch (error) {
      console.error('Food analysis error:', error);
      throw new Error(`Food analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Step 2: Contextual Refinement
   * Refines the analysis using user profile data for personalized insights
   */
  async refineNutritionData(
    initialAnalysis: FoodAnalysis, 
    userProfile: UserProfile
  ): Promise<RefinedAnalysis> {
    
    // Calculate user's daily requirements
    const dailyRequirements = this.calculateDailyRequirements(userProfile);
    
    const refinementPrompt = `You are a personalized nutrition advisor. Refine this food analysis for this specific user.

INITIAL FOOD ANALYSIS:
${JSON.stringify(initialAnalysis, null, 2)}

USER PROFILE:
- Gender: ${userProfile.gender}
- Age: ${userProfile.age}
- Weight: ${userProfile.weight}kg
- Height: ${userProfile.height}cm
- BMI: ${userProfile.bmi}
- Activity Level: ${userProfile.physicalActivity}
- Health Conditions: ${(userProfile.healthConditions || []).join(', ') || 'None'}
- Daily Calorie Target: ${dailyRequirements.calories}
- Daily Protein Target: ${dailyRequirements.protein}g

REFINE AND PERSONALIZE:

1. CALORIE IMPACT ANALYSIS:
   - Percentage of daily calorie goal this meal represents
   - Alignment assessment (under/optimal/over)
   - Macro balance quality for this user

2. HEALTH CONDITION SPECIFIC ALERTS:
   - Any ingredients/nutrients that conflict with health conditions
   - Specific warnings or cautions
   - Beneficial aspects for their conditions

3. PERSONALIZED RECOMMENDATIONS:
   - User-specific suggestions based on their goals and profile
   - Timing recommendations (when to eat this meal)
   - Portion adjustments if needed

4. SMART ALTERNATIVES:
   - Better ingredient swaps specific to this meal
   - How to improve the meal's nutritional profile
   - Regional alternatives that maintain cultural preferences

RETURN AS JSON:
{
  "calorieImpact": {
    "percentageOfDailyGoal": 0,
    "alignmentWithTargets": "under/optimal/over",
    "macroBalance": "poor/good/excellent"
  },
  "userSpecificRecommendations": ["recommendation 1", "recommendation 2"],
  "healthConditionAlerts": ["alert if any"],
  "alternativeSuggestions": [
    {
      "item": "current item",
      "replacement": "better alternative",
      "benefit": "why it's better"
    }
  ]
}`;

    try {
      const result = await this.model.generateContent([{ text: refinementPrompt }]);
      const response = result.response.text();
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid refinement response format');
      }

      const refinement = JSON.parse(jsonMatch[0]);
      
      // Merge with initial analysis
      const refinedAnalysis: RefinedAnalysis = {
        ...initialAnalysis,
        ...refinement
      };

      return refinedAnalysis;
      
    } catch (error) {
      console.error('Refinement error:', error);
      // Return original analysis if refinement fails
      return {
        ...initialAnalysis,
        userSpecificRecommendations: [],
        healthConditionAlerts: [],
        alternativeSuggestions: [],
        calorieImpact: {
          percentageOfDailyGoal: 0,
          alignmentWithTargets: 'optimal',
          macroBalance: 'good'
        }
      };
    }
  }

  /**
   * Complete analysis pipeline combining both steps
   */
  async analyzeFood(imageUri: string, userProfile: UserProfile): Promise<RefinedAnalysis> {
    // Step 1: Initial recognition
    const initialAnalysis = await this.analyzeFoodImage(imageUri);
    
    // Step 2: Contextual refinement
    const refinedAnalysis = await this.refineNutritionData(initialAnalysis, userProfile);
    
    return refinedAnalysis;
  }

  private async prepareImageData(imageUri: string): Promise<string> {
    try {
      // Use expo-file-system to read the image as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      console.error('Error preparing image data:', error);
      throw new Error('Failed to prepare image data');
    }
  }

  private validateAndSanitizeAnalysis(analysis: any): FoodAnalysis {
    // Ensure all required fields exist with defaults
    return {
      foodItems: analysis.foodItems || [],
      totalCalories: analysis.totalCalories || 0,
      totalMacros: analysis.totalMacros || { protein: 0, carbs: 0, fats: 0, fiber: 0 },
      mealType: analysis.mealType || 'snack',
      cuisineType: analysis.cuisineType || 'Unknown',
      dietaryTags: analysis.dietaryTags || [],
      communityClassification: analysis.communityClassification || 'General',
      healthScore: Math.max(0, Math.min(100, analysis.healthScore || 50)),
      confidenceLevel: Math.max(0, Math.min(100, analysis.confidenceLevel || 50)),
      personalizedInsights: analysis.personalizedInsights || [],
      smartSuggestions: analysis.smartSuggestions || [],
      nutritionalWarnings: analysis.nutritionalWarnings || [],
      calorieImpact: {
        percentageOfDailyGoal: 0,
        alignmentWithTargets: 'optimal',
        macroBalance: 'good'
      }
    };
  }

  private calculateDailyRequirements(profile: UserProfile) {
    // Calculate BMR using Mifflin-St Jeor equation
    let bmr: number;
    if (profile.gender === 'male') {
      bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    } else {
      bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    }

    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };

    const tdee = bmr * activityMultipliers[profile.physicalActivity];
    
    return {
      calories: Math.round(tdee),
      protein: Math.round(profile.weight * 0.8), // 0.8g per kg body weight
      carbs: Math.round((tdee * 0.45) / 4), // 45% of calories from carbs
      fats: Math.round((tdee * 0.3) / 9) // 30% of calories from fats
    };
  }
}