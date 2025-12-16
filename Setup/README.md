# Setup

The GA4 documentation solution comes in 2 versions:
1. [Basic](#basic)
2. [Advanced](#advanced)

First decide which solution you are going to use. Advanced is the recommended solution.

## Basic
Basic contains the following parts:

1. [Google Sheet](Google-Sheet)
2. [Basic Looker Studio](Looker-Studio/Basic)

Basic is using Google Sheet as data source. This means documentation is not integrated with the data you are collecting.

## Advanced
Basic contains the following parts:

1. [Google Sheet](Google-Sheet)
2. [Google Cloud/BigQuery setup](BigQuery)
3. [Advanced Looker Studio](Looker-Studio/Advanced)

Advanced uses BigQuery, allowing documentation to align directly with GA4 data.
* Includes **Anomaly Detection** to identify data collection issues like tracking inconsistencies, or flagging new events and parameters discovered.