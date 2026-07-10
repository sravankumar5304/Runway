const FILLER_WORDS = [
  'um', 'uh', 'like', 'basically', 'actually', 'sort of', 'kind of',
  'just', 'you know', 'i guess', 'stuff', 'things', 'literally'
];

const HEDGE_WORDS = ['maybe', 'i think', 'not sure', 'probably', 'i suppose'];

const RESULT_SIGNALS = [
  'resulted in', 'as a result', 'increased', 'decreased', 'reduced',
  'improved', 'saved', 'grew', 'led to', 'achieved', '%', 'percent'
];

const ACTION_SIGNALS = [
  'i decided', 'i led', 'i built', 'i created', 'i implemented',
  'i designed', 'i worked', 'i organized', 'i proposed', 'i reached out',
  'i took', 'i started'
];

function countOccurrences(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'gi');
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function hasAnySignal(lowerText, signals) {
  return signals.some((s) => lowerText.includes(s));
}

/**
 * Produce rule-based feedback on a candidate's interview answer.
 * This does not call an external AI model; it evaluates structure,
 * specificity, and delivery against known good-answer patterns so the
 * project runs fully offline.
 * @param {object} question the question object from questions.json
 * @param {string} answerText candidate's typed answer
 */
function evaluateAnswer(question, answerText) {
  const text = (answerText || '').trim();
  const lower = text.toLowerCase();
  const wordCount = text.length === 0 ? 0 : text.split(/\s+/).length;

  const feedback = [];
  let score = 0;

  // --- Length (0-20) ---
  let lengthScore = 0;
  if (wordCount === 0) {
    feedback.push('No answer was submitted yet.');
  } else if (wordCount < 25) {
    lengthScore = 8;
    feedback.push('Your answer is quite short. Add more concrete detail about what you actually did.');
  } else if (wordCount > 220) {
    lengthScore = 14;
    feedback.push('Your answer runs long. Aim to tighten it to the most relevant details, roughly 100-180 words.');
  } else {
    lengthScore = 20;
    feedback.push('Length is in a good range for a spoken interview answer.');
  }
  score += lengthScore;

  // --- Structure / STAR signals (0-25) ---
  const hasAction = hasAnySignal(lower, ACTION_SIGNALS) || /\bi\s+\w+ed\b/.test(lower);
  const hasResult = hasAnySignal(lower, RESULT_SIGNALS);
  let structureScore = 0;
  if (hasAction && hasResult) {
    structureScore = 25;
    feedback.push('Good structure: you described a clear action and a resulting outcome.');
  } else if (hasAction || hasResult) {
    structureScore = 14;
    feedback.push(
      hasAction
        ? 'You described what you did, but the outcome or result is missing. Add what happened afterward.'
        : 'You mentioned an outcome, but the specific action you took is unclear. Say what you personally did.'
    );
  } else {
    structureScore = 4;
    feedback.push('Try the STAR method: briefly set the Situation/Task, describe your Action, then state the Result.');
  }
  score += structureScore;

  // --- Keyword relevance (0-25) ---
  const keywords = question.keywords || [];
  const matchedKeywords = keywords.filter((k) => lower.includes(k.toLowerCase()));
  const relevanceRatio = keywords.length === 0 ? 0 : matchedKeywords.length / keywords.length;
  const relevanceScore = Math.round(relevanceRatio * 25);
  score += relevanceScore;
  if (keywords.length > 0) {
    if (relevanceRatio >= 0.5) {
      feedback.push('Your answer touches on the themes this question is looking for.');
    } else {
      feedback.push(`Consider addressing more of the theme this question targets. Tip: ${question.tip}`);
    }
  }

  // --- Quantification bonus (0-15) ---
  const hasNumber = /\d/.test(text) || lower.includes('percent');
  const quantScore = hasNumber ? 15 : 0;
  score += quantScore;
  feedback.push(
    hasNumber
      ? 'Nice use of a concrete number to back up your impact.'
      : 'Where possible, add a number (%, time saved, team size) to make your impact concrete.'
  );

  // --- Filler word / hedging penalty (0 to -15) ---
  let fillerHits = 0;
  const fillerFound = [];
  FILLER_WORDS.forEach((f) => {
    const c = countOccurrences(lower, f);
    if (c > 0) {
      fillerHits += c;
      fillerFound.push(f);
    }
  });
  const hedgeFound = HEDGE_WORDS.filter((h) => lower.includes(h));
  const penalty = Math.min(15, fillerHits * 2 + hedgeFound.length * 3);
  score -= penalty;
  if (fillerFound.length > 0 || hedgeFound.length > 0) {
    feedback.push(
      `Watch for filler/hedging language${fillerFound.length ? ' (' + fillerFound.slice(0, 5).join(', ') + ')' : ''}. It softens otherwise strong points.`
    );
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let grade = 'Needs work';
  if (score >= 85) grade = 'Strong';
  else if (score >= 65) grade = 'Solid';
  else if (score >= 45) grade = 'Developing';

  return {
    score,
    grade,
    wordCount,
    matchedKeywords,
    missingKeywords: keywords.filter((k) => !matchedKeywords.includes(k)),
    fillerWordsFound: fillerFound,
    hedgeWordsFound: hedgeFound,
    hasQuantification: hasNumber,
    feedback
  };
}

module.exports = { evaluateAnswer };
