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

/* **** GOOGLE ANALYTICS 4 ADMIN API
Create, update and delete Conversion Events
Developer documentation:
https://developers.google.com/analytics/devguides/config/admin/v1
*/

// Untick Edit checkboxes in Event Sheet
function eventCheckBoxesUntick() {
  try {
    const dataRange = eventSheet.getRange(headerRowNumber + 1, eventEditCheckboxColumn, eventCount);
    const values = dataRange.getValues();

    const updatedValues = values.map(row => row.map(cell => cell === true ? false : cell));

    dataRange.setValues(updatedValues);
  } catch (err) {
    Logger.log('eventCheckBoxesUntick: ' + err.stack);
  }
}

// Tick Edit checkboxes in Event Sheet
function eventCheckBoxesTick() {
  try {
    const dataRange = eventSheet.getRange(headerRowNumber + 1, eventEditCheckboxColumn, eventCount);
    const values = dataRange.getValues();

    const updatedValues = values.map(row => row.map(cell => cell === false ? true : cell));

    dataRange.setValues(updatedValues);
  } catch (err) {
    Logger.log('eventCheckBoxesTick: ' + err.stack);
  }
}

// *** GET GA4 EVENT INFORMATION
function getGA4EventConversions() {
  try {
    if (!ga4PropertyID) {
      SpreadsheetApp.getUi().alert("GA4 Property ID is not set in Settings Sheet.");
      return;
    }

    const sheetData = [];
    eventRows.forEach((row, index) => {
      const event = {
        eventName: row[eventNameColumn - 1].trim(),
        checkbox: row[eventEditCheckboxColumn - 1],
        length: index
      }
      sheetData.push(event);
    });

    const conversionEventAPI = AnalyticsAdmin.Properties.ConversionEvents;
    let pageToken;
    let conversionEvents = [];
    const eventConversionData = [];
    const eventConversionDataDocumented = [];
    const range = ss.getSheetByName(helperDropDownTab).getRange('HelperEventConversionType');
    const rule = SpreadsheetApp.newDataValidation().requireValueInRange(range).build();

    do {
      const response = conversionEventAPI.list(
        `properties/${ga4PropertyID}`,
        {pageSize: 200, pageToken: pageToken}
      );

      conversionEvents = conversionEvents.concat(response.conversionEvents || []);

      if (!conversionEvents) {
        SpreadsheetApp.getUi().alert("No Conversion Events were found in GA4 Property:\n" + ga4PropertyNameAndID);
        return;
      }

      eventSheet.getRange(headerRowNumber + 1, eventResourceNameColumn, sheetData.length + 1, 1).clearContent();

      conversionEvents.forEach((conversionEvent) => {
        eventConversionData.push(conversionEvent);
        sheetData.forEach((row) => {
          if (conversionEvent.eventName === row.eventName) {
            const rowIndex = row.length + headerRowNumber + 1;
            eventSheet.getRange(rowIndex, eventResourceNameColumn).setValue(conversionEvent.name);

            if (row.checkbox) {
              eventSheet.getRange(rowIndex, eventConversionColumn).insertCheckboxes().check();
              eventSheet.getRange(rowIndex, eventConversionCountingColumn).setDataValidation(rule);
              eventSheet.getRange(rowIndex, eventConversionCountingColumn).setValue(conversionEvent.countingMethod);
            }
            eventConversionDataDocumented.push(conversionEvent);
          }
        });
      });

      pageToken = response.nextPageToken;
    } while (pageToken); // Continue until there's no more pageToken

    // Remove Conversion Events that are documented
    const undocumentedConversionEvents = eventConversionData.filter(event => !eventConversionDataDocumented.includes(event));

    // Add undocumented Conversion Events to the end of the Events Sheet
    undocumentedConversionEvents.forEach((event, index) => {
      const rowIndex = eventLastRow + 1 + index;
      eventSheet.getRange(rowIndex, eventNameColumn).setValue(event.eventName);
      eventSheet.getRange(rowIndex, eventConversionColumn).insertCheckboxes().check();
      eventSheet.getRange(rowIndex, eventConversionCountingColumn).setDataValidation(rule);
      eventSheet.getRange(rowIndex, eventConversionCountingColumn).setValue(event.countingMethod);
      eventSheet.getRange(rowIndex, eventResourceNameColumn).setValue(event.name);
    });
  } catch (err) {
    Logger.log('getGA4ConversionEvents: ' + err.stack);
    SpreadsheetApp.getUi().alert('Error occurred in "getGA4ConversionEvents" function: \n' + err);
  }
}

// *** CREATE GA4 CONVERSION EVENT
function createGA4ConversionEvent() {
  try {
    if (!ga4PropertyID) {
      SpreadsheetApp.getUi().alert("GA4 Property ID is not set in Settings Sheet.");
      return;
    }

    const conversionEventAPI = AnalyticsAdmin.Properties.ConversionEvents;
    const sheetData = [];
    eventRows.forEach((row, index) => {
      const event = {
        eventName: row[eventNameColumn - 1].trim(),
        countingMethod: row[eventConversionCountingColumn - 1] ? row[eventConversionCountingColumn - 1].trim() : 'ONCE_PER_EVENT',
        checkbox: row[eventEditCheckboxColumn - 1],
        length: index
      }
      sheetData.push(event);
    });

    sheetData
      .filter((row) => row.checkbox)
      .forEach((row) => {
        conversionEventAPI.create({
          "eventName": row.eventName,
          "countingMethod": row.countingMethod,
        }, `properties/${ga4PropertyID}`);
      });

    let pageToken; // Start with no pageToken
    let conversionEvents = [];
    const range = ss.getSheetByName(helperDropDownTab).getRange('HelperEventConversionType');
    const rule = SpreadsheetApp.newDataValidation().requireValueInRange(range).build();

    do {
      const response = conversionEventAPI.list(
        `properties/${ga4PropertyID}`,
        {pageSize: 200, pageToken: pageToken}
      );

      conversionEvents = conversionEvents.concat(response.conversionEvents || []);
      pageToken = response.nextPageToken; // Update pageToken for the next iteration

      sheetData.forEach((sheetRow) => {
        const matchingEvent = conversionEvents.find((event) => event.eventName === sheetRow.eventName);

        if (matchingEvent) {
          const rowIndex = sheetRow.length + headerRowNumber + 1;

          if (sheetRow.checkbox) {
            eventSheet.getRange(rowIndex, eventResourceNameColumn).setValue(matchingEvent.name);
            eventSheet.getRange(rowIndex, eventConversionCountingColumn).setDataValidation(rule);
            eventSheet.getRange(rowIndex, eventConversionColumn).insertCheckboxes().check();
            eventSheet.getRange(rowIndex, eventConversionCountingColumn).setValue(matchingEvent.countingMethod);
          }
        }
      });

    } while (pageToken); // Continue until there's no more pageToken

    SpreadsheetApp.getUi().alert("Conversion Event(s) were created.");
  } catch (err) {
    Logger.log('createGA4ConversionEvent: ' + err.stack);
    SpreadsheetApp.getUi().alert('Error occurred in "createGA4ConversionEvent" function: \n' + err);
  }
}

// *** UPDATE GA4 CONVERSION EVENT
function updateGA4ConversionEvent() {
  try {
    if (!ga4PropertyID) {
      SpreadsheetApp.getUi().alert("GA4 Property ID is not set in Settings Sheet.");
      return;
    }

    const sheetData = [];
    eventRows.forEach((row, index) => {
      if (row[eventEditCheckboxColumn - 1]) {
        const event = {
          eventName: row[eventNameColumn - 1].trim(),
          eventConversionType: row[eventConversionCountingColumn - 1].trim(),
          length: index
        };
        sheetData.push(event);
      }
    });

    const conversionEventAPI = AnalyticsAdmin.Properties.ConversionEvents;
    let pageToken; // Start with no pageToken
    let conversionEvents = [];
    let isUpdated = false; // Flag to track if any updates were made

    do {
      const response = conversionEventAPI.list(
        `properties/${ga4PropertyID}`,
        {pageSize: 200, pageToken: pageToken}
      );

      conversionEvents = conversionEvents.concat(response.conversionEvents || []);
      pageToken = response.nextPageToken; // Update pageToken for the next iteration

      if(conversionEvents) {
        conversionEvents.forEach((conversionEvent) => {
          sheetData.forEach((sheetRow) => {
            if (conversionEvent.eventName === sheetRow.eventName) {
              const rowIndex = sheetRow.length + headerRowNumber + 1;

              eventSheet.getRange(rowIndex, eventResourceNameColumn).setValue(conversionEvent.name);

              conversionEventAPI.patch(
                {
                  "eventName": sheetRow.eventName,
                  "countingMethod": sheetRow.eventConversionType,
                },
                conversionEvent.name,
                { updateMask: "*" }
              );
              isUpdated = true; // Set the flag to true as an update is made
            }
          });
        });
      }

    } while (pageToken); // Continue until there's no more pageToken

    if (isUpdated) {
      SpreadsheetApp.getUi().alert("Conversion Event(s) were updated.");
    } 

  } catch (err) {
    Logger.log('updateGA4ConversionEvent: ' + err.stack);
    SpreadsheetApp.getUi().alert('Error occurred in "updateGA4ConversionEvent" function: \n' + err);
  }
}

// *** DELETE/UNASSIGN GA4 CONVERSION EVENT
function removeGA4ConversionFromEvent() {
  try {
    if (!ga4PropertyID) {
      SpreadsheetApp.getUi().alert("GA4 Property ID is not set in Settings Sheet.");
      return;
    }

    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'Are you sure you want to Remove Conversion from Event(s)?',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return;
    }

    const sheetData = [];
    eventRows.forEach((row, index) => {
      if (row[eventEditCheckboxColumn - 1]) {
        const event = {
          eventName: row[eventNameColumn - 1].trim(),
          length: index
        };
        sheetData.push(event);
      }
    });

    const conversionEventAPI = AnalyticsAdmin.Properties.ConversionEvents;
    let pageToken; // Start with no pageToken
    let conversionEvents = [];
    let isUpdated = false; // Flag to track if any updates were made

    do {
      const response = conversionEventAPI.list(
        `properties/${ga4PropertyID}`,
        {pageSize: 200, pageToken: pageToken}
      );

      conversionEvents = conversionEvents.concat(response.conversionEvents || []);
      pageToken = response.nextPageToken; // Update pageToken for the next iteration

      if (conversionEvents) {
        conversionEvents.forEach((conversionEvent) => {
          sheetData.forEach((sheetRow) => {
            if (conversionEvent.eventName === sheetRow.eventName) {
              const rowIndex = sheetRow.length + headerRowNumber + 1;
              conversionEventAPI.remove(conversionEvent.name);
              eventSheet.getRange(rowIndex, eventConversionColumn).insertCheckboxes().uncheck();
              eventSheet.getRange(rowIndex, eventConversionCountingColumn).setDataValidation(null);
              eventSheet.getRange(rowIndex, eventConversionCountingColumn).clearContent();
              eventSheet.getRange(rowIndex, eventResourceNameColumn).clearContent();
              isUpdated = true; // Set the flag to true as an update is made
            }
          });
        });
      }

    } while (pageToken); // Continue until there's no more pageToken

    if (isUpdated) {
      SpreadsheetApp.getUi().alert("Conversion Event(s) were deleted.");
    }
  } catch (err) {
    Logger.log('removeGA4ConversionFromEvent: ' + err.stack);
    SpreadsheetApp.getUi().alert('Error occurred in "removeGA4ConversionFromEvent" function: \n' + err);
  }
}

function deleteEventRows() {
  try {

    const ui = SpreadsheetApp.getUi();
    const response = ui.alert('Are you sure you want to Delete selected Event(s)?\n\nIt\'s recommended to not Delete many Events at once.', ui.ButtonSet.YES_NO);

    if (response !== ui.Button.YES) {
      return;
    }

    const sheetData = [];
    eventRows.forEach((row, index) => {
      if (row[eventEditCheckboxColumn - 1]) {
        const event = {
          eventName: row[eventNameColumn - 1].trim(),
          length: index
        };
        sheetData.push(event);
      }
    });

    if (sheetData) {
      // Sort the sheetData array in descending order based on the row number
      sheetData.sort((a, b) => b.length - a.length);

      const conversionEventAPI = AnalyticsAdmin.Properties.ConversionEvents;
      let pageToken; // Start with no pageToken
      let conversionEvents = [];
      let isUpdated = false; // Flag to track if any updates were made

      do {
        const response = conversionEventAPI.list(
          `properties/${ga4PropertyID}`,
          {pageSize: 200, pageToken: pageToken}
        );

        conversionEvents = conversionEvents.concat(response.conversionEvents || []);
        pageToken = response.nextPageToken; // Update pageToken for the next iteration

        sheetData.forEach((data) => {
          if (conversionEvents) {
            conversionEvents.forEach((conversionEvent) => {
              if (conversionEvent.eventName === data.eventName) {
                conversionEventAPI.remove(conversionEvent.name);
              }
            });
          }
         eventSheet.deleteRow(data.length+headerRowNumber+1);
         isUpdated = true; // Set the flag to true as an update is made
         Utilities.sleep(utilitieSleep); 
        });

      } while (pageToken); // Continue until there's no more pageToken
    
      if (isUpdated) {
        SpreadsheetApp.getUi().alert('Events(s) was deleted.');
      }
    }
  } catch (err) {
    Logger.log('archiveGA4CustomDimensionsMetrics: ' + err.stack);
    SpreadsheetApp.getUi().alert('Error occurred in "deleteEventRows" function: \n' + err);
  }
}
