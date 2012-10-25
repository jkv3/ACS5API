This jQuery library is meant to ease the retrieval of ACS data using the Census Bureau API.

To use it you need to request a developer key at http://www.census.gov/developers/

In short: The data requests are defined in DOM elements, the library scans these elements and fills them with data. Each request is for a single geography.

Separate functions help with further calculations of these elements, taking the Margins of Error into account. These functions can also be used independtly from the data requests.

One can request datacells from the detailed ACS tables, but there are also some predefined aggregates. NOTE that the MOE's of these aggregates are calculated using the detailed tables and differ from the published aggregated tables.

The current version should be a working version, but is not finished yet.
Major items on the to-do list:
- documentation of use
- more predefined aggregates (only TotPop implemented as for now)
- other operators: subtraction, ratio and multiplication
- copy the API returned error message in case of an error in the API request

Tested on most modern browsers, probably doesn't work on IE6 and 7.