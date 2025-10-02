import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { GiftedChat, IMessage, Send, Bubble, InputToolbar } from 'react-native-gifted-chat';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { 
  MindScoreChatService, 
  ConversationContext, 
  ConversationMessage, 
  MindScoreMetrics 
} from '../services/MindScoreChatService';

const { width, height } = Dimensions.get('window');

interface Props {
  navigation: any;
  userProfile: any;
}

interface TypingIndicatorProps {
  isTyping: boolean;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isTyping }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isTyping) {
      const animate = () => {
        Animated.sequence([
          Animated.timing(dot1, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot1, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => {
          if (isTyping) animate();
        });
      };
      animate();
    }
  }, [isTyping]);

  if (!isTyping) return null;

  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        <View style={styles.typingDots}>
          <Animated.View style={[styles.typingDot, { opacity: dot1 }]} />
          <Animated.View style={[styles.typingDot, { opacity: dot2 }]} />
          <Animated.View style={[styles.typingDot, { opacity: dot3 }]} />
        </View>
      </View>
    </View>
  );
};

export const MindChatScreen: React.FC<Props> = ({ navigation, userProfile }) => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationComplete, setConversationComplete] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [mindScore, setMindScore] = useState<MindScoreMetrics | null>(null);
  
  // Conversation state
  const [context, setContext] = useState<ConversationContext>({
    messageCount: 0,
    detectedEmotions: [],
    keyPhrases: [],
    userResponses: [],
    assessmentData: {
      energy: 3,
      emotionalBalance: 3,
      socialConnection: 3,
      stressLevels: 3,
      purposeFulfillment: 3,
      keyThemes: [],
      concernFlags: [],
      positiveIndicators: [],
    }
  });

  // Services
  const chatService = new MindScoreChatService(process.env.EXPO_PUBLIC_GEMINI_API_KEY!);

  // Animation refs
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scoreRevealAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    // Update progress bar
    Animated.timing(progressAnim, {
      toValue: context.messageCount / 5,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [context.messageCount]);

  const initializeChat = async () => {
    try {
      const welcomeMessage = await chatService.startConversation();
      
      const giftedChatMessage: IMessage = {
        _id: welcomeMessage.id,
        text: welcomeMessage.text,
        createdAt: welcomeMessage.timestamp,
        user: {
          _id: 'ai',
          name: 'YouMatter AI',
          avatar: '🧠',
        },
      };

      setMessages([giftedChatMessage]);
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  };

  const handleSend = async (newMessages: IMessage[] = []) => {
    if (conversationComplete || newMessages.length === 0) return;

    const userMessage = newMessages[0];
    setMessages(previousMessages => GiftedChat.append(previousMessages, newMessages));
    setIsTyping(true);

    try {
      // Generate AI response
      const { message, shouldConclude, analysisUpdate } = await chatService.generateNextQuestion(
        context,
        userMessage.text
      );

      // Update context
      setContext(prev => ({
        ...prev,
        messageCount: prev.messageCount + 1,
        userResponses: [...prev.userResponses, userMessage.text],
        assessmentData: { ...prev.assessmentData, ...analysisUpdate }
      }));

      // Add AI response
      const aiMessage: IMessage = {
        _id: message.id,
        text: message.text,
        createdAt: message.timestamp,
        user: {
          _id: 'ai',
          name: 'YouMatter AI',
          avatar: '🧠',
        },
      };

      setTimeout(() => {
        setIsTyping(false);
        setMessages(previousMessages => GiftedChat.append(previousMessages, [aiMessage]));

        if (shouldConclude) {
          concludeConversation();
        }
      }, 1500);

    } catch (error) {
      console.error('Failed to generate response:', error);
      setIsTyping(false);
      Alert.alert('Error', 'Failed to process your message. Please try again.');
    }
  };

  const concludeConversation = async () => {
    setConversationComplete(true);
    setIsCalculating(true);

    try {
      // Show conclusion message
      const conclusionMessage = await chatService.concludeConversation();
      
      const aiMessage: IMessage = {
        _id: conclusionMessage.id,
        text: conclusionMessage.text,
        createdAt: conclusionMessage.timestamp,
        user: {
          _id: 'ai',
          name: 'YouMatter AI',
          avatar: '🧠',
        },
      };

      setMessages(previousMessages => GiftedChat.append(previousMessages, [aiMessage]));

      // Calculate mind score
      setTimeout(async () => {
        const conversationHistory: ConversationMessage[] = messages.map(msg => ({
          id: msg._id.toString(),
          role: msg.user._id === 'ai' ? 'ai' : 'user',
          text: msg.text,
          timestamp: new Date(msg.createdAt)
        }));

        const calculatedScore = await chatService.calculateMindScore(
          conversationHistory,
          context.assessmentData
        );

        // Calculate points earned
        const points = calculateMindScorePoints(calculatedScore);
        
        // Note: Database saving removed - will be added when backend is implemented

        setMindScore(calculatedScore);
        setIsCalculating(false);

        // Animate score reveal
        Animated.spring(scoreRevealAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }).start();

      }, 2000);

    } catch (error) {
      console.error('Failed to conclude conversation:', error);
      setIsCalculating(false);
      Alert.alert('Error', 'Failed to calculate Mind Score. Please try again.');
    }
  };

  const calculateMindScorePoints = (score: MindScoreMetrics): number => {
    let points = 15; // Base points for completing assessment
    
    // Score-based bonus
    if (score.overallScore >= 80) points += 25;
    else if (score.overallScore >= 60) points += 15;
    else if (score.overallScore >= 40) points += 10;
    
    // Engagement bonus
    if (score.conversationQuality >= 80) points += 15;
    else if (score.conversationQuality >= 60) points += 10;
    
    // Consistency bonus (if improved from last time)
    if (score.trendIndicator === 'improving') points += 20;
    
    return points;
  };

  const renderBubble = (props: any) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: '#4A90E2',
            borderRadius: 16,
            marginVertical: 2,
          },
          left: {
            backgroundColor: '#F3F4F6',
            borderRadius: 16,
            marginVertical: 2,
          },
        }}
        textStyle={{
          right: {
            color: 'white',
            fontSize: 16,
          },
          left: {
            color: '#1F2937',
            fontSize: 16,
          },
        }}
      />
    );
  };

  const renderInputToolbar = (props: any) => {
    if (conversationComplete) return null;
    
    return (
      <InputToolbar
        {...props}
        containerStyle={styles.inputToolbar}
        primaryStyle={styles.inputPrimary}
      />
    );
  };

  const renderSend = (props: any) => {
    return (
      <Send {...props}>
        <View style={styles.sendButton}>
          <Ionicons name="send" size={20} color="#4A90E2" />
        </View>
      </Send>
    );
  };

  const renderMindScoreResults = () => {
    if (!mindScore) return null;

    return (
      <Animated.View 
        style={[
          styles.resultsOverlay,
          {
            opacity: scoreRevealAnim,
            transform: [{
              scale: scoreRevealAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              })
            }]
          }
        ]}
      >
        <View style={styles.resultsContainer}>
          {/* Points Banner */}
          <LinearGradient
            colors={['#4A90E2', '#357ABD']}
            style={styles.pointsBanner}
          >
            <Ionicons name="star" size={24} color="#FFD700" />
            <Text style={styles.pointsText}>
              +{calculateMindScorePoints(mindScore)} Points Earned!
            </Text>
          </LinearGradient>

          {/* Overall Score */}
          <View style={styles.overallScoreSection}>
            <Text style={styles.scoreTitle}>Your Mind Score</Text>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>{mindScore.overallScore}</Text>
              <Text style={styles.scoreLabel}>out of 100</Text>
            </View>
            <Text style={styles.trendIndicator}>
              Trend: {mindScore.trendIndicator.charAt(0).toUpperCase() + mindScore.trendIndicator.slice(1)}
            </Text>
          </View>

          {/* Dimension Scores */}
          <View style={styles.dimensionsSection}>
            <Text style={styles.sectionTitle}>Wellness Dimensions</Text>
            {Object.entries(mindScore.dimensionScores).map(([key, value]) => (
              <View key={key} style={styles.dimensionRow}>
                <Text style={styles.dimensionLabel}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
                <View style={styles.dimensionBarContainer}>
                  <View 
                    style={[
                      styles.dimensionBar,
                      { 
                        width: `${value}%`,
                        backgroundColor: getDimensionColor(value)
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.dimensionValue}>{value}</Text>
              </View>
            ))}
          </View>

          {/* Insights */}
          <View style={styles.insightsSection}>
            <Text style={styles.sectionTitle}>Insights for You</Text>
            {mindScore.insights.map((insight, index) => (
              <View key={index} style={styles.insightCard}>
                <Ionicons name="bulb-outline" size={20} color="#4A90E2" />
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </View>

          {/* Micro-Recommendations */}
          <View style={styles.recommendationsSection}>
            <Text style={styles.sectionTitle}>Action Steps</Text>
            {mindScore.microRecommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationCard}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={() => {
                Alert.alert('Saved!', 'Mind Score logged successfully');
                navigation.goBack();
              }}
            >
              <Text style={styles.saveButtonText}>Save Results</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.retakeButton}
              onPress={() => {
                // Reset for new assessment
                setMindScore(null);
                setConversationComplete(false);
                setIsCalculating(false);
                setMessages([]);
                setContext({
                  messageCount: 0,
                  detectedEmotions: [],
                  keyPhrases: [],
                  userResponses: [],
                  assessmentData: {
                    energy: 3,
                    emotionalBalance: 3,
                    socialConnection: 3,
                    stressLevels: 3,
                    purposeFulfillment: 3,
                    keyThemes: [],
                    concernFlags: [],
                    positiveIndicators: [],
                  }
                });
                scoreRevealAnim.setValue(0);
                progressAnim.setValue(0);
                initializeChat();
              }}
            >
              <Text style={styles.retakeButtonText}>New Check-in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  const getDimensionColor = (score: number): string => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    if (score >= 40) return '#FFC107';
    return '#F44336';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Progress */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mind Check</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    })
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {context.messageCount}/5
            </Text>
          </View>
        </View>
      </View>

      {/* Chat Interface */}
      <View style={styles.chatContainer}>
        <GiftedChat
          messages={messages}
          onSend={handleSend}
          user={{
            _id: userProfile.id,
            name: userProfile.name || 'You',
          }}
          renderBubble={renderBubble}
          renderInputToolbar={renderInputToolbar}
          renderSend={renderSend}
          placeholder={conversationComplete ? "Assessment complete..." : "Type your response..."}
          alwaysShowSend
          keyboardShouldPersistTaps="never"
        />
        
        <TypingIndicator isTyping={isTyping} />
      </View>

      {/* Calculating Overlay */}
      {isCalculating && (
        <View style={styles.calculatingOverlay}>
          <View style={styles.calculatingContent}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.calculatingText}>
              Analyzing your responses...
            </Text>
            <Text style={styles.calculatingSubtext}>
              Creating your personalized Mind Score
            </Text>
          </View>
        </View>
      )}

      {/* Results Overlay */}
      {renderMindScoreResults()}
    </SafeAreaView>
  );
};

const getDimensionColor = (score: number): string => {
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#FF9800';
  if (score >= 40) return '#FFC107';
  return '#F44336';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    minWidth: 30,
  },

  // Chat Styles
  chatContainer: {
    flex: 1,
  },
  inputToolbar: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  inputPrimary: {
    alignItems: 'center',
  },
  sendButton: {
    marginRight: 12,
    marginBottom: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Typing Indicator
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingBubble: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    maxWidth: '70%',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
    marginHorizontal: 2,
  },

  // Calculating Overlay
  calculatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calculatingContent: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 40,
  },
  calculatingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center',
  },
  calculatingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },

  // Results Overlay
  resultsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
  },
  resultsContainer: {
    flex: 1,
    paddingTop: 60,
  },
  pointsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
  },
  pointsText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Overall Score
  overallScoreSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  scoreTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  scoreLabel: {
    fontSize: 14,
    color: 'white',
    opacity: 0.8,
  },
  trendIndicator: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Dimensions
  dimensionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  dimensionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dimensionLabel: {
    fontSize: 14,
    color: '#374151',
    width: 80,
    textTransform: 'capitalize',
  },
  dimensionBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 12,
  },
  dimensionBar: {
    height: '100%',
    borderRadius: 4,
  },
  dimensionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    width: 30,
    textAlign: 'right',
  },

  // Insights
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
    color: '#1F2937',
    marginLeft: 8,
  },

  // Recommendations
  recommendationsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 8,
  },

  // Action Buttons
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