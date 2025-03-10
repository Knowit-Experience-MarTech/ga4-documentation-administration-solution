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

/* **** GOOGLE ANALYTICS 4 ADMIN API
Create, update and delete Key Events
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
function getGA4KeyEvents() {
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

    const keyEventAPI = AnalyticsAdmin.Properties.KeyEvents;
    let pageToken;
    let keyEvents = [];
    const keyEventData = [];
    const keyEventDataDocumented = [];
    const range = ss.getSheetByName(helperDropDownTab).getRange('HelperKeyEventType');
    const rule = SpreadsheetApp.newDataValidation().requireValueInRange(range).build();

    do {
      const response = keyEventAPI.list(
        `properties/${ga4PropertyID}`,
        {pageSize: 200, pageToken: pageToken}
      );

      keyEvents = keyEvents.concat(response.keyEvents || []);

      if (!keyEvents) {
        SpreadsheetApp.getUi().alert("No Key Events were found in GA4 Property:\n" + ga4PropertyNameAndID);
        return;
      }

      eventSheet.getRange(headerRowNumber + 1, eventResourceNameColumn, sheetData.length + 1, 1).clearContent();

      keyEvents.forEach((keyEvent) => {
        keyEventData.push(keyEvent);
        sheetData.forEach((row) => {
          if (keyEvent.eventName === row.eventName) {
            const rowIndex = row.length + headerRowNumber + 1;
            eventSheet.getRange(rowIndex, eventResourceNameColumn).setValue(keyEvent.name);

            if (row.checkbox) {
              eventSheet.getRange(rowIndex, keyEventColumn).insertCheckboxes().check();
              eventSheet.getRange(rowIndex, keyEventCountingColumn).setDataValidation(rule);
              eventSheet.getRange(rowIndex, keyEventCountingColumn).setValue(keyEvent.countingMethod);
            }
            keyEventDataDocumented.push(keyEvent);
          }
        });
      });

      pageToken = response.nextPageToken;
    } while (pageToken); // Continue until there's no more pageToken

    // Remove Key Events that are documented
    const undocumentedKeyEvents = keyEventData.filter(event => !keyEventDataDocumented.includes(event));

    // Add undocumented Key Events to the end of the Events Sheet
    undocumentedKeyEvents.forEach((event, index) => {
      const rowIndex = eventLastRow + 1 + index;
      eventSheet.getRange(rowIndex, eventNameColumn).setValue(event.eventName);
      eventSheet.getRange(rowIndex, keyEventColumn).insertCheckboxes().check();
      eventSheet.getRange(rowIndex, keyEventCountingColumn).setDataValidation(rule);
      eventSheet.getRange(rowIndex, keyEventCountingColumn).setValue(event.countingMethod);
      eventSheet.getRange(rowIndex, eventResourceNameColumn).setValue(event.name);
    });
  } catch (err) {
    Logger.log('getGA4KeyEvents: ' + err.stack);
    SpreadsheetApp.getUi().alert('Error occurred in "getGA4KeyEvents" function: \n' + err);
  }
}

// *** CREATE GA4 KEY EVENT
function createGA4KeyEvent() {
  try {
    if (!ga4PropertyID) {
      SpreadsheetApp.getUi().alert("GA4 Property ID is not set in Settings Sheet.");
      return;
    }

    const keyEventAPI = AnalyticsAdmin.Properties.KeyEvents;
    const sheetData = [];
    eventRows.forEach((row, index) => {
      const event = {
        eventName: row[eventNameColumn - 1].trim(),
        countingMethod: row[keyEventCountingColumn - 1] ? row[keyEventCountingColumn - 1].trim() : 'ONCE_PER_EVENT',
        checkbox: row[eventEditCheckboxColumn - 1],
        length: index
      }
      sheetData.push(event);
    });

    sheetData
      .filter((row) => row.checkbox)
      .forEach((row) => {
        keyEventAPI.create({
          "eventName": row.eventName,
          "countingMethod": row.countingMethod,
        }, `properties/${ga4PropertyID}`);
      });

    let pageToken; // Start with no pageToken
    let keyEvents = [];
    const range = ss.getSheetByName(helperDropDownTab).getRange('HelperKeyEventType');
    const rule = SpreadsheetApp.newDataValidation().requireValueInRange(range).build();

    do {
      const response = keyEventAPI.list(
        `properties/${ga4PropertyID}`,
        {pageSize: 200, pageToken: pageToken}
      );

      keyEvents = keyEvents.concat(response.keyEvents || []);
      pageToken = response.nextPageToken; // Update pageToken for the next iteration

      sheetData.forEach((sheetRow) => {
        const matchingEvent = keyEvents.find((event) => event.eventName === sheetRow.eventName);

        if (matchingEvent) {
          const rowIndex = sheetRow.length + headerRowNumber + 1;

          if (sheetRow.checkbox) {
            eventSheet.getRange(rowIndex, eventResourceNameColumn).setValue(matchingEvent.name);
            eventSheet.getRange(rowIndex, keyEventCountingColumn).setDataValidation(rule);
            eventSheet.getRange(rowIndex, keyEventColumn).insertCheckboxes().check();
            eventSheet.getRange(rowIndex, keyEventCountingColumn).setValue(matchingEvent.countingMethod);
          }
        }
      });

    } while (pageToken); // Continue until there's no more pageToken

    SpreadsheetApp.getUi().alert("Key Event(s) were created.");
  } catch (err) {
    Logger.log('createGA4KeyEvent: ' + err.stack);
    SpreadsheetApp.getUi().alert('Error occurred in "createGA4KeyEvent" function: \n' + err);
  }
}

// *** UPDATE GA4 KEY EVENT
function updateGA4KeyEvent() {
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
          keyEventType: row[keyEventCountingColumn - 1].trim(),
          length: index
        };
        sheetData.push(event);
      }
    });

    const keyEventAPI = AnalyticsAdmin.Properties.KeyEvents;
    let pageToken; // Start with no pageToken
    let keyEvents = [];
    let isUpdated = false; // Flag to track if any updates were made

    do {
      const response = keyEventAPI.list(
        `properties/${ga4PropertyID}`,
        {pageSize: 200, pageToken: pageToken}
      );

      keyEvents = keyEvents.concat(response.keyEvents || []);
      pageToken = response.nextPageToken; // Update pageToken for the next iteration

      if(keyEvents) {
        keyEvents.forEach((keyEvent) => {
          sheetData.forEach((sheetRow) => {
            if (keyEvent.eventName === sheetRow.eventName) {
              const rowIndex = sheetRow.length + headerRowNumber + 1;

              eventSheet.getRange(rowIndex, eventResourceNameColumn).setValue(keyEvent.name);

              keyEventAPI.patch(
                {
                  "eventName": sheetRow.eventName,
                  "countingMethod": sheetRow.keyEventType,
                },
                keyEvent.name,
                { updateMask: "*" }
              );
              isUpdated = true; // Set the flag to true as an update is made
            }
          });
        });
      }

    } while (pageToken); // Continue until there's no more pageToken

    if (isUpdated) {
      SpreadsheetApp.getUi().alert("Key Event(s) were updated.");
    } 

  } catch (err) {
    Logger.log('updateGA4KeyEvent: ' + err.stack);
    SpreadsheetApp.getUi().alert('Error occurred in "updateGA4KeyEvent" function: \n' + err);
  }
}

// *** DELETE/UNASSIGN GA4 KEY EVENT
function removeGA4KeyEventFromEvent() {
  try {
    if (!ga4PropertyID) {
      SpreadsheetApp.getUi().alert("GA4 Property ID is not set in Settings Sheet.");
      return;
    }

    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'Are you sure you want to Remove KeyEvent from Event(s)?',
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

    const keyEventAPI = AnalyticsAdmin.Properties.KeyEvents;
    let pageToken; // Start with no pageToken
    let keyEvents = [];
    let isUpdated = false; // Flag to track if any updates were made

    do {
      const response = keyEventAPI.list(
        `properties/${ga4PropertyID}`,
        {pageSize: 200, pageToken: pageToken}
      );

      keyEvents = keyEvents.concat(response.keyEvents || []);
      pageToken = response.nextPageToken; // Update pageToken for the next iteration

      if (keyEvents) {
        keyEvents.forEach((keyEvent) => {
          sheetData.forEach((sheetRow) => {
            if (keyEvent.eventName === sheetRow.eventName) {
              const rowIndex = sheetRow.length + headerRowNumber + 1;
              keyEventAPI.remove(keyEvent.name);
              eventSheet.getRange(rowIndex, keyEventColumn).insertCheckboxes().uncheck();
              eventSheet.getRange(rowIndex, keyEventCountingColumn).setDataValidation(null);
              eventSheet.getRange(rowIndex, keyEventCountingColumn).clearContent();
              eventSheet.getRange(rowIndex, eventResourceNameColumn).clearContent();
              isUpdated = true; // Set the flag to true as an update is made
            }
          });
        });
      }

    } while (pageToken); // Continue until there's no more pageToken

    if (isUpdated) {
      SpreadsheetApp.getUi().alert("Key Event(s) were deleted.");
    }
  } catch (err) {
    Logger.log('removeGA4KeyEventFromEvent: ' + err.stack);
    SpreadsheetApp.getUi().alert('Error occurred in "removeGA4KeyEventFromEvent" function: \n' + err);
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

      const keyEventAPI = AnalyticsAdmin.Properties.KeyEvents;
      let pageToken; // Start with no pageToken
      let keyEvents = [];
      let isUpdated = false; // Flag to track if any updates were made

      do {
        const response = keyEventAPI.list(
          `properties/${ga4PropertyID}`,
          {pageSize: 200, pageToken: pageToken}
        );

        keyEvents = keyEvents.concat(response.keyEvents || []);
        pageToken = response.nextPageToken; // Update pageToken for the next iteration

        sheetData.forEach((data) => {
          if (keyEvents) {
            keyEvents.forEach((keyEvent) => {
              if (keyEvent.eventName === data.eventName) {
                keyEventAPI.remove(keyEvent.name);
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
