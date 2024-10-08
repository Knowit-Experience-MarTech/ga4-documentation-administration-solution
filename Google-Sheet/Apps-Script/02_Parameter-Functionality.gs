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

// This code is used in the Parameters Tab/Sheet
const parameterSheet = ss.getSheetByName(parameterTab);
let parameterCount = parameterSheet.getRange(parameterRangeColumn).getDisplayValues().flat().filter(String).length;
let parameterLastRow = parameterCount+headerRowNumber;
let parameterRows = parameterSheet.getDataRange().offset(headerRowNumber, 0, parameterCount).getValues();

const eventSheet = ss.getSheetByName(eventTab);
const eventCount = eventSheet.getRange(eventRangeColumn).getDisplayValues().flat().filter(String).length;
const eventLastRow = eventCount+headerRowNumber;
const eventRows = eventSheet.getDataRange().offset(headerRowNumber, 0, eventLastRow - headerRowNumber).getValues();

// Get Parameters from Events Tab
const getParameters = () => {
  try {
    const activeCell = ss.getActiveCell();
    if (
      getActiveSheet.getSheetName() === eventTab &&
      (activeCell.getColumn() === eventParametersColumn ||
        activeCell.getColumn() === eventItemParametersColumn ||
        activeCell.getColumn() === eventUserParametersColumn)
    ) {
      const range = activeCell.offset(0, 1);
      const result = range.getDataValidation()?.getCriteriaValues()[0]?.getValues();
      if (result !== null) {
        return result.flat(); // Use flat() to flatten the 2D array
      }
    }
  } catch (err) {
    Logger.log('Get Parameters from Sheet: ' + err.stack);
  }
};

// Get Parameters from Active Cell
const getCurrentCellValue = () => {
  try {
    const activeCell = ss.getActiveCell();
    if (
      getActiveSheet.getSheetName() === eventTab &&
      (activeCell.getColumn() === eventParametersColumn ||
        activeCell.getColumn() === eventItemParametersColumn ||
        activeCell.getColumn() === eventUserParametersColumn)
    ) {
      return activeCell.getValue();
    }
  } catch (err) {
    Logger.log('Get Parameters from Active Cell: ' + err.stack);
  }
};

// Fill Active Cell with Parameters
const fillCell = (e) => {
  try {
    const activeCell = ss.getActiveCell();
    if (
      getActiveSheet.getSheetName() === eventTab &&
      (activeCell.getColumn() === eventParametersColumn ||
        activeCell.getColumn() === eventItemParametersColumn ||
        activeCell.getColumn() === eventUserParametersColumn)
    ) {
      const s = [];
      for (const i in e) {
        if (i.substr(0, 2) === 'ch') {
          s.push(e[i]);
        }
      }
      s.sort(); // Sort after pushing values
      if (s.length) activeCell.setValue(s.join('\n')); // New Line join
      onEdit();
    }
  } catch (err) {
    Logger.log('Fill Cell: ' + err.stack);
  }
};

// Function for comparing arrays
const inArray = (item, array) => array.includes(item);

// Array 1 from list of parameters
let arr1 = [];
try {
  if (getActiveSheet.getSheetName() === eventTab) {
    const parameters = getParameters();
    if (Array.isArray(parameters)) {
      arr1 = parameters.filter(Boolean);
    }
  }
} catch (err) {
  Logger.log('Array 1: ' + err.stack);
}

// Array 2 from parameters in cell & do some trimming
let arr2 = [];
try {
  if (getActiveSheet.getSheetName() === eventTab && getCurrentCellValue()) {
    arr2 = getCurrentCellValue().split('\n').map((el) => el.trim());
  }
} catch (err) {
  Logger.log('Array 2: ' + err.stack);
}

function showDialog() {
  const parameters = getParameters(); // Include parameters here

  const html = HtmlService.createTemplateFromFile('13_Add-Edit-Parameters');
  html.parameters = parameters;
  html.arr1 = arr1;
  html.arr2 = arr2;

  SpreadsheetApp.getUi().showSidebar(html.evaluate());
}

function compareParameterWithEventParameter() {
  try{
    const parameterSheetData = [];
    parameterRows.forEach((row, index) => {
      if (row[parameterEditCheckboxColumn-1]) {
        const parameter = {
          parameterName: row[parameterNameColumn-1].trim(),
          scope: row[parameterScopeColumn-1].trim(),
          length: index
        }
        parameterSheetData.push(parameter);
      }
    });

    const eventParameterSheetData = [];
    const itemParameterSheetData = [];
    const userParameterSheetData = [];
    eventRows.forEach((row) => {
      if (row[eventParametersColumn - 1] && row[eventParametersColumn - 1].length) {
        eventParameterSheetData.push(row[eventParametersColumn - 1].replace(/\r\n|\n|' '/g, ',').split(","));
      }
      if (row[eventItemParametersColumn - 1] && row[eventItemParametersColumn - 1].length) {
        itemParameterSheetData.push(row[eventItemParametersColumn - 1].replace(/\r\n|\n|' '/g, ',').split(","));
      }
      if (row[eventUserParametersColumn - 1] && row[eventUserParametersColumn - 1].length) {
        userParameterSheetData.push(row[eventUserParametersColumn - 1].replace(/\r\n|\n|' '/g, ',').split(","));
      }
    });

    const eventParameterData = [];
    const eventParameterSplit = eventParameterSheetData.toString().split(',');

    eventParameterSplit.forEach((param) => {
      const eventParameter = {
        parameterName: param.trim()
      };
      eventParameterData.push(eventParameter);
    });

    const dimensionData = [];
    const dimensionDataDocumented = [];
    parameterSheetData.forEach((sheetData) => {
      if(sheetData.scope === 'EVENT') {
        dimensionData.push(sheetData);
        eventParameterData.forEach((eventData) => {
          if(sheetData.parameterName === eventData.parameterName) {
            dimensionDataDocumented.push(sheetData);
          }
        });
      }
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
    parameterSheetData.forEach((sheetData) => {
      if(sheetData.scope === 'ITEM') {
        itemData.push(sheetData);
        itemParameterData.forEach((itemData) => {
          if(sheetData.parameterName === itemData.parameterName) {
            itemDataDocumented.push(sheetData);
          }
        });
      }
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
    parameterSheetData.forEach((sheetData) => {
      if(sheetData.scope === 'USER') {
        userData.push(sheetData);
        userParameterData.forEach((userData) => {
          if(sheetData.parameterName === userData.parameterName) {
            userDataDocumented.push(sheetData);
          }
        });
      }
    });
 
    const unDocumentedUserProperties = userData.filter(parameterName => !userDataDocumented.includes(parameterName) && parameterName !== "");

    if((unDocumentedDimensions && unDocumentedDimensions.length)||(unDocumentedItems && unDocumentedItems.length) ||(unDocumentedUserProperties && unDocumentedUserProperties.length)) {
       
      let eventParameterMessage = '';
      
      if(unDocumentedDimensions && unDocumentedDimensions.length) {
        const parameterInMessage = [];

        for (let m=0;m<unDocumentedDimensions.length;m++){
          parameterInMessage.push(' '+unDocumentedDimensions[m].parameterName)
        }
        eventParameterMessage = 'Event Parameters that are documentet, but not used in Event documentation:\n'+parameterInMessage.toString();
      }

      let itemParameterMessage = '';

      if(unDocumentedItems && unDocumentedItems.length) {
        const itemParameterInMessage = [];

        for (let n=0;n<unDocumentedItems.length;n++){
          itemParameterInMessage.push(' '+unDocumentedItems[n].parameterName)
        }
        itemParameterMessage = '\n\nItem Parameters that are documentet, but not used in Event documentation:\n'+itemParameterInMessage.toString();
      }
      
      let userParameterMessage = '';

      if(unDocumentedUserProperties && unDocumentedUserProperties.length) {
        const userParameterInMessage = [];

        for (let n=0;n<unDocumentedUserProperties.length;n++){
          userParameterInMessage.push(' '+unDocumentedUserProperties[n].parameterName)
        }
        userParameterMessage = '\n\nUser Property Parameters that are documentet, but not used in Event documentation:\n'+userParameterInMessage.toString();
      }

      const ui = SpreadsheetApp.getUi();
      const response = ui.alert(
        eventParameterMessage+itemParameterMessage+userParameterMessage+'\n\nDo you want to delete Parameters not used in Event documentation?\n\nIt\'s recommended to not Delete many Parameters at once.',
        ui.ButtonSet.YES_NO
      );
    
      if (response !== ui.Button.YES) {
        return;
      }
    
      const parameterConcat = unDocumentedDimensions.concat(unDocumentedItems,unDocumentedUserProperties);

      if(ga4PropertyID) {
        const customDimensionsAPI = AnalyticsAdmin.Properties.CustomDimensions; // Analytics API Custom Dimensions
        const getCD = customDimensionsAPI.list({pageSize: 200}, {parent:`properties/${ga4PropertyID}`})
        const customDimensions = getCD.customDimensions;

        const customMetricsAPI = AnalyticsAdmin.Properties.CustomMetrics; // Analytics API Custom Metrics
        const getCM = customMetricsAPI.list({pageSize: 200}, {parent:`properties/${ga4PropertyID}`});
        const customMetrics = getCM.customMetrics;

        parameterConcat.sort((a, b) => b.length - a.length);

        parameterConcat.forEach((parameterConcat) => {
          if(customDimensions) {
            customDimensions.forEach((customDimensions) => {
              if(customDimensions.parameterName === parameterConcat.parameterName && customDimensions.scope === parameterConcat.scope) {
                customDimensionsAPI.archive({}, customDimensions.name);
              }
            });
          }

          if(customMetrics) {
            customMetrics.forEach((customMetrics) => {
              if(customMetrics.parameterName === parameterConcat.parameterName && customMetrics.scope === parameterConcat.scope) {
                customMetricsAPI.archive({}, customMetrics.name);
              }
            });
          }
          parameterSheet.deleteRow(parameterConcat.length+headerRowNumber+1); // Delete Row from Sheet
          Utilities.sleep(utilitieSleep);
        });
        SpreadsheetApp.getUi().alert("Parameter(s) was deleted."); 
      }
    } else {
      SpreadsheetApp.getUi().alert("Parameters checked are used in Event documentation.");
    }
  }catch(err){
    Logger.log('compareParameterEventParameter: '+err.stack);
    SpreadsheetApp.getUi().alert('Error occoured in "compareParameterEventParameter" function: \n'+err);
  }
}

// **** COMPARE PARAMETERS IN EVENTS TAB WITH DOCUMENTED PARAMETERS IN PARAMETERS TAB
function compareEventParameterWithParameter() {
  try{

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
      if(row[eventEditCheckboxColumn-1]) {
        if (row[eventParametersColumn - 1] && row[eventParametersColumn - 1].length) {
          eventParameterSheetData.push(row[eventParametersColumn - 1].trim().replace(/\r\n|\n|' '/g, ',').split(','));
        }
        if (row[eventItemParametersColumn - 1] && row[eventItemParametersColumn - 1].length) {
          itemParameterSheetData.push(row[eventItemParametersColumn - 1].trim().replace(/\r\n|\n|' '/g, ',').split(','));
        }
        if (row[eventUserParametersColumn - 1] && row[eventUserParametersColumn - 1].length) {
          userParameterSheetData.push(row[eventUserParametersColumn - 1].trim().replace(/\r\n|\n|' '/g, ',').split(','));
        }
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
        eventParameterMessage+itemParameterMessage+userParameterMessage+'\n\nDo you want to delete Parameters used on Event(s), but not documented in Parameter Documentation?\nAll Parameters will be deleted, not only those in selected row(s).',
        ui.ButtonSet.YES_NO
      );

      if (response !== ui.Button.YES) {
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

      SpreadsheetApp.getUi().alert("Parameters are deleted."); 
    } else {
      SpreadsheetApp.getUi().alert("Parameters checked in Events Sheet are documented in Parameters Sheet.");
    }
  }catch(err){
    Logger.log('compareEventParameterWithParameter: '+err.stack);
    SpreadsheetApp.getUi().alert('Error occoured in "compareEventParameterWithParameter" function: \n'+err);
  }
}
