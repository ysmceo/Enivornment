const ABUSE_TERMS = [
  'kill', 'bomb', 'terrorist', 'extort', 'abduct', 'ransom', 'hate', 'scam',
  'rape', 'murder', 'suicide', 'explosive', 'attack', 'fraud ring', 'human trafficking',
];

const SPAM_TERMS = ['buy now', 'free money', 'click this', 'win instantly', 'investment opportunity'];
const MISINFO_TERMS = ['fake incident', 'prank alert', 'false emergency', 'hoax'];

const SENSITIVE_PATTERNS = [
  /\b\d{11}\b/g,
  /\b\d{16}\b/g,
  /\b(?:[0-9]{3}-[0-9]{2}-[0-9]{4})\b/g,
];

const buildHeuristicModeration = ({ title = '', description = '' }) => {
  const corpus = `${title} ${description}`.toLowerCase();
  const reasons = [];
  let score = 0;

  ABUSE_TERMS.forEach((term) => {
    if (corpus.includes(term)) {
      score += 0.12;
      reasons.push(`Contains high-risk term: ${term}`);
    }
  });

  SPAM_TERMS.forEach((term) => {
    if (corpus.includes(term)) {
      score += 0.1;
      reasons.push(`Contains potential spam phrase: ${term}`);
    }
  });

  MISINFO_TERMS.forEach((term) => {
    if (corpus.includes(term)) {
      score += 0.13;
      reasons.push(`Contains potential misinformation phrase: ${term}`);
    }
  });

  SENSITIVE_PATTERNS.forEach((pattern) => {
    if (pattern.test(corpus)) {
      score += 0.2;
      reasons.push('Contains potentially sensitive personal data');
    }
  });

  if (description.length < 20) {
    score += 0.1;
    reasons.push('Very short description may indicate low-quality or abusive submission');
  }

  const normalizedScore = Math.min(1, Number(score.toFixed(2)));
  const status = normalizedScore >= 0.7 ? 'blocked' : normalizedScore >= 0.45 ? 'flagged' : 'approved';

  const flags = [];
  if (reasons.some((r) => r.includes('high-risk'))) flags.push({ type: 'abuse' });
  if (reasons.some((r) => r.includes('spam'))) flags.push({ type: 'spam' });
  if (reasons.some((r) => r.includes('misinformation'))) flags.push({ type: 'misinformation' });

  return {
    decision: status === 'blocked' ? 'block' : status === 'flagged' ? 'review' : 'allow',
    provider: 'heuristic',
    status,
    score: normalizedScore,
    riskScore: normalizedScore,
    flagged: normalizedScore >= 0.45,
    reasons,
    spamFlags: reasons.filter((r) => r.toLowerCase().includes('spam')),
    fraudSignals: reasons.filter((r) => r.toLowerCase().includes('high-risk') || r.toLowerCase().includes('fraud')),
    confidence: Number(Math.min(0.99, 0.5 + normalizedScore / 2).toFixed(2)),
    flags,
    reviewedAt: new Date(),
  };
};

const parseProviderJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const evaluateWithOpenAI = async ({ title, description }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODERATION_MODEL || 'gpt-4.1-mini';
  const timeoutMs = Number(process.env.AI_MODERATION_TIMEOUT_MS || 5000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a strict civic incident moderation classifier. Return only JSON with keys: status(approved|flagged|blocked), score(0-1), confidence(0-1), reasons(string[]), flags({type:string}[]).',
          },
          {
            role: 'user',
            content: `Title: ${title || ''}\nDescription: ${description || ''}`,
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    const parsed = parseProviderJson(text || '');
    if (!parsed) return null;

    const status = ['approved', 'flagged', 'blocked'].includes(parsed.status)
      ? parsed.status
      : 'flagged';
    const score = Math.max(0, Math.min(1, Number(parsed.score ?? 0.5)));
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.7)));
    const reasons = Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 20).map(String) : [];
    const flags = Array.isArray(parsed.flags) ? parsed.flags : [];

    return {
      decision: status === 'blocked' ? 'block' : status === 'flagged' ? 'review' : 'allow',
      provider: 'openai',
      status,
      score: Number(score.toFixed(2)),
      riskScore: Number(score.toFixed(2)),
      flagged: status !== 'approved',
      reasons,
      spamFlags: reasons.filter((r) => String(r).toLowerCase().includes('spam')),
      fraudSignals: reasons.filter((r) => String(r).toLowerCase().includes('fraud') || String(r).toLowerCase().includes('abuse')),
      confidence: Number(confidence.toFixed(2)),
      flags,
      reviewedAt: new Date(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const evaluateModeration = async ({ title = '', description = '' }) => {
  const provider = (process.env.AI_MODERATION_PROVIDER || 'heuristic').toLowerCase();

  if (provider === 'openai') {
    const providerResult = await evaluateWithOpenAI({ title, description });
    if (providerResult) return providerResult;
  }

  return buildHeuristicModeration({ title, description });
};

const assessModeration = evaluateModeration;

module.exports = { evaluateModeration, assessModeration };
