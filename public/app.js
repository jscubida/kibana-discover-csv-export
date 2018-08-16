"use strict";
    
require('./navbar/download-button');

import { NavBarExtensionsRegistryProvider } from 'ui/registry/navbar_extensions';

function discoverControlProvider() {
  return {
    appName: 'discover',
    name: 'kibana-discover-csv-export',
    icon: 'fa-download',
    template: '<kibana-discover-csv-export-button config-template="configTemplate"></kibana-discover-csv-export-button>',
    description: 'csv export',
    key: 'csv-export-button',
    label: 'Export',
  };
}

NavBarExtensionsRegistryProvider.register(discoverControlProvider);
