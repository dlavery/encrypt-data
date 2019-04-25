const buffer = require('buffer');
const crypto = require('crypto');
const AWS = require('aws-sdk')
const express = require('express')

const app = express();
const port = 8080;
const region = "eu-west-2";

// Create a Secrets Manager client
var client = new AWS.SecretsManager({
    region: region
});

// In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
// See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
// We rethrow the exception by default.

client.getSecretValue({SecretId: "encrypt-data-service"}, function(err, data) {
    if (err) {
        console.log(err, err.stack);
        if (err.code === 'DecryptionFailureException')
            // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'InternalServiceErrorException')
            // An error occurred on the server side.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'InvalidParameterException')
            // You provided an invalid value for a parameter.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'InvalidRequestException')
            // You provided a parameter value that is not valid for the current state of the resource.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'ResourceNotFoundException')
            // We can't find the resource that you asked for.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
    }
    else {
        // Decrypts secret using the associated KMS CMK.
        // Depending on whether the secret is a string or binary, one of these fields will be populated.
        if ('SecretString' in data) {
            secret = data.SecretString;
        } else {
            let buff = new Buffer(data.SecretBinary, 'base64');
            decodedBinarySecret = buff.toString('ascii');
        }
    }
    console.log(JSON.stringify(data));
    // Your code goes here.
    var secrets = JSON.parse(data.SecretString);
    console.log(secrets['cmk-id']);
    console.log(secrets['iv']);
});

const jsonProcess = (tree, fn) => {
  for (var attr in tree) {
    if (typeof tree[attr] !== 'object') {
      fn(tree, attr);
      continue;
    }
    jsonProcess(tree[attr], fn);
  }
};

app.use('/', express.json());

app.get('/', function(req, res) {
  returnData = {
    message: "Hello, World"
  };
  res.send(JSON.stringify(returnData));
});

app.post('/', function(req, res) {
  var result = JSON.parse(JSON.stringify(req.body));
  jsonProcess(result, function(node, attr) {
    console.log(attr);
    node[attr] = 'xxxx';
  });
  res.send(JSON.stringify(result));
});

app.listen(port, () => console.log(`Testing Service running on port ${port}.`));
