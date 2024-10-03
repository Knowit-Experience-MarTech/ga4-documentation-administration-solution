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

// **** MENU ****
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📈 GA4 Documentation')
    .addSubMenu(ui.createMenu('BigQuery')
      .addItem('Export Event & Parameter Documentation', 'uploadEventsToBigQueryManually')
        .addItem('Export Annotations', 'uploadAnnotationsToBigQueryManually'))
    .addSubMenu(ui.createMenu('Firestore')
      .addItem('Export Event Documentation', 'uploadToFirestoreManually'))
     .addSubMenu(ui.createMenu('Use Sheet as Data Source')
      .addItem('Write Events & Parameters to Data Source Sheets', 'writeEventsToSheetManually')) 
    .addItem('Check for Updates', 'checkForUpdates')
    .addToUi();
}

// **** END MENU ****
// **** GLOBAL SETTINGS ****
const ss = SpreadsheetApp.getActiveSpreadsheet();
const getActiveSheet = ss.getActiveSheet();

const settingsTab = 'Settings'; // Settings Tab
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
const ga4AccountID = scriptProperties.getProperty('GA4AccountID').trim().toString();
const ga4PropertyID = scriptProperties.getProperty('GA4PropertyID').trim().toString();
const ga4PropertyNameAndID = ss.getSheetByName(settingsTab).getRange('SettingsGA4Property').getValue().toString();

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
const parameterEditCheckboxColumn = 12; // Column number that has checkbox in Parameter Tab
const parameterResourceNameColumn = 13; // Column with GA4 Admin API Resource ID in Parameter Tab
const parameterGTMCommentColumn = 14; // Column with GA4 Admin API Resource ID in Parameter Tab

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
const eventPlatformWebsiteColumn = 19; // Event Edited Time Column in Event Tab
const eventPlatformIosColumn = 20; // Event Edited Time Column in Event Tab
const eventPlatformAndroidColumn = 21; // Event Edited Time Column in Event Tab
const eventEditCheckboxColumn = 22; // Column number that has checkbox in Event Tab
const eventResourceNameColumn = 23; // Column with GA4 Admin API Resource ID in Event Tab
const eventGTMCommentColumn = 24; // Column with GA4 Admin API Resource ID in Event Tab
// End Definitions in Event Sheet

// Definitions in Annotation Sheet
const annotationRangeColumn = 'A8:A'; // Column that has the correct length for looping in Annotation Tab
const annotationTimeColumn = 1 // Time Column in Annotation Tab
const annotationCategoryColumn = 2; // Category Column in Annotation Tab
const annotationDescriptionColumn = 3; // Description Column in Annotation Tab
const annotationAddedByColumn = 4 // Added By Column in Annotation Tab
const annotationGa4PropertyColumn = 5 // GA4 Property Column in Annotation Tab
const annotationIdColumn = 6; // API Id Column in Annotation Tab
// End Definitions in Annotation Sheet

// **** END GLOBAL SETTINGS ****

// **** READ DATA FROM SHEET ****
const headerRowNumber = 8;
function onEdit() {
  try {
    if(getActiveSheet.getSheetName() === eventTab || getActiveSheet.getSheetName() === parameterTab) { 
      const activeCell = ss.getActiveCell();
      if(getActiveSheet.getSheetName() === eventTab) { 
        const row = ss.getActiveRange().getRow();
         // *** Creates a Timestamp if a column is edited in Event Tab  
          if(activeCell.getColumn() < eventEditedTimeColumn && row > headerRowNumber) { // Insert edited time
            const dateTimeLocation = eventEditedTimeColumn-activeCell.getColumn();
            if(dateTimeLocation) {
              let dateTimeCell = activeCell.offset(0,dateTimeLocation);
              dateTimeCell.setValue(new Date());
            }
          // **** Event KeyEvent Count 
          if(activeCell.getColumn() === keyEventColumn) {
            const cell = activeCell.offset(0, 1);
            if(activeCell.getValue() === true) {
              const range = ss.getSheetByName(helperDropDownTab).getRange('HelperKeyEventType');
              const defaultValue = ss.getSheetByName(helperDropDownTab).getRange('HelperKeyEventTypeDefault').getValue();
              const rule = SpreadsheetApp.newDataValidation().requireValueInRange(range).build();
              cell.setDataValidation(rule);
              cell.setValue(defaultValue);
            } else {
              cell.clearContent().clearDataValidations();
            }
          }
        }
      }
      // *** Dynamic Dropdown in Parameters Tab
      if(getActiveSheet.getSheetName() === parameterTab) {
        if((activeCell.getColumn() === parameterScopeColumn || activeCell.getColumn() === parameterTypeColumn || activeCell.getColumn() === parameterFormatColumn) && activeCell.getRow() > headerRowNumber){
          const datass = ss.getSheetByName(helperDropDownTab)
          activeCell.offset(0, 1).clearContent().clearDataValidations();
          let makes = datass.getRange(1, 1, 1, datass.getLastColumn()).getValues();
          let makeIndex = makes[0].indexOf(activeCell.getValue()) + 1;

          if(makeIndex != 0) {
            let validationRange = datass.getRange(2, makeIndex, datass.getLastRow());
            const defaultValue = datass.getRange(2, makeIndex, 2).getValue();
            let validationRule = SpreadsheetApp.newDataValidation().requireValueInRange(validationRange).build();
            activeCell.offset(0, 1).setDataValidation(validationRule);
            activeCell.offset(0, 1).setValue(defaultValue);
            if(activeCell.getColumn() === parameterScopeColumn && activeCell.getValue() === userScopeDimension) {
              activeCell.offset(0,4).insertCheckboxes().uncheck();
            } else {
              activeCell.offset(0,4).removeCheckboxes();
            }
          }
          if(activeCell.getColumn() === parameterScopeColumn && activeCell.getRow() > headerRowNumber){
            activeCell.offset(0, 2).clearContent().clearDataValidations();
            let makeIndex2 = makes[0].indexOf(activeCell.offset(0, 1).getValue()) + 1;  
          
            if(makeIndex2 != 0) {
              let validationRange2 = datass.getRange(2, makeIndex2, datass.getLastRow());
              const defaultValue2 = datass.getRange(2, makeIndex2, 2).getValue();
              let validationRule2 = SpreadsheetApp.newDataValidation().requireValueInRange(validationRange2).build();
              activeCell.offset(0, 2).setDataValidation(validationRule2);
              activeCell.offset(0, 2).setValue(defaultValue2);
            }
          }
        }
      }
    }
    // *** Set BigQuery Data Set ID automatically if it's not filled out
    if(getActiveSheet.getSheetName() === settingsTab) {
      if(!bigQueryDataSetID && bigQueryProjectID && ga4PropertyID) {
        ss.getSheetByName(settingsTab).getRange(12, 2).setValue('analytics_'+ga4PropertyID);
      }
    }

    // Annontation Sheet
    // Insert Date and Email
    if(getActiveSheet.getSheetName() === annotationTab) { 
      const activeCell = ss.getActiveCell();
      const row = ss.getActiveRange().getRow()

      if(activeCell.getColumn() > annotationAddedByColumn && row > headerRowNumber) { 
        
        const dateLocation = annotationTimeColumn-activeCell.getColumn();
        if(dateLocation) {
          const dateCell = activeCell.offset(0,dateLocation);
          if(dateCell.isBlank()) {
            dateCell.setValue(Utilities.formatDate(new Date(), timezone, dateFormat));
          }
        }

        const addedByLocation = annotationAddedByColumn-activeCell.getColumn();
        if(addedByLocation) {
          const addedByCell = activeCell.offset(0,addedByLocation);
          if(addedByCell.isBlank()) {
            addedByCell.setValue(Session.getActiveUser().getEmail());
          }
        }
      }
    }
  } catch (err) {
    Logger.log('onEdit: '+err.stack)
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
    ss.getSheetByName(settingsTab).getRange(19, 2, 6, 1).clearContent();
    ss.getSheetByName(settingsTab).getRange(28, 2, 3, 1).clearContent();

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
