# Upgrading to Version 4.0

The reason for the large version jump is that you have to make physical changes to both Google Sheet and Looker Studio.
This because of all the changes adding **GA4 Annotations** caused.

## Bug fixes, improvements and changes
### GA4 Annotations
- Google Sheet now supports **GA4 Annotations**: Download, create, edit & delete.

### Changes
- **Advanced solution**: Uses **Google Cloud Run Functions** instead of legacy **Cloud Functions**.
- **Advanced solution**: **Looker Studio** changes because of GA4 Annotations.
- Changes to **Google Sheet** because of GA4 Annotations.
- Changes in how **Items** are counted. Item parameter is now closer to Event count. The new counting will probably trigger item anomalies. You can delete anomalies from **Advanced Settings** in **Google Sheet**.

### Improvements & bug fixes
- **Apps Script** improvements
- Bug fixes mainly related to SQL queries.

Changes are made to the following:

* [Google Sheet](#google-sheet)
* [Google Cloud](#google-cloud)
* [Looker Studio](#looker-studio)

What you exactly have to do are listed below.

## Google Sheet

It may be easier to just use the newest version of the [**Google Sheet**](https://docs.google.com/spreadsheets/d/1tnylUh55RJQf1UtCL1UaGiZV8ZrU1fgpaN_PbfP5KD0/edit?usp=sharing), and **copy + paste** your existing documentation into the new Google Sheet (paste **values only** is probably best).

But if you want to edit your existing Google Sheet, here is how.

After you have done **all the changes**, go to **Settings** in the **Google Sheet**. Scroll down to **Version**, and add **v4.0** as the new version.

### Apps Script

Replace (almost) ALL **[Apps Scripts](../../Setup/Google-Sheet/Apps-Script/)**:

* [01_Generic-&-Definitions](../../Setup/Google-Sheet/Apps-Script/01_Generic-&-Definitions.gs)
* [02_Parameter-Functionality](../../Setup/Google-Sheet/Apps-Script/02_Parameter-Functionality.gs)
* [03_GA4-Account-Properties-API](../../Setup/Google-Sheet/Apps-Script/03_GA4-Account-Properties-API.gs)
* [04_GA4-Parameters-API](../../Setup/Google-Sheet/Apps-Script/04_GA4-Parameters-API.gs)
* [05_GA4-Key-Events-API](../../Setup/Google-Sheet/Apps-Script/05_GA4-Key-Events-API.gs)
* [06_GA4-Reports-API](../../Setup/Google-Sheet/Apps-Script/06_GA4-Reports-API.gs)
* [07_Annotations](../../Setup/Google-Sheet/Apps-Script/07_Annotations.gs)
* [08_Annotations-GTM](../../Setup/Google-Sheet/Apps-Script/08_Annotations-GTM.gs)
* [09_BigQuery](../../Setup/Google-Sheet/Apps-Script/09_BigQuery.gs)
* [10_Firestore](../../Setup/Google-Sheet/Apps-Script/10_Firestore.gs)
* [11_Event-Parameter-Join-Google-Sheet](../../Setup/Google-Sheet/Apps-Script/11_Event-Parameter-Join-Google-Sheet.gs)
* [12_Updates-Check](../../Setup/Google-Sheet/Apps-Script/12_Updates-Check.gs)

After you have replaced the Apps Scripts above, **refresh** the Google Sheet. 
This will give you a new **Annotations** sub-menu in the **📈 GA4 Documentation** menu.

### Timer Trigger

Add the **getGA4Annotations** Timer Trigger.

Triggers are found by going to the Google Sheet Menu:

* Extensions -> Apps Script -> Triggers

#### Timer Trigger Settings

* **Select event source**: Time-driven
* **Select type of time based trigger*: Hour timer
* **Select hour interval*: Every 2 hour (You decide how often you want the trigger to run)

### Sheet Changes

Take a look at the [**new Google Sheet**](https://docs.google.com/spreadsheets/d/1tnylUh55RJQf1UtCL1UaGiZV8ZrU1fgpaN_PbfP5KD0/edit?usp=sharing) to see the end result.

#### Events

1. Delete the content of the merged cells **A5:B5**.
2. Make sure your cursor stays in the merged cells **A5:B5**.
	1. From the menu, select **Data -> Named ranges**
		* Name the range **EventGA4Property**
	2. From the menu, select **Insert -> drop-down**
		1. **Criteria**
			* Drop-down (from a range)
				* =GA4PropertyList
		1. **Advanced options**
			* Display style
				* Arrow

#### Parameters

1. Delete the content of the merged cells **A5:C5**.
2. Make sure your cursor stays in the merged cells **A5:C5**.
	1. From the menu, select **Data -> Named ranges**
		* Name the range **ParametersGA4Property**
	2. From the menu, select **Insert -> drop-down**
		1. **Criteria**
			* Drop-down (from a range)
				* =GA4PropertyList
		1. **Advanced options**
			* Display style
				* Arrow

#### Settings

* **RegEx Validation**
	* Change RegEx for **Parameter Display Name** to: ^[A-Za-z0-9_]+(?:[\s_]+[A-Za-z0-9_]+)*$

#### Annotations

1. From the [**new Google Sheet**](https://docs.google.com/spreadsheets/d/1tnylUh55RJQf1UtCL1UaGiZV8ZrU1fgpaN_PbfP5KD0/copy), unhide the **HelperAnnotationDropdown** sheet.
	1. **Right click** on the **HelperAnnotationDropdown** tab.
	2. From the menu "pop-up", select **Copy to -> Existing spreadsheet**. 
		1. Select **your** existing **GA4 Documentation spreadsheet**.
		2. The copied **HelperAnnotationDropdown** will in your existing spreadsheet be called something like **Copy of HelperAnnotationDropdown**.
2. From the [**new Google Sheet**](https://docs.google.com/spreadsheets/d/1tnylUh55RJQf1UtCL1UaGiZV8ZrU1fgpaN_PbfP5KD0/copy), **right click** on the **Annotations** tab.
	1. From the menu "pop-up", select **Copy to -> Existing spreadsheet**. 
		1. Select **your** existing **GA4 Documentation spreadsheet**.
		2. The copied **Annotations** will in your existing spreadsheet be called something like **Copy of Annotations**.
3. Copy the values from original **Annotations** sheet, to the new **Annotations** sheet you added above. Use **Paste special -> Values only** except for the **Annotation** column.
4. Delete the original **Annotations** sheet.
	1. Rename the **Copy of Annotations** to **Annotations**.
5. Delete the original **HelperAnnotationDropdown** sheet.
	1. Rename the **Copy of HelperAnnotationDropdown** to **HelperAnnotationDropdown**.
6. In the **menu**, go to **Data -> Named ranges**.
	1. Delete defect **Named ranges**.
		1. Defect **Named ranges** will have **#REF** as range.
7. In **Annotations** sheet, go to **color drop-down** in **I5**. This drop-down is probably broken.
	1. Right click on the **drop-down**, and select **Drop-down** from the menu.
		1. Make sure **Criteria** is **Drop-down (from a range)**.
		2. In the **range** field, enter **=HelperAnnotationDropdown!AnnotationColors**.
		
If everything went well, **Annotations** sheet is now upgraded.

## Google Cloud

Make sure you follows the new **[Google Cloud / BigQuery documentation](../../Setup/BigQuery/)**.

### BigQuery

Replace the following Scheduled Queries:

* [ga4_documentation_events_and_documentation_status](../../Setup/BigQuery/ga4_documentation_events_and_documentation_status.sql)
* [ga4_documentation_parameters_and_documentation_status](../../Setup/BigQuery/ga4_documentation_parameters_and_documentation_status.sql)
* [ga4_documentation_anomaly_detection](../../Setup/BigQuery/Anomaly-Detection/ga4_documentation_anomaly_detection.sql)

#### Cloud Run Functions

* Delete [old **Google Cloud Functions**](https://console.cloud.google.com/functions/list) setup.
* Setup [new **Google Cloud Run Functions**](../../Setup/BigQuery/README.md#google-cloud-run-functions)

	
## Looker Studio

Advanced version using BigQuery as Data Source has changes related to **Annotations**.

It may be easier to just use the newest version of the Looker Studio, but if you want to edit your existing Looker Studio, here is how.

* Make a copy of the newest version of the Looker Studio
  - [How to copy the Looker Studio report](../../Setup/Looker-Studio/Advanced/README.md#how-to-copy-the-looker-studio-report)
  - This makes it easier to inspect the new Looker Studio version

### Update Data Sources

Update the following Data Source (reconnect data source):

* ga4_documentation_annotations

### Fields & Calculated Fields

#### Date Source: ga4_documentation_annotations

| Calculated Field  | Changes | Comment |
| ------------- | ------------- | ------------- |
| annotation_color | Added | Showing GA4 Annotation Colors |
| annotation_date_end | Added | GA4 Annotation End Date |
