# Looker Studio - Advanced - Using BigQuery as Data Source
Documentation for **Advanced** Looker Studio report. BigQuery is used as Data Source.

* Make sure you first have created the [**BigQuery tables**](../../BigQuery#overview-over-tables-created-in-bigquery) that will be used as **Data Sources** in Looker Studio.
* If you are a consultant and are doing the documentation on behalf of a client, it's recommended to copy Looker Studio with an email belonging to the clients organization. This way ownership to Looker Studio can be transferred within the clients organization.

## How to copy the Looker Studio report

1. Make a copy of the [**Looker Studio GA4 Advanced Documentation report**](https://lookerstudio.google.com/u/0/reporting/28c7c350-c7ed-4c30-86a4-4f26ae4fb42c/page/HMgiD)
2. Click on the 3 vertical dots available at the top right corner, then select "**Make a copy**"
3. Do not pay attention to the warnings (Sometimes the data source name is listed as 'unknown').
   * Copy the report without creating any data sources.
4. After you have copied, all charts will display errors about insufficient permissions. That is OK.
5. In the Looker Studio top menu, go to **Resource** -> **Manage added data sources**.
   * Now connect each data source to **your BigQuery tables**.
   * **Data Credentials** are as default set to **Viewer's Credentials**. You may want to change this to **Owner's Credentials**.
6. After you have connected all data sources to your tables, go back to the report. Refresh your browser to get the new data source connections.
7. You should now have a Looker Studio report showing your data.


## Calculated Fields

### Edit Calculated Fields
You have to edit Calculated Fiels that are **URL** fields. They are found in the following Data Sources:

* ga4_documentation_parameters_and_documentation_status
* ga4_documentation_events_and_documentation_status
* ga4_documentation_anomaly_detection

#### Data Source: ga4_documentation_parameters_and_documentation_status

##### Parameter Name URL \[Calc\]
Makes a **URL** based on **Parameter Name**. Click on Parameter Name will lead the user to a report showing Event Name(s) for this Parameter.

The URL must be edited to match your Looker Studio URLs.

* **Field name:** Parameter Name URL \[Calc\]
* **Field ID:** parameter_name_url_calc

**Formula:**
```javascript
hyperlink(concat("https://lookerstudio.google.com/reporting/XXX/page/p_1ads1jvted?s=ihyU84wd7uY&params=%7B%22df69%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580",parameter_scope,"%22,%22df73%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580",parameter_name,"%22%7D"),parameter_name)
```
###### How to create the URL
Replace the **XXX** part of URL in the formula above with the **ID** found in YOUR Looker Studio URL.
If that doesn't work, this is how to recreate the URL from scratch:

1. Navigate to the **Parameter & Event Documentation** report
2. **Parameter Scope** filter: Select a single Scope (ex. **EVENT**)
3. **Parameter Name** filter: Select a single Parameter (ex. **file_extension**)
4. Copy the URL
5. Find the **Parameter Scope** in the URL, ex. **EVENT**. Replace **EVENT** with **parameter_scope** as shown in the **Formula** above.
6. Find the **Parameter Name** in the URL, ex. **file_extension**. Replace **file_extension** with **parameter_name** as shown in the **Formula** above.

If you want to learn more about creating custom URL links with Calculated Field, here is a video about the subject:
* [https://www.youtube.com/watch?v=fGBsjgjjYWg](https://www.youtube.com/watch?v=fGBsjgjjYWg)

#### Data Source: ga4_documentation_events_and_documentation_status

##### Event Name URL \[Calc\]
Makes a **URL** based on **Event Name**. Click on Event Name will lead the user to a report showing parameters (Dimensions & Metrics) for this Event Name.

The URL must be edited to match your Looker Studio URLs.

* **Field name:** Event Name URL \[Calc\]
* **Field ID:** event_name_url_calc

**Formula:**
```javascript
hyperlink(concat("https://lookerstudio.google.com/reporting/XXX/page/p_nm474cc5cd?params=%7B%22df62%22:%22include%25EE%2580%25803%25EE%2580%2580F%22,%22df61%22:%22ORexclude%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580Not%2520Documented%25EE%2580%2581include%25EE%2580%25803%25EE%2580%2580NU%25EE%2580%2582%22,%22df63%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580",event_name,"%22%7D"),event_name)
```
###### How to create the URL
Replace the **XXX** part of URL in the formula above with the **ID** found in YOUR Looker Studio URL.
If that doesn't work, this is how to recreate the URL from scratch:

1. Navigate to the **Event & Parameter Documentation** report
2. **GA4 Config Parameter** filter: **false** (only)
3. **Documentation Status** filter: Untick **Not Documented** (if you have this choice)
4. **Event Name** filter: Select a single Event Name (ex. **click**)
5. Copy the URL
6. Find the **Event Name** in the URL, ex. **click**. Replace **click** with **event_name** as shown in the **Formula** above.

#### Data Source: ga4_documentation_anomaly_detection

##### Event or Parameter \[Calc\]
Replace the **XXX** part of URL in the formula above with the **ID** found in YOUR Looker Studio URL.

* **Field name:** Event or Parameter \[Calc\]
* **Field id:** event_parameter_calc

**Formula:**
```javascript
case
	when event_or_parameter_type = "event" then
    	concat("https://lookerstudio.google.com/reporting/XXX/page/p_nm474cc5cd?params=%7B%22df62%22:%22include%25EE%2580%25803%25EE%2580%2580F%22,%22df63%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580",event_or_parameter_name,"%22%7D")
   when event_or_parameter_type = "parameter" and event_name is not null then
    	concat("https://lookerstudio.google.com/reporting/XXX/page/p_1ads1jvted?s=ihyU84wd7uY&params=%7B%22df69%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580",parameter_scope,"%22,%22df73%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580",event_or_parameter_name,"%22,%22df116%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580",event_name,"%22%7D") 
	   else
       concat("https://lookerstudio.google.com/reporting/XXX/page/p_1ads1jvted?s=ihyU84wd7uY&params=%7B%22df69%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580",parameter_scope,"%22,%22df73%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580",event_or_parameter_name,"%22%7D") 
end
```

### Other Calculated Fields

* All **[Calculated Fields](Looker-Studio-Calculated-Fields)** documentation

## Looker Studio Pages

* **[Looker Studio pages](Looker-Studio-Pages)** documentation

## Looker Studio Blends

* **[Looker Studio Blends](Looker-Studio-Blends)** documentation