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

let manualSheetTrigger = false;

function writeEventsToSheetManually() {
  try{
    manualSheetTrigger = true;
    eventDocumentationToSheet(manualSheetTrigger);
  }catch(err){
    Logger.log('writeEventsToSheetManually: '+err.stack);
    if(manualSheetTrigger) {
      SpreadsheetApp.getUi().alert('Error occoured in "writeEventsToSheetManually" function: \n'+err);
    }
  } 
}
function eventDocumentationToSheet() {
  try{
 const ss = SpreadsheetApp.getActiveSpreadsheet();
  const eventDocumentationSheet = ss.getSheetByName('EventDataSource');
  
  if (!eventDocumentationSheet) {
    // If the sheet doesn't exist, create it
    ss.insertSheet('EventDataSource');
  }
    // Clear existing content and set headers
    eventDocumentationSheet.clear();
    eventDocumentationSheet.getRange('A1:M1').setValues([['Event Group', 'Event Name', 'Event Method', 'Event Type', 'Key Event', 'Key Event Counting', 'Event Description', 'Event Comment', 'Event Time Edited', 'Event Website', 'Event iOS App', 'Event Android App', 'Event GTM Comment']]);

    const eventDocumentation = [];
  
    eventRows.forEach((row) => {
      if (row[eventNameColumn - 1] !== 'ga4_config') {
        const event_group = row[eventGroupColumn - 1].trim();
        const event_name = row[eventNameColumn - 1].trim();
        const event_method = row[eventMethodColumn - 1].trim();
        const event_type = row[eventTypeColumn - 1].trim();
        const event_key_event = row[keyEventColumn - 1];
        const event_key_event_counting = row[keyEventCountingColumn - 1].trim();
        const event_description = row[eventDescriptionColumn - 1].trim();
        const event_comment = row[eventCommentColumn - 1].trim();
        const event_time_edited = row[eventEditedTimeColumn- 1] ? Utilities.formatDate(row[eventEditedTimeColumn- 1], timezone, dateFormat+"' 'HH:mm:ss") : '';
        const event_website = row[eventPlatformWebsiteColumn - 1];
        const event_ios_app = row[eventPlatformIosColumn - 1];
        const event_android_app = row[eventPlatformAndroidColumn - 1];
        const event_gtm_comment = row[eventGTMCommentColumn - 1].trim();
      
        if((event_group && event_name && event_description) && (event_website || event_ios_app || event_android_app)) {
          eventDocumentation.push([
            event_group,event_name,event_method,event_type,event_key_event,event_key_event_counting,event_description,event_comment,event_time_edited,event_website,event_ios_app,event_android_app,event_gtm_comment
          ]);
        }
      }
    });

    // Write data to the sheet
    if (eventDocumentation.length > 0) {
      const range = eventDocumentationSheet.getRange(2, 1, eventDocumentation.length, 13);
      range.setValues(eventDocumentation);
    }

  // Create Image Documentation for Events
  eventImageDocumentationToSheet();

  }catch(err){
    Logger.log('eventDocumentationToSheet: '+err.stack);
    if(manualSheetTrigger) {
      SpreadsheetApp.getUi().alert('Error occoured in "eventDocumentationToSheet" function: \n'+err);
    }
  } 
}

function eventImageDocumentationToSheet() {
  try{
    function fixDriveImageURL(event_image) {
      if (event_image.startsWith('https://drive.google.com/file/d/')) {
        const fileIdStartIndex = event_image.indexOf('/d/') + 3;
        const fileIdEndIndex = event_image.indexOf('/view');
        const fileId = event_image.substring(fileIdStartIndex, fileIdEndIndex);
        return 'https://drive.google.com/uc?id=' + fileId;
      } else {
        return event_image;
      }
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const eventImageDocumentationSheet = ss.getSheetByName('EventImagesDataSource');
  
    if (!eventImageDocumentationSheet) {
      // If the sheet doesn't exist, create it
      ss.insertSheet('EventImagesDataSource');
    }
  
  // Clear existing content and set headers
    eventImageDocumentationSheet.clear();
    eventImageDocumentationSheet.getRange('A1:B1').setValues([['Event Name', 'Event Image Documentation URL']]);
  
    const eventImageDocumentation = [];
  
    eventRows.forEach((row) => {
      if (row[eventImageDocumentationColumn - 1] && row[eventImageDocumentationColumn - 1].length) {
        const event_name = row[eventNameColumn - 1].trim();
        const event_images = row[eventImageDocumentationColumn - 1].trim().replace(/\r\n|\n|' '/g, ',').split(",");
        const fixed_event_images = event_images.map(event_image => fixDriveImageURL(event_image));

        // Push each event name and fixed event image URL pair as a separate row
        fixed_event_images.forEach(image => {
          eventImageDocumentation.push([
            event_name,
            image
          ]);
        });
      }
    });

    // Write data to the sheet
    if (eventImageDocumentation.length > 0) {
      const range = eventImageDocumentationSheet.getRange(2, 1, eventImageDocumentation.length, 2);
      range.setValues(eventImageDocumentation);
    }

    // Create Parameter Documentation
    parameterDocumentationToSheet();

  }catch(err){
    Logger.log('eventImageDocumentationToSheet: '+err.stack);
    if(manualSheetTrigger) {
      SpreadsheetApp.getUi().alert('Error occoured in "eventImageDocumentationToSheet" function: \n'+err);
    }
  } 
}

function parameterDocumentationToSheet() {
  try{
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
        parameterGTMComment: row[parameterGTMCommentColumn-1].trim()
      }
      parameterSheetData.push(parameter);
    });

    const eventParameterObjects = []; // This will hold your resulting objects
    let ga4EventConfigParameters = []; // This will store parameters of 'ga4_config' with an additional marker

    // Isolate 'ga4_config' Event Scoped Parameters
    eventRows.forEach((row) => {
      const eventName = row[eventNameColumn - 1].trim();
      if (eventName === 'ga4_config') {
        ga4EventConfigParameters = row[eventParametersColumn - 1].trim().replace(/\r\n|\n|' '/g, ',').split(",").map(parameterName => ({
          parameterName: parameterName,
          isGa4Config: true // Mark as originating from 'ga4_config'
        }));
      }
    });

    // Then, process other events and add 'ga4_config' parameters to them
    eventRows.forEach((row) => {
      const eventName = row[eventNameColumn - 1].trim();
      if (eventName !== 'ga4_config') {
        let parameters = row[eventParametersColumn - 1].trim().replace(/\r\n|\n|' '/g, ',').split(",");

        // Convert current event parameters to objects and mark them
        const currentEventParameters = parameters.map(parameterName => ({
          parameterName: parameterName,
          isGa4Config: false // These do not originate from 'ga4_config'
        }));

        // Combine 'ga4_config' parameters with the current event's parameters
        const combinedParameters = currentEventParameters.concat(ga4EventConfigParameters);

        // For each combined parameter, create a new object with eventName, that parameter, and the isGa4Config flag
        combinedParameters.forEach(({ parameterName, isGa4Config }) => {
          const eventParameterObject = {
            eventName: eventName,
            parameterName: parameterName,
            parameterScope: 'EVENT',
            isGa4Config: isGa4Config // Indicates if this parameter was originally a 'ga4_config' parameter
          };
          eventParameterObjects.push(eventParameterObject);
        });
      }
    });

    const userParameterObjects = []; // This will hold your resulting objects
    let ga4UserConfigParameters = []; // This will store parameters of 'ga4_config' with an additional marker

    // Isolate 'ga4_config' User Scoped Parameters
    eventRows.forEach((row) => {
      const eventName = row[eventNameColumn - 1].trim();
      if (eventName === 'ga4_config') {
        ga4UserConfigParameters = row[eventUserParametersColumn - 1].trim().replace(/\r\n|\n|' '/g, ',').split(",").map(parameterName => ({
          parameterName: parameterName,
          isGa4Config: true // Mark as originating from 'ga4_config'
        }));
      }
    });

    // Then, process other events and add 'ga4_config' parameters to them
    eventRows.forEach((row) => {
      const eventName = row[eventNameColumn - 1].trim();
      if (eventName !== 'ga4_config') {
        let parameters = row[eventUserParametersColumn - 1].trim().replace(/\r\n|\n|' '/g, ',').split(",");

        // Convert current event parameters to objects and mark them
        const currentUserParameters = parameters.map(parameterName => ({
          parameterName: parameterName,
          isGa4Config: false // These do not originate from 'ga4_config'
        }));

        // Combine 'ga4_config' parameters with the current event's parameters
        const combinedParameters = currentUserParameters.concat(ga4UserConfigParameters);

        // For each combined parameter, create a new object with eventName, that parameter, and the isGa4Config flag
        combinedParameters.forEach(({ parameterName, isGa4Config }) => {
          const userParameterObject = {
            eventName: eventName,
            parameterName: parameterName,
            parameterScope: 'USER',
            isGa4Config: isGa4Config // Indicates if this parameter was originally a 'ga4_config' parameter
          };
          userParameterObjects.push(userParameterObject);
        });
      }
    });

    const itemParameterObjects = []; // This will hold your resulting objects
    let ga4ItemConfigParameters = []; // This will store parameters of 'ga4_config' with an additional marker (those shouldn't exist, but the code supports it)

    // Isolate 'ga4_config' Item Scoped Parameters
    eventRows.forEach((row) => {
      const eventName = row[eventNameColumn - 1].trim();
      if (eventName === 'ga4_config') {
        ga4ItemConfigParameters = row[eventItemParametersColumn - 1].trim().replace(/\r\n|\n|' '/g, ',').split(",").map(parameterName => ({
          parameterName: parameterName,
          isGa4Config: true // Mark as originating from 'ga4_config'
        }));
      }
    });

    // Then, process other events and add 'ga4_config' parameters to them
    eventRows.forEach((row) => {
      const eventName = row[eventNameColumn - 1].trim();
      if (eventName !== 'ga4_config') {
        let parameters = row[eventItemParametersColumn - 1].trim().replace(/\r\n|\n|' '/g, ',').split(",");

        // Convert current event parameters to objects and mark them
        const currentItemParameters = parameters.map(parameterName => ({
          parameterName: parameterName,
          isGa4Config: false // These do not originate from 'ga4_config'
        }));

        // Combine 'ga4_config' parameters with the current event's parameters
        const combinedParameters = currentItemParameters.concat(ga4ItemConfigParameters);

        // For each combined parameter, create a new object with eventName, that parameter, and the isGa4Config flag
        combinedParameters.forEach(({ parameterName, isGa4Config }) => {
          const itemParameterObject = {
            eventName: eventName,
            parameterName: parameterName,
            parameterScope: 'ITEM',
            isGa4Config: isGa4Config // Indicates if this parameter was originally a 'ga4_config' parameter
          };
          itemParameterObjects.push(itemParameterObject);
        });
      }
    });

    const parameterConcat = eventParameterObjects.concat(userParameterObjects,itemParameterObjects);
    let uniqueParameters = new Set();

    const parameterDocumentation = [];

    parameterSheetData.forEach((sheetData) => {
      parameterConcat.forEach((parameterConcat) => {
        if(sheetData.parameterName === parameterConcat.parameterName && sheetData.parameterScope === parameterConcat.parameterScope) {

          // Create a unique key for each combination of parameterName and parameterScope
          const uniqueKey = sheetData.parameterName + '_' + sheetData.parameterScope + '_' + parameterConcat.eventName;

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
            const parameter_gtm_comment = sheetData.parameterGTMComment;
            const event_name = parameterConcat.eventName;
            const ga4_config_parameter = parameterConcat.isGa4Config;

            if(parameter_group && parameter_display_name && parameter_name && parameter_description) {
              parameterDocumentation.push([
                parameter_group,parameter_display_name,parameter_name,parameter_scope,parameter_type,parameter_format,parameter_disallow_ads_personalization,parameter_example_value,parameter_description,parameter_gtm_comment,event_name,ga4_config_parameter
              ]);
            }
          }
        }
      });
    });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const parameterDocumentationSheet = ss.getSheetByName('ParameterDataSource');
  
    if (!parameterDocumentationSheet) {
      // If the sheet doesn't exist, create it
      ss.insertSheet('ParameterDataSource');
    }

    // Clear existing content and set headers
    parameterDocumentationSheet.clear();
    parameterDocumentationSheet.getRange('A1:L1').setValues([['Parameter Group', 'Parameter Display Name', 'Parameter Name', 'Parameter Scope', 'Parameter Type', 'Parameter Format', 'Parameter NPA', 'Parameter Example Value', 'Parameter Description', 'Parameter GTM Comment', 'Event Name', 'GA4 Config Parameter']]);

    // Write data to the sheet
    if (parameterDocumentation.length > 0) {
      const range = parameterDocumentationSheet.getRange(2, 1, parameterDocumentation.length, 12);
      range.setValues(parameterDocumentation);
    }

    if(manualSheetTrigger) {
      SpreadsheetApp.getUi().alert('Event & Parameter Documentation has been added to Data Source Sheets.');
    }

  }catch(err){
    Logger.log('parameterDocumentationToSheet: '+err.stack);
    if(manualSheetTrigger) {
      SpreadsheetApp.getUi().alert('Error occoured in "parameterDocumentationToSheet" function: \n'+err);
    }
  }
}
