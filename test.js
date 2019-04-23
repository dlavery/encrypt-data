const buffer = require('buffer');
const crypto = require('crypto');
const AWS = require('aws-sdk')
const express = require('express')

const app = express();
const port = 8080;

app.use('/', express.json());

app.get('/', function(req, res) {
  returnData = {
    message: "Hello, World"
  };
  res.send(JSON.stringify(returnData));
});

app.post('/', function(req, res) {
  for (var attr in req.body) {
    if (typeof req.body[attr] == 'object') {
      console.log(attr + ": " + JSON.stringify(req.body[attr]));
    }
    else {
      console.log(attr + ": " + req.body[attr]);
    }
  }
  returnData = {
    message: "Hello, World"
  };
  res.send(JSON.stringify(returnData));
});

app.listen(port, () => console.log(`Testing Service running on port ${port}.`));
