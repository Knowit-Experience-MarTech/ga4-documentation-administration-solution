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
Get Account & Property Names & ID
Developer documentation:
https://developers.google.com/analytics/devguides/config/admin/v1
*/

// **** LIST GA4 ACCOUNTS
function listGA4Accounts() {
  try {
    let pageToken; // Variable to hold the current page token
    const accountList = [];

    do {
      // Fetch the account summaries with the current page token
      const response = AnalyticsAdmin.AccountSummaries.list({ pageToken: pageToken });

      // Process the account summaries
      if (response.accountSummaries && response.accountSummaries.length) {
        for (let i = 0; i < response.accountSummaries.length; i++) {
          const account = response.accountSummaries[i];
          if (account.propertySummaries) {
            properties = AnalyticsAdmin.Properties.list({ filter: 'parent:' + account.account });
            if (properties.properties !== null) {
              accountList.push([account.displayName + ' - ' + account.name.replace('accountSummaries/', '')]);
            }
          }
        }
      }

      // Update the page token for the next iteration
      pageToken = response.nextPageToken;
    } while (pageToken); // Continue until there is no more page token

    // Write the account list to the sheet
    if(accountList && accountList.length) {
      const sheet = ss.getSheetByName(helperGA4Tab);
      const startRow = 2;
      const numRows = sheet.getLastRow(); // The number of row to clear
      sheet.getRange(startRow, 2, numRows + 1, sheet.getLastColumn()).clearContent();
      ss.getSheetByName(settingsTab).getRange(8, 2, 2, 1).clearContent();
      
      sheet.getRange(startRow, 1, accountList.length, accountList[0].length).setValues(accountList);
    }
  } catch (err) {
    Logger.log('listGA4Accounts: ' + err.stack);
    SpreadsheetApp.getUi().alert('Error occurred in "listGA4Accounts" function: \n' + err);
  }
}
// **** END LIST GA4 ACCOUNTS

// **** LIST GA4 PROPERTIES
function listGA4Properties() {
  try {
    if (!ga4AccountID) {
      SpreadsheetApp.getUi().alert("GA4 Account is not set in Settings Sheet.");
      return;
    }

    const sheet = ss.getSheetByName(helperGA4Tab);
    const startRow = 2;
    const numRows = sheet.getLastRow(); // The number of row to clear
    sheet.getRange(startRow, 2, numRows + 1, sheet.getLastColumn()).clearContent();

    if (ga4AccountID) {
      let pageToken; // Variable to hold the current page token
      const propertyList = [];

      do {
        // Fetch the properties with the current page token
        const response = AnalyticsAdmin.Properties.list({ filter: 'ancestor:accounts/' + ga4AccountID, pageToken: pageToken });

        if (response.properties && response.properties.length) {
          for (let i = 0; i < response.properties.length; i++) {
            const property = response.properties[i];
            if (property) {
              propertyList.push([property.displayName + ' - ' + property.name.replace('properties/', '')]);
            }
          }
        }

        // Update the page token for the next iteration
        pageToken = response.nextPageToken;
      } while (pageToken); // Continue until there is no more page token

      // Write the property list to the sheet
      if (propertyList && propertyList.length) {
        sheet.getRange(startRow, 2, propertyList.length, propertyList[0].length).setValues(propertyList);
        sheet.getRange(startRow, 1, numRows + 1, 1).clearContent();

        const account = AnalyticsAdmin.Accounts.get({}, { name: `accounts/${ga4AccountID}` });
        sheet.getRange(startRow, 1).setValue(account.displayName + ' - ' + account.name.replace('accounts/', ''));
      }
    }
  } catch (err) {
    Logger.log('listGA4Properties: ' + err.stack);
    SpreadsheetApp.getUi().alert('Error occurred in "listGA4Properties" function: \n' + err);
  }
}
// **** END LIST GA4 PROPERTIES
