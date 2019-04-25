const buffer = require('buffer');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const express = require('express');
const Q = require('q');

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

const initVector = '0123456789abcdef';

// Process JSON tree
const jsonProcess = (tree, fn) => {
  for (var attr in tree) {
    if (typeof tree[attr] !== 'object') {
      fn(tree, attr);
      continue;
    }
    jsonProcess(tree[attr], fn);
  }
};

kms.generateDataKey(params, function(err, data) {
  if (err) {
    console.log(err, err.stack); // an error occurred
    res.status(500).end();
  }
  else {
    const cipherKey = data.CiphertextBlob.toString('base64');
    const dataKey = data.Plaintext.toString('utf8');
    const KEY = new Buffer.alloc(32, dataKey, 'utf8');
    const IV = new Buffer.alloc(16, initVector, 'utf8')
    const aesCipher = aes256gcm(KEY, IV);

    app.use('/encryptdata', express.json());

    app.post('/encryptdata', function(req, res) {
      try {
        var result = JSON.parse(JSON.stringify(req.body));
        jsonProcess(result, function(node, attr) {
          if (typeof node[attr] === 'string')
            node[attr] = cipherKey + aesCipher.encrypt(Buffer.from(node[attr], 'utf8'));
        });
        res.send(JSON.stringify(result));
      }
      catch (err) {
        console.log(err, err.stack); // an error occurred
        res.status(500).end();
      }
    });

    app.use('/decryptdata', express.json());

    app.post('/decryptdata', function(req, res) {
      var result = JSON.parse(JSON.stringify(req.body));
      var promises = [];
      const fn = (node, attr) => {
        if (typeof node[attr] !== 'string') {
          return;
        }
        const decryptKey = node[attr].substring(0,247);
        const encryptedData = node[attr].substring(248);
        var deferred = Q.defer();
        kms.decrypt({ CiphertextBlob: Buffer.from(decryptKey, 'base64') }, function(err, data) {
          if (err) {
            console.log(err, err.stack); // an error occurred
            res.status(500).end();
            deferred.reject(err);
          }
          else {
            try {
              let plainKey = data.Plaintext.toString('utf8');
              let PLAINKEY = new Buffer.alloc(32, plainKey, 'utf8');
              let plaintext = aesCipher.decrypt(encryptedData, PLAINKEY);
              node[attr] = plaintext;
              console.log(JSON.stringify(result));
              console.log('----');
              deferred.resolve(true);
            }
            catch (err) {
              console.log(err, err.stack); // an error occurred
              res.status(500).end();
            }
          }
        });
        promises.push(deferred.promise);
      };
      jsonProcess(result, fn);
      var allPromise = Q.all(promises);
      allPromise.then(function(val) {
        res.send(JSON.stringify(result));
      });
    });

    app.listen(port, () => console.log(`Encryption Service running on port ${port}.`));
  }
});
