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
                let index = $route.current.locals.savedSearch.searchSource._state.index.title;
                var params_body = angular.copy($route.current.locals.savedSearch.searchSource.history[0].fetchParams.body);
                params_body.query.bool.must.map(function (query) { query['$state'] = undefined; return query; })
                params_body.query.bool.must_not.map(function (query) { query['$state'] = undefined; return query; })
                let query = angular.toJson(params_body.query);
                let sort = angular.toJson(params_body.sort);
                $.post('../api/kibana-discover-csv-export/download',
                {
                    index: index,
                    query: query,
                    sort: sort
                }
                ).done(function (data) {
                    self.exportAsCsv(data);
                    $scope.download.processing = false;
                    $scope.download.state = 'Done!'
                    $scope.download.progress = 100;
                }).fail(function (data) {
                    $scope.download.state = 'Retrieving data : Error: (' + data.state() + ') ' + JSON.stringify(data);
                    $scope.download.processing = false;
                    $scope.download.status = 500;
            });
        }
    }
})
