// src/utils/crypto.js
/**
 * SHA-1 hashing utilities for password checking
 * Client-side implementation for k-anonymity security
 */

/**
 * Calculate SHA-1 hash of a string
 * @param {string} text - Text to hash
 * @returns {string} SHA-1 hash in uppercase hexadecimal
 */
export function sha1(text) {
  // Convert string to UTF-8 encoded array
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  // Use SubtleCrypto API if available
  if (crypto && crypto.subtle) {
    return crypto.subtle.digest('SHA-1', data)
      .then(buffer => {
        const hashArray = Array.from(new Uint8Array(buffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      });
  }
  
  // Fallback to JavaScript implementation
  return sha1Fallback(text);
}

/**
 * Synchronous SHA-1 fallback implementation
 * @param {string} text - Text to hash
 * @returns {string} SHA-1 hash in uppercase hexadecimal
 */
export function sha1Sync(text) {
  return sha1Fallback(text);
}

/**
 * JavaScript SHA-1 implementation
 * @param {string} text - Text to hash
 * @returns {string} SHA-1 hash in uppercase hexadecimal
 */
function sha1Fallback(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = sha1Raw(bytes);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * Raw SHA-1 implementation
 * @param {Uint8Array} bytes - Input bytes
 * @returns {ArrayBuffer} SHA-1 hash
 */
function sha1Raw(bytes) {
  const words = [];
  for (let i = 0; i < bytes.length - 3; i += 4) {
    words.push(
      (bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]
    );
  }
  
  let i = bytes.length % 4;
  let bitLength = bytes.length * 8;
  
  if (i === 0) {
    words.push(0x080000000);
  } else if (i === 1) {
    words.push(bytes[bytes.length - 1] << 24 | 0x0800000);
  } else if (i === 2) {
    words.push(
      (bytes[bytes.length - 2] << 24) | 
      (bytes[bytes.length - 1] << 16) | 
      0x08000
    );
  } else {
    words.push(
      (bytes[bytes.length - 3] << 24) | 
      (bytes[bytes.length - 2] << 16) | 
      (bytes[bytes.length - 1] << 8) | 
      0x80
    );
  }
  
  while ((words.length % 16) !== 14) {
    words.push(0);
  }
  
  words.push((bitLength >>> 29) & 0xFFFFFFFF);
  words.push((bitLength << 3) & 0xFFFFFFFF);
  
  let H0 = 0x67452301;
  let H1 = 0xEFCDAB89;
  let H2 = 0x98BADCFE;
  let H3 = 0x10325476;
  let H4 = 0xC3D2E1F0;
  
  const W = new Array(80);
  
  for (let blockstart = 0; blockstart < words.length; blockstart += 16) {
    for (let i = 0; i < 16; i++) {
      W[i] = words[blockstart + i];
    }
    
    for (let i = 16; i < 80; i++) {
      const n = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
      W[i] = (n << 1) | (n >>> 31);
    }
    
    let A = H0;
    let B = H1;
    let C = H2;
    let D = H3;
    let E = H4;
    
    for (let i = 0; i < 80; i++) {
      let f, k;
      
      if (i < 20) {
        f = (B & C) | ((~B) & D);
        k = 0x5A827999;
      } else if (i < 40) {
        f = B ^ C ^ D;
        k = 0x6ED9EBA1;
      } else if (i < 60) {
        f = (B & C) | (B & D) | (C & D);
        k = 0x8F1BBCDC;
      } else {
        f = B ^ C ^ D;
        k = 0xCA62C1D6;
      }
      
      const temp = (((A << 5) | (A >>> 27)) + f + E + k + W[i]) >>> 0;
      E = D;
      D = C;
      C = ((B << 30) | (B >>> 2)) >>> 0;
      B = A;
      A = temp;
    }
    
    H0 = (H0 + A) >>> 0;
    H1 = (H1 + B) >>> 0;
    H2 = (H2 + C) >>> 0;
    H3 = (H3 + D) >>> 0;
    H4 = (H4 + E) >>> 0;
  }
  
  const result = new Uint8Array(20);
  result[0] = (H0 >>> 24) & 0xFF;
  result[1] = (H0 >>> 16) & 0xFF;
  result[2] = (H0 >>> 8) & 0xFF;
  result[3] = H0 & 0xFF;
  result[4] = (H1 >>> 24) & 0xFF;
  result[5] = (H1 >>> 16) & 0xFF;
  result[6] = (H1 >>> 8) & 0xFF;
  result[7] = H1 & 0xFF;
  result[8] = (H2 >>> 24) & 0xFF;
  result[9] = (H2 >>> 16) & 0xFF;
  result[10] = (H2 >>> 8) & 0xFF;
  result[11] = H2 & 0xFF;
  result[12] = (H3 >>> 24) & 0xFF;
  result[13] = (H3 >>> 16) & 0xFF;
  result[14] = (H3 >>> 8) & 0xFF;
  result[15] = H3 & 0xFF;
  result[16] = (H4 >>> 24) & 0xFF;
  result[17] = (H4 >>> 16) & 0xFF;
  result[18] = (H4 >>> 8) & 0xFF;
  result[19] = H4 & 0xFF;
  
  return result.buffer;
}

/**
 * Extract hash prefix and suffix for k-anonymity
 * @param {string} password - Password to hash
 * @returns {Promise<{hash: string, prefix: string, suffix: string}>}
 */
export async function getPasswordHashParts(password) {
  if (!password) {
    throw new Error('Password is required');
  }
  
  const hash = await sha1(password);
  const prefix = hash.substring(0, 5);
  const suffix = hash.substring(5);
  
  return {
    hash,
    prefix,
    suffix
  };
}

/**
 * Validate hash prefix format
 * @param {string} prefix - Hash prefix to validate
 * @returns {boolean} True if valid hex format
 */
export function isValidHashPrefix(prefix) {
  return /^[0-9a-fA-F]{5}$/.test(prefix);
}

/**
 * Normalize hash prefix to uppercase hexadecimal
 * @param {string} prefix - Hash prefix to normalize
 * @returns {string} Normalized prefix
 */
export function normalizeHashPrefix(prefix) {
  return prefix.toUpperCase();
}