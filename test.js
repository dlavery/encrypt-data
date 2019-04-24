const buffer = require('buffer');
const crypto = require('crypto');
const AWS = require('aws-sdk')
const express = require('express')

const app = express();
const port = 8080;

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
