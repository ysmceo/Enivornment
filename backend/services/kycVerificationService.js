const PROVIDER_NAME = 'dojah';

const isPlaceholderValue = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;

  const blockedTokens = [
    'replace',
    'your_',
    'placeholder',
    'example',
    'dummy',
    'optional',
  ];

  return blockedTokens.some((token) => normalized.includes(token));
};

const getKycProviderConfig = () => {
  const baseUrl = process.env.DOJAH_BASE_URL || 'https://api.dojah.io';
  const endpoint = process.env.DOJAH_VERIFICATION_ENDPOINT || '/api/v1/kyc/verify';
  const appId = process.env.DOJAH_APP_ID;
  const apiKey = process.env.DOJAH_API_KEY;

  const configured = ![appId, apiKey].some((value) => isPlaceholderValue(value));

  return {
    baseUrl,
    endpoint,
    appId,
    apiKey,
    configured,
  };
};

const mapProviderStatusToInternal = (providerStatusRaw = '') => {
  const status = String(providerStatusRaw || '').trim().toLowerCase();

  if (!status) return { idVerificationStatus: 'pending', providerStatus: 'unknown' };

  if (['verified', 'approved', 'match', 'valid', 'success', 'passed'].includes(status)) {
    return { idVerificationStatus: 'verified', providerStatus: status };
  }

  if (['rejected', 'failed', 'invalid', 'mismatch', 'declined'].includes(status)) {
    return { idVerificationStatus: 'rejected', providerStatus: status };
  }

  if (['pending', 'processing', 'queued', 'in_review', 'manual_review'].includes(status)) {
    return { idVerificationStatus: 'pending', providerStatus: status };
  }

  return { idVerificationStatus: 'pending', providerStatus: status };
};

const tryParseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const submitIdentityVerification = async ({
  user,
  idCardType,
  idCardNumber,
  governmentIdUrl,
  selfieUrl,
}) => {
  const config = getKycProviderConfig();

  if (!config.configured) {
    return {
      provider: PROVIDER_NAME,
      attempted: false,
      providerStatus: 'not_configured',
      idVerificationStatus: 'pending',
      reference: null,
      reason: 'KYC provider is not configured.',
    };
  }

  if (!idCardType || !idCardNumber) {
    return {
      provider: PROVIDER_NAME,
      attempted: false,
      providerStatus: 'insufficient_data',
      idVerificationStatus: 'pending',
      reference: null,
      reason: 'Missing ID card type or number for verification.',
    };
  }

  const url = `${String(config.baseUrl).replace(/\/+$/, '')}/${String(config.endpoint).replace(/^\/+/, '')}`;

  const payload = {
    provider: PROVIDER_NAME,
    verificationType: idCardType,
    idNumber: idCardNumber,
    user: {
      id: String(user?._id || ''),
      fullName: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      state: user?.state || '',
    },
    documents: {
      governmentIdUrl: governmentIdUrl || null,
      selfieUrl: selfieUrl || null,
    },
  };

  const controller = new AbortController();
  const timeoutMs = Number(process.env.DOJAH_TIMEOUT_MS || 10000);
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        AppId: config.appId,
        Authorization: config.apiKey,
        'X-Api-Key': config.apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutHandle);

    const rawText = await response.text();
    const responseJson = tryParseJson(rawText) || {};

    const rawStatus = responseJson.status || responseJson.verificationStatus || responseJson.data?.status || (response.ok ? 'pending' : 'failed');
    const mapped = mapProviderStatusToInternal(rawStatus);
    const reference = responseJson.referenceId || responseJson.reference || responseJson.id || responseJson.data?.reference || null;

    return {
      provider: PROVIDER_NAME,
      attempted: true,
      providerStatus: mapped.providerStatus,
      idVerificationStatus: mapped.idVerificationStatus,
      reference,
      reason: responseJson.message || null,
      ok: response.ok,
      httpStatus: response.status,
    };
  } catch (err) {
    clearTimeout(timeoutHandle);

    return {
      provider: PROVIDER_NAME,
      attempted: true,
      providerStatus: 'provider_error',
      idVerificationStatus: 'pending',
      reference: null,
      reason: err.message || 'Verification provider request failed.',
      ok: false,
      httpStatus: null,
    };
  }
};

module.exports = {
  getKycProviderConfig,
  submitIdentityVerification,
};
