# CSV Export for Kibana 5

Export query results as CSV files from the Kibana Discover tab. 

## Dependencies

- [es2csv](https://github.com/taraslayshchuk/es2csv/tree/master)
- @elastic/filesaver

## Installation

    cd <kibana plugins folder>
    git clone git@github.com:jscubida/kibana-discover-csv-export.git
    sudo pip install es2csv
    npm install @elastic/filesaver

You should remove the contents of Kibana's `optimize` folder before restarting Kibana.

## Usage

Go to Kibana -> Discover. At the top, you should see an Export CSV button. 