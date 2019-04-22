const buffer = require('buffer');
const crypto = require('crypto');
const AWS = require('aws-sdk')
const express = require('express')

const app = express();
const port = 8080;

// Implementation of `aes-256-gcm` with node.js's `crypto` lib.
const aes256gcm = (key, iv, cipherKey) => {
  const ALGO = 'aes-256-gcm';

  // encrypt returns base64-encoded ciphertext
  const encrypt = (buf) => {
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    let enc = cipher.update(buf, null, 'base64');
    enc += cipher.final('base64');
    return cipherKey.toString('base64') + cipher.getAuthTag().toString('base64') + enc;
  };

  // decrypt decodes base64-encoded ciphertext into a utf8-encoded string
  const decrypt = (enc) => {
    decryptKey = Buffer.from(enc.substring(0, 247), 'base64');
    authTag = Buffer.from(enc.substring(248, 271), 'base64');
    kms.decrypt({CiphertextBlob: decryptKey}, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else {
        const decipher = crypto.createDecipheriv(ALGO, data.Plaintext, iv);
        decipher.setAuthTag(authTag);
        let buf = decipher.update(enc.substring(272), 'base64');
        buf += decipher.final();
        return buf;
      }
      //console.log(data);           // successful response
       /*
       data = {
        KeyId: "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab", // The Amazon Resource Name (ARN) of the CMK that was used to decrypt the data.
        Plaintext: <Binary String>// The decrypted (plaintext) data.
       }
       */
     });
  };

  return {
    encrypt,
    decrypt,
  };
};

// Get KMS Key
const kms = new AWS.KMS({
  region: 'eu-west-2'
});
const params = {
  KeyId: "arn:aws:kms:eu-west-2:713186966590:key/0a086f1b-67e1-4765-afc6-a90c1e7018c2",
  KeySpec: "AES_256"
};

kms.generateDataKey(params, function(err, data) {
  if (err) {
    console.log(err, err.stack); // an error occurred
  } else {
    const dataKey = data.Plaintext.toString('utf8');
    const KEY = new Buffer.alloc(32, dataKey, 'utf8');
    const IV = new Buffer.alloc(16, '0123456789abcdef', 'utf8')
    const aesCipher = aes256gcm(KEY, IV, data.CiphertextBlob);

    //const encrypted = aesCipher.encrypt(Buffer.from('goodbye, cruel world', 'utf8'));
    //console.log(encrypted); // 'hello, world' encrypted

    //const decrypted = aesCipher.decrypt(encrypted);
    //console.log(decrypted.toString('utf8')); // 'hello, world'

    app.use('/encryptdata', express.json());
    app.post('/encryptdata', function (req, res) {
      data = {};
      for (var attr in req.body)
        if (req.body.hasOwnProperty(attr)) {
          data[attr] = aesCipher.encrypt(Buffer.from(req.body[attr], 'utf8'));
        }
      res.send(JSON.stringify(data));
    });

    app.use('/decryptdata', express.json());
    app.post('/decryptdata', function (req, res) {
      data = {};
      for (var attr in req.body)
        if (req.body.hasOwnProperty(attr)) {
          data[attr] = aesCipher.decrypt(req.body[attr]).toString('utf8');
        }
      res.send(JSON.stringify(data));
    });

    app.listen(port, () => console.log(`Encryption Service running on port ${port}.`));
  }
});
