# Anomaly Detection
**GA4** has anomaly detection, but it will also report anomalies based on changes in traffic. This anomaly detection tries to avoid reporting anomalies caused by session fluctuations.

* This functionality is in **BETA**
* Anomaly detection flags Events or Parameters with significant spikes or drops that aren’t explained by session fluctuations.
  * **Event** anomalies are detected independently across platforms.
  * **Parameter** anomalies are detected independently across scopes, platforms and events.
	* Parameter anomalies are only flagged if their anomaly aren’t explained by an Event. 
* New Events and Parameters detected are flagged independently.

This helps you identify if something is potentially broken or has changed.

* Anomalies are detected using **Standard Deviation**
  - You can choose between **adjusted for day of week** (dayofweek), or **standard** (recommended). 

## Anomaly Detection Setup

1. Create 1 [**Scheduled Query**](#scheduled-queries-settings)
2. Create 1 [**Logs Router**](#create-the-logs-router)
3. Create 1 [**Cloud Run Function**](#google-cloud-run-functions)

### Anomaly Settings

* Anomaly settings can be adjusted in **Google Sheet** in **Advanced Settings**.

#### Anomaly Query Periods settings

| Declaration  | Default | Comment |
| ------------- | ------------- | ------------- |
| Day Interval Short | 1 | Number of days to check for anomalies (e.g., last 1 day). Declared in query as **day_interval_short**. |
| Day Interval Extended | 28 | Number of days to query the first time to get some event & parameter count data. If you have lot's of data, cost may occour if you are selecting a long period. For anomaly detection you need at least 28 days of data, but longer is better. Declared in query as **day_interval_extended**.					 |
| Minimum Number of Days before Anomaly Detection | 28 | Minimum number of days of data collected before running anomaly detection. Declared in query as **days_before_anomaly_detection**. |
| Rolling Statistics Interval | 90| Number of Days for rolling statistics (e.g., last 56 days). With **standard deviation model**, **56** days (as minimum) is recommended. With **day of week** adjustment, **84** (as minimum) is recommended. Declared in query as **day_interval_large**. |

#### Anomaly Detection Settings

| Declaration  | Default | Comment |
| ------------- | ------------- | ------------- |
| Minimum Expected Count Threshold | 10 | Minimum expected count threshold for anomaly detection. If expected count is equal to or lower than this number, no anomaly detection will be run. Delcared in query as **min_expected_count**.					 |
| Standard Deviation Multiplier | 3 | Multiplier for standard deviation. Standard deviation for events and parameters. Scale goes from 1 to 3. Default setting is 3; lower sensitivity, fewer false positives. Declared in query as **stddev_multiplier**.					 |
| Events Explained by Sessions Threshold | 0.1 | If an event anomaly is reported, and should have been explained by changes in sessions, increase the number (going higher than 0.2 may hide real anomalies). Decrease the number for the opposite scenario. Declared in query as **events_explained_by_sessions_threshold**.					 |
| Parameters Explained by Sessions Threshold | 0.1 | If an parameter anomaly is reported, and should have been explained by changes in sessions, increase the number (going higher than 0.2 may hide real anomalies). Decrease the number for the opposite scenario. Declared in query as **parameters_explained_by_sessions_threshold**.					 |
| Standard Deviation Model Setting | standard | Standard Deviation model can either be **standard** or **dayofweek**. dayofweek = adjusted for day of week. standard = not adjusted for day of week. <br /><br /> **Day of Week:** More accurate in detecting true anomalies by considering natural day-of-week fluctuations, but may fail if the day-of-week effect varies seasonally or due to external factors. <br /><br /> **Standard:** Works well for detecting overall trends and anomalies unrelated to weekly patterns. May work better with seasonally changes. <br /><br/>Declared in query as **stddev_model_setting**. |


### Scheduled queries logic
All scheduled queries have this logic:

* If **events_fresh_** table exist (GA 360 only), query **only** this table including **today**.
  * If **events_fresh_** doesn't exist, query **events_** table until **yesterday**.
    * If **yesterday** doesn't exist in **events_** table, query **events_intraday_** (if the table exist), between **yesterday** and **today**.
      * Else query **events_intraday_** only for **today**.

### Scheduled queries settings
* Replace **your-project.analytics_XXX** with your project and data set
* Settings can be edited in **Google Sheet** in the **Advanced Settings** sheet.

| Scheduled query  | Comment |
| ------------- | ------------- |
| [ga4_documentation_anomaly_detection](ga4_documentation_anomaly_detection.sql) | This query creates 2 tables: <ol> <li>[ga4_documentation_anomaly_detection](#table-ga4_documentation_anomaly_detection)</li> <li>[ga4_documentation_anomaly_detection_session_counts](#table-ga4_documentation_anomaly_detection_session_counts)</li></ol> |

* Scheduled queries should use **On-demand Repeat frequency**
* Do NOT tick the checkbox **Set a destination table for query results**. That logic is handled within the SQL query
* Decide if you need to specify **Location type** (Ex. Multi-region and EU)
* Click **Save**

**The complete setup works like this:**
When a _INSERT_ is made to the **ga4_documentation_parameters_daily_counts** table, a **Cloud Run Function** will automatically run the scheduled query.

## Create the Logs Router
* Go to [**Logs Router**](https://console.cloud.google.com/logs/router), and click the **CREATE SINK** button.
  * Give the sink a name, ex. **ga4_documentation_anomaly_update**.
  * Choose **Google Cloud Pub/Sub topic** as the destination.
  * From the list of available Pub/Sub topics, click to **create a new topic**.
  * Create a Topic ID, ex. **ga4_documentation_anomaly_update**.
  * In the **Build inclusion filter**, copy the filter below, but replace **analytics_XXX** with your **Dataset ID**.

 ### Build inclusion filter

```sql

protoPayload.methodName="jobservice.jobcompleted"
protoPayload.serviceData.jobCompletedEvent.job.jobConfiguration.query.destinationTable.datasetId="analytics_XXX"
protoPayload.serviceData.jobCompletedEvent.job.jobConfiguration.query.statementType="INSERT"
protoPayload.serviceData.jobCompletedEvent.job.jobConfiguration.query.destinationTable.tableId="ga4_documentation_parameters_daily_counts"

```

## Google Cloud Run Functions
You have to create **1** Cloud Run Function.

Go to [Cloud Run](https://console.cloud.google.com/run), and click Write a function.

* **Configuration page**
  * Keep environment as **1st gen**.
  * Give the function a descriptive name.
  * Choose **Cloud Pub/Sub** as the trigger type.
  * Select the **Pub/Sub topic** you created in the previous chapter as the trigger.
  * Check the box **Retry on failure**.
  * Click **Save** to save the trigger settings.
  * Ignore the Runtime, build, connections and security settings accordion and click **Next** to continue.
* **Code page**
  * Keep Node.js as the runtime (choose the latest non-Preview version).
  * Click **package.json** to edit its contents.
    * Add the following code:
		```javascript
	    {
			"dependencies": {
			"@google-cloud/bigquery-data-transfer": "^5.0.1",
			"@google-cloud/functions-framework": "^3.5.1"
			}
		}
		```
  * Select **index.js** from the list of files to activate the code editor.
    * Edit the Entry point field on top of the editor to be **runScheduledQuery**.
    * Copy-paste the **index.js** code below into the editor.
    * Change the **projectId** value to match your **Google Cloud Platform project ID**.
    * To get values for **region** and **configId**, browse to [**scheduled queries**](https://console.cloud.google.com/bigquery/scheduled-queries), open your scheduled query, and click the **Configuration tab** to view its details.
    * **region** value should be the Google Cloud region of the Destination dataset, so click through to that to check if you don’t remember what it was.
    * **configId** is the **GUID** at the end of the **Resource name** of the scheduled query.
   
### index.js
```javascript

const functions = require('@google-cloud/functions-framework');
const bigqueryDataTransfer = require('@google-cloud/bigquery-data-transfer');

functions.cloudEvent('runScheduledQuery', async (cloudEvent) => {
  // Update configuration options.
  const projectId = 'REPLACE-THIS';
  const region = 'REPLACE-THIS';
  const configId = 'REPLACE-THIS';

  // Create the run time directly in code.
  // For example, use today's date at 12:00 UTC.
  const now = new Date();
  const runTime = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    12  // 12:00 UTC — adjust if necessary
  ));

  // Create a proto-buffer Timestamp using the client's protos.
  const requestedRunTime = bigqueryDataTransfer.protos.google.protobuf.Timestamp.fromObject({
    seconds: Math.floor(runTime.getTime() / 1000),
    nanos: (runTime.getTime() % 1000) * 1e6
  });

  // Create the BigQuery Data Transfer client.
  const client = new bigqueryDataTransfer.v1.DataTransferServiceClient();
  const parent = client.projectLocationTransferConfigPath(projectId, region, configId);

  // Build the request.
  const request = {
    parent,
    requestedRunTime
  };

  // Trigger the manual transfer run.
  const response = await client.startManualTransferRuns(request);
  console.log(`Scheduled query triggered at ${runTime.toISOString()} for config ${configId}`);
  return response;
});

};

```

## Testing scheduled queries setup
To test the setup, simply go to the **Google Sheet**, select the **📈 GA4 Documentation Menu** at the top of the sheet, and select **BigQuery -> Export Event & Parameter Documentation**.

This will run a BigQuery query using Apps Script. If this is completed without errors, you should now see 2 anomaly tables in BigQuery.

## Overview over tables created in BigQuery
**ga4_documentation_anomaly_detection** is the BigQuery table that you will use in Looker Studio.

1. [ga4_documentation_anomaly_detection](#table-ga4_documentation_anomaly_detection)
2. [ga4_documentation_anomaly_detection_session_counts](#table-ga4_documentation_anomaly_detection_session_counts)


### Table: ga4_documentation_anomaly_detection

| Field name  | Type | Comment |
| ------------- | ------------- | ------------- |
| event_date | DATE | Event Date |
| platform | STRING | Platform can be WEB, IOS or ANDROID |
| event_or_parameter_name | STRING | **event_name** or **parameter_name** |
| event_or_parameter_type | STRING | Can be either **event** or **parameter** |
| actual_count | INTEGER | Actual Count for the Event or Parameter |
| expected_count | FLOAT | Standard Deviation Expected Count |
| anomaly_description | STRING | Anomaly described as text |
| net_change_percentage | FLOAT | Anomaly change expressed as percent in the format 0.1 = 10%, 1 = 100% etc. |
| parameter_scope | STRING | Parameter Scope if the anomaly is for a parameter |
| event_name | STRING | Event Name. Relevant for parameter anomaly |
| upper_bound | FLOAT64 | Upper Bound deviation from expected value. This can help with post-analysis, debugging, and tuning the detection sensitivity. |
| lower_bound | FLOAT64 | Lower Bound deviation from expected value.  This can help with post-analysis, debugging, and tuning the detection sensitivity. |

### Table: ga4_documentation_anomaly_detection_session_counts

| Field name  | Type | Comment |
| ------------- | ------------- | ------------- |
| event_date | DATE | Event Date|
| platform | STRING | Platform can be WEB, IOS or ANDROID |
| session_count_total | INTEGER | Total count of sessions for platform |
