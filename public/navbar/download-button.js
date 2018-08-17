"use strict";
    
const module = require('ui/modules').get('kibana-discover-csv-export');

module.directive('kibanaDiscoverCsvExportButton', () => {
    return {
        restrict: 'E',
        scope: {},
        template: require('./download-button.html'),
        controllerAs: 'kibanaDiscoverCsvExportButton',
        controller: function discoverController($scope, config, courier, $route, $window, Notifier,
            AppState, timefilter, Promise, Private, kbnUrl) {
                const appConfig = require('../../config');
                
                /**
                    Tries to save the current state of the discover view
                */
                self.saveDiscoverState = function () {
                    const splitHash = $window.location.hash.split('?');
                    if (splitHash.length == 2) {
                        $.post({
                            url: '../api/kibana-discover-csv-export/saveDiscoverState',
                            data: {
                                state: splitHash[1]
                            }
                        });
                    }
                };
                /**
                 Show login for Box
                */
                self.showBoxAuth = function () {
                    self.saveDiscoverState();
                    const querystring = require('querystring');
                
                    // Build Box auth object
                    const payload = {
                        'response_type': 'code',
                        'client_id': appConfig.oauthClientId,
                        'redirect_uri': appConfig.redirectURI,
                    };
                
                    // Build redirect URI and redirect
                    const qs = querystring.stringify(payload);
                    const authEndpoint = `https://account.box.com/api/oauth2/authorize?${qs}`;
                    $window.location.href = authEndpoint;
                };
                /**
                 Show folder picker for logged in Box user
                */
                self.showBoxFolderPicker = function () {
                    self.loadLink('https://cdn01.boxcdn.net/platform/elements/6.0.0/en-US/picker.css', 'text/css', 'stylesheet');
                    self.loadScript('https://cdn.polyfill.io/v2/polyfill.min.js?features=es6,Intl');
                    self.loadScript('https://cdn01.boxcdn.net/platform/elements/6.0.0/en-US/picker.js');
                    var folderId = '0';
                    var accessToken = $scope.authKey.accessToken;
                    setTimeout(function() {
                        var folderPicker = new Box.FolderPicker();
                        folderPicker.show(folderId, accessToken, {
                            container: '.container',
                            logoUrl: appConfig.logoUrl,
                        });
                        folderPicker.on('choose', function (chosen) {
                            let firstPick = chosen[0];
                            if (firstPick.type != 'folder') {
                                alert('Please select a folder');
                            } else {
                                $scope.download.state = "Uploading to " + firstPick.name + ". Check this folder in a little bit.";
                                const url = '../api/kibana-discover-csv-export/uploadToBox';
                                const onSuccess = function (data, status, response) {
                                   $scope.download.state = "Actually, it's done! Go to Box nao!";
                                };
                                const onFailure = function (response, status, err) {
                                   $scope.download.state = 'Error: (' + status + ') ' + JSON.stringify(response);
                                   $scope.download.status = 500;
                                };
                                const opts = {folderId: firstPick.id};
                                self.executeQuery(url, opts, onSuccess, onFailure)
                            }
                        });
                    }, 1000);
                };
                /**
                    Add a script to <head>
                    @param {string} url URL of script to load
                    @param {string} type Type of script
                    @param {string} charset Optional character set
                    @return {string}
                */
                self.loadScript = function (url, type, charset) {
                    if (type===undefined) type = 'text/javascript';
                    if (url) {
                        var script = document.querySelector("script[src*='"+url+"']");
                        if (!script) {
                            var heads = document.getElementsByTagName("head");
                            if (heads && heads.length) {
                                var head = heads[0];
                                if (head) {
                                    script = document.createElement('script');
                                    script.setAttribute('src', url);
                                    script.setAttribute('type', type);
                                    if (charset) script.setAttribute('charset', charset);
                                    head.appendChild(script);
                                }
                            }
                        }
                        return script;
                    }
                };
                /**
                    Add a link to <head>
                    @param {string} url URL of link to load
                    @param {string} type Type of link
                    @param {string} rel Relationship between current doc and
                    linked source
                    @return {string}
                */
                self.loadLink = function (url, type, rel) {
                    if (url) {
                        var script = document.querySelector("link[href*='"+url+"']");
                        if (!script) {
                            var heads = document.getElementsByTagName("head");
                            if (heads && heads.length) {
                                var head = heads[0];
                                if (head) {
                                    script = document.createElement("link");
                                    script.rel = rel;
                                    script.type = type;
                                    script.href = url;
                                    head.appendChild(script);
                                }
                            }
                        }
                        return script;
                    }
                };
                /**
                    Fetch selected column names
                    @return {Array} Array of strings
                */
                self.fetchFields = function () {
                    let selected = $window.document.getElementsByClassName('discover-selected-fields');
                    if (selected == undefined) {
                        return [];
                    }
                    let numSelected = selected[0].children.length;
                    var i = 0;
                    var fields = [];
                    for (i=0; i<numSelected; i++) {
                        let field = selected[0].children[i];
                        let fieldName = field.getAttribute('attr-field');
                        if (fieldName != '_source') {
                            fields.push(fieldName);
                        }
                    }
                    return fields;
                };
                /**
                    Fetch index, query, field(s) to sort by, and fields to 
                    output and execute export query at url.
                    @param {string} url
                    @param {Object} opts Additional payload
                    @param {function} onSuccess (data, status, response)
                    @param {function} onFailure (response, status, err)
                */
                self.executeQuery = function (url, opts, onSuccess, onFailure) {
                    let index = $route.current.locals.savedSearch.searchSource._state.index.title;
                    var params_body = angular.copy($route.current.locals.savedSearch.searchSource.history[0].fetchParams.body);
                    params_body.query.bool.must.map(function (query) { query['$state'] = undefined; return query; });
                    params_body.query.bool.must_not.map(function (query) { query['$state'] = undefined; return query; });
                    let query = angular.toJson(params_body.query);
                    let sort = angular.toJson(params_body.sort);
                    let fields = angular.toJson(self.fetchFields());
                    var payload = {
                       index: index,
                       query: query,
                       sort: sort,
                       fields: fields
                    }
                    $.extend(payload, opts);
                    $.ajax({
                        url: url,
                        method: 'POST',
                        timeout: 0,
                        data: payload,
                        success: onSuccess,
                        error: onFailure,
                    });
                };
                /**
                    Show Box folder picker or authentication screen
                */
                $scope.uploadToBox = function () {
                    $scope.download = {
                        state: 'Choose folder to upload to',
                        progress: 0,
                        processing: true,
                        status: 0
                    };
                    if ($scope.isLoggedIn) {
                        self.showBoxFolderPicker();
                    } else {
                        self.showBoxAuth();
                    }
                };
                /**
                    Download results of current query as CSV
                */
                $scope.downloadCSV = function () {
                    $scope.download = {
                        state: 'Processing...',
                        progress: 0,
                        processing: true,
                        status: 0
                    };
                    
                    self._saveAs = require('@elastic/filesaver').saveAs;
                    self.exportAsCsv = function (formatted) {
                        $scope.download.state = 'Saving'
                        $scope.download.progress = 98;
                        let csv = new Blob([formatted], { type: 'text/plain;charset=utf-8' });
                        self._saveAs(csv, 'kibana-discover-csv-export.csv');
                    };
                    const url = '../api/kibana-discover-csv-export/downloadCSV';
                    const onSuccess = function (data, status, response) {
                       self.exportAsCsv(data);
                       console.log(status);
                       console.log(JSON.stringify(response));
                       $scope.download.processing = false;
                       $scope.download.state = 'Done!';
                       $scope.download.progress = 100;
                    };
                    const onFailure = function (response, status, err) {
                       $scope.download.state = 'Error: (' + status + ') ' + JSON.stringify(response);
                       $scope.download.processing = false;
                       $scope.download.status = 500;
                       $scope.download.progress = 100;
                    };
                    self.executeQuery(url, {}, onSuccess, onFailure)
                };
                /**
                    Deauthorizes current user's Box account
                */
                $scope.deauthorizeBox = function () {
                    $.post({
                        url: '../api/kibana-discover-csv-export/deauthorizeBox',
                        success: function (data, status, response) {
                            $scope.isLoggedIn = false;
                        },
                        error: function (response, status, err) {
                            $scope.download.state = 'Error: (' + status + ') ' + JSON.stringify(response);
                        },                        
                    });
                };
                /**
                    Try to find a Box access token for the currently logged in 
                    Kibana user.
                */
                $.get({
                   url: '../api/kibana-discover-csv-export/boxAuthKey',
                   success: function (authKey, status, response) {
                       $scope.isLoggedIn = true;
                       $scope.authKey = authKey;
                   },
                   error: function (response, status, err) {
                       $scope.isLoggedIn = false;
                   }
                });
        }
    }
})
