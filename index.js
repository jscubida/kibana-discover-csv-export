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
                
                let payload = req.payload;
                let index = payload.index;
                let query = formatQuery(JSON.parse(payload.query));
                let sort = formatSort(JSON.parse(payload.sort));
                let outputFile = 'output.csv';
                
                var toRun = 'es2csv ';
                toRun += '-i ' + index + ' ';
                toRun += '-rq \'' + query + '\' ';
                toRun += '-S ' + sort + ' ';
                toRun += '-o ' + outputFile;
                //console.log(toRun);
                var cmd=require('node-cmd');
                cmd.get(
                    toRun,
                    function(err, data, stderr){
                        cmd.get(
                            'pwd',
                            function(err, data, stderr){
                                let filepath = data.replace(/(\r\n\t|\n|\r\t)/gm,"") + '/' + outputFile;
                                //console.log(filepath);
                                reply.file(filepath);
                            }
                        );
                    }
                );
            }
        });
    }
  });
};