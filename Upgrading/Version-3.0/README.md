# Upgrading to Version 3.0

Changes are made to the following:

* [Google Cloud](#google-cloud)
* [Google Sheet](#google-sheet)
* [Looker Studio](#looker-studio)

What you exactly have to do are listed below.

## Google Cloud

Make sure you follows the new **[Google Cloud / BigQuery documentation](../../BigQuery/)**.

### BigQuery

### Replace Scheduled Queries for Events & Parameters

Replace Event & Parameter Scheduled Queries:

* [ga4_documentation_events_and_documentation_status](../../BigQuery/ga4_documentation_events_and_documentation_status.sql)
* [ga4_documentation_parameters_and_documentation_status](../../BigQuery/ga4_documentation_parameters_and_documentation_status.sql)

#### Run upgrading SQL
* If you are **upgrading** to version **3.0**, and are using **BigQuery** as a Data Source in Looker Studio, you need to run the **[ga4_documentation_upgrade_v3.sql](ga4_documentation_upgrade_v3.sql)**.
  - Beware that this will break some functionality in your existing **Looker Studio**, which you will have to fix afterwards.
  - You may have to run the query twice.

| Table name  | Changes | Comment |
| ------------- | ------------- | ------------- |
| ga4_documentation_parameters | **Adds** the following columns: <ul><li>parameter_web</li><li>parameter_ios</li><li>parameter_android</li></ul> | Indentifying if the parameter is WEB, IOS or ANDROID parameter. |
| ga4_documentation_parameters_and_documentation_status | **Adds** the following columns: <ul><li>parameter_documentation_status</li><li>parameter_documentation_status_aggregated</li></ul> | Documentation status for the parameter on a individual level (parameter + scope + event) and a aggregated level (parameter + scope) |
| ga4_documentation_parameters_and_documentation_status | **Drops** the following columns: <ul><li>event_website</li><li>event_ios_app</li><li>event_android_app</li></ul> | This will break **Parameter platform filtering** if you are using this in Looker Studio. Replace these with: <ul><li>platform_web</li><li>platform_ios</li><li>platform_android</li></ul> |
| ga4_documentation_events_and_documentation_status | **Drops** the following columns: <ul><li>event_website</li><li>event_ios_app</li><li>event_android_app</li></ul> | This will break **Event platform filtering** if you are using this in Looker Studio. Replace these with: <ul><li>platform_web</li><li>platform_ios</li><li>platform_android</li></ul> |

After you have run the SQL, reconnect your **Data Sources** in **Looker Studio** to your **BigQuery tables** again.

### Add Scheduled Query for Anomaly Detection

* [ga4_documentation_anomaly_detection](../../BigQuery/Anomaly-Detection/ga4_documentation_anomaly_detection.sql)

### Logs Router

#### Replace existing Logs Router setup

New setup is described here:

* [Create the Logs Router](../../BigQuery/README.md#create-the-logs-router)

#### Add Logs Router setup for Anomaly Detection

Setup is described here:

* [Anomaly Detection Logs Router](../..//BigQuery/Anomaly-Detection/README.md#create-the-logs-router)

#### Replace existing Cloud Functions setup

New setup is described here:

* [Google Cloud Functions](../../BigQuery/README.md#google-cloud-functions)

#### Add Cloud Functions setup for Anomaly Detection

Setup is described here:

* [Anomaly Detection Cloud Functions](../..//BigQuery/Anomaly-Detection/README.md#google-cloud-functions)

#### Add Cloud Scheduler

Setup is described here:

* [Cloud Scheduler](../../BigQuery/README.md#cloud-scheduler)

This replaces **uploadEventsToBigQuery Timer Trigger** in the Google Sheet.

## Google Sheet

It may be easier to just use the newest version of the Google Sheet, and **copy + paste** your existing documentation into the new Google Sheet (paste **values only**).

But if you want to edit your existing Google Sheet, here is how.

### Apps Script

Replace all **[Apps Scripts](../../Google-Sheet/Apps-Script/)**. Some have minor changes, other have major changes.

* [01_Generic-&-Definitions](../../Google-Sheet/Apps-Script/01_Generic-&-Definitions.gs)
* [02_Parameter-Functionality](../../Google-Sheet/Apps-Script/02_Parameter-Functionality.gs)
* [03_GA4-Account-Properties-API](../../Google-Sheet/Apps-Script/03_GA4-Account-Properties-API.gs)
* [04_GA4-Parameters-API](../../Google-Sheet/Apps-Script/04_GA4-Parameters-API.gs)
* [05_GA4-Key-Events-API](../../Google-Sheet/Apps-Script/05_GA4-Key-Events-API.gs)
* [06_GA4-Reports-API](../../Google-Sheet/Apps-Script/06_GA4-Reports-API.gs)
* [07_Annotations](../../Google-Sheet/Apps-Script/07_Annotations.gs)
* [08_Annotations-GTM](../../Google-Sheet/Apps-Script/08_Annotations-GTM.gs)
* [09_BigQuery](../../Google-Sheet/Apps-Script/09_BigQuery.gs)
* [10_Firestore](../../Google-Sheet/Apps-Script/10_Firestore.gs)
* [11_Event-Parameter-Join-Google-Sheet](../../Google-Sheet/Apps-Script/11_Event-Parameter-Join-Google-Sheet.gs)
* [12_Updates-Check](../../Google-Sheet/Apps-Script/12_Updates-Check.gs)

### Timer Trigger
Delete the **uploadEventsToBigQuery** Timer Trigger.

Triggers are found by going to the Google Sheet Menu:

* Extensions -> Apps Script -> Triggers

### Sheet Changes

Take a look at the [**new Google Sheet**](https://docs.google.com/spreadsheets/d/162QAnKN7nBgRxOzsisKLlqzdAsGOk4r2wDe6lzBFbks/edit?usp=sharing) to see the end result.

After you have done **all the changes**, go to **Settings** in the **Google Sheet**. Scroll down to **Version**, and add **3.0** as the new version.

#### Parameters Sheet

##### Add Platform Columns
Add the following **columns** the Sheet.

* Column **L**: Web
* Column **M**: iOS
* Column **N**: Android

Fill the columns with **checkboxes**.

##### Add info about what you are quering (API or BigQuery)

Add this formula to the column **A**, row **6**:

```javascript
=CONCATENATE(SettingsGetGA4DataFrom;" ";SettingsReportingPeriod)
```

#### Events Sheet

##### Add info about what you are quering (API or BigQuery)

Add this formula to the column **A**, row **6**:

```javascript
=CONCATENATE(SettingsGetGA4DataFrom;" ";SettingsReportingPeriod)
```

#### Settings Sheet

* Go to **Settings** Sheet
  - Select row **16** (**Exclude Params from SQL Query** row)
  - Add a row above (**Exclude Params from SQL Query** should now be row **17**)
  - Select column **B**, row **16**
  - Go to the menu **Data -> Named ranges**
  - **Add a range**. Named range = SettingsBigQueryExcludeEvents
  - Add the text **Exclude Events from SQL Query** in column **A**, row **16**.
  - Add the description **Documentation is focused on what you are tracking. Automatic created events are not relevant in this context. Exclude these Events separated by comma.** to column **C**. 
    - You may have to merge column **C** and **D**.
	
* **Exclude Params from SQL Query** are documented in the **[Google Sheet Settings](https://github.com/Knowit-Experience-MarTech/ga4-documentation-administration-solution/tree/main/Google-Sheet#settings)** section.
* **Exclude Events from SQL Query** are documented in the **[Google Sheet Settings](https://github.com/Knowit-Experience-MarTech/ga4-documentation-administration-solution/tree/main/Google-Sheet#settings)** section.

#### Advanced Settings Sheet
- Go to the [**new Google Sheet**](https://docs.google.com/spreadsheets/d/162QAnKN7nBgRxOzsisKLlqzdAsGOk4r2wDe6lzBFbks/edit?usp=sharing)
- Right click on the **Advanced Settings** to get the Sheet menu.
  - Select **Copy to** -> **Existing spreadsheet**
    - Select your **GA4 documentation** sheet.
	
## Looker Studio

* Advanced version using BigQuery as Data Source

It may be easier to just use the newest version of the Looker Studio, but if you want to edit your existing Looker Studio, here is how.

* Make a copy of the newest version of the Looker Studio
  - [How to copy the Looker Studio report](../../Looker-Studio/Advanced/README.md#how-to-copy-the-looker-studio-report)
* Copy this Looker Studio version to your BigQuery tables
  - This makes it easier to inspect the new Looker Studio 
  
### Add Data Sources

Add the following Data Sources:

* ga4_documentation_events_daily_counts
* ga4_documentation_parameters_daily_counts
* ga4_documentation_anomaly_detection
* ga4_documentation_bq_settings

### Fields & Calculated Fields

#### Date Source: ga4_documentation_events_and_documentation_status

| Calculated Field  | Changes | Comment |
| ------------- | ------------- | ------------- |
| Event Description \[Calc\] | Deleted | Use **event_description** |
| Event Comment \[Calc\] | Deleted | Use **event_comment** |
| Event GTM Comment \[Calc\] | Deleted | Use **event_gtm_comment** |
| event_android_app | Deleted | Use **platform_android** |
| event_ios_app | Deleted | Use **platform_ios** |
| event_website | Deleted | Use **platform_web** |
| key_event_checkmark \[Calc\] | Added | Showing Key Events as **✔** |
| platform_android_checkmark \[Calc\] | Added | Showing Android Platform as **✔** |
| platform_ios_checkmark \[Calc\] | Added | Showing iOS Platform as **✔** |
| platform_web_checkmark \[Calc\] | Added | Showing Web Platform as **✔** |

#### Date Source: ga4_documentation_parameters_and_documentation_status

| Calculated Field  | Changes | Comment |
| ------------- | ------------- | ------------- |
| Parameter Description \[Calc\] | Deleted | Use **parameter_description** |
| Parameter Documentation Status \[Calc\] | Deleted | Use **parameter_documentation_status_aggregated** for aggregated parameter listing, or **parameter_documentation_status** for individual parameters |
| Parameter GTM Comment \[Calc\] | Deleted | Use **parameter_gtm_comment** |
| event_android_app | Deleted | Use **platform_android** |
| event_ios_app | Deleted | Use **platform_ios** |
| event_website | Deleted | Use **platform_web** |
| platform_android_checkmark \[Calc\] | Added | Showing Android Platform as **✔** |
| platform_ios_checkmark \[Calc\] | Added | Showing iOS Platform as **✔** |
| platform_web_checkmark \[Calc\] | Added | Showing Web Platform as **✔** |
| ga4_global_parameter_checkmark \[Calc\] | Added | Showing Global Parameters as **✔** |
| Parameter Count Documented and Data \[Calc\] | Changed | [New calculation](../../Looker-Studio/Advanced/Looker-Studio-Calculated-Fields/README.md#parameter-count-documented-and-data-calc) |
| Parameter Count Documented no Data \[Calc\] | Changed | [New calculation](../../Looker-Studio/Advanced/Looker-Studio-Calculated-Fields/README.md#parameter-count-documented-no-data-calc) |
| Parameter Count Not Documented \[Calc\] | Changed | [New calculation](../../Looker-Studio/Advanced/Looker-Studio-Calculated-Fields/README.md#parameter-count-not-documented-calc) |
| Parameter Count Total \[Calc\] | Changed | [New calculation](../../Looker-Studio/Advanced/Looker-Studio-Calculated-Fields/README.md#parameter-count-total-calc) |
| Total Parameters \[Calc\] | Changed | [New calculation](../../Looker-Studio/Advanced/Looker-Studio-Calculated-Fields/README.md#total-parameters-calc) |

#### Date Source: ga4_documentation_anomaly_detection

* New Data Source. Add it to Looker Studio.
* Add **[Calculated Fields](../../Looker-Studio/Advanced/Looker-Studio-Calculated-Fields/README.md#data-source-ga4_documentation_anomaly_detection)**