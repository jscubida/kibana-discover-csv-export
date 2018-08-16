"use strict";
    
module.exports = function (kibana) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch'],

    uiExports: {
        navbarExtensions: ['plugins/kibana-discover-csv-export/app']
    },

    init(server, options) {
        const Boom = require('boom');
        /**
         Format sort from Object to string.
         @param {Object} toSort
         @return {string}
         */
        const formatSort = function (toSort) {
            let len = toSort.length; 
            var formattedSort = [];
            for (var i=0; i<len; i++) {
                let toSortBy = toSort[i];
                let key = Object.keys(toSortBy)[0];
                let order = toSortBy[key]['order'];
                formattedSort.push(key + ':' + order);
            }
            return formattedSort.join(' ');
        };
        /**
         Format query from Object to string.
         @param {Object} query
         @return {string}
        */
        const formatQuery = function (query) {
            return JSON.stringify({'query': query});
        };
        /**
         Format fields from Array to string.
         @param {Array} fields
         @return {string}
         */
        const formatFields = function (fields) {
            let len = fields.length;
            var i = 0;
            var formatted = '';
            for (i=0; i<len; i++) {
                var field = fields[i];
                if (field[0] == '_') {
                    field = field.substr(1);
                }
                formatted += '' + field + ' ';
            }
            return formatted;
        };
        /**
            Build command to export Elasticsearch results to CSV
            @param {Object} config
            @param {Object} payload 
            @return {string}
        */
        const buildExportCommand = function (config, payload) {
            let index = payload.index;
            let query = formatQuery(JSON.parse(payload.query));
            let sort = formatSort(JSON.parse(payload.sort));
            let fields = JSON.parse(payload.fields);
            let outputFolder = config.outFolderPath;
            let outputFile = config.outputFile;
            let fullPath = outputFolder + '/' + outputFile;
            
            var toRun = 'es2csv ';
            toRun += '-i ' + index + ' ';
            toRun += '-rq \'' + query + '\' ';
            toRun += '-S ' + sort + ' ';
            if (fields.length > 0) {
                toRun += '-f ' + formatFields(fields) + ' ';
            }
            toRun += '-o ' + fullPath + ' ';
            if ('url' in config) {
                toRun += '-u ' + config.url + ' ';
            }
            if ('auth' in config) {
                toRun += '-a ' + config.auth + ' ';
            }
            return toRun;
        };
        /**
            Run shell command toRun using folder as path to current working 
            directory.
            @param toRun {string} Shell command to execute
            @param folder {string} Path to folder for current working directory
            @param onSuccess {function} ()
            @param onFailure {function} (err)
        */
        const runCommand = function (toRun, folder, onSuccess, onFailure) {
            const { spawn } = require('child_process');
            const args = [];
            const opts = {
                shell: true,
                stdio: 'ignore',
                cwd: folder,
            };
            const cmd = spawn(toRun, args, opts);
            cmd.on('close', function (code) {
                onSuccess();
            });
            cmd.on('error', function (err) {
                onFailure(err);
            });
        };
        server.state('box', {
            ttl: 30 * 24 * 60 * 60 * 1000, // Thirty days
            isSecure: true,
            path: '/',
            encoding: 'base64json'
        });
        /**
            Generate CSV file of passed in Elasticsearch query parameters and
            upload it to Box
        */
        server.route({
            path: '/api/kibana-discover-csv-export/uploadToBox',
            method: 'POST',
            config: {
                payload: {
                    timeout: 60000
                }
            },
            handler(req, reply) {
                var config = require('./config');
                
                // Create unique filename for CSV file
                var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
                var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
                config.outputFile = localISOTime + '_' + config.outputFile;
                
                // Build command to run
                let payload = req.payload;
                let toRun = buildExportCommand(config, payload);
                
                // Run command
                let outputFolder = config.outFolderPath;
                let outputFile = config.outputFile;
                let fullPath = outputFolder + '/' + outputFile;
                runCommand(toRun, outputFolder, 
                    function () {
                        // Setup client
                        const BoxSDK = require('box-node-sdk');
                        const boxSDK = new BoxSDK({
                          clientID: config.oauthClientId, 
                          clientSecret: config.oauthClientSecret
                        });
                        const authKey = req.state.box.authKey;
                        const client = boxSDK.getPersistentClient(authKey);
                        
                        // Set upload values
                        const filePath = fullPath;
                        const fileName = outputFile;
                        const folderId = payload.folderId;
                        
                        // Create file upload stream
                        const fs = require('fs');
                        const stream = fs.createReadStream(fullPath);
                        
                        // Upload file
                        client.files.uploadFile(
                          folderId, 
                          fileName, 
                          stream, 
                          callback);
                        
                        function callback(err, res) {
                          if (err) {
                              reply(Boom.badImplementation(err));
                              return;
                          }
                          // Clean up temporary file
                          fs.unlink(fullPath);
                          reply(res);
                        }
                    }, 
                    function (err) {
                        reply(Boom.badImplementation(err));
                    });
            }
        });
        /**
            Generate CSV file of passed in Elasticsearch query parameters
        */
        server.route({
            path: '/api/kibana-discover-csv-export/downloadCSV',
            method: 'POST',
            config: {
                payload: {
                    timeout: 60000
                }
            },
            handler(req, reply) {
                var config = require('./config');
                
                // Create unique filename for this CSV file
                var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
                var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
                config.outputFile = localISOTime + '_' + config.outputFile;
                
                // Build command to run
                let payload = req.payload;
                let toRun = buildExportCommand(config, payload);
                
                // Run command
                let outputFolder = config.outFolderPath;
                let outputFile = config.outputFile;
                let fullPath = outputFolder + '/' + outputFile;
                let onSuccess = function () {
                    const fs = require('fs');
                    const output = fs.readFileSync(fullPath, 'utf8');
                    reply(output);
                    fs.unlink(fullPath);
                };
                let onFailure = function (err) {
                    reply(Boom.badImplementation(err));
                };
                runCommand(toRun, outputFolder, onSuccess, onFailure);
            }
        });
        /**
            Callback for Box OAuth implementation
        */
        server.route({
            path: '/api/kibana-discover-csv-export/box',
            method: 'GET',
            handler(req, reply) {
                const params = req.query;
                const code = params.code;
                const config = require('./config');
                const BoxSDK = require('box-node-sdk');
                const boxSDK = new BoxSDK({
                  clientID: config.oauthClientId, 
                  clientSecret: config.oauthClientSecret
                });
                boxSDK.getTokensAuthorizationCodeGrant(code, null, function(err, tokenInfo) {
                    reply.state('box', {authKey: tokenInfo});
                    reply.redirect('/rtf/app/kibana#/discover');
                });
            }
        });
        server.route({
            path: '/api/kibana-discover-csv-export/boxAuthKey',
            method: 'GET',
            handler(req, reply) {
                if (req.state.box != undefined && 'authKey' in req.state.box) {
                    reply(req.state.box.authKey);
                } else {
                    reply(Boom.notFound('authKey'));
                }
            }
        });
        server.route({
            path: '/api/kibana-discover-csv-export/deauthorizeBox',
            method: 'POST',
            handler(req, reply) {
                reply.unstate('box');
                reply();
            }
        })
    }
  });
};