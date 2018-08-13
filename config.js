"use strict";

var config = {}

// REQUIRED:

// Name of the output CSV file
config.outputFile = 'outputFile.csv';

// The path that the process will write the CSV file to. Make sure the 'kibana' 
// user has write permissions to this folder and no trailing slash
config.outFolderPath = '~/Documents';

// OPTIONAL:

// Elasticsearch host url
// config.url = 'http://example.com';

// Elasticsearch basic authentication in the form of username:password
// config.auth = 'username:password';

module.exports = config;