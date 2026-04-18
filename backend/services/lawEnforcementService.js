const crypto = require('crypto');

const digestPayload = (payload = {}) =>
  crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

const buildHeaders = (payload = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'x-crime-app-source': 'true-hero-crime-report',
  };

  const integrationKey = process.env.LAW_ENFORCEMENT_API_KEY;
  if (integrationKey) {
    headers.Authorization = `Bearer ${integrationKey}`;
  }

  const signingSecret = process.env.LAW_ENFORCEMENT_SIGNING_SECRET;
  if (signingSecret) {
    const signature = crypto
      .createHmac('sha256', signingSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    headers['x-signature'] = signature;
  }

  return headers;
};

const upsertLawEnforcementCase = async ({ report, actor }) => {
  const endpoint = process.env.LAW_ENFORCEMENT_ENDPOINT;
  if (!endpoint) {
    return { synced: false, reason: 'LAW_ENFORCEMENT_ENDPOINT not configured' };
  }

  const body = {
    reportId: String(report?._id || ''),
    title: report?.title,
    description: report?.description,
    status: report?.status,
    priority: report?.priority,
    riskScore: report?.riskScore,
    category: report?.category,
    severity: report?.severity,
    state: report?.state,
    location: report?.location,
    moderation: report?.moderation,
    escalation: report?.escalation,
    actor: actor
      ? {
          id: String(actor?._id || ''),
          role: actor?.role,
          name: actor?.name,
          email: actor?.email,
        }
      : null,
    syncedAt: new Date().toISOString(),
  };

  const timeoutMs = Number(process.env.LAW_ENFORCEMENT_TIMEOUT_MS || 8000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: buildHeaders(body),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const responseText = await response.text();

    if (!response.ok) {
      return {
        synced: false,
        status: response.status,
        reason: `Remote integration rejected payload: ${responseText}`,
        digest: digestPayload(body),
      };
    }

    return {
      synced: true,
      status: response.status,
      digest: digestPayload(body),
      response: responseText?.slice(0, 1200) || '',
    };
  } catch (error) {
    return {
      synced: false,
      reason: error?.name === 'AbortError' ? 'Integration request timed out' : error.message,
      digest: digestPayload(body),
    };
  } finally {
    clearTimeout(timer);
  }
};

module.exports = {
  upsertLawEnforcementCase,
};
