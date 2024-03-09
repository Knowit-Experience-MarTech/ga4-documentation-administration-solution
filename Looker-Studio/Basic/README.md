# Looker Studio - Basic - Using Google Sheet as Data Source
Documentation for creating basic Looker Studio report for presenting Event & Parameter Documentation without Status, in addition to Annotations. Google Sheet will be used as Data Source.

* Make a copy of the [**Looker Studio GA4 Basic Documentation report**](https://lookerstudio.google.com/s/k0NYnj-_FFw)
* Add the following Google Sheet Worksheet Data Sources to Looker Studio:
  1. [ParameterDataSource](#ParameterDataSource)
  2. [EventDataSource](#EventDataSource)
  3. [EventImagesDataSource](#EventImagesDataSource)
  4. [AnnotationsDataSource](#AnnotationsDataSource)

## Generate Google Sheet Data Source data
At the top of the sheet, you will find a custom menu called "**📈 GA4 Documentation**".

* **Go to the menu:** Use Sheet as Data Source -> Write Events & Parameters to Data Source Sheets

## Calculated Fields
The solution contains several **Calculated Fields**. They are all documented below. 

You have to edit 2 Calculated Fields:
1. [Event Name URL \[Calc\]](#event-name-url-calc)
2. [Parameter Name URL \[Calc\]](#parameter-name-url-calc)

## ParameterDataSource
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
IF(COUNT_DISTINCT(Event Name)>1,"Multiple Event Names Selected",CONCAT("Event Name: ",MAX(Event Name)))
```

#### Parameter Name Label \[Calc\]
This becomes a metric.

* **Field Name:** Parameter Name Label \[Calc\]
* **Field ID:** parameter_name_label_calc

**Formula:**
```javascript
IF(COUNT_DISTINCT(Parameter Name)>1,"Multiple Parameters Selected",CONCAT("Parameter Name: ",MAX(Parameter Name)))
```

#### Total Parameters \[Calc\]
This becomes a metric.

* **Field Name:** Total Parameters \[Calc\]
* **Field ID:** total_parameters_calc

**Formula:**
```javascript
CONCAT('Total Parameters: ',COUNT_DISTINCT(Parameter Name))
```

#### Parameter Description Search \[Calc\]

* **Field Name:** Parameter Description Search \[Calc\]
* **Field ID:** parameter_description_search_calc

**Formula:**
```javascript
CONTAINS_TEXT(LOWER(Parameter Description), LOWER(Parameter Description Search))
```

#### Parameter Name Search \[Calc\]

* **Field Name:** Parameter Description Search \[Calc\]
* **Field ID:** parameter_name_search_calc

**Formula:**
```javascript
CONTAINS_TEXT(LOWER(Parameter Name), LOWER(Parameter Name Search))
```

#### Parameter Name URL \[Calc\]
Makes a **URL** based on **Parameter Name**. Click on Parameter Name will lead the user to a report showing Event Name(s) for this Parameter.

The URL must be edited to match your Looker Studio URLs.

* **Field name:** Parameter Name URL \[Calc\]
* **Field ID:** parameter_name_url_calc

**Formula:**
```javascript
HYPERLINK(CONCAT("https://lookerstudio.google.com/u/0/reporting/d6e751a9-c6f1-4244-8ae2-26af7225c5a4/page/p_1ads1jvted?params=%7B%22df69%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580",Parameter Scope,"%22,%22df73%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580",Parameter Name,"%22%7D"),Parameter Name)
```
##### How to create the URL
1. Navigate to the **Parameter & Event Documentation** report
2. **Parameter Scope** filter: Select a single Scope (ex. **EVENT**)
3. **Parameter Name** filter: Select a single Parameter (ex. **file_extension**)
4. Copy the URL
5. Find the **Parameter Scope** in the URL, ex. **EVENT**. Replace **EVENT** with **Parameter Scope** as shown in the **Formula** above.
6. Find the **Parameter Name** in the URL, ex. **file_extension**. Replace **file_extension** with **Parameter Name** as shown in the **Formula** above.

If you want to learn more about this solution, here is a video about the subject:
* [https://www.youtube.com/watch?v=fGBsjgjjYWg](https://www.youtube.com/watch?v=fGBsjgjjYWg)

## EventDataSource
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
#### Total Events \[Calc\]
* **Field name:** Total Events \[Calc\]
* **Field ID:** total_events_calc

**Formula:**
```javascript
CONCAT('Total Events: ', COUNT_DISTINCT(Event Name))
```

#### Event Description Search \[Calc\]
* **Field name:** Event Description Search \[Calc\]
* **Field ID:** event_description_search_calc

**Formula:**
```javascript
CONTAINS_TEXT(LOWER(Event Description), LOWER(Event Description Search))
```

#### Event Name Search \[Calc\]
* **Field name:** Event Name Search \[Calc\]
* **Field ID:** event_name_search_calc

**Formula:**
```javascript
CONTAINS_TEXT(LOWER(Event Name), LOWER(Event Name Search))
```

#### Event Name URL \[Calc\]
Makes a **URL** based on **Event Name**. Click on Event Name will lead the user to a report showing parameters (Dimensions & Metrics) for this Event Name.

The URL must be edited to match your Looker Studio URLs.

* **Field name:** Event Name URL \[Calc\]
* **Field ID:** event_name_url_calc

**Formula:**
```javascript
HYPERLINK(CONCAT("https://lookerstudio.google.com/u/0/reporting/d6e751a9-c6f1-4244-8ae2-26af7225c5a4/page/p_nm474cc5cd?params=%7B%22df62%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580FALSE%22,%22df63%22:%22include%25EE%2580%25800%25EE%2580%2580IN%25EE%2580%2580",Event Name,"%22%7D"),Event Name)
```
##### How to create the URL
1. Navigate to the **Event & Parameter Documentation** report
2. **GA4 Config Parameter** filter: **FALSE** (only)
3. **Event Name** filter: Select a single Event Name (ex. **click**)
5. Copy the URL
6. Find the **Event Name** in the URL, ex. **click**. Replace **click** with **Event Name** as shown in the **Formula** above.

If you want to learn more about this solution, here is a video about the subject:
* [https://www.youtube.com/watch?v=fGBsjgjjYWg](https://www.youtube.com/watch?v=fGBsjgjjYWg)

## EventImagesDataSource
Make the following adjustment to the data source if the Calculated Fields aren't working correctly.

### Calculated Fields

#### Event Image \[Calc\]
* **Field name:** Event Image \[Calc\]
* **Field id:** event_image_calc

**Formula:**
```javascript
HYPERLINK(Event Image Documentation URL,IMAGE(Event Image Documentation URL))
```

## AnnotationsDataSource
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
CONTAINS_TEXT(LOWER(Annotation Added By), LOWER(Search Added By))
```

#### Annotation Search \[Calc\]
* **Field name:** Annotation Search \[Calc\]
* **Field id:** annotation_search_calc

**Formula:**
```javascript
CONTAINS_TEXT(LOWER(Annotation), LOWER(Search Annotations))
```
