# CSV Export for Kibana 5

Export query results as CSV files from the Kibana Discover tab. 

## Dependencies

- [es2csv](https://github.com/taraslayshchuk/es2csv/tree/master)
- [node-cmd](https://www.npmjs.com/package/node-cmd)
- @elastic/filesaver

## Installation

    cd <kibana plugins folder>
    git clone git@github.com:jscubida/kibana-discover-csv-export.git
    sudo pip install es2csv
    npm install @elastic/filesaver
    npm install node-cmd
    npm install box-sdk

You should remove the contents of Kibana's `optimize` folder before restarting Kibana.

## Usage

Navigate to the plugin and modify `config.js`. 

Go to Kibana -> Discover. At the top, you should see an Export button. 

## Implementation Notes

A column whose name starts with a `_` may or may not be exported properly. 
