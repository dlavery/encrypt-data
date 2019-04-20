const buffer = require('buffer');
const crypto = require('crypto');
const AWS = require('aws-sdk')

// Demo implementation of using `aes-256-gcm` with node.js's `crypto` lib.
const aes256gcm = (key, iv) => {
  const ALGO = 'aes-256-gcm';

  // encrypt returns base64-encoded ciphertext
  const encrypt = (str) => {
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    let enc = cipher.update(str, 'utf8', 'base64');
    enc += cipher.final('base64');
    return cipher.getAuthTag().toString('base64')+enc;
  };

  // decrypt decodes base64-encoded ciphertext into a utf8-encoded string
  const decrypt = (enc) => {
    authTag = Buffer.from(enc.substring(0,23), 'base64');
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    let str = decipher.update(enc.substring(24), 'base64', 'utf8');
    str += decipher.final('utf8');
    return str;
  };

  return {
    encrypt,
    decrypt,
  };
};

// Get KMS Key
const kms = new AWS.KMS({region: 'eu-west-2'});
const params = {
    KeyId: "arn:aws:kms:eu-west-2:713186966590:key/0a086f1b-67e1-4765-afc6-a90c1e7018c2",
    KeySpec: "AES_256"
};
//var KEY;
kms.generateDataKey(params, function(err, data) {
  if (err) {
    console.log(err, err.stack); // an error occurred
  }
  else {
    const dataKey = data.Plaintext.toString('utf8');
    const KEY = new Buffer.alloc(32, dataKey, 'utf8');
    const IV = new Buffer.alloc(16, '0123456789abcdef', 'utf8')
    const aesCipher = aes256gcm(KEY, IV);

    const encrypted = aesCipher.encrypt('goodbye, cruel world');
    console.log(encrypted); // 'hello, world' encrypted

    const decrypted = aesCipher.decrypt(encrypted);
    console.log(decrypted); // 'hello, world'
   }
 });
