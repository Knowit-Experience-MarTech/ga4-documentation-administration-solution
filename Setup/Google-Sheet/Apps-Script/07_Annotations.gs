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

const annotationTitleField = "D4";
const annotationTitleCount = "F4";
const annotationDescriptionField = "D5";
const annotationDescriptionCount = "F5";
const annotationDateStartField = "G5";
const annotationDateEndField = "H5";
const annotationColorField = "I5";
const annotationRangeColumn = 'A9:A'; // Column that has the correct length for looping in Annotation Tab

const annotationDateColumn = 1; // Date Start Column in Annotation Tab
const annotationDateEndColumn = 2; // Date Start Column in Annotation Tab
const annotationCategoryColumn = 3; // Category Column in Annotation Tab
const annotationColorColumn = 4; // Color Column in Annotation Tab
const annotationDescriptionColumn = 5; // Description Column in Annotation Tab
const annotationEditColumn = 6; // Edit Column in Annotation Tab
const annotationAddedByColumn = 7; // Added By Column in Annotation Tab
const annotationGa4PropertyColumn = 8; // GA4 Property Column in Annotation Tab
const annotationIdColumn = 9; // API Id Column in Annotation Tab

let manualAnnotationTrigger = false;

/**
 * Returns a formatted date string (YYYY-MM-DD) representing x days ago.
 */
function getDateXDaysFromToday(xDays) {
  const today = new Date();
  const historicDate = new Date();
  historicDate.setDate(today.getDate() - xDays);
  
  const year = historicDate.getFullYear();
  let month = historicDate.getMonth() + 1; // Months are zero-indexed.
  let day = historicDate.getDate();
  
  // Add leading zeros.
  month = month < 10 ? '0' + month : month;
  day = day < 10 ? '0' + day : day;
  return `${year}-${month}-${day}`;
}

/**
 * Helper: Converts a date object from the API (with year, month, day) to a "YYYY-MM-DD" string.
 */
function dateObjectToString(dateObj) {
  return `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
}

function pruneColorColumnFromCF() {
  const sheet = ss.getSheetByName(annotationTab);

  // grab existing rules
  let rules = sheet.getConditionalFormatRules();
  let newRules = rules.map(rule => {
    // filter out any ranges that include column D
    let keptRanges = rule.getRanges().filter(r => {
      const start = r.getColumn();
      const end   = r.getLastColumn();
      return (end < annotationColorColumn) || (start > annotationColorColumn);
    });
    // rebuild the rule only if there’s something left
    return keptRanges.length
      ? rule.copy().setRanges(keptRanges).build()
      : null;
  })
  // drop any nulls & re‑apply
  newRules = newRules.filter(r => r);
  sheet.setConditionalFormatRules(newRules);
}

/**
 * Mapping from allowed color names (in uppercase) to hex codes.
 */
const colorNameToColor = {
  "PURPLE": "#7627BB",
  "RED": "#B31412",
  "GREEN": "#146C2E",
  "CYAN": "#009EBB",
  "BLUE": "#00639B",
  "BROWN": "#834500",
  "ORANGE": "orange"
};
/**
 * Updates the background and font color of a cell based on its value using colorNameToColor.
 * If the cell's value is found in the mapping, the background is set accordingly and font color is set to white.
 * Otherwise, formatting is cleared.
 */
function updateColorFormattingForCell(cell) {
  const val = cell.getValue();
  if (val && colorNameToColor[val.toUpperCase()]) {
    const hex = colorNameToColor[val.toUpperCase()];
    cell.setBackground(hex);
    cell.setFontColor("#FFFFFF");
  } else {
    cell.setBackground(null);
    cell.setFontColor(null);
  }
}

/**
 * Retrieves GA4 Reporting Data Annotations, filters them by a date restriction, 
 * and updates existing rows or appends new ones in the "Annotations" sheet.
 * The key to identify an annotation is annotation.name.
 * 
 * - If annotation.systemGenerated is false, an unticked checkbox is inserted in the "Edit" column.
 * - If annotation.systemGenerated is true, the "Edit" cell is left blank.
 * 
 * - The "Color" cell is set up as a dropdown with allowed values from the
 *   "HelperAnnotationDropdown" sheet. In addition, the cell background
 *   is set based on the color (using hex codes from colorNameToColor) and the text is forced white.
 * 
 * - Annotations are inserted or updated starting at row 9.
 */

/**
 * Creates an annotation via the AnalyticsAdmin API.
 * 
 * It reads:
 * - Title (max 60 characters)
 * - Description (max 150 characters)
 * - Color
 * - Dates:
 *    • If both have dates, creates an annotationDateRange.
 *    • Otherwise, uses annotationDate.
 */
function createGA4Annotation() {
  const sheet = ss.getSheetByName(annotationTab);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Sheet "+annotationTab+" not found");
    return;
  }
  
  // Read values from the designated cells.
  let title = sheet.getRange(annotationTitleField).getValue();
  let description = sheet.getRange(annotationDescriptionField).getValue();
  const annotationDateVal = sheet.getRange(annotationDateStartField).getValue(); // Expected to be a Date or a date string.
  const endDateVal = sheet.getRange(annotationDateEndField).getValue();        // Expected to be a Date or a date string.
  let color = sheet.getRange(annotationColorField).getValue();
  
  // Truncate title and description to 60 characters.
  title = title ? title.toString().substring(0, 60) : "";
  description = description ? description.toString().substring(0, 150) : "";
  // Ensure color is in uppercase.
  color = color ? color.toString().toUpperCase() : "";
  
  // Build the annotation resource object.
  const annotationResource = {
    title: title,
    description: description,
    color: color
  };
  
  // Helper function to convert a cell value to a Date object.
  function toDateObj(val) {
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  
  const annDateObj = toDateObj(annotationDateVal);
  const endDateObj = toDateObj(endDateVal);
  
  // If both dates are valid, use annotationDateRange; otherwise, if only the first date exists, use annotationDate.
  if (annDateObj && endDateObj) {
    annotationResource.annotationDateRange = {
      startDate: {
        year: annDateObj.getFullYear(),
        month: annDateObj.getMonth() + 1, // JavaScript months are zero-indexed.
        day: annDateObj.getDate()
      },
      endDate: {
        year: endDateObj.getFullYear(),
        month: endDateObj.getMonth() + 1,
        day: endDateObj.getDate()
      }
    };
  } else if (annDateObj) {
    annotationResource.annotationDate = {
      year: annDateObj.getFullYear(),
      month: annDateObj.getMonth() + 1,
      day: annDateObj.getDate()
    };
  }
  
  // Build the parent string.
  const parent = "properties/" + ga4PropertyID;
  
  try {
    // Log the resource for debugging.
    Logger.log(JSON.stringify(annotationResource));
    
    // Call the create method on the AnalyticsAdmin service.
    // (Make sure you have enabled the AnalyticsAdmin API advanced service.)
    const result = AnalyticsAdmin.Properties.ReportingDataAnnotations.create(annotationResource, parent);
    SpreadsheetApp.getActiveSpreadsheet().toast("Annotation created: " + result.name, "Success");
    getGA4Annotations();
  } catch (err) {
    Logger.log("Error creating annotation: " + err);
    SpreadsheetApp.getActiveSpreadsheet().toast("Error creating annotation. See logs.", "Error");
  }
}

function getGA4AnnotationsManually() {
  try{
    manualAnnotationTrigger = true;
    getGA4Annotations(manualAnnotationTrigger);
  }catch(err){
    Logger.log('getGA4AnnotationsManually: '+err.stack);
    if(manualAnnotationTrigger) {
      SpreadsheetApp.getUi().alert('Error occoured in "getGA4AnnotationsManually" function: \n'+err);
    }
  } 
}

function getGA4Annotations() {
  try {
    if (!ga4PropertyID && manualAnnotationTrigger) {
      SpreadsheetApp.getUi().alert("GA4 Property ID is not set in Settings Sheet.");
      return;
    }

    // Get (or create) the target sheet "Annotations".
    const sheet = ss.getSheetByName(annotationTab);
    if (!sheet) {
      SpreadsheetApp.getUi().alert("Sheet "+annotationTab+" not found");
      return;
    }
        
    // Determine how many days back to query.
    const xDays = (reportingPeriodStart && manualAnnotationTrigger) ? reportingPeriodStart : 1;
    const filterDateStr = getDateXDaysFromToday(xDays);
    const filterDate = new Date(filterDateStr + 'T00:00:00Z');

    let allAnnotations = [];
    let pageToken = null;
    const parent = `properties/${ga4PropertyID}`;
    
do {
  const rsp = AnalyticsAdmin.Properties.ReportingDataAnnotations.list(
    parent, {
      pageSize: 200,
      pageToken: pageToken
    }
  );
  if (rsp.reportingDataAnnotations) {
    allAnnotations = allAnnotations.concat(rsp.reportingDataAnnotations);
  }
  pageToken = rsp.nextPageToken;
} while (pageToken);

    // Filter annotations by effective date.
    const filteredAnnotations = allAnnotations.filter(function(annotation) {
      let effectiveDate = null;
      if (annotation.annotationDate) {
        effectiveDate = new Date(dateObjectToString(annotation.annotationDate) + 'T00:00:00Z');
      } else if (annotation.annotationDateRange && annotation.annotationDateRange.startDate) {
        effectiveDate = new Date(dateObjectToString(annotation.annotationDateRange.startDate) + 'T00:00:00Z');
      }
      return effectiveDate && (effectiveDate >= filterDate);
    });
    
    Logger.log("Number of annotations after date filtering: " + filteredAnnotations.length);
    
    // Read helper values for category.
    const helperSheet = ss.getSheetByName('HelperAnnotationDropdown');
    const annotationCategoryManual = helperSheet.getRange('AnnotationGA4AnnotationManual').getValue();
    const annotationCategorySystem = helperSheet.getRange('AnnotationGA4AnnotationSystem').getValue();
        
    // Build allowed colors (from named range AnnotationColors).
    let allowedColors = [];
    helperSheet.getRange("AnnotationColors").getValues().forEach(function(row) {
      if (row[0]) allowedColors.push(row[0]);
    });
    
    // Build a map of existing annotations by name → sheet row number.
    const lastRow = sheet.getLastRow();
    let existingAnnotations = {};
    if (lastRow >= 9) {
      const dataValues = sheet.getRange(9, 1, lastRow - 8, sheet.getLastColumn()).getValues();
      dataValues.forEach(function(row, i) {
        const key = row[annotationIdColumn-1];
        if (key) existingAnnotations[key] = i + 9;
      });
    }
    
    // Determine next free row for appending new annotations.
    let nextNewRow = lastRow < 9 ? 9 : lastRow + 1;
    
    // Process each annotation: overwrite if exists, otherwise append.
    filteredAnnotations.forEach(function(annotation) {
      // Compute dates
      let annotationDate;
      let endDate;
      if (annotation.annotationDate) {
        annotationDate = dateObjectToString(annotation.annotationDate);
      }
      if (annotation.annotationDateRange) {
        if (annotation.annotationDateRange.startDate) {
          annotationDate = dateObjectToString(annotation.annotationDateRange.startDate);
        }
        if (annotation.annotationDateRange.endDate) {
          endDate = dateObjectToString(annotation.annotationDateRange.endDate);
        }
      }
      
      // Prepare row data
      const editValue    = annotation.systemGenerated ? '' : false;
      const categoryVal  = annotation.systemGenerated ? annotationCategorySystem : annotationCategoryManual;
      const combinedText = (annotation.title || '') + "\n" + (annotation.description || '');
      const rowData      = [
        annotationDate,       // A: Annotation Date
        endDate,              // B: End Date
        categoryVal,          // C: Category
        annotation.color,     // D: Color
        combinedText,         // E: Title & Description
        editValue,            // F: Edit checkbox
        'Not Available from API', // G: (annotationAddedBy placeholder)
        ss.getSheetByName(settingsTab).getRange('SettingsGA4Property').getValue(),           // H: (ga4Property placeholder)
        annotation.name       // I: Name (annotationId)
      ];
      
      // Decide row to write
      const rowNum = existingAnnotations[annotation.name] || nextNewRow++;
      sheet.getRange(rowNum, 1, 1, rowData.length).setValues([rowData]);
      
      // Edit checkbox in column F
      const editCell = sheet.getRange(rowNum, annotationEditColumn);
      if (!annotation.systemGenerated) {
        editCell.setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
        editCell.setValue(false);
      } else {
        editCell.clearDataValidations().setValue('');
      }
      
      // Color dropdown & formatting in column D
      const colorCell = sheet.getRange(rowNum, annotationColorColumn);
      const colorVal  = (annotation.color || '').toUpperCase();
  
      if (annotation.color && colorNameToColor[colorVal]) {
        colorCell.setBackground(colorNameToColor[colorVal]).setFontColor('#FFFFFF');
      } else {
        colorCell.setBackground(null).setFontColor(null);
      }
      
      // Remove any Category dropdown in column C
      sheet.getRange(rowNum, annotationCategoryColumn).clearDataValidations();
    });
    
    ss.toast("Annotations successfully fetched and merged!", "Success");
    
  } catch (err) {
    Logger.log("Error in getGA4Annotations: " + err.stack);
    SpreadsheetApp.getActiveSpreadsheet().toast("Error fetching annotations. See logs for details.", "Error");
  }
}


/**
 * Updates (patches) the currently selected annotation via the AnalyticsAdmin API.
 * 
 * It looks for the annotation row with a checked checkbox in the Edit column
 * and then reads updated values from the summary cells:
 * 
 * The function then constructs the patch resource object, sets the appropriate update mask,
 * and calls the API to update that annotation (using the ID from column G).
 */
function editGA4Annotation() {
  const sheet = ss.getSheetByName(annotationTab);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Sheet "+annotationTab+" not found");
    return;
  }
  
  const lastRow = sheet.getLastRow();
  const startRow = 9;
  const numRows  = Math.max(0, lastRow - startRow + 1);

  const dataRange = sheet.getRange(startRow, annotationEditColumn, numRows, 1).getValues();

  let checkedRow = null;
  for (let i = 0; i < dataRange.length; i++) {
    if (dataRange[i][0] === true) {
      checkedRow = i + startRow;
      break;
    }
  }
  if (!checkedRow) {
    SpreadsheetApp.getUi().alert("No annotation is selected for editing (no checkbox ticked).");
    return;
  }
  
  // Retrieve the annotation ID from Column G in the checked row.
  let annotationId = sheet.getRange(checkedRow, annotationIdColumn).getValue(); // Column G
  if (!annotationId) {
    SpreadsheetApp.getUi().alert("Selected annotation does not have a valid ID (name value).");
    return;
  }
  
  // Read updated values from the summary cells.
  const title = sheet.getRange(annotationTitleField).getValue(); // Title
  const description = sheet.getRange(annotationDescriptionField).getValue(); // Description
  const annDateVal = sheet.getRange(annotationDateStartField).getValue(); // Annotation Date
  const endDateVal = sheet.getRange(annotationDateEndField).getValue(); // End Date (optional)
  const color = sheet.getRange(annotationColorField).getValue(); // Color
   
  // Build the patch resource.
  const patchResource = {
    title: title,
    description: description,
    color: color
  };
  
  // Helper function to convert a value to a Date object.
  function toDateObj(val) {
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  
  const annDateObj = toDateObj(annDateVal);
  const endDateObj = toDateObj(endDateVal);
  
  // Build update mask and add the date field accordingly.
  let updateMask = "title,description,color";
  if (annDateObj && endDateObj) {
    patchResource.annotationDateRange = {
      startDate: {
        year: annDateObj.getFullYear(),
        month: annDateObj.getMonth() + 1,
        day: annDateObj.getDate()
      },
      endDate: {
        year: endDateObj.getFullYear(),
        month: endDateObj.getMonth() + 1,
        day: endDateObj.getDate()
      }
    };
    updateMask += ",annotationDateRange";
  } else if (annDateObj) {
    patchResource.annotationDate = {
      year: annDateObj.getFullYear(),
      month: annDateObj.getMonth() + 1,
      day: annDateObj.getDate()
    };
    updateMask += ",annotationDate";
  }
  
  // Ensure that the annotationId is in the correct format.
  // The API expects the 'name' to be like:
  // "properties/{propertyId}/reportingDataAnnotations/{annotationId}"
  // If annotationId does not include "properties/", prepend it.
  if (typeof annotationId === "string" && !annotationId.startsWith("properties/")) {
    annotationId = "properties/" + ga4PropertyID + "/reportingDataAnnotations/" + annotationId;
  }
  
  // Call the patch method.
  const parent = "properties/" + ga4PropertyID; // parent is not needed for patch if annotationId is full.
  try {
    const result = AnalyticsAdmin.Properties.ReportingDataAnnotations.patch(patchResource, annotationId, {
      updateMask: updateMask
    });
    SpreadsheetApp.getActiveSpreadsheet().toast("Annotation updated: " + result.name, "Success");
    getGA4AnnotationsManually();
  } catch (err) {
    Logger.log("Error patching annotation: " + err);
    SpreadsheetApp.getActiveSpreadsheet().toast("Error updating annotation. See logs.", "Error");
  }
}

function deleteGA4Annotation() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Are you sure you want to delete the Annotation?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    return; // User canceled deletion.
  }
  
  const sheet = ss.getSheetByName(annotationTab);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Sheet "+annotationTab+" not found");
    return;
  }
  
  // Look for the row (from row 9 onward) with a checked checkbox in Column F.
  const dataRange = sheet.getRange("F9:F" + sheet.getLastRow()).getValues();
  let targetRow = null;
  for (let i = 0; i < dataRange.length; i++) {
    if (dataRange[i][0] === true || dataRange[i][0] === "TRUE") {
      targetRow = i + 9;
      break;
    }
  }
  
  if (targetRow === null) {
    ui.alert("No annotation is selected for deletion (no checkbox ticked).");
    return;
  }
  
  // Retrieve the annotation ID from Column G of the selected row.
  let annotationId = sheet.getRange(targetRow, annotationIdColumn).getValue(); // Column G
  if (!annotationId) {
    ui.alert("The selected annotation does not have a valid ID.");
    return;
  }
  
  // Ensure the annotationId is in the full resource format.
  if (typeof annotationId === "string" && !annotationId.startsWith("properties/")) {
    annotationId = "properties/" + ga4PropertyID + "/reportingDataAnnotations/" + annotationId;
  }
  
  try {
    // Use the remove method since it works.
    AnalyticsAdmin.Properties.ReportingDataAnnotations.remove(annotationId);
    // Delete the row from the sheet.
    sheet.deleteRow(targetRow);
    ss.toast("Annotation deleted successfully.", "Success");
  } catch (err) {
    Logger.log("Error deleting annotation: " + err);
    ss.toast("Error deleting annotation. See logs.", "Error");
  }
}

function getGA4ChangeHistoryManually() {
  try{
    manualAnnotationTrigger = true;
    getGA4ChangeHistory(manualAnnotationTrigger);
  }catch(err){
    Logger.log('getGA4ChangeHistoryManually: '+err.stack);
    if(manualAnnotationTrigger) {
      SpreadsheetApp.getUi().alert('Error occoured in "getGA4ChangeHistoryManually" function: \n'+err);
    }
  } 
}

function getGA4ChangeHistory() {
  try{
    if (!ga4PropertyID && manualAnnotationTrigger) {
      SpreadsheetApp.getUi().alert("GA4 Property ID is not set in Settings Sheet.");
      return;
    }
    
    const obscureEmail = (email) => {
      const [name, domain] = email.split('@');
      return `${name[0]}${new Array(name.length).join('*')}@${domain}`;
    };

    const xDays = reportingPeriodStart && manualAnnotationTrigger ? reportingPeriodStart: 1; // 1 day if data is not downloaded manually
    const dateXDaysFromToday = getDateXDaysFromToday(xDays);
   
    const changeHistoryAPI = AnalyticsAdmin.Accounts.searchChangeHistoryEvents; // Analytics API Change History
    const propertyHistory = changeHistoryAPI(
      {
        property: `properties/${ga4PropertyID}`,
        earliestChangeTime: dateXDaysFromToday+'T00:00:00Z',
        pageSize: 200
      }, 
      `accounts/${ga4AccountID}`
    )
    
    if (propertyHistory && propertyHistory.changeHistoryEvents) {
      const historyResult = propertyHistory.changeHistoryEvents;
      const changeHistoryEvents = [];

      historyResult.forEach((history) => {

        // 1) filter out any annotation‐only changes:
        const relevantChanges = history.changes.filter(change => {
          const ra = change.resourceAfterChange;
          return !(ra && ra.reportingDataAnnotation);
        });

        // if you want to skip entire events that only had annotations:
        if (relevantChanges.length === 0) return;

        let annotationAddedBy = history.userActorEmail ? history.userActorEmail : '';
  
        if (annotationSettings === 'Redacted') {
          annotationAddedBy = obscureEmail(annotationAddedBy);
        } else if (annotationSettings === 'No') {
          annotationAddedBy = 'Hidden by Settings';
        }
        const annotation = {
        userActorEmail: annotationAddedBy,
        id: history.id,
        changeTime: history.changeTime ? history.changeTime.split('T')[0] : '',
        changes: relevantChanges.map(change => {
          const resourceAfterChange = change.resourceAfterChange;

          let resourceData = {};

          if ( // Handling adsenseLink
            resourceAfterChange && resourceAfterChange.adsenseLink
          ) {
            resourceData = {
              action: change.action,
              resource: 'Ad Client Code: ' + resourceAfterChange.adsenseLink.adClientCode,
              itemType: 'Adsense Link',
            };
          } else if ( // Handling attributionSettings
            resourceAfterChange && resourceAfterChange.attributionSettings
          ) {
            resourceData = {
              action: change.action,
              resource: 'Reporting Attribution Model: ' + resourceAfterChange.attributionSettings.reportingAttributionModel+
                        '. Acquisition Conversion Event Lookback Window: ' + resourceAfterChange.attributionSettings.acquisitionConversionEventLookbackWindow+
                        '. Ads Web Conversion Data Export Scope: ' + resourceAfterChange.attributionSettings.adsWebConversionDataExportScope+
                        '. Other Conversion Event Lookback Window: ' + resourceAfterChange.attributionSettings.otherConversionEventLookbackWindow,
              itemType: 'Attribution Settings',
            };
          } else if ( // Handling audience
            resourceAfterChange && resourceAfterChange.audience
          ) {
            resourceData = {
              action: change.action,
              resource: '\nDisplay Name: ' + resourceAfterChange.audience.displayName + 
                        '. \nAds Personalization Enabled: ' + resourceAfterChange.audience.adsPersonalizationEnabled + 
                        '. Avent Trigger: ' + resourceAfterChange.audience.eventTrigger + 
                        '. Exclusion Duration Mode: ' + resourceAfterChange.audience.exclusionDurationMode + 
                        '. Filter Clauses: ' + resourceAfterChange.audience.filterClauses + 
                        '. Membership Duration Days: ' + resourceAfterChange.audience.membershipDurationDays,
              itemType: 'Audience',
            };
          } else if ( // Handling bigqueryLink
            resourceAfterChange && resourceAfterChange.bigqueryLink
          ) {
            resourceData = {
              action: change.action,
              resource: '\nProject: ' + resourceAfterChange.bigqueryLink.project + 
                        '. \nDaily Export Enabled: ' + resourceAfterChange.bigqueryLink.dailyExportEnabled + 
                        '. Excluded Events: ' + resourceAfterChange.bigqueryLink.excludedEvents + 
                        '. Fresh Daily Export Enabled: ' + resourceAfterChange.bigqueryLink.freshDailyExportEnabled + 
                        '. Include Advertising Id: ' + resourceAfterChange.bigqueryLink.includeAdvertisingId + 
                        '. Streaming Export Enabled: ' + resourceAfterChange.bigqueryLink.streamingExportEnabled,
              itemType: 'BigQuery Link',
            };
          } else if ( // Handling channelGroup
            resourceAfterChange && resourceAfterChange.calculatedMetrics
          ) {
            resourceData = {
              action: change.action,
              resource: '\nDisplay Name: '+ resourceAfterChange.calculatedMetrics.displayName +
                        '. Calculated Metric Id: ' + resourceAfterChange.calculatedMetrics.calculatedMetricId +
                        '. \nMetric Unit: ' + resourceAfterChange.calculatedMetrics.metricUnit +
                        '. Formula: ' + resourceAfterChange.calculatedMetrics.formula +
                        '. Restricted Metric Type: ' + resourceAfterChange.calculatedMetrics.restrictedMetricType,
              itemType: 'Calculated Metric',
            };
          } else if ( // Handling channelGroup
            resourceAfterChange && resourceAfterChange.channelGroup
          ) {
            resourceData = {
              action: change.action,
              resource: '\nDisplay Name: ' + resourceAfterChange.channelGroup.displayName + 
                        '. \nSystem Defined: ' + resourceAfterChange.channelGroup.systemDefined,
              itemType: 'Channel Group',
            };
          } else if ( // Handling conversion event
            resourceAfterChange && resourceAfterChange.conversionEvent
          ) {
            resourceData = {
              action: change.action,
              resource: '\nEvent Name: ' + resourceAfterChange.conversionEvent.eventName,
              itemType: 'Conversion Event',
            };
          } else if ( // Handling key event
            resourceAfterChange && resourceAfterChange.keyEvent
          ) {
            resourceData = {
              action: change.action,
              resource: '\nEvent Name: ' + resourceAfterChange.keyEvent.eventName,
              itemType: 'Key Event',
            };
          } else if( // Handling custom dimensions
            resourceAfterChange && resourceAfterChange.customDimension
          ) {
            resourceData = {
              action: change.action,
              resource: '\nDisplay Name: '+ resourceAfterChange.customDimension.displayName +
                        '. Parameter Name: ' + resourceAfterChange.customDimension.parameterName +
                        '. \nScope: ' + resourceAfterChange.customDimension.scope +
                        '. Disallow Ads Personalization: ' + resourceAfterChange.customDimension.disallowAdsPersonalization,
              itemType: 'Custom Dimension',
            };
          } else if ( // Handling custom metrics
            resourceAfterChange && resourceAfterChange.customMetric
          ) {
            resourceData = {
              action: change.action,
              resource: '\nDisplay Name: '+resourceAfterChange.customMetric.displayName +
                        '. Parameter Name: ' + resourceAfterChange.customMetric.parameterName +
                        '. \nMeasurement Unit: ' + resourceAfterChange.customMetric.measurementUnit +
                        '. Scope: ' + resourceAfterChange.customMetric.scope +
                        '. Restricted Metric Type: ' + resourceAfterChange.customMetric.restrictedMetricType,
              itemType: 'Custom Metric',
            };
          } else if ( // Handling dataRedactionSettings
            resourceAfterChange && resourceAfterChange.dataRedactionSettings
          ) {
            resourceData = {
              action: change.action,
              resource: '\nEmail Redaction: '+resourceAfterChange.dataRedactionSettings.emailRedactionEnabled+
                        '. \nQuery Parameter Keys: '+resourceAfterChange.dataRedactionSettings.queryParameterKeys+
                        '. \nQuery Parameter Redaction Enabled: '+resourceAfterChange.dataRedactionSettings.queryParameterRedactionEnabled,
              itemType: 'Data Redaction Settings',
            };
          } else if ( // Handling data retention settings
            resourceAfterChange && resourceAfterChange.dataRetentionSettings
          ) {
            resourceData = {
              action: change.action,
              resource: '\nEvent Data Retention: ' + resourceAfterChange.dataRetentionSettings.eventDataRetention + 
                        '. \nReset User Data On New Activity: ' + resourceAfterChange.dataRetentionSettings.resetUserDataOnNewActivity,
              itemType: 'Data Retention Settings',
            };
          } else if ( // Handling dataStream
            resourceAfterChange && resourceAfterChange.dataStream
          ) {
            resourceData = {
              action: change.action,
              resource: '\nDisplay Name: ' + resourceAfterChange.dataStream.displayName + 
                        '. Type: ' + resourceAfterChange.dataStream.type + 
                        '. \nWeb Stream Data: ' + resourceAfterChange.dataStream.webStreamData + 
                        '. Android App Stream Data: ' + resourceAfterChange.dataStream.androidAppStreamData + 
                        '. iOS App Stream Data: ' + resourceAfterChange.dataStream.iosAppStreamData,
              itemType: 'Data Stream',
            };
          } else if ( // Handling displayVideo360AdvertiserLink
            resourceAfterChange && resourceAfterChange.displayVideo360AdvertiserLink
          ) {
            resourceData = {
              action: change.action,
              resource: '\nAdvertiser Display Name: ' + resourceAfterChange.displayVideo360AdvertiserLink.advertiserDisplayName + 
                        '. Advertiser Id: ' + resourceAfterChange.displayVideo360AdvertiserLink.advertiserId + 
                        '. \nAds Personalization Enabled: ' + resourceAfterChange.displayVideo360AdvertiserLink.adsPersonalizationEnabled + 
                        '. Campaign Data Sharing Enabled: ' + resourceAfterChange.displayVideo360AdvertiserLink.campaignDataSharingEnabled + 
                      '. Cost Data Sharing Enabled: ' + resourceAfterChange.displayVideo360AdvertiserLink.costDataSharingEnabled,
              itemType: 'Display Video 360 Advertiser Link',
            };
          } else if ( // Handling displayVideo360AdvertiserLinkProposal
            resourceAfterChange && resourceAfterChange.displayVideo360AdvertiserLinkProposal
          ) {
            resourceData = {
              action: change.action,
              resource: '\nAdvertiser Display Name: ' + resourceAfterChange.displayVideo360AdvertiserLinkProposal.advertiserDisplayName + 
                        '. Advertiser Id: ' + resourceAfterChange.displayVideo360AdvertiserLinkProposal.advertiserId + 
                        '. \nAds Personalization Enabled: ' + resourceAfterChange.displayVideo360AdvertiserLinkProposal.adsPersonalizationEnabled + 
                        '. Campaign Data Sharing Enabled: ' + resourceAfterChange.displayVideo360AdvertiserLinkProposal.campaignDataSharingEnabled + 
                        '. Cost Data Sharing Enabled: ' + resourceAfterChange.displayVideo360AdvertiserLinkProposal.costDataSharingEnabled + 
                        '. Link Proposal Status Details: ' + resourceAfterChange.displayVideo360AdvertiserLinkProposal.linkProposalStatusDetails,
              itemType: 'Display Video 360 Advertiser Link Proposal',
            };
          } else if ( // Handling enhancedMeasurementSettings
            resourceAfterChange && resourceAfterChange.enhancedMeasurementSettings
          ) {
            resourceData = {
              action: change.action,
              resource: '\nFile Download: '+resourceAfterChange.enhancedMeasurementSettings.fileDownloadsEnabled+
                        '. \nForm Interaction: '+resourceAfterChange.enhancedMeasurementSettings.formInteractionsEnabled+
                        '. \nOutbound Click: '+resourceAfterChange.enhancedMeasurementSettings.outboundClicksEnabled+
                        '. \nPage Changes: '+resourceAfterChange.enhancedMeasurementSettings.pageChangesEnabled+
                        '. \nScroll: '+resourceAfterChange.enhancedMeasurementSettings.scrollsEnabled+
                        '. \nSearch Query Parameter: '+resourceAfterChange.enhancedMeasurementSettings.searchQueryParameter+
                        '. \nSite Search Enabled: '+resourceAfterChange.enhancedMeasurementSettings.siteSearchEnabled+
                        '. \nStream Enabled: '+resourceAfterChange.enhancedMeasurementSettings.streamEnabled+
                        '. \nQuery Parameter: '+resourceAfterChange.enhancedMeasurementSettings.uriQueryParameter+
                        '. \nVideo: '+resourceAfterChange.enhancedMeasurementSettings.videoEngagementEnabled,
              itemType: 'Enhanced Measurement Settings',
            };
          } else if ( // Handling eventCreateRule
            resourceAfterChange && resourceAfterChange.eventCreateRule
          ) {
            resourceData = {
              action: change.action,
              resource: '\nDestination Event: ' + resourceAfterChange.eventCreateRule.destinationEvent + 
                        '. Event Conditions: ' + resourceAfterChange.eventCreateRule.eventConditions + 
                        '. \nParameter Mutations: ' + resourceAfterChange.eventCreateRule.parameterMutations + 
                        '. Source Copy Parameters: ' + resourceAfterChange.eventCreateRule.sourceCopyParameters,
              itemType: 'Event Create Rule',
            };
          } else if ( // Handling expandedDataSet
            resourceAfterChange && resourceAfterChange.expandedDataSet
          ) {
            resourceData = {
              action: change.action,
              resource: '\nDisplay Name: ' +resourceAfterChange.expandedDataSet.displayName,
              itemType: 'Expanded Data Set',
            };
          } else if ( // Handling googleAdsLink
            resourceAfterChange && resourceAfterChange.googleAdsLink
          ) {
            resourceData = {
              action: change.action,
              resource: '\nCustomer Id: ' + resourceAfterChange.googleAdsLink.customerId +
                        '. \nAds Personalization Enabled: ' + resourceAfterChange.googleAdsLink.adsPersonalizationEnabled +
                        '. Can Manage Clients: ' + resourceAfterChange.googleAdsLink.canManageClients,
              itemType: 'Google Ads Link',
            };
          } else if ( // Handling firebaseLink
            resourceAfterChange && resourceAfterChange.firebaseLink
          ) {
            resourceData = {
              action: change.action,
              resource: '\nProject: ' + resourceAfterChange.firebaseLink.project,
              itemType: 'Firebase Link',
            };
          } else if (// Handling googleSignalsSettings
            resourceAfterChange && resourceAfterChange.googleSignalsSettings
          ) {
            resourceData = {
              action: change.action,
              resource: '\nState: ' + resourceAfterChange.googleSignalsSettings.state + 
                        '. Consent: ' + resourceAfterChange.googleSignalsSettings.consent,
              itemType: 'Google Signals Settings',
            };
          } else if ( // Handling measurementProtocolSecret
            resourceAfterChange && resourceAfterChange.measurementProtocolSecret
          ) {  
            resourceData = {
              action: change.action,
              resource: '\nDisplay Name: ' + resourceAfterChange.measurementProtocolSecret.displayName,
              itemType: '. Measurement Protocol Secret',
            };
          } else if ( // Handling property settings
            resourceAfterChange && resourceAfterChange.property
          ) {
            resourceData = {
              action: change.action,
              resource: '\nDisplay Name: ' + resourceAfterChange.property.displayName + 
                        '. \nCurrency Code:' + resourceAfterChange.property.currencyCode + 
                        '. Inducstry Category:' + resourceAfterChange.property.industryCategory + 
                        '. Property Type:' + resourceAfterChange.property.propertyType + 
                        '. Service Level:' + resourceAfterChange.property.serviceLevel + 
                        '. Time Zone:' + resourceAfterChange.property.timeZone,
              itemType: 'Property',
            };
          } else if ( // Handling searchAds360Link
            resourceAfterChange && resourceAfterChange.searchAds360Link
          ) {
            resourceData = {
              action: change.action,
              resource: '\nAdvertiser Display Name: ' + resourceAfterChange.searchAds360Link.advertiserDisplayName + 
                        '. Advertiser Id: ' + resourceAfterChange.searchAds360Link.advertiserId +
                        '. \nAds Personalization Enabled: ' + resourceAfterChange.searchAds360Link.adsPersonalizationEnabled + 
                        '. Campaign Data Sharing Enabled: ' + resourceAfterChange.searchAds360Link.campaignDataSharingEnabled + 
                        '. Cost Data Sharing Enabled: ' + resourceAfterChange.searchAds360Link.costDataSharingEnabled + 
                        '. Site Stats Sharing Enabled: ' + resourceAfterChange.searchAds360Link.siteStatsSharingEnabled,
              itemType: 'Search Ads 360 Link',
            };
          } else if ( // Handling skadnetworkConversionValueSchema
            resourceAfterChange && resourceAfterChange.skadnetworkConversionValueSchema
          ) {
            resourceData = {
              action: change.action,
              resource: '\nApply Conversion Values: ' + resourceAfterChange.skadnetworkConversionValueSchema.applyConversionValues +
                        '. \nPostback Window One: ' + resourceAfterChange.skadnetworkConversionValueSchema.postbackWindowOne +
                        '. Postback Window Two: ' + resourceAfterChange.skadnetworkConversionValueSchema.postbackWindowTwo +
                        '. Postback Window Three: ' + resourceAfterChange.skadnetworkConversionValueSchema.postbackWindowThree,
              itemType: 'Skadnetwork Conversion Value Schema',
            };
          } else if ( // Handling if something else is added to the API
            change.resource && resourceAfterChange && Object.keys(resourceAfterChange).length > 0
          ) {
            resourceData = {
              action: change.action,
              resource: resourceAfterChange,
              itemType: 'New Item Type in API\n',
            };
          } else if (change.action && (!resourceAfterChange || Object.keys(resourceAfterChange).length === 0)) {
            // Handling the case when resourceAfterChange is empty
            let itemType = change.resource;
            if (itemType) {

              // Mapping object
              const itemTypeMapping = {
                'customDimensions': 'Custom Dimension',
                'customMetrics': 'Custom Metric',
                'conversionEvents': 'Conversion Events',
                'keyEvents': 'Key Events',
                'calculatedMetrics': 'Calculated Metric',
                'googleSignalsSettings': 'Google Signals Settings',
                'dataRetentionSettings': 'Data Retention Settings',
                'eventDataRetention': 'Event Data Retention',
                'property': 'Property',
                'adsenseLink': 'Adsense Link',
                'attributionSettings': 'Attribution Settings',
                'audience': 'Audience',
                'bigqueryLink': 'BigQuery Link',
                'channelGroup': 'Channel Group',
                'dataRedactionSettings': 'Data Redaction Settings',
                'dataRetentionSettings': 'Data Retention Settings',
                'dataStream': 'Data Stream',
                'displayVideo360AdvertiserLink': 'Display Video 360 Advertiser Link',
                'displayVideo360AdvertiserLinkProposal': 'Display Video 360 Advertiser Link Proposal',
                'enhancedMeasurementSettings': 'Enhanced Measurement Settings',
                'eventCreateRule': 'Event Create Rule',
                'expandedDataSet': 'Expanded Data Set',
                'googleAdsLink': 'Google Ads Link',
                'firebaseLink': 'Firebase Link',
                'measurementProtocolSecret': 'Measurement Protocol Secret',
                'searchAds360Link': 'Search Ads 360 Link',
                'skadnetworkConversionValueSchema': 'Skadnetwork Conversion Value Schema',
              };

              // Using the mapping to set the itemType
              for (const key in itemTypeMapping) {
                if (itemType.indexOf(key) > -1) {
                  itemType = itemTypeMapping[key];
                  break;
                }
              } 
            }

            resourceData = {
              action: change.action,
              resource: '\nResource: ' + change.resource,
              itemType: itemType,
            };
          }

          return resourceData;
        }),
      };

      // Flatten the changes array into the top-level object
      annotation.changes.forEach(change => {
        Object.assign(annotation, change);
      });

      // Remove the changes
      delete annotation.changes;

      changeHistoryEvents.push(annotation);
 
      });
    
      const annotationSheet = ss.getSheetByName(annotationTab);
      let count = annotationSheet.getRange(annotationRangeColumn).getDisplayValues().flat().filter(String).length;
      let rows = annotationSheet.getDataRange().offset(headerRowNumber, 0, count).getValues();

      const helperSheet = ss.getSheetByName('HelperAnnotationDropdown');
      const annotationCategory = helperSheet.getRange('AnnotationGA4ChangeHistory').getValue();

      const sheetData = [];
      rows.forEach((row, index) => {
        if (row[annotationIdColumn-1]) {
          const annotation = {
            id: row[annotationIdColumn-1].trim(),
            changeTime: row[annotationDateColumn-1],
            userActorEmail: row[annotationAddedByColumn-1].trim(),
            annotationCategory: annotationCategory,
            annotationText: row[annotationDescriptionColumn-1].trim(),
            length: index
          }
          sheetData.push(annotation);
        }
      });
 
      const annotationData = [];
      const annotationDataDocumented = [];

      if(changeHistoryEvents) {
        changeHistoryEvents.forEach((annotation) => {
          annotationData.push(annotation);
          sheetData.forEach((sheetData) => {
            if(annotation.id === sheetData.id) {
              annotationDataDocumented.push(annotation);
            }
          });
        });
      }

      const undocumentedAnnotations = annotationData.filter(annotation => !annotationDataDocumented.includes(annotation));

      // Add undocumented Annotations to the end of the Annotation Sheet
      undocumentedAnnotations.forEach((annotation) => {

        const annotationDate = annotation.changeTime;
        const annotationAddedBy = annotation.userActorEmail;
        const annotationText = annotation.itemType + ': ' + annotation.action + '. ' + annotation.resource;
        const ga4Property = ss.getSheetByName(settingsTab).getRange('SettingsGA4Property').getValue();
        const annotationId = annotation.id;

        annotationSheet.appendRow([annotationDate, , annotationCategory, , annotationText, , annotationAddedBy, ga4Property, annotationId]);
      });
    
      if(manualAnnotationTrigger) {
        ss.toast('GA4 Property Change History has been updated.');
      }
    }
  }catch(err){
    Logger.log('getGA4ChangeHistory: '+err.stack);
    if(manualAnnotationTrigger) {
      SpreadsheetApp.getUi().alert('Error occoured in "getGA4ChangeHistory" function: \n'+err);
    }
  } 
}
