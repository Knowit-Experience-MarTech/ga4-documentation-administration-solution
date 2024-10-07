/**
 * Copyright 2024 Knowit Experience Oslo
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     https://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// **** BIG QUERY ****

let manualBQTrigger = false;

function uploadEventsToBigQueryManually() {
  try{
    manualBQTrigger = true;
    uploadEventsToBigQuery(manualBQTrigger);
  }catch(err){
    Logger.log('uploadEventsToBigQueryManually: '+err.stack);
    if(manualBQTrigger) {
      SpreadsheetApp.getUi().alert('Error occoured in "uploadEventsToBigQueryManually" function: \n'+err);
    }
  } 
}

function uploadAnnotationsToBigQueryManually() {
  try{
    manualBQTrigger = true;
    uploadAnnotationsToBigQuery(manualBQTrigger);
  }catch(err){
    Logger.log('uploadAnnotationsToBigQueryManuall: '+err.stack);
    if(manualBQTrigger) {
      SpreadsheetApp.getUi().alert('Error occoured in "uploadParametersToBigQueryManually" function: \n'+err);
    }
  } 
}

function getTableSchema(sheetName) {
  const eventSchema = {
    fields: [
      {name: 'event_group', type: 'STRING'},
      {name: 'event_name', type: 'STRING'},
      {name: 'event_method', type: 'STRING'},
      {name: 'event_type', type: 'STRING'},
      {name: 'key_event', type: 'BOOL'},
      {name: 'key_event_counting', type: 'STRING'},
      {name: 'event_description', type: 'STRING'},
      {name: 'event_parameters', type: 'STRING'},
      {name: 'event_item_parameters', type: 'STRING'},
      {name: 'event_user_parameters', type: 'STRING'},
      {name: 'event_comment', type: 'STRING'},
      {name: 'event_image_documentation', type: 'STRING'},
      {name: 'event_edited_time', type: 'DATETIME'},
      {name: 'event_website', type: 'BOOL'},
      {name: 'event_ios_app', type: 'BOOL'},
      {name: 'event_android_app', type: 'BOOL'},
      {name: 'event_ga4_api_resource_name', type: 'STRING'},
      {name: 'event_gtm_comment', type: 'STRING'},
      {name: 'event_uploaded_to_bq_time',type: 'DATETIME'}
    ]
  };

  const parameterSchema = {
    fields: [
      {name: 'parameter_group', type: 'STRING'},
      {name: 'parameter_display_name', type: 'STRING'},
      {name: 'parameter_name', type: 'STRING'},
      {name: 'parameter_scope', type: 'STRING'},
      {name: 'parameter_type', type: 'STRING'},
      {name: 'parameter_format', type: 'STRING'},
      {name: 'parameter_disallow_ads_personalization', type: 'BOOL'},
      {name: 'parameter_example_value', type: 'STRING'},
      {name: 'parameter_description', type: 'STRING'},
      {name: 'parameter_ga4_api_resource_name', type: 'STRING'},
      {name: 'parameter_gtm_comment', type: 'STRING'},
      {name: 'parameter_uploaded_to_bq_time', type: 'DATETIME'}
    ]
  };

    const annotationSchema = {
    fields: [
      {name: 'annotation_time', type: 'DATETIME'},
      {name: 'annotation_added_by_email', type: 'STRING'},
      {name: 'annotation_category', type: 'STRING'},
      {name: 'annotation_description', type: 'STRING'},
      {name: 'annotation_ga4_gtm_info', type: 'STRING'},
      {name: 'annotation_uploaded_to_bq_time', type: 'DATETIME'}
    ]
  };

  // Determine which schema to return based on sheetName
  if (sheetName === eventTab) {
    return eventSchema;
  } else if (sheetName === parameterTab) {
    return parameterSchema;
  } else if (sheetName === annotationTab) {
    return annotationSchema;
  } else {
    // Handle the case where sheetName doesn't match any known schema
    throw new Error(`Unknown sheetName: ${sheetName}`);
  }
}

function buildReport(rows, sheetName) {
  const report = [];

  if (sheetName === eventTab) {
    for (let i = 0; i < rows.length; i++) {
      // Extract data from rows for the event tab
      const event_group = rows[i][eventGroupColumn-1].trim();
      const event_name = rows[i][eventNameColumn-1].trim();
      const event_method = rows[i][eventMethodColumn-1].trim();
      const event_type = rows[i][eventTypeColumn-1].trim();
      const key_event = rows[i][keyEventColumn-1];
      const key_event_counting = rows[i][keyEventCountingColumn-1].trim();
      const event_description = rows[i][eventDescriptionColumn-1].trim();
      const event_parameters = rows[i][eventParametersColumn-1].replace(/\r\n|\n|' '/g, ',');
      const event_item_parameters = rows[i][eventItemParametersColumn-1].replace(/\r\n|\n|' '/g, ',');
      const event_user_parameters = rows[i][eventUserParametersColumn-1].replace(/\r\n|\n|' '/g, ',');
      const event_comment = rows[i][eventCommentColumn-1].trim();
      const event_image_documentation = rows[i][eventImageDocumentationColumn-1].replace(/\r\n|\n|' '/g, ',');
      const event_time_edited = rows[i][eventEditedTimeColumn-1] ? Utilities.formatDate(rows[i][eventEditedTimeColumn-1], timezone, dateFormat+"' 'HH:mm:ss") : '';
      const event_website = rows[i][eventPlatformWebsiteColumn-1];
      const event_ios_app = rows[i][eventPlatformIosColumn-1];
      const event_android_app = rows[i][eventPlatformAndroidColumn-1];
      const event_ga4_api_resource_name = rows[i][eventResourceNameColumn-1].trim();
      const event_gtm_comment = rows[i][eventGTMCommentColumn-1].trim();
      const event_uploaded_to_bq_time = Utilities.formatDate(new Date(), timezone, dateFormat+"' 'HH:mm:ss");

      if((event_group && event_name && event_description) && (event_website || event_ios_app || event_android_app)) {
        report.push([
          event_group,event_name,event_method,event_type,key_event,key_event_counting,event_description,event_parameters,event_item_parameters,event_user_parameters,event_comment,event_image_documentation,event_time_edited,event_website,event_ios_app,event_android_app,event_ga4_api_resource_name,event_gtm_comment,event_uploaded_to_bq_time
        ]);
      }
    }
  } else if (sheetName === parameterTab) {

    const parameterSheetData = [];
    parameterRows.forEach((row) => {
      const parameter = {
        parameterGroup: row[parameterGroupColumn-1].trim(),
        parameterDisplayName: row[parameterDisplayNameColumn-1].trim(),
        parameterName: row[parameterNameColumn-1].trim(),
        parameterScope: row[parameterScopeColumn-1].trim(),
        parameterType: row[parameterTypeColumn-1].trim(),
        parameterFormat: row[parameterFormatColumn-1].trim(),
        parameterDisallowAdsPersonalization: row[parameterDisallowAdsPersonalizationColumn-1] ? true : false,
        parameterExampleValue: row[parameterExampleValueColumn-1].trim(),
        parameterDescription: row[parameterDescriptionColumn-1].trim(),
        parameterResourceName: row[parameterResourceNameColumn-1].trim(),
        parameterGTMComment: row[parameterGTMCommentColumn-1].trim(),
      }
      parameterSheetData.push(parameter);
    });

    const eventParameterSheetData = [];
    const itemParameterSheetData = [];
    const userParameterSheetData = [];

    eventRows.forEach((row) => {
      if (row[eventParametersColumn - 1] && row[eventParametersColumn - 1].length) {
        eventParameterSheetData.push(row[eventParametersColumn - 1].trim().replace(/\r\n|\n|' '/g, ',').split(","));
      }
      if (row[eventItemParametersColumn - 1] && row[eventItemParametersColumn - 1].length) {
        itemParameterSheetData.push(row[eventItemParametersColumn - 1].trim().replace(/\r\n|\n|' '/g, ',').split(","));
      }
      if (row[eventUserParametersColumn - 1] && row[eventUserParametersColumn - 1].length) {
        userParameterSheetData.push(row[eventUserParametersColumn - 1].trim().replace(/\r\n|\n|' '/g, ',').split(","));
      }
    });

    const eventParameterData = [];
    const eventParameterSplit = eventParameterSheetData.toString().split(',');

    eventParameterSplit.forEach((param) => {
      const parameter = {
        parameterName: param.trim(),
        parameterScope: 'EVENT'
      };
      eventParameterData.push(parameter);
    });

    const itemParameterData = [];
    const itemParameterSplit = itemParameterSheetData.toString().split(',');

    itemParameterSplit.forEach((param) => {
      const parameter = {
        parameterName: param.trim(),
        parameterScope: 'ITEM'
      };
      itemParameterData.push(parameter);
    });

    const userParameterData = [];
    const userParameterSplit = userParameterSheetData.toString().split(',');

    userParameterSplit.forEach((param) => {
      const parameter = {
        parameterName: param.trim(),
        parameterScope: 'USER'
      };
      userParameterData.push(parameter);
    });

    const parameterConcat = eventParameterData.concat(itemParameterData,userParameterData);
    let uniqueParameters = new Set();

    parameterSheetData.forEach((sheetData) => {
      parameterConcat.forEach((parameterConcat) => {
        if(sheetData.parameterName === parameterConcat.parameterName && sheetData.parameterScope === parameterConcat.parameterScope) {

          // Create a unique key for each combination of parameterName and parameterScope
          const uniqueKey = sheetData.parameterName + '_' + sheetData.parameterScope;

          // Check if this combination has already been added
          if (!uniqueParameters.has(uniqueKey)) {
            uniqueParameters.add(uniqueKey); // Add the unique key to the set

            const parameter_group = sheetData.parameterGroup;
            const parameter_display_name = sheetData.parameterDisplayName;
            const parameter_name = sheetData.parameterName;
            const parameter_scope = sheetData.parameterScope;
            const parameter_type = sheetData.parameterType;
            const parameter_format = sheetData.parameterFormat;
            const parameter_disallow_ads_personalization = sheetData.parameterDisallowAdsPersonalization;
            const parameter_example_value = sheetData.parameterExampleValue;
            const parameter_description = sheetData.parameterDescription;
            const parameter_ga4_api_resource_name = sheetData.parameterResourceName;
            const parameter_gtm_comment = sheetData.parameterGTMComment;
            const parameter_uploaded_to_bq_time = Utilities.formatDate(new Date(), timezone, dateFormat+"' 'HH:mm:ss");

            if(parameter_group && parameter_display_name && parameter_name && parameter_description) {
              report.push([
                parameter_group,parameter_display_name,parameter_name,parameter_scope,parameter_type,parameter_format,parameter_disallow_ads_personalization,parameter_example_value,parameter_description,parameter_ga4_api_resource_name,parameter_gtm_comment,parameter_uploaded_to_bq_time
              ]);
            }
          }
        }
      });
    });
  } else if (sheetName === annotationTab) {
    for (let i = 0; i < rows.length; i++) {
      // Extract data from rows for the Annotation tab
      const annotation_time = Utilities.formatDate(rows[i][annotationTimeColumn-1], timezone, dateFormat);
      const annotation_added_by_email = rows[i][annotationAddedByColumn-1].trim();
      const annotation_category = rows[i][annotationCategoryColumn-1].trim();
      const annotation_description = rows[i][annotationDescriptionColumn-1].trim();
      const annotation_ga4_gtm_info = rows[i][annotationGa4PropertyColumn-1].trim();
      const annotation_uploaded_to_bq_time = Utilities.formatDate(new Date(), timezone, dateFormat+"' 'HH:mm:ss");

      report.push([
        annotation_time,annotation_added_by_email,annotation_category,annotation_description,annotation_ga4_gtm_info, annotation_uploaded_to_bq_time
      ]);
    }
  } else {
    // Handle the case where sheetName doesn't match any known tab
    throw new Error(`Unknown sheetName: ${sheetName}`);
  }

  return report;
}

function getTableRange(sheetName) {
  if (sheetName === eventTab) {
    return 'B9:B'; // or whatever range is appropriate for the event tab
  } else if (sheetName === parameterTab) {
    return 'C9:C'; // or whatever range is appropriate for the parameter tab
  } else if (sheetName === annotationTab) {
    return 'A9:A'; // or whatever range is appropriate for the annotations tab
  } else {
    // Handle the case where sheetName doesn't match any known tab
    throw new Error(`Unknown sheetName: ${sheetName}`);
  }
}

function uploadToBigQuery(sheetName, tableId) {
  try {
    const projectId = bigQueryProjectID;
    const datasetId = bigQueryDataSetID;
    const writeDispositionSetting = 'WRITE_TRUNCATE';

    const file = ss.getSheetByName(sheetName);
    const range = getTableRange(sheetName);

    const count = file.getRange(range).getDisplayValues().flat().filter(String).length;
    const lastRow = count + headerRowNumber;

    const rows = file.getDataRange().offset(headerRowNumber, 0, lastRow - headerRowNumber).getValues();

    const schema = getTableSchema(sheetName);
    const report = buildReport(rows, sheetName);

    let csvRows = report.map(values =>
      // We use JSON.stringify() to add "quotes to strings",
      // but leave numbers and booleans without quotes.
      // If a string itself contains quotes ("), JSON escapes them with
      // a backslash as \" but the CSV format expects them to be
      // escaped as "", so we replace all the \" with "".
      values.map(value => JSON.stringify(value).replace(/\\"/g, '""'))
  );
  let csvData = csvRows.map(values => values.join(',')).join('\n');

  const blob = Utilities.newBlob(csvData, "application/octet-stream");
  
  // Create the data upload job. 
  const job = {
    configuration: {
      load: {
        destinationTable: {
          projectId: projectId,
          datasetId: datasetId,
          tableId: tableId
        },
        schema: schema,
        writeDisposition: writeDispositionSetting
      }
    }
  };
  BigQuery.Jobs.insert(job, projectId, blob);

  } catch (err) {
    Logger.log('BigQuery: ' + err.stack);
    if(manualBQTrigger) {
      SpreadsheetApp.getUi().alert('BigQuery upload failed: \n' + err);
    }
  }
}

function uploadEventsToBigQuery() {

    const parameterSheetData = [];

    parameterRows.forEach((row, index) => {
        const parameter = {
          parameterName: row[parameterNameColumn-1].trim(),
          scope: row[parameterScopeColumn-1].trim(),
          length: index
      }
      parameterSheetData.push(parameter);
    });

    const eventParameterSheetData = [];
    const itemParameterSheetData = [];
    const userParameterSheetData = [];
    
    eventRows.forEach((row) => {
      if (row[eventParametersColumn - 1] && row[eventParametersColumn - 1].length) {
        eventParameterSheetData.push(row[eventParametersColumn - 1].trim().replace(/\r\n|\n|' '/g, ',').split(','));
      }
      if (row[eventItemParametersColumn - 1] && row[eventItemParametersColumn - 1].length) {
        itemParameterSheetData.push(row[eventItemParametersColumn - 1].trim().replace(/\r\n|\n|' '/g, ',').split(','));
      }
      if (row[eventUserParametersColumn - 1] && row[eventUserParametersColumn - 1].length) {
        userParameterSheetData.push(row[eventUserParametersColumn - 1].trim().replace(/\r\n|\n|' '/g, ',').split(','));
      }
    });
  
    const eventParameterData  = [];
    const eventParameterSplit = eventParameterSheetData.toString().split(',');
    eventParameterSplit.forEach((param) => {
      const eventParameter = {
        parameterName: param.trim()
      };
      eventParameterData.push(eventParameter);
    });


    const dimensionData = [];
    const dimensionDataDocumented = [];

    eventParameterData.forEach((eventParameterData) => {
      dimensionData.push(eventParameterData.parameterName);
      parameterSheetData.forEach((parameterSheetData) => {
        if(parameterSheetData.parameterName === eventParameterData.parameterName && parameterSheetData.scope === 'EVENT') {
          dimensionDataDocumented.push(parameterSheetData.parameterName);
        }
      });
    });
  
    const unDocumentedDimensions = dimensionData.filter(parameterName => !dimensionDataDocumented.includes(parameterName) && parameterName !== "");

    const itemParameterData = [];
    const itemParameterSplit = itemParameterSheetData.toString().split(',');
 
    itemParameterSplit.forEach((param) => {
      const itemParameter = {
        parameterName: param.trim()
      };
      itemParameterData.push(itemParameter);
    });

    const itemData = [];
    const itemDataDocumented = [];

    itemParameterData.forEach((itemParams) => {
      itemData.push(itemParams.parameterName.trim());
      parameterSheetData.forEach((sheetParams) => {
        if(sheetParams.parameterName === itemParams.parameterName && sheetParams.scope === 'ITEM') {
          itemDataDocumented.push(sheetParams.parameterName.trim());
        }
      });
    });
 
    const unDocumentedItems = itemData.filter(parameterName => !itemDataDocumented.includes(parameterName) && parameterName !== "");

    const userParameterData = [];
    const userParameterSplit = userParameterSheetData.toString().split(',');
 
    userParameterSplit.forEach((param) => {
      const userParameter = {
        parameterName: param.trim()
      };
      userParameterData.push(userParameter);
    });

    const userData = [];
    const userDataDocumented = [];

    userParameterData.forEach((userParams) => {
      userData.push(userParams.parameterName.trim());
      parameterSheetData.forEach((sheetParams) => {
        if(sheetParams.parameterName === userParams.parameterName && sheetParams.scope === 'USER') {
          userDataDocumented.push(sheetParams.parameterName.trim());
        }
      });
    });
 
    const unDocumentedUserProperties = userData.filter(parameterName => !userDataDocumented.includes(parameterName) && parameterName !== "");

    const deleteDimensions = [];
    const deleteItems = [];
    const deleteUserProperties = [];

    if((unDocumentedDimensions && unDocumentedDimensions.length) || (unDocumentedItems && unDocumentedItems.length) || (unDocumentedUserProperties && unDocumentedUserProperties.length)) {

      let eventParameterMessage = '';
      if(unDocumentedDimensions.length) { 
        const parameterInMessage = [];

        for (let m=0;m<unDocumentedDimensions.length;m++){
          parameterInMessage.push(' '+unDocumentedDimensions[m]);
        } 
        const uniqueUndocumentedDimensions = [...new Set(parameterInMessage)];
        deleteDimensions.push(uniqueUndocumentedDimensions);
        eventParameterMessage = 'Event Parameters used on Event(s), but not found in the Parameter documentation:\n'+uniqueUndocumentedDimensions.toString();
      }
    
      let itemParameterMessage = '';
      
      if(unDocumentedItems && unDocumentedItems.length) {
        const itemParameterInMessage = [];
      
        for (let n=0;n<unDocumentedItems.length;n++){
          itemParameterInMessage.push(' '+unDocumentedItems[n]);
        }
        const uniqueunDocumentedItems = [...new Set(itemParameterInMessage)];
        deleteItems.push(uniqueunDocumentedItems);
        itemParameterMessage = '\n\nItem Parameters used on Event(s), but not found in the Parameter documentation:\n'+uniqueunDocumentedItems.toString();
      }

      let userParameterMessage = '';
      
      if(unDocumentedUserProperties && unDocumentedUserProperties.length) {
        const userParameterInMessage = [];
      
        for (let n=0;n<unDocumentedUserProperties.length;n++){
          userParameterInMessage.push(' '+unDocumentedUserProperties[n]);
        }
        const uniqueunDocumentedUserProperties = [...new Set(userParameterInMessage)];
        deleteUserProperties.push(uniqueunDocumentedUserProperties);
        userParameterMessage = '\n\nUser Scoped Parameters used on Event(s), but not found in the Parameter documentation:\n'+uniqueunDocumentedUserProperties.toString();
      }

      const ui = SpreadsheetApp.getUi();
      const response = ui.alert(
        eventParameterMessage+itemParameterMessage+userParameterMessage+'\n\nParameters used on Event(s), but not documented in Parameter Documentation was found.\nThese Parameters must be removed from the Event Documentation before uploading documentation to BigQuery. Do you want to remove them?',
        ui.ButtonSet.YES_NO
      );

      if (response !== ui.Button.YES) {
        SpreadsheetApp.getUi().alert('Uploading documentation to BigQuery was cancelled.');
        return;
      }

      // TextFinder RegEx
      const leadingNewlinePattern = '(^\n)';
      const matchBeforeText = '(^|\n)';
      const matchAfterText = '(\r?\n|\r|$)';

      if(deleteDimensions && deleteDimensions.length) {
        deleteDimensionsSplit = deleteDimensions.toString().split(',');
        
        const dimensionList = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('EventParameters');
        
        // Create a TextFinder instance for the second pattern (constant pattern)
        let newlineDimensionTextFinder = dimensionList.createTextFinder(leadingNewlinePattern)
                                     .useRegularExpression(true)
                                     .matchEntireCell(false)
                                     .matchCase(true);

        for (let p = 0; p < deleteDimensionsSplit.length; p++) {

          const dimensionText = deleteDimensionsSplit[p].trim();

          // Define the text to be replaced
          const dimensionTextToReplace = '(' + matchBeforeText + dimensionText + matchAfterText + ')';

          // Create a TextFinder instance for the first pattern
          let textDimensionFinder = dimensionList.createTextFinder(dimensionTextToReplace)
                                 .useRegularExpression(true)
                                 .matchEntireCell(false)
                                 .matchCase(true);

          // Replace all instances of the first pattern
          textDimensionFinder.replaceAllWith('\n');

          // Reuse the constant TextFinder instance for the second pattern
          newlineDimensionTextFinder.replaceAllWith('');
        }
      }

      // ITEM PARAMETERS
      if(deleteItems && deleteItems.length) {
        deleteItemsSplit = deleteItems.toString().split(',');

        const itemList = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('EventItemParameters');
        
        // Create a TextFinder instance for the second pattern (constant pattern)
        let newlineItemTextFinder = itemList.createTextFinder(leadingNewlinePattern)
                                     .useRegularExpression(true)
                                     .matchEntireCell(false)
                                     .matchCase(true);

        for (let p=0;p<deleteItemsSplit.length;p++){
          const itemText = deleteItemsSplit[p].trim();

                    // Define the text to be replaced
          const itemTextToReplace = '(' + matchBeforeText + itemText + matchAfterText + ')';

          // Create a TextFinder instance for the first pattern
          let textItemFinder = itemList.createTextFinder(itemTextToReplace)
                                 .useRegularExpression(true)
                                 .matchEntireCell(false)
                                 .matchCase(true);

          // Replace all instances of the first pattern
          textItemFinder.replaceAllWith('\n');

          // Reuse the constant TextFinder instance for the second pattern
          newlineItemTextFinder.replaceAllWith('');
        }
      }

      // USER SCOPED PARAMETERS
      if(deleteUserProperties && deleteUserProperties.length) {
        deleteUserPropertiesSplit = deleteUserProperties.toString().split(',');

        const userPropertyList = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('EventUserParameters');
        
        // Create a TextFinder instance for the second pattern (constant pattern)
        let newlineUserPropertiesTextFinder = userPropertyList.createTextFinder(leadingNewlinePattern)
                                     .useRegularExpression(true)
                                     .matchEntireCell(false)
                                     .matchCase(true);

        for (let p=0;p<deleteUserPropertiesSplit.length;p++){
          const userPropertiesText = deleteUserPropertiesSplit[p].trim();

                    // Define the text to be replaced
          const userPropertiesTextToReplace = '(' + matchBeforeText + userPropertiesText + matchAfterText + ')';

          // Create a TextFinder instance for the first pattern
          let textUserPropertiesFinder = userPropertyList.createTextFinder(userPropertiesTextToReplace)
                                 .useRegularExpression(true)
                                 .matchEntireCell(false)
                                 .matchCase(true);

          // Replace all instances of the first pattern
          textUserPropertiesFinder.replaceAllWith('\n');

          // Reuse the constant TextFinder instance for the third pattern
          newlineUserPropertiesTextFinder.replaceAllWith('');
        }
      }

      SpreadsheetApp.getUi().alert("Parameters are removed, uploading documentation to BigQuery."); 
    }

  const sheetName = eventTab;
  const tableId = bigQueryTableID1;

  uploadParametersToBigQuery(manualBQTrigger);

  if (!tableId && manualBQTrigger) {
    SpreadsheetApp.getUi().alert('BigQuery Settings are not filled out, nothing was uploaded to BigQuery.');
    return;
  }
  uploadToBigQuery(sheetName, tableId);
}

function uploadParametersToBigQuery() {
  const sheetName = parameterTab;
  const tableId = bigQueryTableID2;
  
  if (!tableId && manualBQTrigger) {
    return;
  }
  uploadToBigQuery(sheetName, tableId);
}

function uploadAnnotationsToBigQuery() {
  const sheetName = annotationTab;
  const tableId = bigQueryTableID3;

  if (!tableId && manualBQTrigger) {
    return;
  }
  uploadToBigQuery(sheetName, tableId);
}

// READ DATA FROM BIGQUERY
// *** Get GA4 Event Names & Event Count
function getGA4EventDataFromBigQuery() {
  try {
    if (!bigQueryProjectID || !bigQueryDataSetID) {
      SpreadsheetApp.getUi().alert("BigQuery Project ID or Data Set ID is not set in Settings Sheet.");
      return
    }

    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'You are querying Event Names & Event Count from BigQuery for the last ' + reportingPeriodStart +' days including today. Cost may occur. Continue?',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return;
    }

    const request = {
      query: 'select event_name, count(event_name) as event_count ' +
        'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*` ' +
        'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
        'and format_date("%Y%m%d", current_date()) ' +
        'and event_name not in ("ga4_config", "session_start", "first_visit", "first_open", "user_engagement") ' +
        'group by event_name',
      useLegacySql: false
    };

    let queryResults = BigQuery.Jobs.query(request, bigQueryProjectID);
    const jobId = queryResults.jobReference.jobId;

    // Check on status of the Query Job.
    let sleepTimeMs = 500;
    while (!queryResults.jobComplete) {
      Utilities.sleep(sleepTimeMs);
      sleepTimeMs *= 2;
      queryResults = BigQuery.Jobs.getQueryResults(bigQueryProjectID, jobId);
    }

    // Get all the rows of results.
    let rows = queryResults.rows;
    while (queryResults.pageToken) {
      queryResults = BigQuery.Jobs.getQueryResults(bigQueryProjectID, jobId, {
        pageToken: queryResults.pageToken
      });
      rows = rows.concat(queryResults.rows);
    }

    if (!rows) {
      console.log('No rows returned.');
      return;
    }

    const helperSheet = ss.getSheetByName(helperGA4EventDataFromBigQueryTab);
    const numRows = helperSheet.getLastRow(); // The number of row to clear
    helperSheet.getRange(1, 1, numRows+1, helperSheet.getLastColumn()+1).clearContent();

    // Append the headers.
    const headers = queryResults.schema.fields.map(function(field) {
      return field.name;
    });
    helperSheet.appendRow(headers);

    // Append the results.
    const data = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i].f;
      data[i] = new Array(cols.length);
      for (let j = 0; j < cols.length; j++) {
        data[i][j] = cols[j].v;
      }
    }
    helperSheet.getRange(2, 1, rows.length, headers.length).setValues(data);

    const helperEventData = [];
    const helperEventRows = helperSheet.getRange(2, 1, rows.length, headers.length).getValues();

    helperEventRows.forEach((row, index) => {
      const helperEvent = {
        eventName: row[0].trim(),
        eventCount: row[1],
        length: index
      }
      helperEventData.push(helperEvent);
    });

    const eventSheet = ss.getSheetByName(eventTab);
    const eventCount = eventSheet.getRange(eventRangeColumn).getDisplayValues().flat().filter(String).length;
    const eventLastRow = eventCount+headerRowNumber;
    const eventRows = eventSheet.getDataRange().offset(headerRowNumber, 0, eventLastRow - headerRowNumber).getValues();
    const sheetData = [];
    
    eventRows.forEach((row, index) => {
      const helperEvent = {
        eventName: row[eventNameColumn-1].trim(),
        length: index
      }
      sheetData.push(helperEvent);
    });

    eventSheet.getRange(headerRowNumber+1, eventEventCountColumn, sheetData.length,1).setValue(0);

    const eventData = [];
    const eventDataDocumented = [];

    helperEventData.forEach((helperEventData) => {
      eventData.push(helperEventData);
      sheetData.forEach((sheetData) => {
        if(helperEventData.eventName === sheetData.eventName) {
          eventSheet.getRange(sheetData.length+headerRowNumber+1,eventEventCountColumn).setValue(helperEventData.eventCount);
          eventDataDocumented.push(helperEventData);
        }
      });
    });

    // Remove Events that are documented
    const unDocumentedEvents = eventData.filter(event => !eventDataDocumented.includes(event));

    // Add undocumented Events to the end of the Events Sheet
    unDocumentedEvents.forEach((unDocumentedEvents,index) => {
      eventSheet.getRange(eventLastRow+1+index,eventNameColumn).setValue(unDocumentedEvents.eventName);
      const eventCount = unDocumentedEvents.eventCount ? unDocumentedEvents.eventCount : 0;
      eventSheet.getRange(eventLastRow+1+index,eventEventCountColumn).setValue(eventCount);
  });

  }catch(err){
    Logger.log('getGA4EventDataFromBigQuery: '+err.stack);
    SpreadsheetApp.getUi().alert('getGA4EventDataFromBigQuery: \n' + err);
  }
}

// *** Get GA4 Parameters & Count
function getGA4ParameterDataFromBigQuery() {
  try {
    if (!bigQueryProjectID || !bigQueryDataSetID) {
      SpreadsheetApp.getUi().alert("BigQuery Project ID or Data Set ID is not set in Settings Sheet.");
      return
    }

    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'You are querying Parameters & Count from BigQuery for the last ' + reportingPeriodStart +' days including today. Cost may occur. Continue?',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return;
    }

    const parameterSheet = ss.getSheetByName(parameterTab);
    const count = parameterSheet.getRange(parameterRangeColumn).getDisplayValues().flat().filter(String).length;
    const parameterLastRow = count+headerRowNumber;
    const parameterRows = parameterSheet.getDataRange().offset(headerRowNumber, 0, parameterLastRow - headerRowNumber).getValues();

    const queryEcom = ss.getSheetByName(settingsTab).getRange('SettingsBigQueryEcomParams').getValue();
    
    if(queryEcom === 'Yes') {
      const itemData = [];

      parameterRows.forEach((row, index) => {
        if(row[parameterScopeColumn-1].trim === 'ITEM') {
          const items = {
            parameterName: row[parameterNameColumn-1].trim(),
          }
          itemData.push(items);
        }
      });
    }

    let keyNotIn = ss.getSheetByName(settingsTab).getRange('SettingsBigQueryExcludeParams').getValue().replace(/\s+/g, '').split(',');
    
    keyNotIn = JSON.stringify(keyNotIn).replace(/[[\]]/g, '').toString();

    let query = 'select ' +
    'event_params.key as parameter_name, ' +
    'count(event_params.key) as count, ' +
    '"EVENT" as scope ' +

    'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*` ' +
    'cross join unnest(event_params) as event_params ' +

    'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
    'and format_date("%Y%m%d", current_date()) ' +
    'and event_params.key not in (' + keyNotIn + ') ' +
    'group by event_params.key ' +

    // Query for user_properties
    'union all ' +

    'select ' +
    'user_properties.key as parameter_name, ' +
    'count(user_properties.key) as count, ' +
    '"USER" as scope ' +

    'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*` ' +
    'cross join unnest(user_properties) as user_properties ' +
    
    'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
    'and format_date("%Y%m%d", current_date()) ' +
    'and user_properties.key not in (' + keyNotIn + ') ' +
    'group by user_properties.key ';

    // ***** ECOMMERCE *****
    if(queryEcom === 'Yes') {
      query += 'union all ' +

    'select ' +
    'item_params.key as parameter_name, ' +
    'count(item_params.key) as count, ' +
    '"ITEM" as scope ' +
    
    'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
    'unnest(items) as items, ' +
    'unnest(items.item_params) as item_params ' +
    
    'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
    'and format_date("%Y%m%d", current_date()) ' +
    'group by item_params.key ' +
      
      // *** STANDARD ITEMS
      // Ecommerce part for item_id
      'union all ' +

      'select ' +
      '"item_id" as parameter_name, ' +
      'countif(items.item_id is not null and trim(cast(items.item_id as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +

      'group by parameter_name ' +
      
      // Ecommerce part for item_name
      'union all ' +
    
      'select ' +
      '"item_name" as parameter_name, ' +
      'countif(items.item_name is not null and trim(cast(items.item_name as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +

      // Ecommerce part for item_brand
      'union all ' +
    
      'select ' +
      '"item_brand" as parameter_name, ' +
      'countif(items.item_brand is not null and trim(cast(items.item_name as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +
      
      // Ecommerce part for item_variant
      'union all ' +
    
      'select ' +
      '"item_variant" as parameter_name, ' +
      'countif(items.item_variant is not null and trim(cast(items.item_variant as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +
      
      // Ecommerce part for item_category
      'union all ' +
    
      'select ' +
      '"item_category" as parameter_name, ' +
      'countif(items.item_category is not null and trim(cast(items.item_category as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +
      
      // Ecommerce part for item_category2
      'union all ' +
    
      'select ' +
      '"item_category2" as parameter_name, ' +
      'countif(items.item_category2 is not null and trim(cast(items.item_category2 as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +
      
      // Ecommerce part for item_category3
      'union all ' +
    
      'select ' +
      '"item_category3" as parameter_name, ' +
      'countif(items.item_category3 is not null and trim(cast(items.item_category3 as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +
      
      // Ecommerce part for item_category4
      'union all ' +
    
      'select ' +
      '"item_category4" as parameter_name, ' +
      'countif(items.item_category4 is not null and trim(cast(items.item_category4 as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +
      
      // Ecommerce part for item_category5
      'union all ' +
    
      'select ' +
      '"item_category5" as parameter_name, ' +
      'countif(items.item_category5 is not null and trim(cast(items.item_category5 as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +
      
      // Ecommerce part for price
      'union all ' +
    
      'select ' +
      '"price" as parameter_name, ' +
      'countif(items.price is not null and trim(cast(items.price as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +
      
      // Ecommerce part for quantity
      'union all ' +
    
      'select ' +
      '"quantity" as parameter_name, ' +
      'countif(items.quantity is not null and trim(cast(items.quantity as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +
      
      // Ecommerce part for coupon
      'union all ' +
    
      'select ' +
      '"coupon" as parameter_name, ' +
      'countif(items.coupon is not null and trim(cast(items.coupon as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +
      
      // Ecommerce part for affiliation
      'union all ' +
    
      'select ' +
      '"affiliation" as parameter_name, ' +
      'countif(items.affiliation is not null and trim(cast(items.affiliation as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +
      
      // Ecommerce part for location_id
      'union all ' +
    
      'select ' +
      '"location_id" as parameter_name, ' +
      'countif(items.location_id is not null and trim(cast(items.location_id as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +
      
      // Ecommerce part for item_list_id
      'union all ' +
    
      'select ' +
      '"item_list_id" as parameter_name, ' +
      'countif(items.item_list_id is not null and trim(cast(items.item_list_id as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +
      
      // Ecommerce part for item_list_name
      'union all ' +
    
      'select ' +
      '"item_list_name" AS parameter_name, ' +
      'countif(items.item_list_name is not null and trim(cast(items.item_list_name as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +
      
      // Ecommerce part for item_list_index
      'union all ' +
    
      'select ' +
      '"index" as parameter_name, ' +
      'countif(items.item_list_index is not null and trim(cast(items.item_list_index as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +
      
      // Ecommerce part for promotion_id
      'union all ' +
    
      'select ' +
      '"promotion_id" as parameter_name, ' +
      'countif(items.promotion_id is not null and trim(cast(items.promotion_id as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +
      
      // Ecommerce part for promotion_name
      'union all ' +
    
      'select ' +
      '"promotion_name" as parameter_name, ' +
      'countif(items.promotion_name is not null and trim(cast(items.promotion_name as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +
      
      // Ecommerce part for creative_name
      'union all ' +
    
      'select ' +
      '"creative_name" as parameter_name, ' +
      'countif(items.creative_name is not null and trim(cast(items.creative_name as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ' +
      
      // Ecommerce part for creative_slot
      'union all ' +
    
      'select ' +
      '"creative_slot" as parameter_name, ' +
      'countif(items.creative_slot is not null and trim(cast(items.creative_slot as string)) != "(not set)") as count, ' +
      '"ITEM" as scope ' +

      'from `' + bigQueryProjectID + '.' + bigQueryDataSetID + '.events_*`, ' +
      'unnest(items) as items ' +

      'where regexp_extract(_table_suffix, "[0-9]+") between format_date("%Y%m%d", date_sub(current_date(), interval ' + reportingPeriodStart + ' day)) ' +
      'and format_date("%Y%m%d", current_date()) ' +
      'group by parameter_name ';
    }

    const request = {
      query: query,
      useLegacySql: false
    };

    let queryResults = BigQuery.Jobs.query(request, bigQueryProjectID);
    const jobId = queryResults.jobReference.jobId;

    // Check on status of the Query Job.
    let sleepTimeMs = 500;
    while (!queryResults.jobComplete) {
      Utilities.sleep(sleepTimeMs);
      sleepTimeMs *= 2;
      queryResults = BigQuery.Jobs.getQueryResults(bigQueryProjectID, jobId);
    }

    // Get all the rows of results.
    let rows = queryResults.rows;
    while (queryResults.pageToken) {
      queryResults = BigQuery.Jobs.getQueryResults(bigQueryProjectID, jobId, {
        pageToken: queryResults.pageToken
      });
      rows = rows.concat(queryResults.rows);
    }

    if (!rows) {
      console.log('No rows returned.');
      return;
    }

    const helperSheet = ss.getSheetByName(helperGA4ParameterDataFromBigQueryTab);
    const numRows = helperSheet.getLastRow(); // The number of row to clear
    helperSheet.getRange(1, 1, numRows+1, helperSheet.getLastColumn()+1).clearContent();

    // Append the headers.
    const headers = queryResults.schema.fields.map(function(field) {
      return field.name;
    });
    helperSheet.appendRow(headers);

    // Append the results.
    const data = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i].f;
      data[i] = new Array(cols.length);
      for (let j = 0; j < cols.length; j++) {
        data[i][j] = cols[j].v;
      }
    }
    helperSheet.getRange(2, 1, rows.length, headers.length).setValues(data);
    
    const helperParameterRows = helperSheet.getRange(2, 1, rows.length, headers.length).getValues();
    
    const helperParameterData = [];
    helperParameterRows.forEach((row, index) => {
      if(row[1] > 0) {
        const helperParameter = {
          parameterName: row[0].trim(),
          count: row[1],
          scope: row[2].trim(),
          length: index
        }
        helperParameterData.push(helperParameter);
      }
    });


    parameterSheet.getRange(headerRowNumber+1, parameterCountColumn,parameterLastRow,1).clearContent();
    
    const sheetData = [];
    parameterRows.forEach((row, index) => {
      const helperParameter = {
        parameterName: row[parameterNameColumn-1].trim(),
        scope: row[parameterScopeColumn-1].trim(),
        length: index
      }
      sheetData.push(helperParameter);
    });

    const parameterData = [];
    const parameterDataDocumented = [];

    helperParameterData.forEach((data) => {
      parameterData.push(data);
      sheetData.forEach((sheetData) => {
        if(data.parameterName === sheetData.parameterName && data.scope === sheetData.scope) {
          parameterSheet.getRange(sheetData.length+headerRowNumber+1,parameterCountColumn).setValue(data.count);
          parameterDataDocumented.push(data);
        }
      });
    });

    // Remove Parameters that are documented
    const unDocumentedParameters = parameterData.filter(parameter => !parameterDataDocumented.includes(parameter) && parameter !== "");

    // Add undocumented Parameters to the end of the Parameters Sheet
    unDocumentedParameters.forEach((unDocumentedParameters,index) => {
      parameterSheet.getRange(parameterLastRow+1+index,parameterNameColumn).setValue(unDocumentedParameters.parameterName.trim());
      parameterSheet.getRange(parameterLastRow+1+index,parameterScopeColumn).setValue(unDocumentedParameters.scope.trim());
      parameterSheet.getRange(parameterLastRow+1+index,parameterCountColumn).setValue(unDocumentedParameters.count);
  });

  }catch(err){
    Logger.log('getGA4ParameterDataFromBigQuery: '+err.stack);
    SpreadsheetApp.getUi().alert('getGA4ParameterDataFromBigQuery: \n' + err.stack);
  }
}
