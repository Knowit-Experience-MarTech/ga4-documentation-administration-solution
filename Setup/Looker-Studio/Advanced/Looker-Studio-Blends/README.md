# Looker Studio Blends
This section contains information about **Blends** used in Looker Studio. In total there are 4 blends.

## GA4 Event Name & Image Blend

| What  | Table 1 | Join | Table 2 |
| ------------- | ------------- | ------------- | ------------- |
| Table | ga4_documentation_events_and_images |  | ga4_documentation_events_and_documentation_status |
| Join | event_name | Inner Join | event_name |
| Table Name | GA4 Image Table |  | GA4 Event Table |
| Dimensions | <ul><li>event_name</li> <li>Event Image \[Calc\]</li></ul> |  | <ul><li>event_name</li></ul>  |


## GA4 Event & Parameter Blend

| What  | Table 1 | Join | Table 2 |
| ------------- | ------------- | ------------- | ------------- |
| Table | ga4_documentation_events_and_documentation_status |  | ga4_documentation_parameters_and_documentation_status |
| Join | event_name | Left Outer Join | event_name |
| Table Name | GA4 Events Table | | GA4 Parameters Table |
| Dimensions | <ul><li>event_name</li> <li>event_group</li> <li>event_description</li> <li>Event Last Seen Days \[Calc\]</li> <li>Event Name Search \[Calc\]</li> <li>Event Description Search \[Calc\]</li>  <li>Event Name URL \[Calc\]</li><li>platform_web_checkmark \[Calc\]</li> <li>platform_ios_checkmark \[Calc\]</li> <li>platform_android_checkmark \[Calc\]</li></ul> | | <ul><li>event_name</li> <li>parameter_name</li> <li>Parameter Name Search \[Calc\]</li></ul> |
| Metrics | <ul> <li>event_count_total</li> <li>Total Events \[Calc\]</li></ul> |  |  |

### GA4 Event Name and Daily Event Count Blend

| What  | Table 1 | Join | Table 2 |
| ------------- | ------------- | ------------- | ------------- |
| Table | ga4_documentation_events_daily_counts | | ga4_documentation_events_and_documentation_status |
| Join | event_name | Inner Join | event_name |
| Table Name | GA4 Event Daily Count Table | | GA4 Event Documentation Table |
| Dimensions | <ul><li>event_name</li> <li>event_count_android</li> <li>event_count_ios</li> <li>event_count_total</li> <li>event_count_web</li> <li>event_date</li></ul> | | <ul><li>event_name</li> <li>platform_android</li> <li>platform_ios</li> <li>platform_web</li></ul> |


## GA4 Parameter & Parameter Daily Count Blend

| What  | Table 1 | Join | Table 2 | Join | Table 3 |
| ------------- | ------------- | ------------- | ------------- | ------------- | ------------- |
| Table | ga4_documentation_parameters_daily_count |  | ga4_documentation_parameters_and_documentation_status |  | ga4_documentation_anomaly_detection |
| Join | <ul><li>event_name</li> <li>parameter_name</li> <li>parameter_scope | Inner Join | <ul><li>event_name</li> <li>parameter_name</li> <li>parameter_scope</li></ul> | Left Outer Join | <ul><li>event_date</li> <li>parameter_name</li> <li>parameter_scope</li></ul> |
| Table Name | GA4 Parameter Daily Count |  | GA4 Parameter Documentation |  | GA4 Anomaly Detection |
| Dimensions | <ul><li>event_date</li> <li>parameter_name</li> <li>parameter_scope</li> <li>parameter_count_web</li> <li>parameter_count_ios</li> <li>parameter_count_android</li> <li>parameter_count_total</li> <li>event_name</li></ul> |  | <ul><li>parameter_name</li> <li>parameter_scope</li> <li>platform_web</li> <li>platform_android</li> <li>platform_ios</li> <li>event_name</li></ul> |  | <ul><li>parameter_scope</li> <li>event_name</li> <li>event_date</li> <li>event_or_parameter_name</li> <li>anomaly_description</li> <li>platform</li> <li>event_or_parameter_type</li></ul> |
| Metrics | Parameter Count |  |  |  | <ul><li>net_change_percentage</li> <li>expected_count</li> <li>actual_count</li> <li>upper_bound</li> <li>lower_bound</li></ul>  |
