const categoryWeight = {
  crime: 10,
  assault: 18,
  fraud: 8,
  harassment: 9,
  domestic_violence: 20,
  environmental_hazard: 16,
  infrastructure_failure: 14,
  disaster: 22,
  human_safety: 15,
  other: 5,
};

const severityWeight = {
  low: 20,
  medium: 45,
  high: 70,
  critical: 90,
};

const computeRiskAndEscalation = ({ severity = 'medium', category = 'other', moderationStatus = 'approved' }) => {
  const base = severityWeight[severity] || severityWeight.medium;
  const categoryScore = categoryWeight[category] || categoryWeight.other;
  const moderationPenalty = moderationStatus === 'flagged' ? 10 : moderationStatus === 'blocked' ? 25 : 0;

  const riskScore = Math.min(100, base + categoryScore + moderationPenalty);
  const shouldEscalate = riskScore >= 75 || severity === 'critical';

  return {
    riskScore,
    shouldEscalate,
    level: riskScore >= 90 ? 'critical' : riskScore >= 75 ? 'high' : riskScore >= 50 ? 'medium' : 'low',
  };
};

module.exports = { computeRiskAndEscalation };
