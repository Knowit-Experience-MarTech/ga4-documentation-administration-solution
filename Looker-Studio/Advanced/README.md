# Looker Studio - Advanced - Using BigQuery as Data Source
Documentation for creating advanced Looker Studio report for presenting Event & Parameter Documentation with Status, in addition to Annotations. BigQuery will be used as Data Source.

* Make sure you first have created the [**BigQuery tables**](../BigQuery#overview-over-tables-created-in-bigquery) that will be used as **Data Sources** in Looker Studio.
* Make a copy of the [**Looker Studio GA4 Advanced Documentation report**](https://lookerstudio.google.com/s/ihyU84wd7uY)
* Add the following BigQuery Data Sources to Looker Studio:
  1. [ga4_documentation_parameters_and_documentation_status](#ga4_documentation_parameters_and_documentation_status)
  2. [ga4_documentation_events_and_documentation_status](#ga4_documentation_events_and_documentation_status)
  3. [ga4_documentation_events_and_images](#ga4_documentation_events_and_images)
  4. [ga4_documentation_annotations](#ga4_documentation_annotations)

## Calculated Fields
The solution contains several **Calculated Fields**. They are all documented below. 

You have to edit 2 Calculated Fields:
1. [Event Name URL \[Calc\]](#event-name-url-calc)
2. [Parameter Name URL \[Calc\]](#parameter-name-url-calc)

## ga4_documentation_parameters_and_documentation_status
Make the following adjustment to the data source if the **Calculated Fields** aren't working correctly.

### Parameters
#### Parameter Name Search
Create **Parameter Name Search** parameter.

* **Parameter name:** Parameter Name Search
* **Parameter ID:** parameter_name_search
* **Data Type:** Text
* **Permitted values:** Any value

#### Parameter Description Search
Create **Parameter Name Search** parameter.

* **Parameter name:** Parameter Description Search
* **Parameter ID:** parameter_description_search
* **Data Type:** Text
* **Permitted values:** Any value

### Calculated Fields
#### Event Name Label \[Calc\]
This becomes a metric.

* **Field Name:** Event Name Label \[Calc\]
* **Field ID:** event_name_label_calc

**Formula:**
```javascript
IF(COUNT_DISTINCT(event_name)>1,"Multiple Event Names Selected",CONCAT("Event Name: ",MAX(event_name)))
```

#### Parameter Name Label \[Calc\]
This becomes a metric.

* **Field Name:** Parameter Name Label \[Calc\]
* **Field ID:** parameter_name_label_calc

**Formula:**
```javascript
IF(COUNT_DISTINCT(parameter_name)>1,"Multiple Parameters Selected",CONCAT("Parameter Name: ",MAX(parameter_name)))
```

#### Parameter Documentation Status \[Calc\]
* **Field name:** Parameter Documentation Status \[Calc\]
* **Field ID:** parameter_documentation_status_calc

**Formula:**
```javascript
CASE
  WHEN parameter_display_name IS NULL AND parameter_name IS NOT NULL AND parameter_count_total > 0 THEN 'Not Documented'
  WHEN parameter_display_name IS NOT NULL AND parameter_name IS NOT NULL AND parameter_count_total > 0 THEN 'Documented and Data'
  WHEN parameter_display_name IS NOT NULL AND parameter_name IS NOT NULL AND parameter_count_total = 0 THEN 'Documented no Data'
END
```

#### Parameter Count Documented and Data \[Calc\]
* **Field name:** Parameter Count Documented and Data \[Calc\]
* **Field ID:** parameter_count_documented_and_data_calc

**Formula:**
```javascript
COUNT_DISTINCT(IF(parameter_count_total > 0 AND parameter_display_name IS NOT NULL AND parameter_name IS NOT NULL, parameter_name, NULL))
```

#### Parameter Count Not Documented \[Calc\]
* **Field name:** Parameter Count Not Documented \[Calc\]
* **Field ID:** parameter_count_not_documented_calc

**Formula:**
```javascript
COUNT_DISTINCT(IF(parameter_count_total > 0 AND parameter_display_name IS NULL AND parameter_name IS NOT NULL, parameter_name, NULL))
```

#### Parameter Count Total \[Calc\]
* **Field name:** Parameter Count Total \[Calc\]
* **Field ID:** parameter_count_total_calc

**Formula:**
```javascript
COUNT_DISTINCT(IF(parameter_name IS NOT NULL, parameter_name, NULL))
```

#### Parameter Count Documented no Data \[Calc\]
* **Field name:** Parameter Count Documented no Data \[Calc\]
* **Field ID:** parameter_count_documented_no_data_calc

**Formula:**
```LookML
Parameter Count Total [Calc] - Parameter Count Not Documented [Calc] - Parameter Count Documented and Data [Calc]
```

#### Parameter Documentation Status Number \[Calc\]
* **Field name:** Parameter Documentation Status Number \[Calc\]
* **Field ID:** parameter_documentation_status_number_calc

**Formula:**
```javascript
CASE
  WHEN Parameter Count Not Documented [Calc] > 0 THEN Parameter Count Not Documented [Calc]
  WHEN Parameter Count Documented and Data [Calc] > 0 THEN Parameter Count Documented and Data [Calc] 
  WHEN Parameter Count Documented no Data [Calc] > 0 THEN Parameter Count Documented no Data [Calc]
END
```

#### Parameter Documentation Status Text \[Calc\]
* **Field name:** Parameter Documentation Status Text \[Calc\]
* **Field ID:** parameter_documentation_status_text_calc

**Formula:**
```javascript
CASE
  WHEN Parameter Count Not Documented [Calc] > 0 THEN 'Not Documented'
  WHEN Parameter Count Documented and Data [Calc] > 0 THEN 'Documented and Data'
  WHEN Parameter Count Documented no Data [Calc] > 0 THEN 'Documented no Data'
END
```

#### Parameter Name URL \[Calc\]
Makes a **URL** based on **Parameter Name**. Click on Parameter Name will lead the user to a report showing Event Name(s) for this Parameter.

The URL must be edited to match your Looker Studio URLs.

* **Field name:** Parameter Name URL \[Calc\]
* **Field ID:** parameter_name_url_calc

**Formula:**
```javascript
HYPERLINK(CONCAT("https://lookerstudio.google.com/reporting/42a4e160-741d-481c-a5a6-5e154e738c8c/page/p_1ads1jvted?s=ihyU84wd7uY&params=%7B%22df69%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580",parameter_scope,"%22,%22df73%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580",parameter_name,"%22%7D"),parameter_name)
```
##### How to create the URL
1. Navigate to the **Parameter & Event Documentation** report
2. **Parameter Scope** filter: Select a single Scope (ex. **EVENT**)
3. **Parameter Name** filter: Select a single Parameter (ex. **file_extension**)
4. Copy the URL
5. Find the **Parameter Scope** in the URL, ex. **EVENT**. Replace **EVENT** with **parameter_scope** as shown in the **Formula** above.
6. Find the **Parameter Name** in the URL, ex. **file_extension**. Replace **file_extension** with **parameter_name** as shown in the **Formula** above.

If you want to learn more about creating custom URL links with Calculated Field, here is a video about the subject:
* [https://www.youtube.com/watch?v=fGBsjgjjYWg](https://www.youtube.com/watch?v=fGBsjgjjYWg)

#### Parameter Last Seen Date \[Calc\]
* **Field name:** Parameter Last Seen Date \[Calc\]
* **Field ID:** parameter_last_seen_date_calc

**Formula:**
```javascript
MAX(parameter_last_seen_date_total)
```

#### Parameter Last Seen Days \[Calc\]
* **Field name:** Parameter Last Seen Days \[Calc\]
* **Field ID:** parameter_last_seen_days_calc

**Formula:**
```javascript
CONCAT(DATE_DIFF(TODAY(), MAX(parameter_last_seen_date_total)),' day(s) ago')
```

#### Parameter Description \[Calc\]
* **Field name:** Parameter Description \[Calc\]
* **Field ID:** parameter_description_calc

**Formula:**
```javascript
CASE
  WHEN parameter_description IS NULL THEN "Not Documented"
  ELSE REPLACE(REPLACE(REPLACE(parameter_description,r"\r\n","\n"),r"\n","\n"),r"\n\n","\n")
END
```

#### Parameter Description Search \[Calc\]
* **Field name:** Parameter Description Search \[Calc\]
* **Field ID:** parameter_description_search_calc

**Formula:**
```javascript
CONTAINS_TEXT(LOWER(Parameter Description [Calc]), LOWER(Parameter Description Search))
```

#### Parameter GTM Comment \[Calc\]
* **Field name:** Parameter GTM Comment \[Calc\]
* **Field ID:** parameter_gtm_comment_calc

**Formula:**
```javascript
REPLACE(REPLACE(REPLACE(parameter_gtm_comment,r"\r\n","\n"),r"\n","\n"),r"\n\n","\n")
```

#### Parameter Name Search \[Calc\]
* **Field name:** Parameter Name Search \[Calc\]
* **Field ID:** parameter_name_search_calc

**Formula:**
```javascript
CONTAINS_TEXT(LOWER(parameter_name), LOWER(Parameter Name Search))
```

## ga4_documentation_events_and_documentation_status
Make the following adjustment to the data source if the **Calculated Fields** aren't working correctly.

### Parameters
#### Event Name Search
Create **Event Name Search** parameter.

* **Parameter name:** Event Name Search
* **Parameter ID:** event_name_search
* **Data Type:** Text
* **Permitted values:** Any value

#### Event Description Search
Create **Event Description Search** parameter.

* **Parameter name:** Event Description Search
* **Parameter ID:** event_description_search
* **Data Type:** Text
* **Permitted values:** Any value

### Calculated Fields
#### Event Comment \[Calc\]
* **Field name:** Event Comment \[Calc\]
* **Field ID:** event_comment_calc

**Formula:**
```javascript
REPLACE(REPLACE(REPLACE(event_comment,r"\r\n","\n"),r"\n","\n"),r"\n\n","\n")
```

#### Event Description \[Calc\]
* **Field name:** Event Description \[Calc\]
* **Field ID:** event_description_calc

**Formula:**
```javascript
CASE
  WHEN event_description IS NULL THEN "Not Documented"
  ELSE REPLACE(REPLACE(REPLACE(event_description,r"\r\n","\n"),r"\n","\n"),r"\n\n","\n")
END
```

#### Event GTM Comment \[Calc\]
* **Field name:** Event GTM Comment \[Calc\]
* **Field ID:** event_gtm_comment_calc

**Formula:**
```javascript
REPLACE(REPLACE(REPLACE(event_gtm_comment,r"\r\n","\n"),r"\n","\n"),r"\n\n","\n")
```

#### Event Name Search \[Calc\]
* **Field name:** Event Name Search \[Calc\]
* **Field ID:** event_name_search_calc

**Formula:**
```javascript
CONTAINS_TEXT(LOWER(event_name), LOWER(Event Name Search))
```

#### Event Description Search \[Calc\]
* **Field name:** Event Description Search \[Calc\]
* **Field ID:** event_description_search_calc

**Formula:**
```javascript
CONTAINS_TEXT(LOWER(Event Description [Calc]), LOWER(Event Description Search))
```

#### Event Name URL \[Calc\]
Makes a **URL** based on **Event Name**. Click on Event Name will lead the user to a report showing parameters (Dimensions & Metrics) for this Event Name.

The URL must be edited to match your Looker Studio URLs.

* **Field name:** Event Name URL \[Calc\]
* **Field ID:** event_name_url_calc

**Formula:**
```javascript
HYPERLINK(CONCAT("https://lookerstudio.google.com/reporting/42a4e160-741d-481c-a5a6-5e154e738c8c/page/p_nm474cc5cd?params=%7B%22df62%22:%22include%25EE%2580%25803%25EE%2580%2580F%22,%22df61%22:%22ORexclude%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580Not%2520Documented%25EE%2580%2581include%25EE%2580%25803%25EE%2580%2580NU%25EE%2580%2582%22,%22df63%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580",event_name,"%22%7D"),event_name)
```
##### How to create the URL
1. Navigate to the **Event & Parameter Documentation** report
2. **GA4 Config Parameter** filter: **false** (only)
3. **Documentation Status** filter: Untick **Not Documented** (if you have this choice)
4. **Event Name** filter: Select a single Event Name (ex. **click**)
5. Copy the URL
6. Find the **Event Name** in the URL, ex. **click**. Replace **click** with **event_name** as shown in the **Formula** above.

If you want to learn more about creating custom URL links with Calculated Field, here is a video about the subject:
* [https://www.youtube.com/watch?v=fGBsjgjjYWg](https://www.youtube.com/watch?v=fGBsjgjjYWg)
  
#### Event Uploaded to BQ Time \[Calc\]
* **Field name:** Event Uploaded to BQ Time \[Calc\]
* **Field ID:** event_uploaded_to_bq_time_calc

**Formula:**
```javascript
FORMAT_DATETIME('%Y-%m-%d %H:%M',  event_uploaded_to_bq_time)
```

#### Event Last Seen Days \[Calc\]
* **Field name:** Event Last Seen Days \[Calc\]
* **Field ID:** event_last_seen_days_calc

**Formula:**
```javascript
CONCAT(DATE_DIFF(TODAY(), event_last_seen_date_total),' day(s) ago')
```

#### Event Documentation Last Updated \[Calc\]
* **Field name:** Event Documentation Last Updated \[Calc\]
* **Field ID:** event_documentation_last_updated_calc

**Formula:**
```javascript
CONCAT("Last Updated: ",MAX(Event Uploaded to BQ Time [Calc]))
```

## ga4_documentation_events_and_images
Make the following adjustment to the data source if the Calculated Fields aren't working correctly.

### Calculated Fields

#### Event Image \[Calc\]
* **Field name:** Event Image \[Calc\]
* **Field id:** event_image_calc

**Formula:**
```javascript
HYPERLINK(event_image_documentation,IMAGE(event_image_documentation))
```

## ga4_documentation_annotations
Make the following adjustment to the data source if the **Calculated Fields** aren't working correctly.

### Parameters
#### Search Added By
Create **Search Added By** parameter.

* **Parameter name:** Search Added By
* **Parameter ID:** search_added_by
* **Data Type:** Text
* **Permitted values:** Any value

#### Search Annotations
Create **Search Annotations** parameter.

* **Parameter name:** Search Annotations
* **Parameter ID:** search_annotations
* **Data Type:** Text
* **Permitted values:** Any value

### Calculated Fields
#### Added By Search \[Calc\]
* **Field name:** Added By Search \[Calc\]
* **Field id:** added_by_search_calc

**Formula:**
```javascript
CONTAINS_TEXT(LOWER(annotation_added_by_email), LOWER(Search Added By))
```

#### Annotation \[Calc\]
* **Field name:** Annotation \[Calc\]
* **Field id:** annotation_calc

**Formula:**
```javascript
REPLACE(REPLACE(REPLACE(annotation_description,r"\r\n","\n"),r"\n","\n"),r"\n\n","\n")
```

#### Annotation Search \[Calc\]
* **Field name:** Annotation Search \[Calc\]
* **Field id:** annotation_search_calc

**Formula:**
```javascript
CONTAINS_TEXT(LOWER(annotation_description), LOWER(Search Annotations))
```
