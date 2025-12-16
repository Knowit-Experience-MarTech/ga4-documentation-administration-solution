/**
* Copyright 2025 Knowit AI & Analytics
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

// **** MENU ****
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📈 GA4 Documentation')
    .addSubMenu(ui.createMenu('BigQuery')
      .addItem('Export Event & Parameter Documentation', 'uploadEventsToBigQueryManually')
        .addItem('Export Annotations', 'uploadAnnotationsToBigQueryManually'))
    .addSubMenu(ui.createMenu('Annotations')
      .addItem('Get GA4 Annotations', 'getGA4AnnotationsManually')
      .addItem('Get GA4 Change History', 'getGA4ChangeHistoryManually')
      .addItem('Get GTM Container Versions', 'listGTMContainerVersionsyManually'))
     .addSubMenu(ui.createMenu('Use Sheet as Data Source')
      .addItem('Write Events & Parameters to Data Source Sheets', 'writeEventsToSheetManually'))
    .addSubMenu(ui.createMenu('Firestore')
      .addItem('Export Event Documentation', 'uploadToFirestoreManually'))
    .addItem('Check for Updates', 'checkForUpdates')
    .addToUi();
}

// **** END MENU ****
// **** GLOBAL SETTINGS ****
const ss = SpreadsheetApp.getActiveSpreadsheet();
const getActiveSheet = ss.getActiveSheet();

const settingsTab = 'Settings'; // Settings Tab
const bigQuerySettingsTab = 'Advanced Settings'; // BigQuery Settings Tab
const eventTab = 'Events'; // Event Tab
const parameterTab = "Parameters"; // Parameters Tab
const annotationTab = "Annotations"; // Annotations Tab
const helperDropDownTab = "HelperDropdown"; // Helper Tab
const helperGA4Tab = "HelperGA4"; // GA4 Tab with Accounts & Properties
const helperGTMTab = "HelperGTM"; // GTM Tab with Accounts & Containers
const helperGA4EventDataTab = "HelperGA4EventData"; // GA4 Tab with Event Data from API
const helperGA4EventDataFromBigQueryTab = "HelperGA4EventDataFromBigQuery"; // GA4 Tab with Event Data from BigQuery
const helperGA4ParameterDataFromBigQueryTab = "HelperGA4ParameterDataFromBigQuery"; // GA4 Tab with Event Data from BigQuery
const annotationsDataSourceTab = "AnnotationsDataSource"; // Annotations Data Source Sheet
const eventDataSourceTab = "EventDataSource"; // Event Data Source Sheet
const eventImagesDataSourceTab = "EventImagesDataSource"; // Event Images Data Source Sheet
const parameterDataSourceTab = "ParameterDataSource"; // Parameter Data Source Sheet
const utilitieSleep = 300; // Global Utilities.sleep setting, except for BigQuery script.

// Save settings to PropertiesService
const scriptProperties = PropertiesService.getScriptProperties();

// Settings
scriptProperties.setProperty('ReportingPeriodStart',ss.getSheetByName(settingsTab).getRange('SettingsReportingPeriod').getValue().split(' ')[0]);
scriptProperties.setProperty('GetGA4DataFrom',ss.getSheetByName(settingsTab).getRange('SettingsGetGA4DataFrom').getValue());
let reportingPeriodStart = scriptProperties.getProperty('ReportingPeriodStart');
const getGA4DataFrom = scriptProperties.getProperty('GetGA4DataFrom');

// GA4
scriptProperties.setProperty('GA4AccountID',ss.getSheetByName(settingsTab).getRange('SettingsGA4Account').getValue().split(' ').pop().toString());
scriptProperties.setProperty('GA4PropertyID',ss.getSheetByName(settingsTab).getRange('SettingsGA4Property').getValue().split(' ').pop().toString());

scriptProperties.setProperty('GA4PropertyIDEvents',ss.getSheetByName(parameterTab).getRange('EventGA4Property').getValue().split(' ').pop().toString());
scriptProperties.setProperty('GA4PropertyIDParameters',ss.getSheetByName(parameterTab).getRange('ParametersGA4Property').getValue().split(' ').pop().toString());

const ga4AccountID = scriptProperties.getProperty('GA4AccountID').trim().toString();
const ga4PropertyID = scriptProperties.getProperty('GA4PropertyID').trim().toString();

const ga4PropertyIDEvents = scriptProperties.getProperty('GA4PropertyIDEvents').trim().toString();
const ga4PropertyIDParameters = scriptProperties.getProperty('GA4PropertyIDParameters').trim().toString();

const ga4PropertyNameAndIDEvents = ss.getSheetByName(eventTab).getRange('EventGA4Property').getValue().toString();
const ga4PropertyNameAndIDParameters = ss.getSheetByName(parameterTab).getRange('ParametersGA4Property').getValue().toString();

// GTM
scriptProperties.setProperty('GTMAccountID',ss.getSheetByName(settingsTab).getRange('SettingsGTMAccount').getValue().split(' ').pop().toString());
scriptProperties.setProperty('GTMContainerWeb',ss.getSheetByName(settingsTab).getRange('SettingsGTMContainerWeb').getValue().split(' ').pop().toString());
scriptProperties.setProperty('GTMContainerServer',ss.getSheetByName(settingsTab).getRange('SettingsGTMContainerServer').getValue().split(' ').pop().toString());
scriptProperties.setProperty('GTMContainerIos',ss.getSheetByName(settingsTab).getRange('SettingsGTMContainerIos').getValue().split(' ').pop().toString());
scriptProperties.setProperty('GTMContainerAndroid',ss.getSheetByName(settingsTab).getRange('SettingsGTMContainerAndroid').getValue().split(' ').pop().toString());
scriptProperties.setProperty('GTMContainerAmp',ss.getSheetByName(settingsTab).getRange('SettingsGTMContainerAmp').getValue().split(' ').pop().toString());
const gtmAccountID = scriptProperties.getProperty('GTMAccountID').trim().toString();
const gtmContainerWeb = scriptProperties.getProperty('GTMContainerWeb').trim().toString();
const gtmContainerServer = scriptProperties.getProperty('GTMContainerServer').trim().toString();
const gtmContainerIos = scriptProperties.getProperty('GTMContainerIos').trim().toString();
const gtmContainerAndroid = scriptProperties.getProperty('GTMContainerAndroid').trim().toString();
const gtmContainerAmp = scriptProperties.getProperty('GTMContainerAmp').trim().toString();
const gtmContainerIDs = [gtmContainerWeb,gtmContainerServer,gtmContainerIos,gtmContainerAndroid,gtmContainerAmp].filter(Boolean).join(", ")

// BigQuery
scriptProperties.setProperty('BigQueryProjectID',ss.getSheetByName(settingsTab).getRange('SettingsBigQueryProjectID').getValue().toString());
scriptProperties.setProperty('BigQueryDataSetID',ss.getSheetByName(settingsTab).getRange('SettingsBigQueryDataSetID').getValue().toString());
scriptProperties.setProperty('BigQueryTableID1',ss.getSheetByName(settingsTab).getRange('SettingsBigQueryTableID1').getValue().toString());
scriptProperties.setProperty('BigQueryTableID2',ss.getSheetByName(settingsTab).getRange('SettingsBigQueryTableID2').getValue().toString());
scriptProperties.setProperty('BigQueryTableID3',ss.getSheetByName(settingsTab).getRange('SettingsBigQueryTableID3').getValue().toString());

const bigQueryProjectID = scriptProperties.getProperty('BigQueryProjectID').toString();
const bigQueryDataSetID = scriptProperties.getProperty('BigQueryDataSetID').toString();
const bigQueryTableID1 = scriptProperties.getProperty('BigQueryTableID1').toString();
const bigQueryTableID2 = scriptProperties.getProperty('BigQueryTableID2').toString();
const bigQueryTableID3 = scriptProperties.getProperty('BigQueryTableID3').toString();

// Annotations
scriptProperties.setProperty('SettingsAnnotations',ss.getSheetByName(settingsTab).getRange('SettingsAnnotations').getValue());
const annotationSettings = scriptProperties.getProperty('SettingsAnnotations').toString();

// Firestore
scriptProperties.setProperty('FirestoreCloudClientEmail',ss.getSheetByName(settingsTab).getRange('SettingsFirestoreCloudClientEmail').getValue().toString());
scriptProperties.setProperty('FirestoreCloudProjectID',ss.getSheetByName(settingsTab).getRange('SettingsFirestoreCloudProjectID').getValue().toString());
scriptProperties.setProperty('FirestoreCloudKey',ss.getSheetByName(settingsTab).getRange('SettingsFirestoreCloudKey').getValue().toString());
scriptProperties.setProperty('FirestoreFirstCollection',ss.getSheetByName(settingsTab).getRange('SettingsFirestoreFirstCollection').getValue().toString());
scriptProperties.setProperty('DateFormat',ss.getSheetByName(settingsTab).getRange('SettingsDateFormat').getValue());

const firestoreCloudClientEmail = scriptProperties.getProperty('FirestoreCloudClientEmail');
const firestoreCloudProjectId = scriptProperties.getProperty('FirestoreCloudProjectID');
const firestoreCloudKey = scriptProperties.getProperty('FirestoreCloudKey').replace(/\\n/g, '\n');
const firestoreFirstCollection = scriptProperties.getProperty('FirestoreFirstCollection');
const dateFormat = scriptProperties.getProperty('DateFormat');
// End Save settings to PropertiesService

// Time Zone
const timezone = ss.getSpreadsheetTimeZone();

// Definitions in Parameter Sheet
const parameterRangeColumn = 'C9:C'; // Column that has the correct length for looping in Parameter Tab
const parameterGroupColumn = 1 // Parameter Group Column in Parameter Tab
const parameterDisplayNameColumn = 2 // Parameter Display Name Column in Parameter Tab
const parameterNameColumn = 3; // Parameter Name Column in Parameter Tab
const parameterScopeColumn = 4; // Parameter Scope Column in Parameter Tab
const parameterTypeColumn = 5; // Parameter Type Column in Parameter Tab
const parameterFormatColumn = 6; // Parameter Format Column in Parameter Tab
const parameterCurrencyDataTypeColumn = 7; // Currency Date Type (Restricted Metrics) Column in Parameter Tab
const parameterDisallowAdsPersonalizationColumn = 8; // Disallow Ads 
const parameterExampleValueColumn = 9; // Parameter Example Value Column in Parameter Tab
const parameterCountColumn = 10; // Parameter Example Value Column in Parameter Tab
const parameterDescriptionColumn = 11; // Parameter Description Column in Parameter Tab
const parameterPlatformWebsiteColumn = 12; // Web Platform checkbox Column in Parameter Tab
const parameterPlatformIosColumn = 13; // iOS Platform checkbox Column in Parameter Tab
const parameterPlatformAndroidColumn = 14; // Android Platform checkbox Column in Parameter Tab
const parameterEditCheckboxColumn = 15; // Column number that has checkbox in Parameter Tab
const parameterResourceNameColumn = 16; // Column with GA4 Admin API Resource ID in Parameter Tab
const parameterGTMCommentColumn = 17; // Column with GA4 Admin API Resource ID in Parameter Tab

const customDimensionType = ss.getSheetByName(helperDropDownTab).getRange('HelperCustomDimension').getValue();
const customDimensionFormat = ss.getSheetByName(helperDropDownTab).getRange('HelperCustomDimensionFormat').getValue();
const customMetricType = ss.getSheetByName(helperDropDownTab).getRange('HelperCustomMetric').getValue();
const customMetricFormat = ss.getSheetByName(helperDropDownTab).getRange('HelperCustomMetricFormat').getValue();
const userScopeDimension = ss.getSheetByName(helperDropDownTab).getRange('HelperUserScope').getValue();
// End Definitions in Parameter Sheet

// Definitions in Event Sheet
const eventRangeColumn = 'B9:B'; // Column that has the correct length for looping in Event Tab
const eventGroupColumn = 1 // Event Group Column in Event Tab
const eventNameColumn = 2; // Event Name Column in Event Tab
const eventMethodColumn = 3; // Event Method Column in Event Tab
const eventTypeColumn = 4; // Event Type Column in Event Tab
const keyEventColumn = 5; // KeyEvent Column in Event Tab
const keyEventCountingColumn = 6; // Key Event Type Column in Event Tab
const eventEventCountColumn = 8; // Event Count Column in Event Tab
const eventDescriptionColumn = 9; // Event Description Column in Event Tab
const eventParametersColumn = 10; // Event Parameter Column in Event Tab
const eventItemParametersColumn = 12; // Event Item Parameter Column in Event Tab
const eventUserParametersColumn = 14; // Event User Parameter Column in Event Tab
const eventCommentColumn = 16; // Event Comment Column in Event Tab
const eventImageDocumentationColumn = 17; // Event Image Documentation Column in Event Tab
const eventEditedTimeColumn = 18; // Event Edited Time Column in Event Tab
const eventPlatformWebsiteColumn = 19; // Web Platform checkbox Column in Event Tab
const eventPlatformIosColumn = 20; // iOS Platform checkbox Column in Event Tab
const eventPlatformAndroidColumn = 21; // Android Platform checkbox Column in Event Tab
const eventEditCheckboxColumn = 22; // Column number that has checkbox in Event Tab
const eventResourceNameColumn = 23; // Column with GA4 Admin API Resource ID in Event Tab
const eventGTMCommentColumn = 24; // Column with GA4 Admin API Resource ID in Event Tab
// End Definitions in Event Sheet

// **** END GLOBAL SETTINGS ****

// **** READ DATA FROM SHEET ****
const headerRowNumber = 8;
function onEdit(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const activeSheet = ss.getActiveSheet();
    const activeCell  = ss.getActiveCell();
    const sheetName   = activeSheet.getSheetName();

    // *** Event Tab logic ***
    if (sheetName === eventTab) {
      const row = activeCell.getRow();
      if (activeCell.getColumn() < eventEditedTimeColumn && row > headerRowNumber) {
        const dateTimeLocation = eventEditedTimeColumn - activeCell.getColumn();
        if (dateTimeLocation) {
          activeCell.offset(0, dateTimeLocation).setValue(new Date());
        }
      }
      if (activeCell.getColumn() === keyEventColumn) {
        const cell = activeCell.offset(0, 1);
        if (activeCell.getValue() === true) {
          const range = ss.getSheetByName(helperDropDownTab).getRange('HelperKeyEventType');
          const defaultValue = ss.getSheetByName(helperDropDownTab)
                                .getRange('HelperKeyEventTypeDefault')
                                .getValue();
          cell.setDataValidation(SpreadsheetApp.newDataValidation()
                                   .requireValueInRange(range)
                                   .build());
          cell.setValue(defaultValue);
        } else {
          cell.clearContent().clearDataValidations();
        }
      }
    }

    // *** Parameters Tab logic ***
    if (sheetName === parameterTab) {
      if ((activeCell.getColumn() === parameterScopeColumn ||
           activeCell.getColumn() === parameterTypeColumn ||
           activeCell.getColumn() === parameterFormatColumn) &&
          activeCell.getRow() > headerRowNumber) {
        const helper = ss.getSheetByName(helperDropDownTab);
        // clear next cell
        activeCell.offset(0, 1).clearContent().clearDataValidations();
        const makes = helper.getRange(1, 1, 1, helper.getLastColumn()).getValues()[0];
        const makeIndex = makes.indexOf(activeCell.getValue()) + 1;
        if (makeIndex) {
          const validationRange = helper.getRange(2, makeIndex, helper.getLastRow());
          const defaultValue = helper.getRange(2, makeIndex, 2).getValue();
          activeCell.offset(0, 1)
            .setDataValidation(SpreadsheetApp.newDataValidation()
              .requireValueInRange(validationRange)
              .build())
            .setValue(defaultValue);
          if (activeCell.getColumn() === parameterScopeColumn &&
              activeCell.getValue() === userScopeDimension) {
            activeCell.offset(0, 4).insertCheckboxes().uncheck();
          } else {
            activeCell.offset(0, 4).removeCheckboxes();
          }
        }
        // nested dropdown
        if (activeCell.getColumn() === parameterScopeColumn) {
          activeCell.offset(0, 2).clearContent().clearDataValidations();
          const makeIndex2 = makes.indexOf(activeCell.offset(0, 1).getValue()) + 1;
          if (makeIndex2) {
            const validationRange2 = helper.getRange(2, makeIndex2, helper.getLastRow());
            const defaultValue2 = helper.getRange(2, makeIndex2, 2).getValue();
            activeCell.offset(0, 2)
              .setDataValidation(SpreadsheetApp.newDataValidation()
                .requireValueInRange(validationRange2)
                .build())
              .setValue(defaultValue2);
          }
        }
      }
    }

    // *** Settings Tab logic ***
    if (sheetName === settingsTab) {
      if (!bigQueryDataSetID && bigQueryProjectID && ga4PropertyID) {
        ss.getSheetByName(settingsTab)
          .getRange(12, 2)
          .setValue('analytics_' + ga4PropertyID);
      }
    }

    // *** Annotations Sheet logic ***
    if (sheetName === 'Annotations') {
      const range = e.range;
      const sheet = range.getSheet();

      // 1. Character counters
      if (range.getA1Notation() === annotationTitleField) {
        const titleText = (range.getValue() || '').toString();
        const len = titleText.length;
        let msg = `${len}/60`;
        let fontColor = null;
        if (len > 60) { msg += ". MAX 60 characters!"; fontColor = 'red'; }
        sheet.getRange(annotationTitleCount)
             .setValue(msg)
             .setFontColor(fontColor);
      }
      if (range.getA1Notation() === annotationDescriptionField) {
        const descText = (range.getValue() || '').toString();
        const len = descText.length;
        let msg = `${len}/150`;
        let fontColor = null;
        if (len > 150) { msg += ". MAX 150 characters!"; fontColor = 'red'; }
        sheet.getRange(annotationDescriptionCount)
             .setValue(msg)
             .setFontColor(fontColor);
      }

      // 2. Color edits in rows ≥ 9, column D
      if (range.getColumn() === 4 && range.getRow() >= 9) {
        const newVal = e.value;
        if (newVal && colorNameToColor[newVal.toString().toUpperCase()]) {
          const hex = colorNameToColor[newVal.toString().toUpperCase()];
          range.setBackground(hex).setFontColor("#FFFFFF");
        } else {
          range.setBackground(null).setFontColor(null);
        }
      }
      // Color summary dropdown in I5
      if (range.getA1Notation() === annotationColorField) {
        updateColorFormattingForCell(range);
      }

      // 3. Checkbox edits in rows ≥ 9, annotationEditColumn
      if (range.getColumn() === annotationEditColumn && range.getRow() >= 9) {
        const newValue = e.value;
        if (newValue === true || newValue === "TRUE") {
          const lastRow = sheet.getLastRow();
          const editRange = sheet.getRange(9, annotationEditColumn, lastRow - 8, 1);
          const editValues = editRange.getValues();
          // Uncheck others
          editValues.forEach((r, i) => {
            const row = i + 9;
            if (row !== range.getRow() && (r[0] === true || r[0] === "TRUE")) {
              r[0] = false;
            }
          });
          editRange.setValues(editValues);

          // Pull row data A→G
          const rowData = sheet.getRange(range.getRow(), 1, 1, annotationIdColumn).getValues()[0];
          // Split combined text (col E)
          const parts = rowData[4].split("\n");
          const titleVal = parts[0] || "";
          const descVal  = parts.slice(1).join("\n");
          // Copy to summary
          sheet.getRange(annotationTitleField).setValue(titleVal);
          sheet.getRange(annotationDescriptionField).setValue(descVal);
          sheet.getRange(annotationDateStartField)
               .setValue(rowData[0]).setNumberFormat("yyyy-dd-MM");
          sheet.getRange(annotationDateEndField)
               .setValue(rowData[1]).setNumberFormat("yyyy-dd-MM");
          sheet.getRange(annotationColorField).setValue(rowData[3]);
          updateColorFormattingForCell(sheet.getRange(annotationColorField));
          // Clear warnings
          sheet.getRange(annotationTitleCount).clearContent();
          sheet.getRange(annotationDescriptionCount).clearContent();
        }
      }
    }
    
    // Only run on the BigQuery settings sheet
    if (sheetName === bigQuerySettingsTab) {
      const typeRange = ss.getRangeByName('BQSettingsAnomalyDeleteType');
      const scopeRange = ss.getRangeByName('BQSettingsAnomalyDeleteParameterScope');
      if (!typeRange || !scopeRange) return;

      // Only react when the edited cell IS the delete type cell
      if (
        e.range.getSheet().getName() !== typeRange.getSheet().getName() ||
        e.range.getA1Notation() !== typeRange.getA1Notation()
      ) {
        return;
      }

      const value = String(typeRange.getValue()).trim();

      if (value === 'Event') {
        // Blank the scope cell (so it’s effectively “hidden” in terms of value)
        scopeRange.clearContent();
        scopeRange.setDataValidation(null);
      } else {
        // When type ≠ EVENT → restore dropdown: EVENT, ITEM, USER
        const rule = SpreadsheetApp.newDataValidation()
          .requireValueInList(['EVENT', 'ITEM', 'USER'], true) // true = show dropdown
          .setAllowInvalid(false)
          .build();

        scopeRange.setDataValidation(rule);

        // Set default value if currently blank
        if (!String(scopeRange.getValue()).trim()) {
          scopeRange.setValue('EVENT');
        }
      }
    }
  } catch (err) {
    Logger.log('onEdit: ' + err.stack);
  }
}

// **** END READ DATA FROM SHEET ****

// **** SETTINGS TAB
function clearSettingsFields() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'Are you sure you want to clear the following Settings Fields? \n GA4 Settings, BigQuery Settings & Firestore Settings.\n\n GA4 Account, Property data and Event Count will also be cleared.',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
        return;
    }

    // Clear Settings Sheet
    ss.getSheetByName(settingsTab).getRange(8, 2, 5, 1).clearContent();
    ss.getSheetByName(settingsTab).getRange(20, 2, 6, 1).clearContent();
    ss.getSheetByName(settingsTab).getRange(29, 2, 3, 1).clearContent();

    // Clear GA4 Account & Property helper Sheet
    const sheetGA4Tab = ss.getSheetByName(helperGA4Tab);
    const numRowsGA4Tab = sheetGA4Tab.getLastRow(); // The number of rows to clear
    sheetGA4Tab.getRange(2, 1, numRowsGA4Tab+1, sheetGA4Tab.getLastColumn()).clearContent();
  
    // Clear GTM Account & Container helper Sheet
    const sheetGTMTab = ss.getSheetByName(helperGTMTab);
    const numRowsGTMTab = sheetGTMTab.getLastRow(); // The number of rows to clear
    sheetGTMTab.getRange(2, 1, numRowsGTMTab+1, sheetGTMTab.getLastColumn()).clearContent();

    // Clear GA4 API Event Data from helper Sheet
    const sheetGA4EventDataTab = ss.getSheetByName(helperGA4EventDataTab);
    const numRowsGA4EventDataTab = sheetGA4EventDataTab.getLastRow(); // The number of rows to clear
    sheetGA4EventDataTab.getRange(2, 1, numRowsGA4EventDataTab+1, sheetGA4EventDataTab.getLastColumn()).clearContent();

    // Clear GA4 BigQuery Event Data from helper Sheet
    const sheetGA4EventDataBQTab = ss.getSheetByName(helperGA4EventDataFromBigQueryTab);
    const numRowsGA4EventDataBQTab = sheetGA4EventDataBQTab.getLastRow(); // The number of rows to clear
    sheetGA4EventDataBQTab.getRange(2, 1, numRowsGA4EventDataBQTab+1, sheetGA4EventDataBQTab.getLastColumn()).clearContent();

    // Clear GA4 BigQuery Parameter Data from helper Sheet
    const sheetGA4ParameterDataBQTab = ss.getSheetByName(helperGA4ParameterDataFromBigQueryTab);
    const numRowsGA4ParameterDataBQTab = sheetGA4ParameterDataBQTab.getLastRow(); // The number of rows to clear
    sheetGA4ParameterDataBQTab.getRange(2, 1, numRowsGA4ParameterDataBQTab+1, sheetGA4ParameterDataBQTab.getLastColumn()).clearContent();

   // Clear Annotations Data Source Sheet
    const sheetAnnotationsSourceTab = ss.getSheetByName(annotationsDataSourceTab);
    const numRowsAnnotationsSourceTab = sheetAnnotationsSourceTab.getLastRow(); // The number of rows to clear
    sheetAnnotationsSourceTab.getRange(2, 1, numRowsAnnotationsSourceTab+1, sheetAnnotationsSourceTab.getLastColumn()).clearContent();

   // Clear Event Data Source Sheet
    const sheetEventSourceTab = ss.getSheetByName(eventDataSourceTab);
    const numRowsEventSourceTab = sheetEventSourceTab.getLastRow(); // The number of rows to clear
    sheetEventSourceTab.getRange(2, 1, numRowsEventSourceTab+1, sheetEventSourceTab.getLastColumn()).clearContent();

   // Clear Event Images Data Source Sheet
    const sheetEventImagesSourceTab = ss.getSheetByName(eventImagesDataSourceTab);
    const numRowsEventImagesSourceTab = sheetEventImagesSourceTab.getLastRow(); // The number of rows to clear
    sheetEventImagesSourceTab.getRange(2, 1, numRowsEventImagesSourceTab+1, sheetEventImagesSourceTab.getLastColumn()).clearContent();

   // Clear Parameter Data Source Sheet
    const sheetParameterSourceTab = ss.getSheetByName(parameterDataSourceTab);
    const numRowsParameterSourceTab = sheetParameterSourceTab.getLastRow(); // The number of rows to clear
    sheetParameterSourceTab.getRange(2, 1, numRowsParameterSourceTab+1, sheetParameterSourceTab.getLastColumn()).clearContent();
    
    // *** EVENTS SHEET ***
    // Clear Event Count from Event Sheet
    const sheetEventTab = ss.getSheetByName(eventTab);
    const numRowsEventTab = sheetEventTab.getLastRow(); // The number of rows to clear
    sheetEventTab.getRange(headerRowNumber+1, eventEventCountColumn, numRowsEventTab+1, 1).clearContent();
    // Clear Resource Name (GA4 API) from Events 
    sheetEventTab.getRange(headerRowNumber+1, eventResourceNameColumn, numRowsEventTab+1, 1).clearContent();

    // *** PARAMETERS SHEET ***
    // Clear Resource Name (GA4 API) from 
    const sheetParameterTab = ss.getSheetByName(parameterTab);
    const numRowsParameterTab = sheetEventTab.getLastRow(); // The number of rows to clear
    // Clear Parameter Count from Parameter Sheet
    sheetParameterTab.getRange(headerRowNumber+1, parameterCountColumn, numRowsParameterTab+1, 1).clearContent();
    // Clear Resource Name (GA4 API) from Parameters
    sheetParameterTab.getRange(headerRowNumber+1, parameterResourceNameColumn, numRowsParameterTab+1, 1).clearContent();
    
    // Clear Annotations
    const sheetAnnotationTab = ss.getSheetByName(annotationTab);
    const numRowsAnnotationTab = sheetAnnotationTab.getLastRow(); // The number of rows to clear
    sheetAnnotationTab.getRange(headerRowNumber+1, 1, numRowsAnnotationTab+1, sheetAnnotationTab.getLastColumn()).clearContent();
  } catch (err) {
    Logger.log('clearSettingsFields: '+err.stack);
  }
}