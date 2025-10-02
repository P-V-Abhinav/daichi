# YouMatter AI

A personalized wellness companion mobile app built with Expo + React Native (TypeScript). It blends nutrition awareness, conversational mental wellbeing check-ins, and profile‑driven personalization into a single minimal experience designed for fast iteration (hackathon-friendly) and future extensibility.

## Core Features

### 1. Smart Food Scanner
- Capture or pick a meal photo and get AI-driven:
  - Multi-item recognition (ingredients / dishes / cooking method)
  - Portion & macro estimates (calories, protein, carbs, fats, fiber, sugar)
  - Health score + contextual insights
  - Cultural & dietary tagging
  - Gamified points and achievement hooks
  - Calorie awareness via Indian snack equivalents (e.g., samosa / jalebi)

### 2. Mind Check Conversational Flow
- Natural, adaptive wellness chat (no rigid survey feel)
- Subtle silent tracking of: energy, emotional balance, social connection, stress regulation, purpose cues
- Adaptive questioning—ends early once enough signal is collected (with a safety cap)
- Final Mind Score with dimension bars, mood badge, and micro-tips
- Resilient fallbacks if AI parsing fails

### 3. Unified Profile Personalization
- Editable profile: demographics, activity level, goals, conditions, dietary preferences
- Automatic daily macro targets
- Personalized food analysis (targets, warnings, substitutions)
- Conversational tone & references adapt to profile context

### 4. Dashboard Snapshot
- Static, fast-loading wellness summary panel
- AI-personalized readiness score, focus areas, risk flags, daily micro-suggestions
- Quick action shortcuts & gamification preview

## Technical Highlights
- React Native + Expo (TypeScript)
- Modular service layer (`FoodRecognitionService`) for image → analysis pipeline
- Defensive JSON parsing + graceful degradation (never blocks user flow)
- Clean separation between: capture → analysis → refinement → personalization
- Minimal external state: in-memory only (no storage dependency) for hackathon velocity
- Prompt patterns designed to avoid revealing internal assessment logic to user

## Architecture Overview
```
App.tsx
  ├── Profile context & navigation wiring
  ├── Screens
  │   ├── DashboardScreen (snapshot + actions)
  │   ├── FoodScannerScreen (camera / gallery → analysis)
  │   ├── MindChatScreenSimple (adaptive dialogue + scoring)
  │   └── ProfileScreen (user data + auto targets)
  └── Services
      └── FoodRecognitionService (image prep, analysis, refinement, sanitation)
```

## Gamification Hooks (Extensible)
- Points calculation based on meal health score
- Achievement placeholders (consistency, diversity, streaks)
- Rainbow color adherence (produce diversity heuristic)

## Resilience & Fallback Strategy
| Layer | Failure Handling |
|-------|------------------|
| Image Analysis | Basic placeholder item + neutral macros |
| Conversation Scoring | Heuristic emotional inference (keywords) |
| Final Mind Assessment | Conservative mid-tier score w/ generic tips |
| Dashboard AI Snapshot | Stable defaults + gentle encouragement |

## Development Notes
- Environment variable: `EXPO_PUBLIC_GEMINI_API_KEY` (consumed generically as an "AI system")
- Replace with any future model provider by adjusting the service + chat generation functions
- No persistent storage included—wire a backend later for logs, longitudinal trends, leaderboards

## Extending Next
- Add secure user auth & cloud persistence
- Historical trend charts (mind vs nutrition correlations)
- Real-time habit nudges (push notifications)
- Social wellness challenges
- Sleep & activity ingestion (wearable integration)

## Ethical / UX Considerations
- Avoids clinical diagnostic language
- Never exposes internal scoring criteria during chat
- Encourages supportive micro-actions over judgment
- Frames calorie equivalents for awareness, not shame

## Quick Start (Dev)
```
# install
npm install

# run (Expo)
npx expo start
```

## License
Internal / Hackathon Prototype. Add an explicit license before wider distribution.

---
Built to accelerate compassionate digital wellbeing experiences.
