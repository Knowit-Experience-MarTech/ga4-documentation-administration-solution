# BigQuery and Google Cloud setup

Google Sheet will create and upload data to the following BigQuery tables (if you select to use this functionality). 


| Table name  | Comment |
| ------------- | ------------- |
| ga4_documentation_events | Event documentation |
| ga4_documentation_parameters | Parameter documentation (only parameters that are used in Event documentation will be uploaded) |
| ga4_documentation_annotations | Annotations |

## Scheduled queries
To get the final documentation result in BigQuery that can be used by Looker Studio (or similar solutions), we need to run 3 scheduled queries. These queries will create [3 different tables](#overview-over-tables-created-in-bigquery).
* Replace **your-project.analytics_XXXXX** with your project and data set
* As default 3 days of data is queried. Change the number of days to what suits your needs best.
  * Ex. if you have little data where some Events only occours "now and then", you would maybe run a query that spans more days.


| Scheduled query  | Comment |
| ------------- | ------------- |
| [ga4_documentation_events_and_documentation_status](ga4_documentation_events_and_documentation_status.sql) | This query creates a table for Event documentation and documentation status. Event documentation will be joined with GA4 BigQuery data to check if the documented Events are collecting data, or if there are Events collected in GA4 BigQuery that aren’t documented. |
| [ga4_documentation_events_and_images](ga4_documentation_events_and_images.sql) | This query creates a table for images used in Event documentation. |
| [ga4_documentation_parameters_and_documentation_status](ga4_documentation_parameters_and_documentation_status.sql) | This query creates a table for Parameter documentation and documentation status. Parameter documentation will be joined with GA4 BigQuery & Event documentation data to check if the documented Parameters are collecting data, or if there are Parameters collected in GA4 BigQuery that aren’t documented. |

* Scheduled queries should use **On-demand Repeat frequency**
* Do NOT tick the checkbox **Set a destination table for query results**. That logic is handled within the SQL query
* Decide if you need to specify **Location type** (Ex. Multi-region and EU)
* Click **Save**

**The complete setup works like this:**
If changes are made to the **ga4_documentation_parameters** table, a **Cloud Function** will automatically run the scheduled queries.

The concept we use for this setup comes from a blog post on [**Simmer**](https://www.teamsimmer.com/2022/12/07/how-do-i-trigger-a-scheduled-query-when-the-ga4-daily-export-happens/) by _Simo Ahava_ (but it differs slightly).

## Create the Logs Router
* Go to [**Logs Router**](https://console.cloud.google.com/logs/router), and click the **CREATE SINK** button.
  * Give the sink a name, ex. **ga4_documentation_update**.
  * Choose **Google Cloud Pub/Sub topic** as the destination.
  * From the list of available Pub/Sub topics, click to **create a new topic**.
  * Create a Topic ID, ex. **ga4_documentation_update**.
  * In the **Build inclusion filter**, copy the filter below, but replace **analytics_XXXXX** with your **Dataset ID**.

 ### Build inclusion filter

```sql

protoPayload.methodName="jobservice.jobcompleted"
protoPayload.serviceData.jobCompletedEvent.job.jobConfiguration.load.destinationTable.datasetId="analytics_XXXXX"
protoPayload.serviceData.jobCompletedEvent.job.jobConfiguration.load.destinationTable.tableId="ga4_documentation_parameters"

```
## Google Cloud Functions
You will have to create 3 Cloud Functions, 1 for each scheduled query.

Go to [**Cloud Functions**](https://console.cloud.google.com/functions/list), and click **Create function**.

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
    * Add the following line in the “dependencies” property:
    * _"@google-cloud/bigquery-data-transfer": "^3.1.3"_
  * Select **index.js** from the list of files to activate the code editor.
    * Edit the Entry point field on top of the editor to be **runScheduledQuery**.
    * Copy-paste the **index.js** code below into the editor.
    * Change the **projectId** value to match your **Google Cloud Platform project ID**.
    * To get values for **region** and **configId**, browse to [**scheduled queries**](https://console.cloud.google.com/bigquery/scheduled-queries), open your scheduled query, and click the **Configuration tab** to view its details.
    * **region** value should be the Google Cloud region of the Destination dataset, so click through to that to check if you don’t remember what it was.
    * **configId** is the **GUID** at the end of the **Resource name** of the scheduled query.
   
### index.js
```javascript

const bigqueryDataTransfer = require('@google-cloud/bigquery-data-transfer');

exports.runScheduledQuery = async (event, context) => {
  // Update configuration options
  const projectId = '';
  const configId = '';
  const region = '';

  // Load the log data from the buffer
  const eventData = JSON.parse(Buffer.from(event.data, 'base64').toString());
  const destinationTableId = eventData.protoPayload.serviceData.jobCompletedEvent.job.jobConfiguration.load.destinationTable.tableId;

  // Grab the table date and turn it into the run time for the scheduled query
  const tableTime = destinationTableId.replace('events_', '');
  const year = tableTime.substring(0, 4),
        month = tableTime.substring(4, 6),
        day = tableTime.substring(6, 8);
  // Set the run time for the day after the table date so that the scheduled query works with "yesterday's" data
  const runTime = new Date(Date.UTC(year, month - 1, parseInt(day) + 1, 12));
  // Create a proto-buffer Timestamp object from this
  const requestedRunTime = bigqueryDataTransfer.protos.google.protobuf.Timestamp.fromObject({
    seconds: runTime / 1000,
    nanos: (runTime % 1000) * 1e6
  });

  const client = new bigqueryDataTransfer.v1.DataTransferServiceClient();
  const parent = client.projectLocationTransferConfigPath(projectId, region, configId);

  const request = {
    parent,
    requestedRunTime
  };

  const response = await client.startManualTransferRuns(request);
  return response;
};

```

## Testing scheduled queries setup
To test the setup, simply go to the **Google Sheet**, select the **📈 GA4 Documentation Menu** at the top of the sheet, and select **BigQuery -> Export Event & Parameter Documentation**.

This will run a BigQuery query using Apps Script. If this is completed without errors, you should now see 3 new tables in BigQuery:

1. ga4_documentation_events_and_documentation_status
2. ga4_documentation_events_and_images
3. ga4_documentation_parameters_and_documentation_status

These tables (in addition to the ga4_documentation_annotations table) are your BigQuery tables that you will use in Looker Studio.

# Overview over tables created in BigQuery
The following BigQuery tables will be used in **Looker Studio**:
1. [ga4_documentation_events_and_documentation_status](#ga4_documentation_events_and_documentation_status)
2. [ga4_documentation_events_and_images](#ga4_documentation_events_and_images)
3. [ga4_documentation_parameters_and_documentation_status](#ga4_documentation_parameters_and_documentation_status)
4. [ga4_documentation_annotations](#ga4_documentation_annotations)

## ga4_documentation_events_and_documentation_status
* Most of these field are also described in the **Google Sheet** documentation.
* This query will generate the table: [ga4_documentation_events_and_documentation_status query](ga4_documentation_events_and_documentation_status.sql) 

| Field name  | Type | Comment |
| ------------- | ------------- | ------------- |
| event_group | STRING | Event Group |
| event_name | STRING | Event Name |
| event_method | STRING | Method |
| event_type | STRING | Type |
| event_conversion | BOOLEAN | Is the Event Name an conversion |
| event_conversion_counting | STRING | How is the conversion counted (event/session) |
| event_description | STRING | Event Description |
| event_comment | STRING | Event Comment |
| event_gtm_comment | STRING | Comment related to Google Tag Manager setup |
| event_website | BOOLEAN | Should the Event Name be tracked on a website |
| event_ios_app | BOOLEAN | Should the  Event Name be tracked in an iOS app |
| event_android_app | BOOLEAN | Should the Event Name be tracked in an Android app |
| event_documentation_status | STRING | Documentation in Google Sheet is joied with GA4 BQ data. Status can be: **Documented and Data**, **Documented no Data** and **Not Documented** |
| platform_web | BOOLEAN | GA4 BQ data. Is the Event Name tracked in the **web platform** |
| platform_android | BOOLEAN | GA4 BQ data. Is the Event Name tracked in the **Android platform** |
| platform_ios | BOOLEAN | GA4 BQ data. Is the Event Name tracked in the **iOS platform** |
| event_count_total | INTEGER | GA4 BQ data. Total Event Count |
| event_count_web | INTEGER | GA4 BQ data. Event Count for **web platforrm** |
| event_count_android | INTEGER | GA4 BQ data. Event Count for **Android platforrm** |
| event_count_ios | INTEGER | GA4 BQ data. Event Count for **iOS platforrm** |
| event_edited_time | DATETIME | Time when Event Name was edited in Google Sheet |
| event_uploaded_to_bq_time | DATETIME | Time when Event documentation was uploaded to BQ |
| event_last_seen_date_total | DATE | Date showing the last date the Event Name was "seen" overall |
| event_last_seen_date_web | DATE | Date showing the last date the Event Name was "seen" in the **web platform** |
| event_last_seen_date_android | DATE | Date showing the last date the Event Name was "seen" in the **Android platform** |
| event_last_seen_date_ios | DATE | Date showing the last date the Event Name was "seen" in the **iOS platform** |

## ga4_documentation_events_and_images
* This query will generate the table: [ga4_documentation_events_and_images.sql](ga4_documentation_events_and_images.sql)

| Field name  | Type | Comment |
| ------------- | ------------- | ------------- |
| event_name | STRING | Event Name |
| event_image_documentation | STRING | URL to image |

## ga4_documentation_parameters_and_documentation_status
* Most of these field are also described in the **Google Sheet** documentation.
* This query will generate the table: [ga4_documentation_parameters_and_documentation_status query](ga4_documentation_parameters_and_documentation_status.sql)

| Field name  | Type | Comment |
| ------------- | ------------- | ------------- |
| event_name | STRING | Event Name |
| parameter_group | STRING | Parameter Group |
| parameter_display_name | STRING | Parameter Display Name |
| parameter_name | STRING | Parameter Name |
| parameter_scope | STRING | Parameter Scope. Event, User, Item |
| parameter_type | STRING | Parameter Type. Custom Dimension, Custom Metric etc. |
| parameter_format | STRING | Parameter Format. String, Currency, Standard etc. |
| parameter_disallow_ads_personalization | BOOLEAN | NPA (Non-Personalized Ads) |
| parameter_example_value | STRING | Parameter example value |
| parameter_description | STRING | Parameter Description |
| parameter_gtm_comment | STRING | Comment related to Google Tag Manager, ex. name of Variable, Data Layer Name etc. |
| ga4_config_parameter | BOOLEAN | Parameters in Google Sheet that in the **Events** Sheet is added to the "fake" **ga4_config** Event Name will get this **flag**. Also parameters that are documented on some Events, but you have forgotten to add it to all Events will get the flag. Ex. **link_text** is added to **click** (outbound event), but you forget to add **link_text** to the **file_download** Event. For the **file_download** Event, **link_text** will be "flagged" (true). |
| parameter_count_total | INTEGER | How many times have the parameter been seen across Events and Platforms |
| parameter_count_web | INTEGER | How many times have the parameter been seen across Events and the Web Platform |
| parameter_count_android | INTEGER | How many times have the parameter been seen across Events and the Android Platform |
| parameter_count_ios | INTEGER | How many times have the parameter been seen across Events and the iOS Platform |
| event_website | BOOLEAN | Should the Parameter be tracked on a website |
| event_ios_app | BOOLEAN | Should the Parameter be tracked in the iOS app |
| event_android_app | BOOLEAN | Should the Parameter be tracked in the Android app |
| platform_web | BOOLEAN | GA4 BQ data. Is the Parameter tracked in the **web platform** |
| platform_android | BOOLEAN | GA4 BQ data. Is the Parameter tracked in the **Android platform** |
| platform_ios | BOOLEAN | GA4 BQ data. Is the Parameter tracked in the **iOS platform** |
| parameter_last_seen_date_total | DATE | Date showing the last date the Parameter was "seen" overall |
| parameter_last_seen_date_web | DATE | Date showing the last date the Parameter was "seen" in the **web platform** |
| parameter_last_seen_date_android | DATE | Date showing the last date the Parameter was "seen" in the **Android platform** |
| parameter_last_seen_date_ios | DATE | Date showing the last date the Parameter was "seen" in the **iOS platform** |

## ga4_documentation_annotations
This table is created when you upload **Annotations** from **Google Sheet** to BigQuery.

| Field name  | Type | Comment |
| ------------- | ------------- | ------------- |
| annotation_time | DATETIME | Time when annotation was added |
| annotation_added_by_email | STRING | Email of the person who added the annontation (if available or not redacted) |
| annotation_category | STRING | Annotation Category; GA4 Change History, GTM (Web), Marketing etc. |
| annotation_description | STRING | Annotation description |
| annotation_ga4_gtm_info | STRING | Info/API ID's from GA4 or GTM |
| annotation_uploaded_to_bq_time | DATETIME | Time when the annotation was uploaded to BigQuery. |

