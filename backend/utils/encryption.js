const crypto = require('crypto');

const ALGORITHM  = 'aes-256-gcm';
const RAW_KEY    = process.env.ENCRYPTION_KEY || 'unsafe-default-dev-key-change_me';
const KEY        = crypto.createHash('sha256').update(String(RAW_KEY)).digest(); // 32-byte key
const IV_LENGTH  = 12; // 96-bit IV recommended for GCM

/**
 * encrypt
 * AES-256-GCM symmetric encryption.
 * Returns a colon-separated string: iv:authTag:ciphertext (all hex).
 */
const encrypt = (plaintext) => {
  const iv         = crypto.randomBytes(IV_LENGTH);
  if (plaintext === undefined || plaintext === null) {
    throw new Error('Nothing to encrypt');
  }
  const cipher     = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted  = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag    = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

/**
 * decrypt
 * Reverses encrypt(). Throws on authentication failure (tampered data).
 */
const decrypt = (ciphertext) => {
  if (!ciphertext || typeof ciphertext !== 'string') throw new Error('Malformed ciphertext');
  const [ivHex, authTagHex, dataHex] = ciphertext.split(':');
  if (!ivHex || !authTagHex || !dataHex) throw new Error('Malformed ciphertext');

  const iv       = Buffer.from(ivHex, 'hex');
  const authTag  = Buffer.from(authTagHex, 'hex');
  const data     = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
};

module.exports = { encrypt, decrypt };
