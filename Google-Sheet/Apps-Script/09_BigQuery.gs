/**
 * Copyright 2025 Knowit Experience Oslo
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
  const bqSettingsSchema = {
    fields: [
      {name: 'events_exclusion', type: 'STRING'},
      {name: 'parameters_exclusion', type: 'STRING'},
      {name: 'ep_day_interval_short', type: 'INT64'},
      {name: 'ep_day_interval_extended', type: 'INT64'},
      {name: 'ep_delete_event_count_after_days', type: 'INT64'},
      {name: 'anomaly_day_interval_short', type: 'INT64'},
      {name: 'anomaly_day_interval_extended', type: 'INT64'},
      {name: 'anomaly_days_before_anomaly_detection', type: 'INT64'},
      {name: 'anomaly_day_interval_large', type: 'INT64'},
      {name: 'anomaly_delete_anomaly_data_after_days', type: 'INT64'},
      {name: 'anomaly_day_interval_new_events_params', type: 'INT64'},
      {name: 'anomaly_stddev_model_setting', type: 'STRING'},
      {name: 'anomaly_min_expected_count', type: 'INT64'},
      {name: 'anomaly_stddev_multiplier', type: 'FLOAT64'},
      {name: 'anomaly_events_explained_by_sessions_threshold', type: 'FLOAT64'},
      {name: 'anomaly_parameters_explained_by_sessions_threshold', type: 'FLOAT64'},
      {name: 'events_anomaly_exclusion', type: 'STRING'}
    ]
  };

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
      {name: 'parameter_uploaded_to_bq_time', type: 'DATETIME'},
      {name: 'parameter_web', type: 'BOOL'},
      {name: 'parameter_ios', type: 'BOOL'},
      {name: 'parameter_android', type: 'BOOL'}
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
  } else if (sheetName === 'BigQuerySettings') {
    return bqSettingsSchema;
  } else {
    // Handle the case where sheetName doesn't match any known schema
    throw new Error(`Unknown sheetName: ${sheetName}`);
  }
}

function buildReport(rows, sheetName) {
  const report = [];

if (sheetName === 'BigQuerySettings') {
    // Process BigQuerySettings data
    rows.forEach(row => {
      const eventsExclusion = row[0]?.trim() || '';
      const parametersExclusion = row[1]?.trim() || '';
      const epDayIntervalShort = row[2]?.trim() || '';
      const epDayIntervalExtended = row[3]?.trim() || '';
      const epDeleteEventCountAfterDays = row[4]?.trim() || '';
      const anomalyDayIntervalShort = row[5]?.trim() || '';
      const anomalyDayIntervalExtended = row[6]?.trim() || '';
      const anomalyDaysBeforeAnomalyDetection = row[7]?.trim() || '';
      const anomalyDayIntervalLarge = row[8]?.trim() || '';
      const anomalyDeleteAnomalyDataAfterDays = row[9]?.trim() || '';
      const anomalyDayIntervalNewEventsParams = row[10]?.trim() || '';
      const anomalyStddevModelSetting = row[11]?.trim() || '';
      const anomalyMinExpectedCount = row[12]?.trim() || '';
      const anomalyStddevMultiplier = row[13]?.trim() || '';
      const anomalyEventsExplainedBySessionsThreshold = row[14]?.trim() || '';
      const anomalyParametersExplainedBySessionsThreshold = row[15]?.trim() || '';

      report.push([eventsExclusion, parametersExclusion, epDayIntervalShort, epDayIntervalExtended, epDeleteEventCountAfterDays, anomalyDayIntervalShort, anomalyDayIntervalExtended, anomalyDaysBeforeAnomalyDetection, anomalyDayIntervalLarge, anomalyDeleteAnomalyDataAfterDays, anomalyDayIntervalNewEventsParams, anomalyStddevModelSetting, anomalyMinExpectedCount, anomalyStddevMultiplier, anomalyEventsExplainedBySessionsThreshold, anomalyParametersExplainedBySessionsThreshold]);
    });
  } else  if (sheetName === eventTab) {
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
      const event_website = rows[i][eventPlatformWebsiteColumn-1] ? true : false;
      const event_ios_app = rows[i][eventPlatformIosColumn-1] ? true : false;
      const event_android_app = rows[i][eventPlatformAndroidColumn-1] ? true : false;
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
        parameterWeb: row[parameterPlatformWebsiteColumn-1] ? true : false,
        parameterIos: row[parameterPlatformIosColumn-1] ? true : false,
        parameterAndroid: row[parameterPlatformAndroidColumn-1] ? true : false
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
            const parameter_web = sheetData.parameterWeb;
            const parameter_ios = sheetData.parameterIos;
            const parameter_android = sheetData.parameterAndroid;

            if(parameter_group && parameter_display_name && parameter_name && parameter_description  && (parameter_web || parameter_ios || parameter_android)) {
              report.push([
                parameter_group,parameter_display_name,parameter_name,parameter_scope,parameter_type,parameter_format,parameter_disallow_ads_personalization,parameter_example_value,parameter_description,parameter_ga4_api_resource_name,parameter_gtm_comment,parameter_uploaded_to_bq_time, parameter_web, parameter_ios, parameter_android
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

function uploadBigQuerySettingsToBigQuery() {
  const projectId = bigQueryProjectID;
  const datasetId = bigQueryDataSetID;
  const tableId = 'ga4_documentation_bq_settings';
  const bqSettingsData = [
    [
      ss.getSheetByName(settingsTab).getRange('SettingsBigQueryExcludeEvents').getValue().trim(),
      ss.getSheetByName(settingsTab).getRange('SettingsBigQueryExcludeParams').getValue().trim(),
      ss.getSheetByName(bigQuerySettingsTab).getRange('BQSettingsEPDayIntervalShort').getValue().trim(),
      ss.getSheetByName(bigQuerySettingsTab).getRange('BQSettingsEPDayIntervalExtended').getValue().trim(),
      ss.getSheetByName(bigQuerySettingsTab).getRange('BQSettingsEPDeleteEventCountAfterDays').getValue().trim(),
      ss.getSheetByName(bigQuerySettingsTab).getRange('BQSettingsAnomalyDayIntervalShort').getValue().trim(),
      ss.getSheetByName(bigQuerySettingsTab).getRange('BQSettingsAnomalyDayIntervalExtended').getValue().trim(),
      ss.getSheetByName(bigQuerySettingsTab).getRange('BQSettingsAnomalyDaysBeforeAnomalyDetection').getValue().trim(),
      ss.getSheetByName(bigQuerySettingsTab).getRange('BQSettingsAnomalyDayIntervalLarge').getValue().trim(),
      ss.getSheetByName(bigQuerySettingsTab).getRange('BQSettingsAnomalyDeleteDataAfterDays').getValue().trim(),
      ss.getSheetByName(bigQuerySettingsTab).getRange('BQSettingsAnomalyDayIntervalNewEventsParams').getValue().trim(),
      ss.getSheetByName(bigQuerySettingsTab).getRange('BQSettingsAnomalyStddevModelSetting').getValue().trim(),
      ss.getSheetByName(bigQuerySettingsTab).getRange('BQSettingsAnomalyMinExpectedCount').getValue().trim(),
      ss.getSheetByName(bigQuerySettingsTab).getRange('BQSettingsAnomalyStddevMultiplier').getValue().trim(),
      ss.getSheetByName(bigQuerySettingsTab).getRange('BQSettingsAnomalyEventsExplainedBySessionsThreshold').getValue().trim(),
      ss.getSheetByName(bigQuerySettingsTab).getRange('BQSettingsAnomalyParametersExplainedBySessionsThreshold').getValue().trim(),
      ss.getSheetByName(bigQuerySettingsTab).getRange('BQSettingsExcludeEvents').getValue().trim()
    ]
  ];

  try {
    // Convert exclusions data to CSV
    const csvRows = bqSettingsData.map(row => row.map(value => JSON.stringify(value)).join(','));
    const csvData = csvRows.join('\n');
    const blob = Utilities.newBlob(csvData, 'application/octet-stream');

    // BigQuery job configuration
    const job = {
      configuration: {
        load: {
          destinationTable: {
            projectId: projectId,
            datasetId: datasetId,
            tableId: tableId
          },
          schema: getTableSchema('BigQuerySettings'),
          writeDisposition: 'WRITE_TRUNCATE'
        }
      }
    };

    // Upload to BigQuery
    BigQuery.Jobs.insert(job, projectId, blob);
    Logger.log('BigQuerySettings uploaded to BigQuery successfully.');
  } catch (err) {
    Logger.log('BigQuery: ' + err.stack);
    SpreadsheetApp.getUi().alert('Failed to upload exclusions to BigQuery:\n' + err.message);
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

  uploadBigQuerySettingsToBigQuery();

  uploadParametersToBigQuery(manualBQTrigger);

  if (!tableId && manualBQTrigger) {
    SpreadsheetApp.getUi().alert('BigQuerySettings are not filled out, nothing was uploaded to BigQuery.');
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

    // Date variables
    const timeZone = Session.getScriptTimeZone();
    const today = new Date();
    const todayDate = Utilities.formatDate(today, timeZone, 'yyyyMMdd');
    const yesterday = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);
    const yesterdayDate = Utilities.formatDate(yesterday, timeZone, 'yyyyMMdd');
    const startDate = Utilities.formatDate(new Date(today.getTime() - (reportingPeriodStart) * 24 * 60 * 60 * 1000), timeZone, 'yyyyMMdd');
  
    // Get the list of events to exclude
    let eventNotIn = ss.getSheetByName(settingsTab)
      .getRange('SettingsBigQueryExcludeEvents')
      .getValue()
      .replace(/\s+/g, '')
      .split(',');

    // Convert the array to a comma-separated string with quotes around each event
    eventNotIn = eventNotIn.map(event => `'${event}'`).join(',');

    // Step 1: Check if `events_fresh_*` exists for today
    const dailyFreshCheckQuery = `
      select count(1) as table_exists
      from \`${bigQueryProjectID}.${bigQueryDataSetID}.__TABLES_SUMMARY__\`
      where table_id like 'events_fresh_%'
    `;
    const dailyFreshCheckRequest = {
      query: dailyFreshCheckQuery,
      useLegacySql: false
    };
    const dailyFreshCheckResults = BigQuery.Jobs.query(dailyFreshCheckRequest, bigQueryProjectID);
    const dailyFreshExists = parseInt(dailyFreshCheckResults.rows[0].f[0].v) > 0;

    // Step 2: Check if `events_intraday_*` exists for today
    const intradayCheckQuery = `
      select count(1) as table_exists
      from \`${bigQueryProjectID}.${bigQueryDataSetID}.__TABLES_SUMMARY__\`
      where table_id like 'events_intraday_%'
    `;
    const intradayCheckRequest = {
      query: intradayCheckQuery,
      useLegacySql: false
    };
    const intradayCheckResults = BigQuery.Jobs.query(intradayCheckRequest, bigQueryProjectID);
    const intradayExists = parseInt(intradayCheckResults.rows[0].f[0].v) > 0;
    

    // Step 3: Check if `events_*` exists for yesterday
    const eventsYesterdayCheckQuery = `
      select count(1) as table_exists
      from \`${bigQueryProjectID}.${bigQueryDataSetID}.__TABLES_SUMMARY__\`
      where table_id = 'events_${yesterdayDate}'
    `;
    const eventsYesterdayCheckRequest = {
      query: eventsYesterdayCheckQuery,
      useLegacySql: false
    };
    const eventsYesterdayCheckResults = BigQuery.Jobs.query(eventsYesterdayCheckRequest, bigQueryProjectID);
    const eventsYesterdayExists = parseInt(eventsYesterdayCheckResults.rows[0].f[0].v) > 0;

    // Step 4: Construct the main query based on table existence
    let mainQuery = '';

    if (dailyFreshExists) {
      // Query `events_fresh_*` from `startDate` to `todayDate`
      mainQuery += `
        select event_name, count(event_name) as event_count, platform
        from \`${bigQueryProjectID}.${bigQueryDataSetID}.events_fresh_*\`
        where _table_suffix between '${startDate}' and '${todayDate}'
          and event_name not in (${eventNotIn})
        group by event_name, platform
      `;
    } else {
      // Query `events_*` from `startDate` to `yesterdayDate`
      mainQuery += `
        select combined_events.event_name, sum(combined_events.event_count) as event_count, combined_events.platform
        from (
          select event_name, count(event_name) as event_count, platform
          from \`${bigQueryProjectID}.${bigQueryDataSetID}.events_*\`
          where _table_suffix between '${startDate}' and '${yesterdayDate}'
            and event_name not in (${eventNotIn})
          group by event_name, platform
      `;
      
      if (intradayExists) {
        const intraDayStartDate = eventsYesterdayExists ? todayDate : yesterdayDate;
          mainQuery += `
            union all
            select event_name, count(event_name) as event_count, platform
            from \`${bigQueryProjectID}.${bigQueryDataSetID}.events_intraday_*\`
            where _table_suffix between '${intraDayStartDate}' and '${todayDate}'
              and event_name not in (${eventNotIn})
            group by event_name, platform
          `;
      }
     mainQuery += `) as combined_events 
      group by combined_events.event_name, combined_events.platform`; 
    }

    // Step 4: Execute the main query
    const mainRequest = {
      query: mainQuery,
      useLegacySql: false
    };

    let queryResults = BigQuery.Jobs.query(mainRequest, bigQueryProjectID);
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
      Loger.log('No rows returned.');
      return;
    }

  // Helper sheet for events
const helperSheet = ss.getSheetByName(helperGA4EventDataFromBigQueryTab);
  const numRows = helperSheet.getLastRow();
  const numCols = helperSheet.getLastColumn();
  if (numRows > 0 && numCols > 0) {
    helperSheet.getRange(1, 1, numRows, numCols).clearContent();
  }

  // Append headers
  const headers = queryResults.schema.fields.map(field => field.name);
  helperSheet.appendRow(headers);

  // Append BigQuery data
  if (rows.length > 0) {
    const data = rows.map(r => r.f.map(c => c.v));
    helperSheet.getRange(2, 1, data.length, headers.length).setValues(data);
  }

  // Get all event data from the helper sheet
  const helperEventRows = (rows.length > 0) 
    ? helperSheet.getRange(2, 1, rows.length, headers.length).getValues() 
    : [];

  // Build helperEventData
  const helperEventData = helperEventRows.map((row, index) => ({
    eventName: row[0].trim(),
    eventCount: row[1],
    platform: row[2],
    length: index
  }));

  // Get existing events from the event sheet
  // Instead of relying on eventCount from a column, read all data rows and use their length directly.
  const totalRows = eventSheet.getLastRow();
  let eventDataRange;
  if (totalRows > headerRowNumber) {
    eventDataRange = eventSheet.getRange(headerRowNumber+1, 1, totalRows - headerRowNumber, eventSheet.getLastColumn());
  } else {
    // No data rows
    eventDataRange = eventSheet.getRange(headerRowNumber+1, 1, 0, eventSheet.getLastColumn());
  }
  const eventRows = eventDataRange.getValues().filter(r => r.join('').trim() !== '');
  
  // sheetData for documented events
  const sheetData = eventRows.map((row, index) => ({
    eventName: row[eventNameColumn - 1].trim(),
    checkbox: row[eventEditCheckboxColumn - 1],
    length: index // zero-based
  }));

  // Clear old counts
  if (sheetData.length > 0) {
    eventSheet.getRange(headerRowNumber+1, eventEventCountColumn, sheetData.length, 1).clearContent();
  }

  // Build eventPlatformMap
  const eventPlatformMap = {};
  helperEventData.forEach((data) => {
    const { eventName, eventCount, platform } = data;
    if (!eventPlatformMap[eventName]) {
      eventPlatformMap[eventName] = {
        platforms: new Set(),
        eventCount: 0
      };
    }
    eventPlatformMap[eventName].eventCount += eventCount;
    eventPlatformMap[eventName].platforms.add(platform);
  });

  // Create a quick lookup for existing events on the sheet
  const sheetDataMap = {};
  sheetData.forEach(sd => {
    sheetDataMap[sd.eventName] = sd;
  });

  const eventDataDocumented = [];

  // We will update counts and checkboxes in bulk. First, create arrays for them.
  const countValues = (sheetData.length > 0) 
    ? eventSheet.getRange(headerRowNumber+1, eventEventCountColumn, sheetData.length, 1).getValues()
    : [];
  
  const webValues = (sheetData.length > 0)
    ? eventSheet.getRange(headerRowNumber+1, eventPlatformWebsiteColumn, sheetData.length, 1).getValues()
    : [];
  
  const iosValues = (sheetData.length > 0)
    ? eventSheet.getRange(headerRowNumber+1, eventPlatformIosColumn, sheetData.length, 1).getValues()
    : [];
  
  const androidValues = (sheetData.length > 0)
    ? eventSheet.getRange(headerRowNumber+1, eventPlatformAndroidColumn, sheetData.length, 1).getValues()
    : [];

  // Insert checkboxes for all rows if needed (only if we know all or most rows need them)
  // This avoids overwriting event names. Make sure these columns are not the event name column.
  if (sheetData.length > 0) {
    eventSheet.getRange(headerRowNumber+1, eventPlatformWebsiteColumn, sheetData.length, 1).insertCheckboxes();
    eventSheet.getRange(headerRowNumber+1, eventPlatformIosColumn, sheetData.length, 1).insertCheckboxes();
    eventSheet.getRange(headerRowNumber+1, eventPlatformAndroidColumn, sheetData.length, 1).insertCheckboxes();
  }

  // Update documented events
  Object.keys(eventPlatformMap).forEach((eventName) => {
    const rowData = sheetDataMap[eventName];
    if (rowData) {
      const rowIndex = rowData.length; // zero-based index in sheetData
      const { eventCount, platforms } = eventPlatformMap[eventName];

      // Set event count
      countValues[rowIndex][0] = eventCount;

      // Set checkbox values if needed
      if (rowData.checkbox) {
        webValues[rowIndex][0] = platforms.has('WEB');
        iosValues[rowIndex][0] = platforms.has('IOS');
        androidValues[rowIndex][0] = platforms.has('ANDROID');
      }

      eventDataDocumented.push(eventName);
    }
  });

  // Write updated values back to the sheet in bulk
  if (sheetData.length > 0) {
    eventSheet.getRange(headerRowNumber+1, eventEventCountColumn, sheetData.length, 1).setValues(countValues);
    eventSheet.getRange(headerRowNumber+1, eventPlatformWebsiteColumn, sheetData.length, 1).setValues(webValues);
    eventSheet.getRange(headerRowNumber+1, eventPlatformIosColumn, sheetData.length, 1).setValues(iosValues);
    eventSheet.getRange(headerRowNumber+1, eventPlatformAndroidColumn, sheetData.length, 1).setValues(androidValues);
  }

  // Handle undocumented events
  // Find unique event names in helperEventData that are not documented
  const allEventNames = [...new Set(helperEventData.map(e => e.eventName))];
  const undocumentedEvents = allEventNames.filter(name => !eventDataDocumented.includes(name));

  if (undocumentedEvents.length > 0) {
    const undocumentedStartRow = headerRowNumber + sheetData.length + 1;
    // Insert undocumented events
    undocumentedEvents.forEach((eventName, i) => {
      const { eventCount, platforms } = eventPlatformMap[eventName] || { eventCount: 0, platforms: new Set() };
      const row = undocumentedStartRow + i;
      eventSheet.getRange(row, eventNameColumn).setValue(eventName);
      eventSheet.getRange(row, eventEventCountColumn).setValue(eventCount);

      // Insert checkboxes for these new rows
      eventSheet.getRange(row, eventPlatformWebsiteColumn).insertCheckboxes();
      eventSheet.getRange(row, eventPlatformIosColumn).insertCheckboxes();
      eventSheet.getRange(row, eventPlatformAndroidColumn).insertCheckboxes();

      // Set values
      eventSheet.getRange(row, eventPlatformWebsiteColumn).setValue(platforms.has('WEB'));
      eventSheet.getRange(row, eventPlatformIosColumn).setValue(platforms.has('IOS'));
      eventSheet.getRange(row, eventPlatformAndroidColumn).setValue(platforms.has('ANDROID'));
    });
  }

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

// Step 2: Check if events_intraday_* exists
const intradayCheckQuery = `
  select count(1) as table_exists
  from \`${bigQueryProjectID}.${bigQueryDataSetID}.__TABLES_SUMMARY__\`
  where table_id like 'events_intraday_%'
`;
const intradayCheckRequest = {
  query: intradayCheckQuery,
  useLegacySql: false
};
const intradayCheckResults = BigQuery.Jobs.query(intradayCheckRequest, bigQueryProjectID);
const intradayExists = intradayCheckResults.rows[0].f[0].v > 0;

// Step 3: Check if events_fresh_* exists
const dailyFreshCheckQuery = `
  select count(1) as table_exists
  from \`${bigQueryProjectID}.${bigQueryDataSetID}.__TABLES_SUMMARY__\`
  where table_id like 'events_fresh_%'
`;
const dailyFreshCheckRequest = {
  query: dailyFreshCheckQuery,
  useLegacySql: false
};
const dailyFreshCheckResults = BigQuery.Jobs.query(dailyFreshCheckRequest, bigQueryProjectID);
const dailyFreshExists = dailyFreshCheckResults.rows[0].f[0].v > 0;

// Step 4: Check if yesterday's `events_*` table exists
const yesterdayDate = Utilities.formatDate(
  new Date(new Date().getTime() - 24 * 60 * 60 * 1000),
  Session.getScriptTimeZone(),
  'yyyyMMdd'
);
const yesterdayTableCheckQuery = `
  select count(1) as table_exists
  from \`${bigQueryProjectID}.${bigQueryDataSetID}.__TABLES_SUMMARY__\`
  where table_id = 'events_${yesterdayDate}'
`;
const yesterdayTableCheckRequest = {
  query: yesterdayTableCheckQuery,
  useLegacySql: false
};
const yesterdayTableCheckResults = BigQuery.Jobs.query(yesterdayTableCheckRequest, bigQueryProjectID);
const yesterdayTableExists = yesterdayTableCheckResults.rows[0].f[0].v > 0;

// Step 5: Determine the tables to use
const dailyTable = dailyFreshExists ? 'events_fresh_*' : 'events_*';

// Define itemFields at a higher scope
const itemFields = [
  'item_id',
  'item_name',
  'item_brand',
  'item_variant',
  'item_category',
  'item_category2',
  'item_category3',
  'item_category4',
  'item_category5',
  'price',
  'quantity',
  'coupon',
  'affiliation',
  'location_id',
  'item_list_id',
  'item_list_name',
  'item_list_index',
  'promotion_id',
  'promotion_name',
  'creative_name',
  'creative_slot'
];

// Step 5: Build the main query
let querySegments = [];

// Date conditions
const dailyTablePeriod = dailyFreshExists
  ? `_table_suffix between format_date('%Y%m%d', date_sub(current_date(), interval ${reportingPeriodStart} day)) and format_date('%Y%m%d', current_date())`
  : `_table_suffix between format_date('%Y%m%d', date_sub(current_date(), interval ${reportingPeriodStart} day)) and format_date('%Y%m%d', date_sub(current_date(), interval 1 day))`;

const intraDayTablePeriod = yesterdayTableExists
  ? `_table_suffix = format_date('%Y%m%d', current_date())`
  : `_table_suffix = format_date('%Y%m%d', date_sub(current_date(), interval 1 day))` ;

// Step 1: Retrieve and parse excluded keys
// -----------------------------------------------------------------------------

// Get the raw string from your spreadsheet
let rawExcludeString = ss
  .getSheetByName(settingsTab)
  .getRange('SettingsBigQueryExcludeParams')
  .getValue();

/**
 * Parses the raw exclude string into two structures:
 * - globalExclusions: an array of param names to exclude from ALL scopes
 * - scopeExclusions: an object { EVENT: [], USER: [], ITEMS: [] } with param arrays
 *
 * Example rawExcludeString: "param1, param2, param3|EVENT, param4"
 */
function parseExcludedKeys(rawInput) {
  // If rawInput is null or empty, let's just return empty arrays
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      globalExclusions: [],
      scopeExclusions: { EVENT: [], USER: [], ITEMS: [] }
    };
  }

  // Remove whitespace, then split on commas
  let parts = rawInput.replace(/\s+/g, '').split(',');

  // Prepare data structures
  let globalExclusions = [];
  let scopeExclusions = {
    EVENT: [],
    USER: [],
    ITEMS: []
  };

  // Process each item, looking for "param|SCOPE"
  parts.forEach(item => {
    let [param, maybeScope] = item.split('|');

    // Make sure the param is a non-empty string
    if (!param) {
      return; // skip if empty
    }

    if (maybeScope) {
      let scope = maybeScope.trim().toUpperCase();
      // If recognized scope, add param to that scope
      if (scopeExclusions[scope] !== undefined) {
        scopeExclusions[scope].push(param.trim());
      } else {
        // If scope is unrecognized, treat param as global
        globalExclusions.push(param.trim());
      }
    } else {
      // No scope => global
      globalExclusions.push(param.trim());
    }
  });

  return { globalExclusions, scopeExclusions };
}

// Parse them into two variables
let { globalExclusions, scopeExclusions } = parseExcludedKeys(rawExcludeString);

// Log them to confirm they're arrays
Logger.log('globalExclusions = %s', globalExclusions);
Logger.log('scopeExclusions = %s', scopeExclusions);

// -----------------------------------------------------------------------------
// Step 2: Build the "NOT IN" clause
// -----------------------------------------------------------------------------
function buildExclusionClause(keyField, scope, globalExclusions, scopeExclusions) {
  // If for some reason globalExclusions is null, force it to empty array
  if (!globalExclusions) {
    globalExclusions = [];
  }

  // Create a new array from globalExclusions
  let combined = globalExclusions.slice();

  // Merge scopeExclusions if that scope array is defined
  if (scopeExclusions[scope] && scopeExclusions[scope].length > 0) {
    combined = combined.concat(scopeExclusions[scope]);
  }

  // If there's nothing to exclude, return an empty string
  if (combined.length === 0) {
    return '';
  }

  // Build the "'param1','param2','param3'..." string
  let quotedList = combined.map(x => `'${x}'`).join(',');

  // Return the final "AND keyField NOT IN (...)" snippet
  return `and ${keyField} not in (${quotedList})`;
}

// -----------------------------------------------------------------------------
// Step 3a: Build query segments for EVENT scope
// -----------------------------------------------------------------------------
function buildQuerySegment(
  tableName,
  dateCondition,
  scope,
  crossJoinClause,
  keyField,
  globalExclusions,
  scopeExclusions
) {
  // Get the appropriate exclusion clause
  let exclusionClause = buildExclusionClause(
    keyField,
    scope,
    globalExclusions,
    scopeExclusions
  );

  return `
    select
      ${keyField} as parameter_name,
      count(${keyField}) as count,
      "${scope}" as scope,
      platform
    from \`${bigQueryProjectID}.${bigQueryDataSetID}.${tableName}\`
    ${crossJoinClause}
    where ${dateCondition}
      ${exclusionClause}
    group by parameter_name, scope, platform
  `;
}

// -----------------------------------------------------------------------------
// Step 3b: Build query segments for USER scope (user_properties)
// -----------------------------------------------------------------------------
function buildUserPropertiesQuerySegment(
  tableName,
  dateCondition,
  globalExclusions,
  scopeExclusions
) {
  let scope = 'USER';
  let keyField = 'user_properties.key';

  let exclusionClause = buildExclusionClause(
    keyField,
    scope,
    globalExclusions,
    scopeExclusions
  );

  return `
    select
      ${keyField} as parameter_name,
      count(${keyField}) as count,
      "${scope}" as scope,
      platform
    from \`${bigQueryProjectID}.${bigQueryDataSetID}.${tableName}\`
    cross join unnest(user_properties) as user_properties
    where ${dateCondition}
      ${exclusionClause}
    group by parameter_name, scope, platform
  `;
}

// -----------------------------------------------------------------------------
// Step 4: Build final query segments
// -----------------------------------------------------------------------------
querySegments.push(
  buildQuerySegment(
    dailyTable,
    dailyTablePeriod,
    'EVENT',
    'cross join unnest(event_params) as event_params',
    'event_params.key',
    globalExclusions,
    scopeExclusions
  )
);

if (intradayExists && !dailyFreshExists) {
  querySegments.push(
    buildQuerySegment(
      'events_intraday_*',
      intraDayTablePeriod,
      'EVENT',
      'cross join unnest(event_params) as event_params',
      'event_params.key',
      globalExclusions,
      scopeExclusions
    )
  );
}

querySegments.push(
  buildUserPropertiesQuerySegment(
    dailyTable,
    dailyTablePeriod,
    globalExclusions,
    scopeExclusions
  )
);

if (intradayExists && !dailyFreshExists) {
  querySegments.push(
    buildUserPropertiesQuerySegment(
      'events_intraday_*',
      intraDayTablePeriod,
      globalExclusions,
      scopeExclusions
    )
  );
}

// Function to build query segments for item fields
function buildItemFieldsQuerySegment(tableName, dateCondition, field) {
  return `
    select
      "${field}" as parameter_name,
      countif(items.${field} is not null and trim(cast(items.${field} as string)) != "(not set)") as count,
      "ITEM" as scope,
      platform
    from \`${bigQueryProjectID}.${bigQueryDataSetID}.${tableName}\`,
    unnest(items) as items
    where ${dateCondition}
    group by parameter_name, scope, platform
  `;
}

// Build query segments for item parameters (ITEM scope)
if (queryEcom === 'Yes') {
  // Build item parameter queries
  querySegments.push(
    buildQuerySegment(
      dailyTable,
      dailyTablePeriod,
      'ITEM',
      ', unnest(items) as items, unnest(items.item_params) as item_params',
      'item_params.key',
      globalExclusions,
      scopeExclusions
    )
  );

  // Add query segments for each field in itemFields
  itemFields.forEach(field => {
    querySegments.push(buildItemFieldsQuerySegment(dailyTable, dailyTablePeriod, field));
  });
}

// Handle intraday item parameters if intraday tables exist
if (intradayExists && !dailyFreshExists) {
  // Build item parameter queries for intraday tables
  querySegments.push(
    buildQuerySegment(
      'events_intraday_*',
      intraDayTablePeriod,
      'ITEM',
      ', unnest(items) as items, unnest(items.item_params) as item_params',
      'item_params.key',
      globalExclusions,
      scopeExclusions
    )
  );

  // Add query segments for each field in itemFields for intraday tables
  itemFields.forEach(field => {
    querySegments.push(buildItemFieldsQuerySegment('events_intraday_*', intraDayTablePeriod, field));
  });
  
}
// Filter and join query segments for dailyTable and events_intraday_*
const dailySegments = querySegments
  .filter(segment => segment.includes(dailyTable))
  .join(' union all ');

const intradaySegments = querySegments
  .filter(segment => segment.includes('events_intraday_*'))
  .join(' union all ');

// Build the final query, ensuring no stray union all
const combinedSegments = [dailySegments, intradaySegments]
  .filter(segment => segment.trim() !== '') // Only include non-empty segments
  .join(' union all ');

// Final query
const unionQuery = `
  select
    parameter_name,
    sum(count) as total_count,
    scope,
    platform
  from (
    ${combinedSegments}
  ) as combined_events
  group by parameter_name, scope, platform;
`;

// Execute the final query
const mainRequest = {
  query: unionQuery,
  useLegacySql: false
};

let queryResults = BigQuery.Jobs.query(mainRequest, bigQueryProjectID);
const jobId = queryResults.jobReference.jobId;

// **Check on status of the Query Job.**
let sleepTimeMs = 500;
while (!queryResults.jobComplete) {
  Utilities.sleep(sleepTimeMs);
  sleepTimeMs *= 2;
  queryResults = BigQuery.Jobs.getQueryResults(bigQueryProjectID, jobId);
}

// **Get all the rows of results.**
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
  // Clear helperSheet
  const numRows = helperSheet.getLastRow();
  helperSheet.getRange(1, 1, Math.max(numRows,1), helperSheet.getLastColumn() || 1).clearContent();

  // Append headers from queryResults
  const headers = queryResults.schema.fields.map(field => field.name);
  helperSheet.appendRow(headers);

  // Append query results data
  if (rows.length > 0) {
    const data = rows.map(r => r.f.map(c => c.v));
    helperSheet.getRange(2, 1, data.length, headers.length).setValues(data);
  }

  // Read helper parameter rows
  const helperParameterRows = helperSheet.getRange(2, 1, rows.length, headers.length).getValues();
  
  // Build helperParameterData from helperParameterRows
  const helperParameterData = [];
  helperParameterRows.forEach((row, index) => {
    if (row[1] > 0) {
      helperParameterData.push({
        parameterName: row[0].trim(),
        count: row[1],
        scope: row[2].trim(),
        platform: row[3],
        length: index
      });
    }
  });

  // Build sheetData from parameterRows
  const sheetData = parameterRows.map((row, index) => {
    return {
      parameterName: row[parameterNameColumn-1].trim(),
      scope: row[parameterScopeColumn-1].trim(),
      checkbox: row[parameterEditCheckboxColumn-1],
      length: index
    };
  });

  // Clear old counts
  parameterSheet.getRange(headerRowNumber+1, parameterCountColumn, parameterLastRow, 1).clearContent();

  // Build parameterPlatformMap
  const parameterPlatformMap = {};
  helperParameterData.forEach((data) => {
    const key = `${data.parameterName}::${data.scope}`;
    if (!parameterPlatformMap[key]) {
      parameterPlatformMap[key] = {
        platforms: new Set(),
        parameterCount: 0
      };
    }
    parameterPlatformMap[key].parameterCount += data.count;
    parameterPlatformMap[key].platforms.add(data.platform);
  });

  // Create a lookup map for sheetData to avoid nested loops
  const sheetDataMap = {};
  sheetData.forEach((sd) => {
    const key = `${sd.parameterName}::${sd.scope}`;
    sheetDataMap[key] = sd;
  });

  // We'll track documented parameters and also build arrays for bulk operations
  const parameterData = [];
  const parameterDataDocumented = [];

  // Process documented parameters
  helperParameterData.forEach((data) => {
    parameterData.push(data);
    const key = `${data.parameterName}::${data.scope}`;
    const aggregatedData = parameterPlatformMap[key];
    const rowData = sheetDataMap[key];

    if (rowData) {
      const rowIndex = rowData.length + headerRowNumber + 1; // Sheet row index

      // Set count
      parameterSheet.getRange(rowIndex, parameterCountColumn).setValue(aggregatedData.parameterCount);

      // Handle checkboxes if needed
      if (rowData.checkbox) {
        const webCell = parameterSheet.getRange(rowIndex, parameterPlatformWebsiteColumn);
        const iosCell = parameterSheet.getRange(rowIndex, parameterPlatformIosColumn);
        const androidCell = parameterSheet.getRange(rowIndex, parameterPlatformAndroidColumn);

        // Insert checkboxes and set values
        webCell.insertCheckboxes();
        iosCell.insertCheckboxes();
        androidCell.insertCheckboxes();

        const platforms = aggregatedData.platforms;
        // Set checkbox states
        if (platforms.has('WEB')) webCell.check(); else webCell.uncheck();
        if (platforms.has('IOS')) iosCell.check(); else iosCell.uncheck();
        if (platforms.has('ANDROID')) androidCell.check(); else androidCell.uncheck();
      }

      parameterDataDocumented.push(data);
    }
  });

 // 1) Identify *all* undocumented parameters.
const unDocumentedParameters = parameterData.filter(
  (param) => !parameterDataDocumented.includes(param) && param !== ""
);

// 2) Aggregate undocumented parameters by parameterName + scope:
const aggregatedUnDocumentedParams = {};

unDocumentedParameters.forEach((p) => {
  const key = `${p.parameterName}::${p.scope}`;

  if (!aggregatedUnDocumentedParams[key]) {
    aggregatedUnDocumentedParams[key] = {
      parameterName: p.parameterName,
      scope: p.scope,
      parameterCount: 0,        // or you could start with p.count if each p has a count
      platforms: new Set(),
    };
  }

  // Aggregate the count (if each p has .count)
  aggregatedUnDocumentedParams[key].parameterCount += p.count || 0;

  // Merge platforms
  if (p.platform) {
    aggregatedUnDocumentedParams[key].platforms.add(p.platform);
  }
});

// 3) Convert our map to an array so we can iterate and write to the sheet
const aggregatedList = Object.values(aggregatedUnDocumentedParams);

// 4) Add aggregated undocumented parameters to the end of the Parameter Sheet
aggregatedList.forEach((param, index) => {
  const row = parameterLastRow + 1 + index;

  parameterSheet
    .getRange(row, parameterNameColumn)
    .setValue(param.parameterName.trim());
  parameterSheet
    .getRange(row, parameterScopeColumn)
    .setValue(param.scope.trim());
  parameterSheet
    .getRange(row, parameterCountColumn)
    .setValue(param.parameterCount);

  // Insert checkboxes for each platform column
  const webCell = parameterSheet.getRange(row, parameterPlatformWebsiteColumn);
  const iosCell = parameterSheet.getRange(row, parameterPlatformIosColumn);
  const androidCell = parameterSheet.getRange(row, parameterPlatformAndroidColumn);

  webCell.insertCheckboxes();
  iosCell.insertCheckboxes();
  androidCell.insertCheckboxes();

  // Check/uncheck based on whether this param includes each platform
  webCell.setValue(param.platforms.has("WEB"));
  iosCell.setValue(param.platforms.has("IOS"));
  androidCell.setValue(param.platforms.has("ANDROID"));
});


  }catch(err){
    Logger.log('getGA4ParameterDataFromBigQuery: '+err.stack);
    SpreadsheetApp.getUi().alert('getGA4ParameterDataFromBigQuery: \n' + err.stack);
  }
}

/**
 * Deletes anomalies stored in BigQuery
 */
function deleteAnomalyFromBigQuery() {
  try {
    if (!bigQueryProjectID || !bigQueryDataSetID) {
      SpreadsheetApp.getUi().alert("BigQuery Project ID or Data Set ID is not set in Settings Sheet.");
      return;
    }

    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'You are about to delete Anomaly data from BigQuery. This permanently removes the data. Continue?',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return;
    }

    // 1) Set your GCP project & table details.
    const projectId = bigQueryProjectID;
    const datasetId = bigQueryDataSetID;
    const tableId = "ga4_documentation_anomaly_detection";

    // 2) Get references to Named Ranges in your sheet.
    const bqSettingsSheet = ss.getSheetByName(bigQuerySettingsTab);

    const tz = ss.getSpreadsheetTimeZone(); // Get the spreadsheet's time zone

    // Ranges for each column
    const rawDate = bqSettingsSheet.getRange("BQSettingsAnomalyDeleteDate").getValue(); 
    // Convert the date to BigQuery-compatible format
    const eventDate = Utilities.formatDate(new Date(rawDate), tz, "yyyy-MM-dd");

    // ----- CHANGED: Accept multiple event names (comma-separated) ------
    // For example, cell could contain: "my_event, my_other_event"
    const rawEventNames = bqSettingsSheet.getRange("BQSettingsAnomalyDeleteName").getValue();
    // Split, trim, and remove any empty entries
    const eventNamesArray = rawEventNames
      .split(",")
      .map(function(name) { return name.trim(); })
      .filter(function(name) { return name.length > 0; });

    // If the user typed zero valid event names, abort
    if (eventNamesArray.length === 0) {
      SpreadsheetApp.getUi().alert("No valid event names found. Aborting delete operation.");
      return;
    }

    const eventType = bqSettingsSheet.getRange("BQSettingsAnomalyDeleteType").getValue().toLowerCase();
    const platformValue = bqSettingsSheet.getRange("BQSettingsAnomalyDeletePlatform").getValue();
    const paramScopeValue = bqSettingsSheet.getRange("BQSettingsAnomalyDeleteParameterScope").getValue().toUpperCase();

    // Make sure no required fields are blank
    if (!eventDate || !rawEventNames || !eventType || !platformValue) {
      SpreadsheetApp.getUi().alert("Required fields are missing. Aborting delete operation.");
      return;
    }

    // 3) Build the WHERE clause
    //    Replace "AND event_or_parameter_name = ..." with an IN clause.
    //    For example, if eventNamesArray = ["my_event", "my_other_event"],
    //    then we want event_or_parameter_name IN ('my_event', 'my_other_event')

    // Create a string of quoted event names for SQL
    const inClauseValues = eventNamesArray
      .map(function(name) { return "'" + name.replace(/'/g, "\\'") + "'"; })
      .join(", ");

    let whereClause = `
      event_date = '${eventDate}'
      AND event_or_parameter_type = '${eventType}'
      AND platform = '${platformValue}'
      AND event_or_parameter_name IN (${inClauseValues})
    `;

    // Conditionally include parameter_scope if type is 'parameter'
    if (String(eventType) === "parameter") {
      whereClause += `\n      AND parameter_scope = '${paramScopeValue}'`;
    }

    const tableRef = "`" + [projectId, datasetId, tableId].join(".") + "`";
    const queryString = `
      DELETE FROM ${tableRef}
      WHERE ${whereClause}
    `;

    const request = {
      query: queryString,
      useLegacySql: false
    };

    // 4) Run the query
    BigQuery.Jobs.query(request, projectId);
    SpreadsheetApp.getUi().alert("Delete operation finished.");
    
  } catch(err) {
    Logger.log('deleteAnomalyFromBigQuery: ' + err.stack);
    SpreadsheetApp.getUi().alert('deleteAnomalyFromBigQuery: \n' + err.stack);
  }
}
