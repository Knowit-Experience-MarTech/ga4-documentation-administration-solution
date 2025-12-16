# GA4 Parameter Documentation
This section contains information about **Fields** used on **GA4 Parameter Documentation page**.

### Things to be aware of
Sometimes Looker Studio adds **Date Range Dimension** to charts by "itself". Date Range Dimensions are specified when to use.

* **Data Source:** ga4_documentation_parameters_and_documentation_status

![GA4 Parameter Documentation](../../../images/GA4-Documentation-BigQuery-Parameter-Documentation.png)

| Number  | Field | Data Type | Field Type | 
| ------------- | ------------- | ------------- | ------------- |
| 1 | Event Name Label \[Calc\]| Text | Metric |
| 2 | Total Parameters \[Calc\] | Text | Metric | 
| 3 | ga4_config_parameter | Boolean | Control Field |
| 4 | parameter_group | Text | Control Field |
| 5 | parameter_scope | Text | Control Field |
| 6 | parameter_type | Text | Control Field |
| 7 | Parameter Name Search | | Control Field |
| 8 | Parameter Description Search | | Control Field |
| 9 | parameter_documentation_status_aggregated | Text | Control Field |
| 10 | event_name | Text | Control Field |
| 11 | platform_web | Boolean | Control Field |
| 12 | platform_ios | Boolean | Control Field |
| 13 | platform_android | Boolean | Control Field |

* **Data Source:** ga4_documentation_parameters_and_documentation_status

![GA4 Parameter Documentation](../../../images/GA4-Documentation-BigQuery-Parameter-Documentation-Table.png)

| Number  | Field | Data Type | Field Type | 
| ------------- | ------------- | ------------- | ------------- |
| 1 | parameter_group | Text | Dimension |
| 2 | parameter_display_name | Text | Dimension |
| 3 | Parameter Name URL \[Calc\] | Hyperlink | Dimension |
| 4 | parameter_scope | Text | Dimension |
| 5 | parameter_disallow_ads_personalization_checkmark \[Calc\] | Text | Dimension |
| 6 | platform_web_checkmark \[Calc\] | Text | Dimension |
| 7 | platform_ios_checkmark  \[Calc\] | Text | Dimension |
| 8 | platform_android_checkmark  \[Calc\] | Text | Dimension |
| 9 | parameter_description | Text | Dimension |
| 10 | Parameter Last Seen Days \[Calc\] | Text | Metric |
| 11 | parameter_count_total | Number | Metric |
