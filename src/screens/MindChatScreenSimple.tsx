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
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Message {
  id: string;
  text: string;
  isAI: boolean;
  timestamp: Date;
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

  const MAX_CONVERSATIONS = 5;
  const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');

  useEffect(() => {
    // Start conversation
    startChat();
  }, []);

  const startChat = async () => {
    const welcomeMessages = [
      "Hey! 🌟 What's been keeping you busy this week?",
      "Hi there! If today was a color, what would it be?",
      "Hello! What's something small that made you smile recently?",
      "Hey! If you had a completely free hour right now, what would you do?",
      "Hi! What's the most interesting thing that happened to you lately?"
    ];
    
    const welcomeText = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    
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
    setInputText('');
    setIsLoading(true);

    try {
      const newCount = conversationCount + 1;
      setConversationCount(newCount);

      // Generate AI response
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash-lite',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150,
        }
      });
      
      const prompt = `You are a friendly wellness AI conducting a mental health check-in.

RULES:
1. Keep response under 25 words
2. Be warm and conversational (like texting a friend)
3. NEVER ask clinical questions
4. Use indirect questions to understand their mental state
5. Current exchange: ${newCount}/${MAX_CONVERSATIONS}

Previous conversation:
${messages.map(m => `${m.isAI ? 'AI' : 'User'}: ${m.text}`).join('\n')}

User just said: "${inputText}"

${newCount >= MAX_CONVERSATIONS - 1 ? 'This is the last question - make it forward-looking and hopeful.' : 'Generate next engaging question.'}

Return just the question text, nothing else.`;

      const result = await model.generateContent(prompt);
      const aiResponse = result.response.text();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isAI: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Check if we should conclude
      if (newCount >= MAX_CONVERSATIONS) {
        setTimeout(() => {
          concludeConversation();
        }, 2000);
      }

    } catch (error) {
      console.error('Error:', error);
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
      // Calculate Mind Score
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash-lite',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        }
      });
      
      const analysisPrompt = `You are a psychologist analyzing a wellness conversation.

CONVERSATION:
${messages.map(m => `${m.isAI ? 'AI' : 'User'}: ${m.text}`).join('\n')}

Analyze the user's mental wellness and provide a score from 0-100 where:
- 80-100: Excellent mental wellbeing
- 60-79: Good mental wellbeing  
- 40-59: Fair, some concerns
- 0-39: Needs support

Consider:
- Energy levels and enthusiasm
- Emotional tone (positive/negative)
- Social connections mentioned
- Stress indicators
- Sense of purpose

Return ONLY a number between 0-100, nothing else.`;

      const result = await model.generateContent(analysisPrompt);
      const scoreText = result.response.text().trim();
      const score = parseInt(scoreText) || 50;

      setFinalScore(Math.max(0, Math.min(100, score)));

    } catch (error) {
      console.error('Scoring error:', error);
      setFinalScore(50); // Default score
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
    <View style={styles.scoreContainer}>
      <Text style={styles.scoreTitle}>Your Mind Score</Text>
      
      <View style={styles.scoreCircle}>
        <Text style={styles.scoreNumber}>{finalScore}</Text>
        <Text style={styles.scoreLabel}>out of 100</Text>
      </View>

      <Text style={styles.scoreDescription}>
        {finalScore && finalScore >= 80 ? '🎉 Excellent! You\'re doing great!' :
         finalScore && finalScore >= 60 ? '😊 Good! Keep up the positive momentum!' :
         finalScore && finalScore >= 40 ? '💪 Fair. Small steps can make a big difference!' :
         '🌱 Remember, reaching out is a sign of strength.'}
      </Text>

      <TouchableOpacity
        style={styles.restartButton}
        onPress={() => {
          setMessages([]);
          setConversationCount(0);
          setIsComplete(false);
          setFinalScore(null);
          startChat();
        }}
      >
        <Text style={styles.restartButtonText}>Take Another Check-in</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
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
    </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
  },
  restartButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});