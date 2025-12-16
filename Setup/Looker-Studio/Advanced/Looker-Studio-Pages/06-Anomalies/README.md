# Anomalies

* **Data Source:** ga4_documentation_anomaly_detection

![GA4 Parameter & Event Documentation - Anomaly](../../../images/GA4-Documentation-BigQuery-Anomalies.png)

| Number  | Field | Data Type | Field Type |
| ------------- | ------------- | ------------- | ------------- |
| 1 | Anomaly Name Search | Text | Control Field |
| 2 | Anomaly Description Search | Text | Control Field |
| 3 | Date Picker |  |  |
| 4 | event_or_parameter_type | Text | Control Field |
| 5 | platform | Text | Control Field |

* **Data Source:** ga4_documentation_anomaly_detection

![GA4 Parameter & Event Documentation - Anomaly Graph](../../../images/GA4-Documentation-BigQuery-Anomalies-Graph.png)

| Number  | Field | Data Type | Field Type |
| ------------- | ------------- | ------------- | ------------- |
| 1 | event_date | Date | Dimension |
| 2 | event_or_parameter_name | Text | Dimension |
| 3 | net_change_percentage | Percent | Metric |

![GA4 Parameter & Event Documentation - Anomaly Table](../../../images/GA4-Documentation-BigQuery-Anomalies-Table.png)

| Number  | Field | Data Type | Field Type |
| ------------- | ------------- | ------------- | ------------- |
| 1 | event_date | Date | Dimension |
| 2 | Event or Parameter URL \[Calc\] | Hyperlink | Dimension |
| 3 | event_or_parameter_type | Text | Dimension |
| 4 | platform | Text | Dimension |
| 5 | anomaly_description | Text | Dimension |
| 6 | lower_bound | Number | Metric |
| 7 | upper_bound | Number | Metric |
| 8 | actual_count | Number | Metric |
| 9 | expected_count | Number | Metric |
 9 | net_change_percentage | Percent | Metric |