const buffer = require('buffer');
const crypto = require('crypto');
const AWS = require('aws-sdk')

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
    //const KEY = new Buffer.alloc(32, crypto.randomBytes(32), 'utf8');
    const dataKey = data.Plaintext.toString('utf8');
    console.log(dataKey);
    const KEY = new Buffer.alloc(32, dataKey, 'utf8');
    const IV = new Buffer.alloc(16, '0123456789abcdef', 'utf8')
    const aesCipher = aes256gcm(KEY, IV);

    const [encrypted, authTag] = aesCipher.encrypt('goodbye, world', IV);
    console.log(encrypted); // 'hello, world' encrypted
    //console.log(authTag);
    //console.log(IV)

    const decrypted = aesCipher.decrypt(encrypted, IV, authTag);
    console.log(decrypted); // 'hello, world'
    /*
    data = {
      CiphertextBlob: <Binary String>, // The encrypted data key.
      KeyId: "arn:aws:kms:us-east-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab", // The ARN of the CMK that was used to encrypt the data key.
      Plaintext: <Binary String>// The unencrypted (plaintext) data key.
     }
     */
   }
 });
