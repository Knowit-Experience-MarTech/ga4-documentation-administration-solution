# Looker Studio - Advanced - Calculated Fields

If you need to recreate **Calculated Fields**, they are all described here.

## Data Source: ga4_documentation_parameters_and_documentation_status

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
if(count_distinct(event_name)>1,"Multiple Event Names Selected",concat("Event Name: ",max(event_name)))
```

#### Parameter Name Label \[Calc\]
This becomes a metric.

* **Field Name:** Parameter Name Label \[Calc\]
* **Field ID:** parameter_name_label_calc

**Formula:**
```javascript
if(count_distinct(parameter_name)>1,"Multiple Parameters Selected",concat("Parameter Name: ",max(parameter_name)))
```

#### Parameter Count Documented and Data \[Calc\]
* **Field name:** Parameter Count Documented and Data \[Calc\]
* **Field ID:** parameter_count_documented_and_data_calc

**Formula:**
```javascript
count_distinct(if(parameter_documentation_status_aggregated = 'Documented and Data', concat(parameter_name,parameter_scope), null))
```

#### Parameter Count Not Documented \[Calc\]
* **Field name:** Parameter Count Not Documented \[Calc\]
* **Field ID:** parameter_count_not_documented_calc

**Formula:**
```javascript
count_distinct(if(parameter_documentation_status_aggregated = 'Not Documented', concat(parameter_name,parameter_scope), null))
```

#### Parameter Count Documented no Data \[Calc\]
* **Field name:** Parameter Count Documented no Data \[Calc\]
* **Field ID:** parameter_count_documented_no_data_calc

**Formula:**
```javascript
count_distinct(if(parameter_documentation_status_aggregated = 'Documented no Data', concat(parameter_name,parameter_scope), null))
```

#### Total Parameters \[Calc\]
* **Field name:** Total Parameters \[Calc\]
* **Field ID:** total_parameters_calc

**Formula:**
```javascript
concat('Total Parameters: ',count_distinct(concat(parameter_name,parameter_scope)))
```

#### Parameter Count Total \[Calc\]
* **Field name:** Parameter Count Total \[Calc\]
* **Field ID:** parameter_count_total_calc

**Formula:**
```javascript
count_distinct(if(parameter_name IS NOT null, concat(parameter_name,parameter_scope), null))
```

#### ga4_global_parameter_checkmark \[Calc\]
* **Field name:** ga4_global_parameter_checkmark \[Calc\]
* **Field ID:** ga4_global_parameter_checkmark_calc

**Formula:**
```javascript
case when ga4_config_parameter then '✔' else '' end
```


#### Parameter Description Search \[Calc\]
* **Field name:** Parameter Description Search \[Calc\]
* **Field ID:** parameter_description_search_calc

**Formula:**
```javascript
contains_text(lower(parameter_description), lower(Parameter Description Search))
```

#### Parameter Name Search \[Calc\]
* **Field name:** Parameter Name Search \[Calc\]
* **Field ID:** parameter_name_search_calc

**Formula:**
```javascript
contains_text(lower(parameter_name), lower(Parameter Name Search))
```

#### Parameter Name URL \[Calc\]
Makes a **URL** based on **Parameter Name**. Click on Parameter Name will lead the user to a report showing Event Name(s) for this Parameter.

The URL must be edited to match your Looker Studio URLs.

* **Field name:** Parameter Name URL \[Calc\]
* **Field ID:** parameter_name_url_calc

**Formula:**
```javascript
hyperlink(concat("https://lookerstudio.google.com/reporting/XXX/page/p_1ads1jvted?s=ihyU84wd7uY&params=%7B%22df69%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580",parameter_scope,"%22,%22df73%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580",parameter_name,"%22%7D"),parameter_name)
```
##### How to create the URL
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

#### Parameter First Seen Date \[Calc\]
* **Field name:** Parameter First Seen Date \[Calc\]
* **Field ID:** parameter_first_seen_date_calc

**Formula:**
```javascript
min(parameter_first_seen_date_total)
```

#### parameter_disallow_ads_personalization_checkmark \[Calc\]
* **Field name:** parameter_disallow_ads_personalization_checkmark \[Calc\]
* **Field ID:** parameter_disallow_ads_personalization_checkmark_calc

**Formula:**
```javascript
case when parameter_disallow_ads_personalization then '✔' else '' end
```

#### platform_android_checkmark \[Calc\]
* **Field name:** platform_android_checkmark \[Calc\]
* **Field ID:** platform_android_checkmark_calc

**Formula:**
```javascript
case when platform_android then '✔' else '' end
```

#### platform_ios_checkmark \[Calc\]
* **Field name:** platform_ios_checkmark \[Calc\]
* **Field ID:** platform_ios_checkmark_calc

**Formula:**
```javascript
case when platform_ios then '✔' else '' end
```

#### platform_weeb_checkmark \[Calc\]
* **Field name:** platform_web_checkmark \[Calc\]
* **Field ID:** platform_web_checkmark_calc

**Formula:**
```javascript
case when platform_web then '✔' else '' end
```

#### Parameter Last Seen Date \[Calc\]
* **Field name:** Parameter Last Seen Date \[Calc\]
* **Field ID:** parameter_last_seen_date_calc

**Formula:**
```javascript
max(parameter_last_seen_date_total)
```

#### Parameter Last Seen Days \[Calc\]
* **Field name:** Parameter Last Seen Days \[Calc\]
* **Field ID:** parameter_last_seen_days_calc

**Formula:**
```javascript
concat(
	date_diff(today(), max(parameter_last_seen_date_total)), ' ',
  case
    when date_diff(today(),  max(parameter_last_seen_date_total)) = 1 then 'day'
    else 'days'
  end,
  ' ago'
)
```

## Data Source: ga4_documentation_events_and_documentation_status
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

#### Event Name Search \[Calc\]
* **Field name:** Event Name Search \[Calc\]
* **Field ID:** event_name_search_calc

**Formula:**
```javascript
contains_text(lower(event_name), lower(Event Name Search))
```

#### Event Description Search \[Calc\]
* **Field name:** Event Description Search \[Calc\]
* **Field ID:** event_description_search_calc

**Formula:**
```javascript
contains_text(lower(event_description), lower(Event Description Search))
```

#### Event Name URL \[Calc\]
Makes a **URL** based on **Event Name**. Click on Event Name will lead the user to a report showing parameters (Dimensions & Metrics) for this Event Name.

The URL must be edited to match your Looker Studio URLs.

* **Field name:** Event Name URL \[Calc\]
* **Field ID:** event_name_url_calc

**Formula:**
```javascript
hyperlink(concat("https://lookerstudio.google.com/reporting/XXX/page/p_nm474cc5cd?params=%7B%22df62%22:%22include%25EE%2580%25803%25EE%2580%2580F%22,%22df61%22:%22ORexclude%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580Not%2520Documented%25EE%2580%2581include%25EE%2580%25803%25EE%2580%2580NU%25EE%2580%2582%22,%22df63%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580",event_name,"%22%7D"),event_name)
```
##### How to create the URL
Replace the **XXX** part of URL in the formula above with the **ID** found in YOUR Looker Studio URL.
If that doesn't work, this is how to recreate the URL from scratch:

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
format_datetime('%Y-%m-%d %H:%M',  event_uploaded_to_bq_time)
```

#### Total Events \[Calc\]
* **Field name:** Total Events \[Calc\]
* **Field ID:** total_events_calc

**Formula:**
```javascript
concat('Total Events: ',count_distinct(event_name))
```

#### key_event_checkmark \[Calc\]
* **Field name:** key_event_checkmark \[Calc\]
* **Field ID:** key_event_checkmark_calc

**Formula:**
```javascript
case when key_event then '✔' else '' end
```

#### platform_android_checkmark \[Calc\]
* **Field name:** platform_android_checkmark \[Calc\]
* **Field ID:** platform_android_checkmark_calc

**Formula:**
```javascript
case when platform_android then '✔' else '' end
```

#### platform_ios_checkmark \[Calc\]
* **Field name:** platform_ios_checkmark \[Calc\]
* **Field ID:** platform_ios_checkmark_calc

**Formula:**
```javascript
case when platform_ios then '✔' else '' end
```

#### platform_web_checkmark \[Calc\]
* **Field name:** platform_web_checkmark \[Calc\]
* **Field ID:** platform_web_checkmark_calc

**Formula:**
```javascript
case when platform_web then '✔' else '' end
```

#### Event Last Seen Days \[Calc\]
* **Field name:** Event Last Seen Days \[Calc\]
* **Field ID:** event_last_seen_days_calc

**Formula:**
```javascript
concat(
	date_diff(today(), event_last_seen_date_total), ' ',
  case
    when date_diff(today(), event_last_seen_date_total) = 1 then 'day'
    else 'days'
  end,
  ' ago'
)
```

#### Event Documentation Last Edited \[Calc\]
* **Field name:** Event Documentation Last Edited \[Calc\]
* **Field ID:** event_documentation_last_edited_calc

**Formula:**
```javascript
concat("Documentation Last Edited: ",max(Event Uploaded to BQ Time [Calc]))
```

## Data Source: ga4_documentation_events_and_images
Make the following adjustment to the data source if the Calculated Fields aren't working correctly.

### Calculated Fields

#### Event Image \[Calc\]
* **Field name:** Event Image \[Calc\]
* **Field id:** event_image_calc

**Formula:**
```javascript
hyperlink(event_image_documentation,image(event_image_documentation))
```

## Data Source: ga4_documentation_annotations
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
contains_text(lower(annotation_added_by_email), lower(Search Added By))
```

#### Annotation \[Calc\]
* **Field name:** Annotation \[Calc\]
* **Field id:** annotation_calc

**Formula:**
```javascript
replace(replace(replace(annotation_description,r"\r\n","\n"),r"\n","\n"),r"\n\n","\n")
```

#### Annotation Search \[Calc\]
* **Field name:** Annotation Search \[Calc\]
* **Field id:** annotation_search_calc

**Formula:**
```javascript
contains_text(lower(annotation_description), lower(Search Annotations))
```

## Data Source: ga4_documentation_anomaly_detection
Make the following adjustment to the data source if the **Calculated Fields** aren't working correctly.

### Parameters

#### Anomaly Description Search
Create **Anomaly Description Search** parameter.

* **Parameter name:** Anomaly Description Search
* **Parameter ID:** anomaly_description_search
* **Data Type:** Text
* **Permitted values:** Any value

#### Anomaly Name Search
Create **Anomaly Name Search** parameter.

* **Parameter name:** Anomaly Name Search
* **Parameter ID:** anomaly_name_search
* **Data Type:** Text
* **Permitted values:** Any value

### Calculated Fields

#### Anomaly Description Search \[Calc\]
* **Field name:** Anomaly Description Search \[Calc\]
* **Field id:** anomaly_description_search

**Formula:**
```javascript
contains_text(lower(anomaly_description), lower(Anomaly Description Search))
```

#### Anomaly Name Search \[Calc\]
* **Field name:** Anomaly Name Search \[Calc\]
* **Field id:** anomaly_name_search_calc

**Formula:**
```javascript
contains_text(lower(event_or_parameter_name), lower(Anomaly Name Search))
```

#### Event or Parameter \[Calc\]
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

#### Event or Parameter URL \[Calc\]
Replace the **XXX** part of URL in the formula above with the **ID** found in YOUR Looker Studio URL.

* **Field name:** Event or Parameter URL \[Calc\]
* **Field id:** event_parameter_url_calc

**Formula:**
```javascript
hyperlink(Event or Parameter [Calc],event_or_parameter_name)
```

