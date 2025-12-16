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

/* **** GOOGLE ANALYTICS 4 ADMIN API
Create, update and delete Custom Dimensions or Metrics
Developer documentation:
https://developers.google.com/analytics/devguides/config/admin/v1
*/

// Untick Action/Edit Parameter Checkboxes
function parameterCheckBoxesUnTick() {
  try {
    const dataRange = parameterSheet.getRange(headerRowNumber + 1, parameterEditCheckboxColumn, parameterCount);
    const values = dataRange.getValues();

    const newValues = values.map(row => row.map(cellValue => cellValue === true ? false : cellValue));

    dataRange.setValues(newValues);
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Checkboxes are unticked.',
      'Done',
      5
    );
  } catch (err) {
    Logger.log('checkBoxesUntick: ' + err.stack);
  }
}
// Tick Action/Edit Parameter Checkboxes
function parameterCheckBoxesTick() {
  try {
    const dataRange = parameterSheet.getRange(headerRowNumber + 1, parameterEditCheckboxColumn, parameterCount);
    const values = dataRange.getValues();

    const newValues = values.map(row => row.map(cellValue => cellValue === false ? true : cellValue));

    dataRange.setValues(newValues);
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Checkboxes are ticked.',
      'Done',
      5
    );
  } catch (err) {
    Logger.log('checkBoxesTick: ' + err.stack);
  }
}

// **** CUSTOM DIMENSIONS & METRICS
function getGA4ParameterData() {
  if(getGA4DataFrom === 'API') {
    getGA4CustomDimensions()
  } else {
    getGA4ParameterDataFromBigQuery()
  }
}

// **** CUSTOM DIMENSIONS
function getGA4CustomDimensions() {
  try{
    if (!ga4PropertyIDParameters) {
      SpreadsheetApp.getUi().alert("GA4 Property ID is not set in Parameters Sheet.");
      return;
    }

    const sheetData = [];
    parameterRows.forEach((row, index) => {
      if (row[parameterTypeColumn-1] === customDimensionType) {
        const parameter = {
          parameterName: row[parameterNameColumn-1].trim(),
          name: row[parameterResourceNameColumn-1].trim(),
          scope: row[parameterScopeColumn-1].trim(),
          disallowAdsPersonalization: row[parameterDisallowAdsPersonalizationColumn-1],
          checkbox: row[parameterEditCheckboxColumn-1],
          length: index
        }
        sheetData.push(parameter);
      }
    });
  
    // Clear existing GA4 Resource Name from Sheet
    parameterSheet.getRange(headerRowNumber+1, parameterResourceNameColumn,parameterLastRow,1).clearContent();
    parameterSheet.getRange(headerRowNumber+1, parameterCountColumn,parameterLastRow,1).clearContent();

    // Define some initial setup, assuming these variables are initialized earlier in your script
    const customDimensionsAPI = AnalyticsAdmin.Properties.CustomDimensions; // Analytics API Custom Dimensions
    let pageToken;
    let customDimensions = [];
    const dimensionData = [];
    const dimensionDataDocumented = [];

    do {
      const response = customDimensionsAPI.list(
        `properties/${ga4PropertyIDParameters}`,
        {pageSize: 200, pageToken: pageToken}
      );

      customDimensions = customDimensions.concat(response.customDimensions || []);
      pageToken = response.nextPageToken; // Update pageToken for the next iteration

      customDimensions.forEach((customDimension) => {
        dimensionData.push(customDimension);
        parameterSheet.getRange(sheetData.length + headerRowNumber + 1, parameterDisallowAdsPersonalizationColumn).clearContent();
        sheetData.forEach((row) => {
           if (customDimension.parameterName === row.parameterName && customDimension.scope === row.scope) {
            const rowIndex = row.length + headerRowNumber + 1; 
            parameterSheet.getRange(rowIndex, parameterResourceNameColumn).setValue(customDimension.name);
            if (row.checkbox) {
              parameterSheet.getRange(rowIndex, parameterDisplayNameColumn).setValue(customDimension.displayName);
              parameterSheet.getRange(rowIndex, parameterNameColumn).setValue(customDimension.parameterName);
              parameterSheet.getRange(rowIndex, parameterScopeColumn).setValue(customDimension.scope);
              parameterSheet.getRange(rowIndex, parameterDescriptionColumn).setValue(customDimension.description);
              if (customDimension.disallowAdsPersonalization) {
                parameterSheet.getRange(rowIndex, parameterDisallowAdsPersonalizationColumn).insertCheckboxes();
                parameterSheet.getRange(rowIndex, parameterDisallowAdsPersonalizationColumn).setValue(customDimension.disallowAdsPersonalization);
              }
            }
            dimensionDataDocumented.push(customDimension);
          }
        });
      });
      Utilities.sleep(utilitieSleep);
    } while (pageToken);

    if(dimensionData.length === 0) {
      SpreadsheetApp.getUi().alert("No Custom Dimensions was found in GA4 Property:\n"+ga4PropertyNameAndIDParameters);
    }
    const unDocumentedDimensions = dimensionData.filter(parameterName => !dimensionDataDocumented.includes(parameterName) && parameterName !== "");

    // Data Validation Rules
    const dimensionScopeRange = ss.getSheetByName(helperDropDownTab).getRange('HelperParameterScope');
    const dimensionScopeRule = SpreadsheetApp.newDataValidation().requireValueInRange(dimensionScopeRange).build();
    const dimensionTypeRange = ss.getSheetByName(helperDropDownTab).getRange('HelperParameterType');
    const dimensionTypeRule = SpreadsheetApp.newDataValidation().requireValueInRange(dimensionTypeRange).build();
    const dimensionFormatRange = ss.getSheetByName(helperDropDownTab).getRange('HelperCustomDimensionFormat');
    const dimensionFormatRule = SpreadsheetApp.newDataValidation().requireValueInRange(dimensionFormatRange).build();

    // Add undocumented Dimensions to the end of the Parameters Sheet
    unDocumentedDimensions.forEach((unDocumentedDimensions,index) => {
      parameterSheet.getRange(parameterLastRow+1+index,parameterDisplayNameColumn).setValue(unDocumentedDimensions.displayName);
      parameterSheet.getRange(parameterLastRow+1+index,parameterNameColumn).setValue(unDocumentedDimensions.parameterName);
      parameterSheet.getRange(parameterLastRow+1+index,parameterDescriptionColumn).setValue(unDocumentedDimensions.description);
      parameterSheet.getRange(parameterLastRow+1+index,parameterResourceNameColumn).setValue(unDocumentedDimensions.name);
      if(unDocumentedDimensions.scope === userScopeDimension) {
        parameterSheet.getRange(parameterLastRow+1+index,parameterDisallowAdsPersonalizationColumn).insertCheckboxes();
        parameterSheet.getRange(parameterLastRow+1+index,parameterDisallowAdsPersonalizationColumn).setValue(unDocumentedDimensions.disallowAdsPersonalization)
      }
      parameterSheet.getRange(parameterLastRow+1+index,parameterScopeColumn).setDataValidation(dimensionScopeRule);
      parameterSheet.getRange(parameterLastRow+1+index,parameterScopeColumn).setValue(unDocumentedDimensions.scope);
      parameterSheet.getRange(parameterLastRow+1+index,parameterTypeColumn).setDataValidation(dimensionTypeRule);
      parameterSheet.getRange(parameterLastRow+1+index,parameterTypeColumn).setValue(customDimensionType);
      parameterSheet.getRange(parameterLastRow+1+index,parameterFormatColumn).setDataValidation(dimensionFormatRule);
      parameterSheet.getRange(parameterLastRow+1+index,parameterFormatColumn).setValue(customDimensionFormat);
    });

    // Get GA4 Custom Metrcis
    getGA4CustomMetrics();

  }catch(err){
    Logger.log('getGA4CustomDimensions: '+err.stack);
    SpreadsheetApp.getUi().alert('Error occoured in "getGA4CustomDimensions" function: \n'+err);
  }
}

// **** CUSTOM METRICS
function getGA4CustomMetrics() {
  try{
    if (!ga4PropertyIDParameters) {
      SpreadsheetApp.getUi().alert("GA4 Property ID is not set in Parameters Sheet.");
      return;
    }
    
    const sheetData = [];
    parameterRows.forEach((row, index) => {
      if (row[parameterTypeColumn-1] === customMetricType) {
        const parameter = {
          parameterName: row[parameterNameColumn-1].trim(),
          scope: row[parameterScopeColumn-1].trim(),
          name: row[parameterResourceNameColumn-1].trim(),
          checkbox: row[parameterEditCheckboxColumn-1],
          length: index
        }
        sheetData.push(parameter);
      }
    });

    const customMetricsAPI = AnalyticsAdmin.Properties.CustomMetrics; // Analytics API Custom Metrics
    let pageToken; // Start with no pageToken
    let customMetrics = [];
    const metricData = [];
    const metricDataDocumented = [];

    do {
      // Make the API call with the current pageToken
      const response = customMetricsAPI.list(
        `properties/${ga4PropertyIDParameters}`,
        {pageSize: 200, pageToken: pageToken}
      );

      pageToken = response.nextPageToken; // Update pageToken for the next iteration
      customMetrics = customMetrics.concat(response.customMetrics || []);
   
      customMetrics.forEach((customMetrics) => {
        metricData.push(customMetrics);
        sheetData.forEach((row) => {
          if(customMetrics.parameterName === row.parameterName && customMetrics.scope === row.scope) {
            const rowIndex = row.length + headerRowNumber + 1;   
            parameterSheet.getRange(rowIndex, parameterResourceNameColumn).setValue(customMetrics.name);
            if(row.checkbox) {
              parameterSheet.getRange(rowIndex, parameterDisplayNameColumn).setValue(customMetrics.displayName);
              parameterSheet.getRange(rowIndex, parameterDescriptionColumn).setValue(customMetrics.description);
              parameterSheet.getRange(rowIndex, parameterFormatColumn).setValue(customMetrics.measurementUnit);
            }
            metricDataDocumented.push(customMetrics);
          }
        });
      });
      Utilities.sleep(utilitieSleep);
  } while (pageToken); // Continue until there's no more pageToken

     if(metricData.length === 0) {
      SpreadsheetApp.getUi().alert("No Custom Metrics was found in GA4 Property:\n"+ga4PropertyNameAndIDParameters);
    }

    const unDocumentedMetrics = metricData.filter(parameterName => !metricDataDocumented.includes(parameterName) && parameterName !== "");
      
    // Data Validation Rules (Drop Down List)
    const metricScopeRange = ss.getSheetByName(helperDropDownTab).getRange('HelperParameterScope');
    const metricScopeRule = SpreadsheetApp.newDataValidation().requireValueInRange(metricScopeRange).build();
    const metricTypeRange = ss.getSheetByName(helperDropDownTab).getRange('HelperParameterType');
    const metricTypeRule = SpreadsheetApp.newDataValidation().requireValueInRange(metricTypeRange).build();
    const metricFormatRange = ss.getSheetByName(helperDropDownTab).getRange('HelperCustomMetricFormat');
    const metricFormatRule = SpreadsheetApp.newDataValidation().requireValueInRange(metricFormatRange).build();

    // Add undocumented Metrics to the end of the Parameters Sheet
    unDocumentedMetrics.forEach((unDocumentedMetrics,index) => {
      parameterSheet.getRange(parameterLastRow+1+index,parameterDisplayNameColumn).setValue(unDocumentedMetrics.displayName);
      parameterSheet.getRange(parameterLastRow+1+index,parameterNameColumn).setValue(unDocumentedMetrics.parameterName);
      parameterSheet.getRange(parameterLastRow+1+index,parameterDescriptionColumn).setValue(unDocumentedMetrics.description);
      parameterSheet.getRange(parameterLastRow+1+index,parameterResourceNameColumn).setValue(unDocumentedMetrics.name);

      parameterSheet.getRange(parameterLastRow+1+index,parameterScopeColumn).setDataValidation(metricScopeRule);
      parameterSheet.getRange(parameterLastRow+1+index,parameterScopeColumn).setValue(unDocumentedMetrics.scope);
      parameterSheet.getRange(parameterLastRow+1+index,parameterTypeColumn).setDataValidation(metricTypeRule);
      parameterSheet.getRange(parameterLastRow+1+index,parameterTypeColumn).setValue(customMetricType);
      parameterSheet.getRange(parameterLastRow+1+index,parameterFormatColumn).setDataValidation(metricFormatRule);
      parameterSheet.getRange(parameterLastRow+1+index,parameterFormatColumn).setValue(unDocumentedMetrics.measurementUnit);
    });

  }catch(err){
    Logger.log('getGA4CustomMetrics: '+err.stack);
    SpreadsheetApp.getUi().alert('Error occoured in "getGA4CustomMetrics" function: \n'+err);
  }
}

function createGA4CustomDimensionsMetrics() {
  try {
    if (!ga4PropertyIDParameters) {
      SpreadsheetApp.getUi().alert("GA4 Property ID is not set in Parameters Sheet.");
      return;
    }

    const ui = SpreadsheetApp.getUi();
    const customDimensionsAPI = AnalyticsAdmin.Properties.CustomDimensions;
    const customMetricsAPI = AnalyticsAdmin.Properties.CustomMetrics;

    var validationErrors = [];
    var createdCount = 0;

    var parameterNameRegex = /^[A-Za-z][A-Za-z0-9_]*$/;
    var displayNameRegex = /^[A-Za-z][A-Za-z0-9_ ]*$/;

    function validateParameterRow(row, index) {
      var errors = [];

      var parameterName = (row[parameterNameColumn - 1] || "").trim();
      var displayName = (row[parameterDisplayNameColumn - 1] || "").trim();
      var description = (row[parameterDescriptionColumn - 1] || "").trim();
      var scope = (row[parameterScopeColumn - 1] || "").trim();
      var scopeUpper = scope.toUpperCase();

      // --- parameterName validation ---
      if (!parameterName) {
        errors.push("Parameter Name is empty.");
      } else {
        if (!parameterNameRegex.test(parameterName)) {
          errors.push("Parameter Name must start with a letter and contain only letters, numbers, and underscores.");
        }

        // Max length: 24 for USER scope, 40 for others (EVENT, etc.)
        var maxParamLen = scopeUpper === "USER" ? 24 : 40;
        if (parameterName.length > maxParamLen) {
          errors.push(
            "Parameter Name length (" +
              parameterName.length +
              ") exceeds maximum of " +
              maxParamLen +
              " characters for scope \"" + scope + "\"."
          );
        }
      }

      // --- displayName validation ---
      if (displayName) {
        if (!displayNameRegex.test(displayName)) {
          errors.push("Parameter Display Name must start with a letter and contain only letters, numbers, spaces, and underscores.");
        }
        if (displayName.length > 82) {
          errors.push(
            "displayName length (" +
              displayName.length +
              ") exceeds maximum of 82 characters."
          );
        }
      }

      // --- description validation ---
      if (description && description.length > 150) {
        errors.push(
          "Description length (" +
            description.length +
            ") exceeds maximum of 150 characters."
        );
      }

      if (errors.length > 0) {
        var paramLabel = parameterName || "(empty Parameter Name)";
        validationErrors.push(
          "Row " + (index + 1) + " - " + paramLabel + ":\n  - " + errors.join("\n  - ")
        );
        return false; // invalid
      }

      return true; // valid
    }

    function createCustomDimension(row) {
      customDimensionsAPI.create({
        "parameterName": row[parameterNameColumn - 1].trim(),
        "displayName": row[parameterDisplayNameColumn - 1].trim(),
        "description": row[parameterDescriptionColumn - 1].trim(),
        "scope": row[parameterScopeColumn - 1].trim(),
        "disallowAdsPersonalization": row[parameterDisallowAdsPersonalizationColumn - 1] ? true : false
      }, "properties/" + ga4PropertyIDParameters);
      createdCount++;
    }

    function createCustomMetric(row) {
      var customMetricData = {
        "parameterName": row[parameterNameColumn - 1].trim(),
        "displayName": row[parameterDisplayNameColumn - 1].trim(),
        "description": row[parameterDescriptionColumn - 1].trim(),
        "measurementUnit": row[parameterFormatColumn - 1].trim(),
        "scope": row[parameterScopeColumn - 1].trim()
      };

      // Add restrictedMetricType only if measurementUnit is CURRENCY
      console.log(row[parameterCurrencyDataTypeColumn - 1].trim());
      if (customMetricData.measurementUnit === "CURRENCY") {
        customMetricData.restrictedMetricType = [row[parameterCurrencyDataTypeColumn - 1].trim()];
      }

      customMetricsAPI.create(customMetricData, "properties/" + ga4PropertyIDParameters);
      createdCount++;
    }

    // --- Create dimensions/metrics only if valid ---
    parameterRows.forEach(function (row, i) {
      var isChecked = row[parameterEditCheckboxColumn - 1];
      var type = row[parameterTypeColumn - 1];

      if (!isChecked) return;
      if (type !== customDimensionType && type !== customMetricType) return;

      // Validate row (length, allowed chars, etc.)
      var isValid = validateParameterRow(row, i);
      if (!isValid) return; // skip creation if invalid

      if (type === customDimensionType) {
        createCustomDimension(row);
      } else if (type === customMetricType) {
        createCustomMetric(row);
      }
    });

    // Build sheetData for resource name lookup
    const sheetData = parameterRows
      .map(function (row, i) {
        if (row[parameterTypeColumn - 1] === customMetricType || row[parameterTypeColumn - 1] === customDimensionType) {
          return {
            parameterName: row[parameterNameColumn - 1].trim(),
            parameterScope: row[parameterScopeColumn - 1].trim(),
            length: i
          };
        }
      })
      .filter(function (v) { return !!v; });

    function setResourceName(apiItems, sheetData, resourceColumn) {
      apiItems.forEach(function (apiItem) {
        sheetData.forEach(function (row) {
          if (apiItem.parameterName === row.parameterName && apiItem.scope === row.parameterScope) {
            parameterSheet
              .getRange(row.length + headerRowNumber + 1, resourceColumn)
              .setValue(apiItem.name);
          }
        });
      });
    }

    function listAllCustomDimensions() {
      var allCustomDimensions = [];
      var pageToken;

      do {
        var response = customDimensionsAPI.list(
          "properties/" + ga4PropertyIDParameters,
          { pageSize: 200, pageToken: pageToken }
        );

        allCustomDimensions = allCustomDimensions.concat(response.customDimensions || []);
        pageToken = response.nextPageToken;
        Utilities.sleep(utilitieSleep);
      } while (pageToken);

      return allCustomDimensions;
    }

    const customDimensions = listAllCustomDimensions();
    if (customDimensions && customDimensions.length > 0) {
      setResourceName(customDimensions, sheetData, parameterResourceNameColumn);
    }

    function listAllCustomMetrics() {
      var allCustomMetrics = [];
      var pageToken;

      do {
        var response = customMetricsAPI.list(
          "properties/" + ga4PropertyIDParameters,
          { pageSize: 200, pageToken: pageToken }
        );

        allCustomMetrics = allCustomMetrics.concat(response.customMetrics || []);
        pageToken = response.nextPageToken;
        Utilities.sleep(utilitieSleep);
      } while (pageToken);

      return allCustomMetrics;
    }

    const customMetrics = listAllCustomMetrics();
    if (customMetrics && customMetrics.length > 0) {
      setResourceName(customMetrics, sheetData, parameterResourceNameColumn);
    }

    // --- Final user message(s) ---
    if (createdCount > 0 && validationErrors.length === 0) {
      ui.alert(createdCount + " parameter(s) were created.");
    } else if (createdCount > 0 && validationErrors.length > 0) {
      ui.alert(
        createdCount + " parameter(s) were created, but some could not be created due to validation errors:\n\n" +
        validationErrors.join("\n\n")
      );
    } else if (createdCount === 0 && validationErrors.length > 0) {
      ui.alert(
        "No parameters were created because of validation errors:\n\n" +
        validationErrors.join("\n\n")
      );
    } else {
      ui.alert("No parameters were selected to create.");
    }

  } catch (err) {
    Logger.log('createGA4CustomDimensionsMetrics: ' + err.stack);
    SpreadsheetApp.getUi().alert('Error occurred in "createGA4CustomDimensionsMetrics" function: \n' + err);
  }
}

function updateGA4CustomDimensionsMetrics() {
  try {
    if (!ga4PropertyIDParameters) {
      SpreadsheetApp.getUi().alert("GA4 Property ID is not set in Parameters Sheet.");
      return;
    }

    const ui = SpreadsheetApp.getUi();

    // --- Validation setup (same rules as for create) ---
    var validationErrors = [];
    var updatedCount = 0;

    var parameterNameRegex = /^[A-Za-z][A-Za-z0-9_]*$/;
    var displayNameRegex = /^[A-Za-z][A-Za-z0-9_ ]*$/;

    function validateParameterRow(row, index) {
      var errors = [];

      var parameterName = (row[parameterNameColumn - 1] || "").trim();
      var displayName = (row[parameterDisplayNameColumn - 1] || "").trim();
      var description = (row[parameterDescriptionColumn - 1] || "").trim();
      var scope = (row[parameterScopeColumn - 1] || "").trim();
      var scopeUpper = scope.toUpperCase();

      // --- parameterName validation ---
      if (!parameterName) {
        errors.push("Parameter Name is empty.");
      } else {
        if (!parameterNameRegex.test(parameterName)) {
          errors.push("Parameter Name must start with a letter and contain only letters, numbers, and underscores.");
        }

        // Max length: 24 for USER scope, 40 for others (EVENT etc.)
        var maxParamLen = scopeUpper === "USER" ? 24 : 40;
        if (parameterName.length > maxParamLen) {
          errors.push(
            "Parameter Name length (" +
              parameterName.length +
              ") exceeds maximum of " +
              maxParamLen +
              " characters for scope \"" + scope + "\"."
          );
        }
      }

      // --- displayName validation ---
      if (displayName) {
        if (!displayNameRegex.test(displayName)) {
          errors.push("Parameter Display Name must start with a letter and contain only letters, numbers, spaces, and underscores.");
        }
        if (displayName.length > 82) {
          errors.push(
            "Parameter Display Name length (" +
              displayName.length +
              ") exceeds maximum of 82 characters."
          );
        }
      }

      // --- description validation ---
      if (description && description.length > 150) {
        errors.push(
          "Description length (" +
            description.length +
            ") exceeds maximum of 150 characters."
        );
      }

      if (errors.length > 0) {
        var paramLabel = parameterName || "(empty Parameter Name)";
        validationErrors.push(
          "Row " + (index + 1) + " - " + paramLabel + ":\n  - " + errors.join("\n  - ")
        );
        return false; // invalid
      }

      return true; // valid
    }

    // --- Collect sheet data and validate each row ---
    const sheetData = [];
    parameterRows.forEach(function (row, index) {
      if (row[parameterTypeColumn - 1] === customMetricType || row[parameterTypeColumn - 1] === customDimensionType) {
        var isValid = validateParameterRow(row, index);

        var parameter = {
          displayName: (row[parameterDisplayNameColumn - 1] || "").trim(),
          parameterName: (row[parameterNameColumn - 1] || "").trim(),
          scope: (row[parameterScopeColumn - 1] || "").trim(),
          description: (row[parameterDescriptionColumn - 1] || "").trim(),
          measurementUnit: (row[parameterFormatColumn - 1] || "").trim(),
          restrictedMetricType: (row[parameterCurrencyDataTypeColumn - 1] || "").trim(),
          disallowAdsPersonalization: row[parameterDisallowAdsPersonalizationColumn - 1] ? true : false,
          checkbox: row[parameterEditCheckboxColumn - 1],
          length: index,
          isValid: isValid
        };
        sheetData.push(parameter);
      }
    });

    const customDimensionsAPI = AnalyticsAdmin.Properties.CustomDimensions;
    let pageTokenDimension;
    let customDimensions = [];

    do {
      const response = customDimensionsAPI.list(
        `properties/${ga4PropertyIDParameters}`,
        { pageSize: 200, pageToken: pageTokenDimension }
      );

      customDimensions = customDimensions.concat(response.customDimensions || []);

      if (customDimensions) {
        customDimensions.forEach(function (customDimension) {
          sheetData.forEach(function (sheetRow) {
            if (
              customDimension.parameterName === sheetRow.parameterName &&
              sheetRow.checkbox &&
              sheetRow.isValid
            ) {
              parameterSheet
                .getRange(sheetRow.length + headerRowNumber + 1, parameterResourceNameColumn)
                .setValue(customDimension.name);

              customDimensionsAPI.patch(
                {
                  "displayName": sheetRow.displayName,
                  "description": sheetRow.description,
                  "scope": sheetRow.scope,
                  "disallowAdsPersonalization": sheetRow.disallowAdsPersonalization
                },
                customDimension.name,
                { updateMask: "*" }
              );
              updatedCount++;
            }
          });
        });
      }

      pageTokenDimension = response.nextPageToken;
      Utilities.sleep(utilitieSleep);
    } while (pageTokenDimension);

    const customMetricsAPI = AnalyticsAdmin.Properties.CustomMetrics;
    let pageTokenMetric;
    let customMetrics = [];

    do {
      const response = customMetricsAPI.list(
        `properties/${ga4PropertyIDParameters}`,
        { pageSize: 200, pageToken: pageTokenMetric }
      );

      customMetrics = customMetrics.concat(response.customMetrics || []);

      if (customMetrics) {
        customMetrics.forEach(function (customMetric) {
          sheetData.forEach(function (sheetRow) {
            if (
              customMetric.parameterName === sheetRow.parameterName &&
              sheetRow.checkbox &&
              sheetRow.isValid
            ) {
              
              let mask = "*";
              if (customMetric.measurementUnit === "CURRENCY" && sheetRow.measurementUnit === "CURRENCY") {
                mask = "displayName,description";
              }
                parameterSheet
                  .getRange(sheetRow.length + headerRowNumber + 1, parameterResourceNameColumn)
                  .setValue(customMetric.name);

                let customMetricData = {
                  "displayName": sheetRow.displayName,
                  "description": sheetRow.description,
                  "scope": sheetRow.scope,
                  "measurementUnit": sheetRow.measurementUnit
                };

                customMetricsAPI.patch(customMetricData, customMetric.name, { updateMask: mask });
                updatedCount++;
            }
          });
        });
      }

      pageTokenMetric = response.nextPageToken;
      Utilities.sleep(utilitieSleep);
    } while (pageTokenMetric);

    // --- Final user messages based on updates + validation ---
    if (updatedCount > 0 && validationErrors.length === 0) {
      ui.alert(updatedCount + " parameter(s) were updated.");
    } else if (updatedCount > 0 && validationErrors.length > 0) {
      ui.alert(
        updatedCount + " parameter(s) were updated, but some could not be updated due to validation errors:\n\n" +
        validationErrors.join("\n\n")
      );
    } else if (updatedCount === 0 && validationErrors.length > 0) {
      ui.alert(
        "No parameters were updated because of validation errors:\n\n" +
        validationErrors.join("\n\n")
      );
    } else {
      ui.alert("No parameters were selected to update.");
    }

  } catch (err) {
    Logger.log('updateGA4CustomDimensionsMetrics: ' + err.stack);
    SpreadsheetApp.getUi().alert(`Error occurred in "updateGA4CustomDimensionsMetrics" function: \n${err}`);
  }
}

function archiveGA4CustomDimensionsMetrics() {
  try {
    if (!ga4PropertyIDParameters) {
      SpreadsheetApp.getUi().alert("GA4 Property ID is not set in Parameters Sheet.");
      return;
    }

    const ui = SpreadsheetApp.getUi();
    const response = ui.alert('Are you sure you want to Delete selected Parameter(s)?\n\nIt\'s recommended to not Delete many Parameters at once.', ui.ButtonSet.YES_NO);

    if (response !== ui.Button.YES) {
      return;
    }

    const sheetData = [];
    parameterRows.forEach((row, index) => {
      if(row[parameterEditCheckboxColumn-1]) {
        const parameter = {
        parameterName: row[parameterNameColumn-1].trim(),
        scope: row[parameterScopeColumn-1].trim(),
        checkbox: row[parameterEditCheckboxColumn-1],
        length: index
        }
        sheetData.push(parameter);
      }
    });

    const customDimensionsAPI = AnalyticsAdmin.Properties.CustomDimensions;
    const customMetricsAPI = AnalyticsAdmin.Properties.CustomMetrics;

    // Function to fetch all custom dimensions with pagination
    function fetchAllCustomDimensions() {
      let allCustomDimensions = [];
      let pageToken;

      do {
        const response = customDimensionsAPI.list(
          `properties/${ga4PropertyIDParameters}`,
          {pageSize: 200, pageToken: pageToken}
        );

        if (response.customDimensions) {
          allCustomDimensions = allCustomDimensions.concat(response.customDimensions || []);
        }

        pageToken = response.nextPageToken;
        Utilities.sleep(utilitieSleep);
      } while (pageToken);

      return allCustomDimensions;
    }

    // Function to fetch all custom metrics with pagination
    function fetchAllCustomMetrics() {
      let allCustomMetrics = [];
      let pageToken;

      do {
        const response = customMetricsAPI.list(
          `properties/${ga4PropertyIDParameters}`,
          {pageSize: 200, pageToken: pageToken}
        );

        if (response.customMetrics) {
          allCustomMetrics = allCustomMetrics.concat(response.customMetrics || []);
        }

        pageToken = response.nextPageToken;
        Utilities.sleep(utilitieSleep);
      } while (pageToken);

      return allCustomMetrics;
    }

    const customDimensions = fetchAllCustomDimensions();
    const customMetrics = fetchAllCustomMetrics();

    // Sort the sheetData array in descending order based on the row number
    sheetData.sort((a, b) => b.length - a.length);

    sheetData.forEach((data) => {
      if (data.checkbox) {
        customDimensions.forEach((customDimension) => {
          if (customDimension.parameterName === data.parameterName && customDimension.scope === data.scope) {
            customDimensionsAPI.archive({}, customDimension.name);
          }
        });

        customMetrics.forEach((customMetric) => {
          if (customMetric.parameterName === data.parameterName && customMetric.scope === data.scope) {
            customMetricsAPI.archive({}, customMetric.name);
          }
        });

        // Delete Row
        parameterSheet.deleteRow(data.length + headerRowNumber + 1);
        Utilities.sleep(utilitieSleep);
      }
    });

    SpreadsheetApp.getUi().alert('Parameter(s) was deleted.');
  } catch (err) {
    Logger.log('archiveGA4CustomDimensionsMetrics: ' + err.stack);
    SpreadsheetApp.getUi().alert('Error occurred in "archiveGA4CustomDimensionsMetrics" function: \n' + err);
  }
}
// **** END CUSTOM DIMENSIONS & METRICS
// **** GOOGLE ANALYTICS 4 ADMIN API END ****