import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ConversationContext {
  messageCount: number;
  detectedEmotions: string[];
  keyPhrases: string[];
  userResponses: string[];
  assessmentData: AssessmentData;
}

export interface AssessmentData {
  energy: number; // 1-5
  emotionalBalance: number; // 1-5
  socialConnection: number; // 1-5
  stressLevels: number; // 1-5 (inverted - lower is better)
  purposeFulfillment: number; // 1-5
  keyThemes: string[];
  concernFlags: string[];
  positiveIndicators: string[];
}

export interface MindScoreMetrics {
  overallScore: number; // 0-100
  dimensionScores: {
    vitality: number; // Energy & Physical Wellbeing
    emotional: number; // Emotional Balance & Regulation
    social: number; // Social Wellbeing & Connection
    stress: number; // Stress Management (higher is better)
    purpose: number; // Life Purpose & Fulfillment
  };
  insights: string[];
  microRecommendations: string[];
  trendIndicator: 'improving' | 'stable' | 'concerning';
  confidenceLevel: number; // How confident we are in the assessment
  conversationQuality: number; // How engaged/open the user was
}

export interface ConversationMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  timestamp: Date;
  metadata?: {
    analysisStage?: string;
    emotionalTone?: string;
    engagementLevel?: number;
  };
}

export class MindScoreChatService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private maxExchanges = 5; // Keep it short for attention-deficit users

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.9, // Higher for more natural conversation
        maxOutputTokens: 150, // Keep responses short
      }
    });
  }

  /**
   * Initiates the conversational assessment with a natural, engaging opener
   */
  async startConversation(): Promise<ConversationMessage> {
    const openers = [
      "Hey! 🌟 What's been keeping you busy this week?",
      "Hi there! If today was a color, what would it be?",
      "Hello! What's something small that made you smile recently?",
      "Hey! If you had a completely free hour right now, what would you do?",
      "Hi! What's the most interesting thing that happened to you lately?"
    ];

    const selectedOpener = openers[Math.floor(Math.random() * openers.length)];
    
    return {
      id: this.generateMessageId(),
      role: 'ai',
      text: selectedOpener,
      timestamp: new Date(),
      metadata: {
        analysisStage: 'opening',
        emotionalTone: 'warm',
        engagementLevel: 100
      }
    };
  }

  /**
   * Processes user response and generates next question with silent psychological analysis
   */
  async generateNextQuestion(
    context: ConversationContext,
    userMessage: string
  ): Promise<{ 
    message: ConversationMessage; 
    shouldConclude: boolean; 
    analysisUpdate: Partial<AssessmentData> 
  }> {
    
    const systemPrompt = `You are an expert conversational AI therapist conducting a subtle mental wellness assessment.

CRITICAL CONVERSATION RULES:
1. Keep responses under 25 words
2. Be warm, authentic, and naturally curious (like a close friend)
3. NEVER ask direct clinical questions like "How is your mood?" or "Are you stressed?"
4. Use indirect behavioral questions to infer mental state
5. Make the conversation feel organic and engaging
6. Use minimal emojis (max 1 per response)
7. End gracefully when you have sufficient data

ASSESSMENT STRATEGY:
- Exchange 1-2: Explore current activities, recent experiences (gauge energy & engagement)
- Exchange 3-4: Dig into social connections, daily routines (assess social wellbeing & stress)
- Exchange 5: Future-focused questions (purpose & outlook)

CONVERSATION CONTEXT:
Message Count: ${context.messageCount}/${this.maxExchanges}
Previous Responses: ${JSON.stringify(context.userResponses)}
Current Assessment Data: ${JSON.stringify(context.assessmentData)}

USER JUST SAID: "${userMessage}"

TASK:
1. Generate a natural follow-up question that:
   - Builds on what they just shared
   - Indirectly reveals mental health indicators
   - Keeps them engaged and wanting to respond
   - Feels like natural conversation flow

2. Silently analyze their response for:
   - Energy levels (high/medium/low engagement, enthusiasm)
   - Emotional tone (positive/neutral/negative indicators)
   - Social elements (mentions of others, isolation, connection)
   - Stress markers (overwhelm, time pressure, worry)
   - Purpose indicators (goals, interests, motivation)

RESPONSE FORMAT:
{
  "nextQuestion": "Your engaging follow-up question here",
  "silentAnalysis": {
    "energy": 1-5,
    "emotionalBalance": 1-5,
    "socialConnection": 1-5,
    "stressLevels": 1-5,
    "purposeFulfillment": 1-5,
    "keyThemes": ["theme1", "theme2"],
    "concernFlags": ["flag if any"],
    "positiveIndicators": ["positive sign"],
    "confidenceLevel": 1-5
  },
  "shouldConclude": ${context.messageCount >= this.maxExchanges - 1}
}`;

    try {
      const result = await this.model.generateContent([{ text: systemPrompt }]);
      const response = result.response.text();
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid conversation response format');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Update conversation context
      context.messageCount++;
      context.userResponses.push(userMessage);
      
      // Update assessment data
      const analysisUpdate = parsed.silentAnalysis;
      context.assessmentData = this.mergeAssessmentData(context.assessmentData, analysisUpdate);

      const conversationMessage: ConversationMessage = {
        id: this.generateMessageId(),
        role: 'ai',
        text: parsed.nextQuestion,
        timestamp: new Date(),
        metadata: {
          analysisStage: `exchange_${context.messageCount}`,
          emotionalTone: this.detectTone(userMessage),
          engagementLevel: this.calculateEngagement(userMessage)
        }
      };

      return {
        message: conversationMessage,
        shouldConclude: parsed.shouldConclude || context.messageCount >= this.maxExchanges,
        analysisUpdate: analysisUpdate
      };

    } catch (error) {
      console.error('Conversation generation error:', error);
      
      // Fallback response
      const fallbackQuestions = [
        "That's interesting! What usually helps you recharge?",
        "I see! How do you typically spend your free time?",
        "Nice! What's something you're looking forward to?",
        "Cool! How are you feeling about the week ahead?"
      ];

      return {
        message: {
          id: this.generateMessageId(),
          role: 'ai',
          text: fallbackQuestions[context.messageCount % fallbackQuestions.length],
          timestamp: new Date()
        },
        shouldConclude: context.messageCount >= this.maxExchanges,
        analysisUpdate: {}
      };
    }
  }

  /**
   * Concludes the conversation gracefully and prepares for Mind Score calculation
   */
  async concludeConversation(): Promise<ConversationMessage> {
    const conclusions = [
      "Thanks for sharing! I'm putting together some insights for you... ✨",
      "Appreciate you opening up! Let me analyze this and show you your Mind Score 🧠",
      "This was great! Give me a moment to process everything and create your wellness snapshot 🌟",
      "Perfect! I'll compile this into your personalized Mind Score in just a sec 💫"
    ];

    const selectedConclusion = conclusions[Math.floor(Math.random() * conclusions.length)];

    return {
      id: this.generateMessageId(),
      role: 'ai',
      text: selectedConclusion,
      timestamp: new Date(),
      metadata: {
        analysisStage: 'conclusion',
        emotionalTone: 'supportive',
        engagementLevel: 100
      }
    };
  }

  /**
   * Calculates comprehensive Mind Score based on conversation analysis
   */
  async calculateMindScore(
    conversationHistory: ConversationMessage[],
    finalAssessmentData: AssessmentData
  ): Promise<MindScoreMetrics> {
    
    const analysisPrompt = `You are a clinical psychologist analyzing a conversational mental wellness assessment.

CONVERSATION HISTORY:
${conversationHistory.map((msg, i) => 
  `${msg.role.toUpperCase()}: ${msg.text}`
).join('\n')}

ACCUMULATED ASSESSMENT DATA:
${JSON.stringify(finalAssessmentData, null, 2)}

CALCULATE COMPREHENSIVE MIND SCORE:

1. DIMENSIONAL ANALYSIS (0-100 for each):
   - VITALITY: Energy levels, enthusiasm, physical wellbeing indicators
   - EMOTIONAL: Emotional balance, mood stability, emotional regulation
   - SOCIAL: Connection quality, social support, relationship satisfaction
   - STRESS: Stress management ability (higher score = better management)
   - PURPOSE: Life fulfillment, motivation, goal clarity

2. OVERALL SCORE: Weighted average with vitality and emotional having higher weights

3. INSIGHTS: 2-3 specific, actionable insights about their mental state (each 15-20 words)

4. MICRO-RECOMMENDATIONS: 3 very specific, achievable actions (each under 15 words)

5. TREND ASSESSMENT: Based on conversation tone and content patterns

6. CONFIDENCE: How reliable is this assessment based on conversation quality

RETURN EXACTLY THIS JSON FORMAT:
{
  "overallScore": 0-100,
  "dimensionScores": {
    "vitality": 0-100,
    "emotional": 0-100,
    "social": 0-100,
    "stress": 0-100,
    "purpose": 0-100
  },
  "insights": ["insight 1", "insight 2", "insight 3"],
  "microRecommendations": ["action 1", "action 2", "action 3"],
  "trendIndicator": "improving/stable/concerning",
  "confidenceLevel": 0-100,
  "conversationQuality": 0-100
}`;

    try {
      const result = await this.model.generateContent([{ text: analysisPrompt }]);
      const response = result.response.text();
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid mind score calculation response');
      }

      const mindScore: MindScoreMetrics = JSON.parse(jsonMatch[0]);
      
      // Validate and sanitize scores
      return this.validateMindScore(mindScore);
      
    } catch (error) {
      console.error('Mind score calculation error:', error);
      
      // Fallback calculation based on assessment data
      return this.calculateFallbackMindScore(finalAssessmentData);
    }
  }

  /**
   * Gamification: Calculate streak bonus for consistent check-ins
   */
  calculateStreakBonus(lastCheckInDate: Date | null): number {
    if (!lastCheckInDate) return 10; // First time bonus

    const daysDiff = Math.floor(
      (Date.now() - lastCheckInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysDiff === 1) return 25; // Perfect daily streak
    if (daysDiff <= 3) return 20; // Good consistency  
    if (daysDiff <= 7) return 15; // Weekly check-in
    return 5; // Base points for any check-in
  }

  /**
   * Generate achievement badges based on Mind Score patterns
   */
  generateAchievements(mindScore: MindScoreMetrics, previousScores: MindScoreMetrics[]): string[] {
    const achievements: string[] = [];

    // Score-based achievements
    if (mindScore.overallScore >= 80) achievements.push("Wellness Warrior");
    if (mindScore.dimensionScores.stress >= 75) achievements.push("Zen Master");
    if (mindScore.dimensionScores.social >= 80) achievements.push("Social Butterfly");
    if (mindScore.dimensionScores.purpose >= 85) achievements.push("Purpose Pioneer");

    // Improvement-based achievements
    if (previousScores.length > 0) {
      const lastScore = previousScores[previousScores.length - 1];
      const improvement = mindScore.overallScore - lastScore.overallScore;
      
      if (improvement >= 10) achievements.push("Upward Trajectory");
      if (improvement >= 20) achievements.push("Transformation Champion");
    }

    // Consistency achievements
    if (previousScores.length >= 4) achievements.push("Consistent Checker");
    if (previousScores.length >= 12) achievements.push("Year-Long Warrior");

    return achievements;
  }

  // Private helper methods
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private detectTone(message: string): string {
    const positiveWords = ['good', 'great', 'amazing', 'happy', 'excited', 'love', 'awesome'];
    const negativeWords = ['bad', 'terrible', 'sad', 'stressed', 'tired', 'worried', 'difficult'];
    
    const lowerMessage = message.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private calculateEngagement(message: string): number {
    // Simple engagement calculation based on message length and detail
    const wordCount = message.split(' ').length;
    const hasDetail = message.includes('because') || message.includes('since') || message.length > 50;
    
    let engagement = Math.min(100, wordCount * 10);
    if (hasDetail) engagement += 20;
    
    return Math.max(20, engagement); // Minimum 20% engagement
  }

  private mergeAssessmentData(current: AssessmentData, update: Partial<AssessmentData>): AssessmentData {
    return {
      energy: update.energy ?? current.energy,
      emotionalBalance: update.emotionalBalance ?? current.emotionalBalance,
      socialConnection: update.socialConnection ?? current.socialConnection,
      stressLevels: update.stressLevels ?? current.stressLevels,
      purposeFulfillment: update.purposeFulfillment ?? current.purposeFulfillment,
      keyThemes: [...(current.keyThemes || []), ...(update.keyThemes || [])],
      concernFlags: [...(current.concernFlags || []), ...(update.concernFlags || [])],
      positiveIndicators: [...(current.positiveIndicators || []), ...(update.positiveIndicators || [])]
    };
  }

  private validateMindScore(score: any): MindScoreMetrics {
    return {
      overallScore: Math.max(0, Math.min(100, score.overallScore || 50)),
      dimensionScores: {
        vitality: Math.max(0, Math.min(100, score.dimensionScores?.vitality || 50)),
        emotional: Math.max(0, Math.min(100, score.dimensionScores?.emotional || 50)),
        social: Math.max(0, Math.min(100, score.dimensionScores?.social || 50)),
        stress: Math.max(0, Math.min(100, score.dimensionScores?.stress || 50)),
        purpose: Math.max(0, Math.min(100, score.dimensionScores?.purpose || 50))
      },
      insights: score.insights?.slice(0, 3) || ['Regular check-ins help track wellness trends'],
      microRecommendations: score.microRecommendations?.slice(0, 3) || ['Take 5 deep breaths daily'],
      trendIndicator: ['improving', 'stable', 'concerning'].includes(score.trendIndicator) 
        ? score.trendIndicator 
        : 'stable',
      confidenceLevel: Math.max(0, Math.min(100, score.confidenceLevel || 70)),
      conversationQuality: Math.max(0, Math.min(100, score.conversationQuality || 70))
    };
  }

  private calculateFallbackMindScore(assessmentData: AssessmentData): MindScoreMetrics {
    // Simple fallback calculation
    const avgScore = (
      assessmentData.energy + 
      assessmentData.emotionalBalance + 
      assessmentData.socialConnection + 
      (6 - assessmentData.stressLevels) + // Invert stress
      assessmentData.purposeFulfillment
    ) / 5;

    const normalizedScore = Math.round((avgScore / 5) * 100);

    return {
      overallScore: normalizedScore,
      dimensionScores: {
        vitality: Math.round((assessmentData.energy / 5) * 100),
        emotional: Math.round((assessmentData.emotionalBalance / 5) * 100),
        social: Math.round((assessmentData.socialConnection / 5) * 100),
        stress: Math.round(((6 - assessmentData.stressLevels) / 5) * 100),
        purpose: Math.round((assessmentData.purposeFulfillment / 5) * 100)
      },
      insights: [
        'Your responses show unique patterns in your wellness journey',
        'Continue regular check-ins to track your progress',
        'Small daily improvements make a big difference'
      ],
      microRecommendations: [
        'Take 3 minutes daily for mindful breathing',
        'Connect with someone you care about this week',
        'Set one small achievable goal for tomorrow'
      ],
      trendIndicator: 'stable',
      confidenceLevel: 70,
      conversationQuality: 70
    };
  }
}