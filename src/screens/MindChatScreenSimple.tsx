import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Message {
  id: string;
  text: string;
  isAI: boolean;
  timestamp: Date;
  sentiment?: 'positive' | 'neutral' | 'negative';
  stressFlags?: string[];
  engagementLevel?: number; // 1-10
}

interface ConversationState {
  emotionalTone: 'positive' | 'neutral' | 'stressed' | 'low';
  stressFlags: string[];
  engagementLevel: number;
  energyLevel: number;
  responses: string[];
  // Silent Assessment Dimensions (1-5 scale)
  silentAnalysis: {
    energy: number;           // Energy/Vitality
    emotionalBalance: number; // Emotional Balance
    socialConnection: number; // Social Engagement
    stress: number;          // Stress & Relaxation (higher = better management)
    purpose: number;         // Sense of Purpose
  };
  microInsights: string[];
  moodBadge: string;
}

interface Props {
  navigation: any;
  userProfile: any;
}

export const MindChatScreen: React.FC<Props> = ({ navigation, userProfile }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationCount, setConversationCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState>({
    emotionalTone: 'neutral',
    stressFlags: [],
    engagementLevel: 5,
    energyLevel: 5,
    responses: [],
    silentAnalysis: {
      energy: 3,
      emotionalBalance: 3,
      socialConnection: 3,
      stress: 3,
      purpose: 3
    },
    microInsights: [],
    moodBadge: '🤔'
  });

  const MAX_CONVERSATIONS = 15; // Maximum limit - let Gemini decide when to conclude
  const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');

  useEffect(() => {
    // Start conversation
    startChat();
  }, []);

  const startChat = async () => {
    // Sophisticated elicitation statements that trigger natural responses
    const elicitationStarters = [
      "I'm surprised how some days feel endless, even the quiet ones 🤔",
      "People often say they find mornings the hardest, but not everyone agrees ☀️",
      "It's funny how a simple walk can change a person's mood completely 🚶‍♀️",
      "I've read some people say weekends are really stressful, can't imagine why though 🤷‍♀️",
      "No way people find it easy to switch off after work! 📱",
      "Work can be quite unpredictable sometimes, right? �",
      "They say good sleep is overrated, but I'm not so sure 😴",
      "Some folks claim they're more productive when stressed... interesting theory 🎯"
    ];
    
    const welcomeText = elicitationStarters[Math.floor(Math.random() * elicitationStarters.length)];
    
    setMessages([{
      id: '1',
      text: welcomeText,
      isAI: true,
      timestamp: new Date()
    }]);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isComplete) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isAI: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      const newCount = conversationCount + 1;
      setConversationCount(newCount);

      // STEP 1: Silent emotional analysis of user's response
      const analysisModel = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash-lite',
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 200,
        }
      });
      
      const emotionalAnalysisPrompt = `Analyze this user response for emotional indicators:

"${currentInput}"

User Profile Context:
- Age: ${userProfile?.age || 'Unknown'}
- Health Goals: ${userProfile?.healthGoals?.join(', ') || 'None specified'}
- Health Conditions: ${userProfile?.healthConditions?.join(', ') || 'None'}
- Activity Level: ${userProfile?.activityLevel || 'Unknown'}

Context: User is in a wellness conversation (exchange ${newCount}/${MAX_CONVERSATIONS})

Return JSON with:
{
  "energy": 1-5,
  "emotionalBalance": 1-5,
  "socialConnection": 1-5,
  "stress": 1-5,
  "purpose": 1-5,
  "emotionalTone": "positive|neutral|stressed|low",
  "keyThemes": ["theme1", "theme2"],
  "stressFlags": ["flag1", "flag2"]
}

Analyze for:
- ENERGY: Vitality mentions, fatigue, enthusiasm
- EMOTIONAL: Mood words, emotional regulation
- SOCIAL: Relationships, isolation, connection quality
- STRESS: Overwhelm, anxiety, coping mentions
- PURPOSE: Motivation, goals, fulfillment

Only valid JSON, no explanation.`;

      const emotionalResponse = await analysisModel.generateContent(emotionalAnalysisPrompt);
      let emotionalData: any;
      try {
        const responseText = emotionalResponse.response.text().trim();
        // Clean response - remove any markdown formatting
        const cleanResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
        emotionalData = JSON.parse(cleanResponse);
        
        // Update conversation state with new emotional data
        setConversationState(prev => ({
          ...prev,
          emotionalTone: emotionalData.emotionalTone || prev.emotionalTone,
          stressFlags: [...new Set([...prev.stressFlags, ...(emotionalData.stressFlags || [])])],
          silentAnalysis: {
            energy: Math.round((prev.silentAnalysis.energy + (emotionalData.energy || 3)) / 2),
            emotionalBalance: Math.round((prev.silentAnalysis.emotionalBalance + (emotionalData.emotionalBalance || 3)) / 2),
            socialConnection: Math.round((prev.silentAnalysis.socialConnection + (emotionalData.socialConnection || 3)) / 2),
            stress: Math.round((prev.silentAnalysis.stress + (emotionalData.stress || 3)) / 2),
            purpose: Math.round((prev.silentAnalysis.purpose + (emotionalData.purpose || 3)) / 2)
          },
          responses: [...prev.responses, currentInput]
        }));
      } catch (parseError) {
        console.log('Emotional analysis parsing failed, using defaults:', parseError);
        // Use current input for basic analysis fallback
        const basicAnalysis = {
          energy: currentInput.toLowerCase().includes('tired') ? 2 : currentInput.toLowerCase().includes('energetic') ? 4 : 3,
          emotionalBalance: currentInput.toLowerCase().includes('stress') ? 2 : currentInput.toLowerCase().includes('happy') ? 4 : 3,
          socialConnection: currentInput.toLowerCase().includes('alone') ? 2 : currentInput.toLowerCase().includes('friends') ? 4 : 3,
          stress: currentInput.toLowerCase().includes('overwhelm') ? 2 : currentInput.toLowerCase().includes('calm') ? 4 : 3,
          purpose: currentInput.toLowerCase().includes('meaningless') ? 2 : currentInput.toLowerCase().includes('goal') ? 4 : 3
        };
        
        setConversationState(prev => ({
          ...prev,
          silentAnalysis: {
            energy: Math.round((prev.silentAnalysis.energy + basicAnalysis.energy) / 2),
            emotionalBalance: Math.round((prev.silentAnalysis.emotionalBalance + basicAnalysis.emotionalBalance) / 2),
            socialConnection: Math.round((prev.silentAnalysis.socialConnection + basicAnalysis.socialConnection) / 2),
            stress: Math.round((prev.silentAnalysis.stress + basicAnalysis.stress) / 2),
            purpose: Math.round((prev.silentAnalysis.purpose + basicAnalysis.purpose) / 2)
          },
          responses: [...prev.responses, currentInput]
        }));
      }

      // STEP 2: Generate next conversation question based on context
      const conversationModel = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash-lite',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150,
        }
      });
      
      const conversationHistory = messages.map(m => `${m.isAI ? 'AI' : 'User'}: ${m.text}`).join('\n');
      
      const nextQuestionPrompt = `You're an empathetic AI wellness companion conducting a wellness assessment. Determine if you have enough data for analysis or need more conversation.

User Profile Context:
- Name: ${userProfile?.name || 'User'}
- Age: ${userProfile?.age || 'Unknown'}
- Health Goals: ${userProfile?.healthGoals?.join(', ') || 'General wellness'}
- Health Conditions: ${userProfile?.healthConditions?.join(', ') || 'None specified'}
- Activity Level: ${userProfile?.activityLevel || 'Unknown'}

Conversation so far:
${conversationHistory}
User: ${currentInput}

Exchange ${newCount}/${MAX_CONVERSATIONS}

ASSESSMENT AREAS TO EXPLORE:
1. Energy levels & sleep patterns
2. Emotional state & stress management
3. Social connections & relationships
4. Daily routine & work-life balance
5. Physical activity & self-care
6. Life satisfaction & purpose

DECISION RULES:
- If you have sufficient insights across 4+ areas: Respond with "CONCLUDE_ASSESSMENT:"
- If you need more data: Ask a natural follow-up question
- Keep questions under 25 words, warm and conversational
- Build on their previous responses naturally
- Don't ask clinical/medical questions

EXAMPLES OF GOOD QUESTIONS:
- "That sounds lovely! What usually helps when you're feeling overwhelmed?"
- "How do you typically recharge after busy days?"
- "What's been your biggest source of joy lately?"
- "How connected do you feel with the people around you?"

Return either:
1. "CONCLUDE_ASSESSMENT:" (if enough data gathered)
2. Just the next question (if more conversation needed)`;

      const conversationResponse = await conversationModel.generateContent(nextQuestionPrompt);
      const aiResponse = conversationResponse.response.text().trim();

      // Check if Gemini decided to conclude
      if (aiResponse.startsWith('CONCLUDE_ASSESSMENT:')) {
        const conclusionMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: "Thanks for sharing! ✨ Let me put together your personalized wellness insights...",
          isAI: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, conclusionMessage]);
        
        setTimeout(() => {
          concludeConversation();
        }, 1500);
        return;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isAI: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Safety check - force conclusion at max limit
      if (newCount >= MAX_CONVERSATIONS) {
        setTimeout(() => {
          const conclusionMessage: Message = {
            id: (Date.now() + 2).toString(),
            text: "Thanks for sharing! ✨ Let me put together your personalized wellness insights...",
            isAI: true,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, conclusionMessage]);
          
          setTimeout(() => {
            concludeConversation();
          }, 1500);
        }, 1000);
      }

    } catch (error) {
      console.error('Conversation error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble connecting. Could you try that again?",
        isAI: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const concludeConversation = async () => {
    setIsComplete(true);
    setIsLoading(true);

    try {
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash-lite',
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        }
      });
      
      const fullConversation = messages.map(m => `${m.isAI ? 'AI' : 'User'}: ${m.text}`).join('\n');
      const userResponses = conversationState.responses.join(' | ');
      
      const finalAnalysisPrompt = `You are a clinical psychologist conducting final wellness assessment.

User Profile:
- Name: ${userProfile?.name || 'User'}
- Age: ${userProfile?.age || 'Unknown'}
- Health Goals: ${userProfile?.healthGoals?.join(', ') || 'General wellness'}
- Health Conditions: ${userProfile?.healthConditions?.join(', ') || 'None'}
- Activity Level: ${userProfile?.activityLevel || 'Unknown'}
- Dietary Preferences: ${userProfile?.dietaryPreferences?.join(', ') || 'None'}

FULL CONVERSATION:
${fullConversation}

USER RESPONSES: ${userResponses}

CURRENT EMOTIONAL STATE: ${conversationState.emotionalTone}
STRESS FLAGS: ${conversationState.stressFlags.join(', ')}
CURRENT DIMENSION SCORES: ${JSON.stringify(conversationState.silentAnalysis)}

Generate comprehensive final assessment in EXACT JSON format:
{
  "overallScore": 0-100,
  "dimensions": {
    "energy": 1-5,
    "emotionalBalance": 1-5,
    "socialConnection": 1-5,
    "stress": 1-5,
    "purpose": 1-5
  },
  "moodBadge": "🌟|😊|😐|😔|💪|🌈|⚡",
  "microTips": ["personalized tip 1 (max 12 words)", "tip 2", "tip 3"],
  "keyInsight": "personalized insight considering their health goals and profile (max 25 words)",
  "trendIndicator": "improving|stable|concerning"
}

Scoring Guidelines:
- 80-100: Thriving (high energy, balanced emotions, strong connections)
- 60-79: Good (generally positive with minor areas for improvement)
- 40-59: Moderate (mixed signals, some concerning patterns)
- 20-39: Concerning (multiple stress indicators, low energy/connection)
- 0-19: Critical (significant distress signals)

Personalization:
- Consider their health goals in micro-tips
- Reference their activity level for energy recommendations
- Account for health conditions in stress management advice
- Make insights relevant to their age and lifestyle

Return ONLY valid JSON.`;

      const result = await model.generateContent(finalAnalysisPrompt);
      let responseText = result.response.text().trim();
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }
      
      try {
        const analysis = JSON.parse(responseText);
        const calculatedScore = Math.max(0, Math.min(100, analysis.overallScore || 65));
        setFinalScore(calculatedScore);
        
        // Update conversation state with final analysis
        setConversationState(prev => ({
          ...prev,
          silentAnalysis: analysis.dimensions || prev.silentAnalysis,
          microInsights: analysis.microTips || ['Take a mindful walk', 'Connect with a friend', 'Practice deep breathing'],
          moodBadge: analysis.moodBadge || '😊'
        }));
        
        console.log('Mind Score Analysis:', {
          score: calculatedScore,
          dimensions: analysis.dimensions,
          insight: analysis.keyInsight,
          trend: analysis.trendIndicator
        });
        
      } catch (parseError) {
        console.error('Final analysis JSON parse error:', parseError, 'Response:', responseText);
        // Enhanced fallback based on conversation state
        const fallbackScore = conversationState.emotionalTone === 'positive' ? 75 : 
                             conversationState.emotionalTone === 'stressed' ? 45 : 60;
        setFinalScore(fallbackScore);
        setConversationState(prev => ({
          ...prev,
          microInsights: ['Take a mindful break', 'Connect with someone you trust', 'Practice gratitude'],
          moodBadge: fallbackScore > 70 ? '😊' : fallbackScore > 50 ? '😐' : '💙'
        }));
      }

    } catch (error) {
      console.error('Final scoring error:', error);
      setFinalScore(60); // Moderate default
      setConversationState(prev => ({
        ...prev,
        microInsights: ['Take time for yourself', 'Stay connected', 'Practice self-care'],
        moodBadge: '😊'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message: Message) => (
    <View
      key={message.id}
      style={[
        styles.messageBubble,
        message.isAI ? styles.aiBubble : styles.userBubble
      ]}
    >
      <Text style={[
        styles.messageText,
        message.isAI ? styles.aiText : styles.userText
      ]}>
        {message.text}
      </Text>
    </View>
  );

  const renderScoreScreen = () => (
    <ScrollView 
      style={styles.scoreContainer}
      contentContainerStyle={styles.scoreContentContainer}
    >
      {/* Mood Badge */}
      <View style={styles.moodBadgeContainer}>
        <Text style={styles.moodBadge}>{conversationState.moodBadge}</Text>
        <Text style={styles.moodLabel}>Today's Mood</Text>
      </View>
      
      {/* Overall Score */}
      <View style={styles.scoreCircle}>
        <Text style={styles.scoreNumber}>{finalScore}</Text>
        <Text style={styles.scoreLabel}>Mind Score</Text>
      </View>

      {/* Dimension Scores */}
      <View style={styles.dimensionsContainer}>
        <Text style={styles.dimensionsTitle}>Wellness Dimensions</Text>
        {Object.entries(conversationState.silentAnalysis).map(([key, value]) => (
          <View key={key} style={styles.dimensionRow}>
            <Text style={styles.dimensionLabel}>
              {key === 'energy' ? '⚡ Energy' :
               key === 'emotionalBalance' ? '💝 Emotional' :
               key === 'socialConnection' ? '🤝 Social' :
               key === 'stress' ? '🧘 Stress Management' :
               '🎯 Purpose'}
            </Text>
            <View style={styles.dimensionBar}>
              <View style={[styles.dimensionFill, { width: `${(value / 5) * 100}%` }]} />
            </View>
            <Text style={styles.dimensionValue}>{value}/5</Text>
          </View>
        ))}
      </View>

      {/* Micro Tips */}
      {conversationState.microInsights.length > 0 && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>✨ Micro-Tips for You</Text>
          {conversationState.microInsights.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Text style={styles.tipText}>• {tip}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.restartButton}
        onPress={() => {
          setMessages([]);
          setConversationCount(0);
          setIsComplete(false);
          setFinalScore(null);
          setConversationState(prev => ({
            ...prev,
            silentAnalysis: { energy: 3, emotionalBalance: 3, socialConnection: 3, stress: 3, purpose: 3 },
            microInsights: [],
            moodBadge: '🤔'
          }));
          startChat();
        }}
      >
        <Text style={styles.restartButtonText}>Take Another Check-in</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mind Check 🧠</Text>
          {!isComplete && (
            <Text style={styles.progressText}>
              {conversationCount}/{MAX_CONVERSATIONS}
            </Text>
          )}
        </View>

        {/* Messages or Score */}
        {!isComplete ? (
          <>
            <ScrollView 
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
            >
              {messages.map(renderMessage)}
              
              {isLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#4A90E2" />
                  <Text style={styles.loadingText}>Thinking...</Text>
                </View>
              )}
            </ScrollView>

            {/* Input */}
            {!isComplete && (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type your response..."
                  placeholderTextColor="#999"
                  multiline
                  maxLength={500}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
                  onPress={handleSend}
                  disabled={!inputText.trim() || isLoading}
                >
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          renderScoreScreen()
        )}
      </KeyboardAvoidingView>
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
  progressText: {
    fontSize: 14,
    color: '#6B7280',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#4A90E2',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  aiText: {
    color: '#1F2937',
  },
  userText: {
    color: 'white',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scoreContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scoreContentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: '100%',
  },
  scoreTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 32,
  },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  scoreLabel: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  scoreDescription: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  restartButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  restartButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // New styles for enhanced UI
  moodBadgeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  moodBadge: {
    fontSize: 48,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  dimensionsContainer: {
    width: '100%',
    marginTop: 24,
    marginBottom: 24,
  },
  dimensionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  dimensionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  dimensionLabel: {
    width: 120,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  dimensionBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  dimensionFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 4,
  },
  dimensionValue: {
    width: 32,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  tipItem: {
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});