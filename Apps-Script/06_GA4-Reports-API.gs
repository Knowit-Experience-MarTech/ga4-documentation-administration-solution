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

function getGA4EventData() {
  if(getGA4DataFrom === 'API') {
    getGA4EventDataFromApi()
  } else {
    getGA4EventDataFromBigQuery()
  }
}

// ***** GOOGLE ANALYTICS DATA API (GA4) *****
// https://developers.google.com/analytics/devguides/reporting/data/v1

// *** GET GA4 EVENTS AND EVENT COUNT LAST 7 DAYS
function getGA4EventDataFromApi() {
  
  try{
    if (!ga4PropertyID) {
      SpreadsheetApp.getUi().alert("GA4 Property ID is not set in Settings Sheet.");
      return;
    }

    const helperSheet = ss.getSheetByName(helperGA4EventDataTab);
    const numRows = helperSheet.getLastRow(); // The number of row to clear
    helperSheet.getRange(1, 1, numRows+1, helperSheet.getLastColumn()+1).clearContent();

    const metric = AnalyticsData.newMetric();    
    metric.name = 'eventCount';

    const dimension = AnalyticsData.newDimension();
    dimension.name = 'eventName';

    const dateRange = AnalyticsData.newDateRange();
    ga4ReportingPeriodStart = reportingPeriodStart ? reportingPeriodStart : 7;
    dateRange.startDate = reportingPeriodStart+'daysAgo';
    dateRange.endDate = 'yesterday';

    const request = AnalyticsData.newRunReportRequest();
    request.dimensions = dimension;
    request.metrics = metric;
    request.dateRanges = dateRange;

    const report = AnalyticsData.Properties.runReport(request, `properties/${ga4PropertyID}`);

    if (!report.rows) {
      Logger.log('No rows returned.');
      return;
    }

    // Append the headers.
    const dimensionHeaders = report.dimensionHeaders.map(
      (dimensionHeader) => {
        return dimensionHeader.name;
      }
    );

    const metricHeaders = report.metricHeaders.map(
      (metricHeader) => {
        return metricHeader.name;
      }
    );

    const headers = [...dimensionHeaders, ...metricHeaders];
    helperSheet.appendRow(headers);

    // Append the results.
    const rows = report.rows.map((row) => {
      const dimensionValues = row.dimensionValues.map(
        (dimensionValue) => {
          return dimensionValue.value;
        }
      );
      const metricValues = row.metricValues.map(
        (metricValues) => {
          return metricValues.value;
        }
      );
      return [...dimensionValues, ...metricValues];
    });
    helperSheet.getRange(2, 1, report.rows.length, headers.length).setValues(rows);

    const helperEventData = [];
    const helperEventRows = helperSheet.getRange(2, 1, report.rows.length, headers.length).getValues();

    // Define an array of event names to exclude
    const excludedEventNames = ['session_start', 'first_visit', 'user_engagement'];

    helperEventRows.forEach((row, index) => {
      const eventName = row[0].trim();

      // Check if the event name is not in the excluded list
      if (!excludedEventNames.includes(eventName)) {
        const helperEvent = {
          eventName: eventName,
          eventCount: row[1],
          length: index
        }
        helperEventData.push(helperEvent);
      }
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
    const undocumentedEvents = eventData.filter(event => !eventDataDocumented.includes(event));

    // Add undocumented Events to the end of the Events Sheet
    undocumentedEvents.forEach((undocumentedEvents,index) => {
      eventSheet.getRange(eventLastRow+1+index,eventNameColumn).setValue(undocumentedEvents.eventName);
      const eventCount = undocumentedEvents.eventCount ? undocumentedEvents.eventCount : 0;
      eventSheet.getRange(eventLastRow+1+index,eventEventCountColumn).setValue(eventCount);
    });
  }catch(err){
    Logger.log('getGA4EventData: '+err.stack) 
    SpreadsheetApp.getUi().alert('Error occurred in "getGA4EventData" function: \n' + err);
  }
}
