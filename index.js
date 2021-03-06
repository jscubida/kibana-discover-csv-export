"use strict";
    
module.exports = function (kibana) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch'],

    uiExports: {
        navbarExtensions: ['plugins/kibana-discover-csv-export/app']
    },

    init(server, options) {
        server.route({        
            path: '/api/kibana-discover-csv-export/download',
            method: 'POST',
            config: {
                payload: {
                    timeout: 60000
                }
            },
            handler(req, reply) {
                const config = require('./config');
                /**
                 Format sort from Object to string.
                 @param {Object} toSort
                 @return {string}
                 */
                let formatSort = function (toSort) {
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
                let formatQuery = function (query) {
                    return JSON.stringify({'query': query});
                };
                
                /**
                 Format fields from Array to string.
                 @param {Array} fields
                 @return {string}
                 */
                let formatFields = function (fields) {
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
                
                let payload = req.payload;
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
                
                //console.log(toRun);
                const { spawn } = require('child_process');
                const args = [];
                const opts = {
                    shell: true,
                    stdio: 'ignore',
                    cwd: outputFolder,
                };
                const cmd = spawn(toRun, args, opts);
                cmd.on('close', function (code) {
                    console.log(`done with code: ${code}`);
                    reply.file(fullPath);
                });
                cmd.on('error', function (err) {
                    console.error(`Failed with error: ${err}`);
                    reply.error(err);
                });
            }
        });
    }
  });
};