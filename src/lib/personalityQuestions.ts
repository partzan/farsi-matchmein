export type PersonalityAnswers = Record<string, string>;

export type PersonalityQuestion = {
  id: string;
  options: { id: string; labelKey: string }[];
};

/** Stable IDs for DB; labels live in fa.profileSetup.personality */
export const PERSONALITY_QUESTIONS: PersonalityQuestion[] = [
  {
    id: 'free_time',
    options: [
      { id: 'alone', labelKey: 'alone' },
      { id: 'close_friend', labelKey: 'closeFriend' },
      { id: 'small_group', labelKey: 'smallGroup' },
      { id: 'crowded', labelKey: 'crowded' },
      { id: 'depends', labelKey: 'depends' },
    ],
  },
  {
    id: 'decision_style',
    options: [
      { id: 'logic', labelKey: 'logic' },
      { id: 'feeling', labelKey: 'feeling' },
      { id: 'both', labelKey: 'both' },
    ],
  },
  {
    id: 'conversation_style',
    options: [
      { id: 'listen', labelKey: 'listen' },
      { id: 'balanced', labelKey: 'balancedTalk' },
      { id: 'lead', labelKey: 'leadTalk' },
    ],
  },
  {
    id: 'disagreement_style',
    options: [
      { id: 'calm_talk', labelKey: 'calmTalk' },
      { id: 'avoid', labelKey: 'avoid' },
      { id: 'pause_then_talk', labelKey: 'pauseThenTalk' },
      { id: 'defend', labelKey: 'defend' },
      { id: 'depends_person', labelKey: 'dependsPerson' },
    ],
  },
  {
    id: 'comfort_environment',
    options: [
      { id: 'quiet', labelKey: 'quiet' },
      { id: 'cozy_cafe', labelKey: 'cozyCafe' },
      { id: 'busy_cafe', labelKey: 'busyCafe' },
      { id: 'parties', labelKey: 'parties' },
      { id: 'nature', labelKey: 'nature' },
    ],
  },
  {
    id: 'first_impression',
    options: [
      { id: 'kindness', labelKey: 'kindness' },
      { id: 'smart', labelKey: 'smart' },
      { id: 'humor', labelKey: 'humor' },
      { id: 'shared_interests', labelKey: 'sharedInterests' },
      { id: 'authentic', labelKey: 'authentic' },
      { id: 'confidence', labelKey: 'confidence' },
    ],
  },
  {
    id: 'novelty_seeking',
    options: [
      { id: 'a_lot', labelKey: 'aLot' },
      { id: 'somewhat', labelKey: 'somewhat' },
      { id: 'if_suggested', labelKey: 'ifSuggested' },
      { id: 'familiar', labelKey: 'familiar' },
    ],
  },
  {
    id: 'stress_response',
    options: [
      { id: 'alone', labelKey: 'stressAlone' },
      { id: 'talk', labelKey: 'stressTalk' },
      { id: 'busy', labelKey: 'stressBusy' },
      { id: 'exercise', labelKey: 'stressExercise' },
      { id: 'distract', labelKey: 'stressDistract' },
    ],
  },
  {
    id: 'planning_style',
    options: [
      { id: 'plan', labelKey: 'planAhead' },
      { id: 'spontaneous', labelKey: 'spontaneous' },
      { id: 'mix', labelKey: 'planMix' },
    ],
  },
  {
    id: 'energy_people',
    options: [
      { id: 'calm', labelKey: 'energyCalm' },
      { id: 'energetic', labelKey: 'energyEnergetic' },
      { id: 'curious', labelKey: 'energyCurious' },
      { id: 'adventurous', labelKey: 'energyAdventurous' },
      { id: 'empathetic', labelKey: 'energyEmpathetic' },
      { id: 'creative', labelKey: 'energyCreative' },
    ],
  },
];

export function personalityComplete(answers: PersonalityAnswers) {
  return PERSONALITY_QUESTIONS.every((q) => Boolean(answers[q.id]));
}
