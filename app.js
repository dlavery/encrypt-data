const buffer = require('buffer');
const crypto = require('crypto');

// Demo implementation of using `aes-256-gcm` with node.js's `crypto` lib.
const aes256gcm = (key) => {
  const ALGO = 'aes-256-gcm';

  // encrypt returns base64-encoded ciphertext
  const encrypt = (str, iv) => {
    // Hint: the `iv` should be unique (but not necessarily random).
    // `randomBytes` here are (relatively) slow but convenient for
    // demonstration.
    //const iv = new Buffer.alloc(16, crypto.randomBytes(16), 'utf8');
    const cipher = crypto.createCipheriv(ALGO, key, iv);

    // Hint: Larger inputs (it's GCM, after all!) should use the stream API
    let enc = cipher.update(str, 'utf8', 'base64');
    enc += cipher.final('base64');
    return [enc, cipher.getAuthTag()];
  };

  // decrypt decodes base64-encoded ciphertext into a utf8-encoded string
  const decrypt = (enc, iv, authTag) => {
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    let str = decipher.update(enc, 'base64', 'utf8');
    str += decipher.final('utf8');
    return str;
  };

  return {
    encrypt,
    decrypt,
  };
};

const KEY = new Buffer.alloc(32, crypto.randomBytes(32), 'utf8');
const IV = new Buffer.alloc(16, 'test init vector', 'utf8')
const aesCipher = aes256gcm(KEY, IV);

const [encrypted, authTag] = aesCipher.encrypt('goodbye, world', IV);
console.log(encrypted); // 'hello, world' encrypted
//console.log(authTag);

const decrypted = aesCipher.decrypt(encrypted, IV, authTag);
console.log(decrypted); // 'hello, world'
