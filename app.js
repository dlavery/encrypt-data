const buffer = require('buffer');
const crypto = require('crypto');
const AWS = require('aws-sdk')
const express = require('express')

const app = express();
const port = 8080;

// Implementation of `aes-256-gcm` with node.js's `crypto` lib.
const aes256gcm = (key, iv) => {
  const ALGO = 'aes-256-gcm';

  // encrypt returns base64-encoded ciphertext
  const encrypt = (buf) => {
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    let enc = cipher.update(buf, null, 'base64');
    enc += cipher.final('base64');
    return cipher.getAuthTag().toString('base64') + enc;
  };

  // decrypt decodes base64-encoded ciphertext into a utf8-encoded string
  const decrypt = (enc, cipherKey) => {
    authTag = Buffer.from(enc.substring(0, 23), 'base64');
    const decipher = crypto.createDecipheriv(ALGO, cipherKey, iv);
    decipher.setAuthTag(authTag);
    let buf = decipher.update(enc.substring(24), 'base64');
    buf += decipher.final();
    console.log(buf);
    return buf;
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
    console.log(data.Plaintext);
    const cipherKey = data.CiphertextBlob.toString('base64');
    const dataKey = data.Plaintext.toString('utf8');
    console.log(dataKey);
    const KEY = new Buffer.alloc(32, dataKey, 'utf8');
    console.log(KEY);
    const IV = new Buffer.alloc(16, '0123456789abcdef', 'utf8')
    const aesCipher = aes256gcm(KEY, IV);

    app.use('/encryptdata', express.json());

    app.post('/encryptdata', function (req, res) {
      data = {encKey: cipherKey};
      /*for (var attr in req.body) {
        if (req.body.hasOwnProperty(attr)) {
          data[attr] = aesCipher.encrypt(Buffer.from(req.body[attr], 'utf8'));
        }
      }*/
      data['enc'] = aesCipher.encrypt(Buffer.from(req.body['data'], 'utf8'));
      res.send(JSON.stringify(data));
    });

    app.use('/decryptdata', express.json());

    app.post('/decryptdata', function (req, res) {
      kms.decrypt({CiphertextBlob: Buffer.from(req.body.encKey, 'base64')}, function(err, data) {
        returnData = {};
        console.log(data.Plaintext);
        let plainKey = data.Plaintext.toString('utf8');
        console.log(plainKey);
        let PLAINKEY = new Buffer.alloc(32, plainKey, 'utf8');
        console.log(PLAINKEY);
        console.log(PLAINKEY.toString('base64'));
        console.log(PLAINKEY.toString('base64').length);
        /*for (var attr in req.body) {
          if (req.body.hasOwnProperty(attr) && attr != "encKey") {
            returnData[attr] = aesCipher.decrypt(req.body[attr], PLAINKEY); // USE PROMISES
          }
        }*/
        returnData['data'] = aesCipher.decrypt(req.body['enc'], PLAINKEY);
        res.send(JSON.stringify(returnData));
      });
    });

    app.listen(port, () => console.log(`Encryption Service running on port ${port}.`));
  }
});
