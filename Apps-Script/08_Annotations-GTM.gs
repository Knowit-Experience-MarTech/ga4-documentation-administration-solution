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

// **** GOOGLE TAG MANAGER ****

function listGTMAccounts() {
  try {
  // API for retrieving the list of all GTM accounts for the current user
  const accounts = TagManager.Accounts.list({fields: 'account(accountId,name)'}).account;
    if (accounts && accounts.length) {
      const startRow = 2;
      const sheet = ss.getSheetByName(helperGTMTab);

      const numRows = sheet.getLastRow(); // The number of row to clear
      sheet.getRange(startRow, 1, numRows+1, sheet.getLastColumn()).clearContent();
      ss.getSheetByName(settingsTab).getRange(17, 2, 6, 1).clearContent();

      const accountList = [];
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        accountList.push([account.name + ' - '+ account.accountId])
      }

      if(accountList && accountList.length) {
        sheet.getRange(startRow,1,accountList.length,accountList[0].length).setValues(accountList);
      }
    }
  } catch (err) {
    Logger.log('listGTMAccounts: '+err.stack);
    SpreadsheetApp.getUi().alert('Error occoured in "listGTMAccounts" function: \n'+err);
  }
}

// **** LIST GTM CONTAINERS
function listGTMContainers() {
  try {
    if (!gtmAccountID) {
      SpreadsheetApp.getUi().alert("GTM Account is not set in Settings Sheet.");
      return
    }
    const sheet = ss.getSheetByName(helperGTMTab);
    const startRow = 2;
    const numRows = sheet.getLastRow(); // The number of row to clear
    sheet.getRange(startRow, 2, numRows+1, sheet.getLastColumn()).clearContent();
 
    const containerList = [];
    const containers = TagManager.Accounts.Containers.list(`accounts/${gtmAccountID}`);

    for (let i = 0 ; i < containers.container.length ; i++) {
      const container = containers.container[i];
      if (container) {    
        let usageContext = container.usageContext;
        if (usageContext && usageContext.length > 0) {
          // If usageContext is an array and not empty
          usageContext = usageContext.join(", "); // Convert array to string if it has elements
  
          const containerWeb = usageContext.match("web") ? container.name + ' - ' + container.publicId + ' - ' + container.containerId : '';
          const containerServer = usageContext.match("server") ? container.name + ' - ' + container.publicId + ' - ' + container.containerId : '';
          const containerIos = usageContext.match("ios") ? container.name + ' - ' + container.publicId + ' - ' + container.containerId : '';
          const containerAndroid = usageContext.match("android") ? container.name + ' - ' + container.publicId + ' - ' + container.containerId : '';
          const containerAmp = usageContext.match("amp") ? container.name + ' - ' + container.publicId + ' - ' + container.containerId : '';
          containerList.push([containerWeb, containerServer, containerIos, containerAndroid, containerAmp,usageContext])
        }
      }
    }

    if(containerList && containerList.length) {
      sheet.getRange(startRow,2,containerList.length,containerList[0].length).setValues(containerList);
      sheet.getRange(startRow, 1, numRows+1, 1).clearContent();

      const account = TagManager.Accounts.get(`accounts/${gtmAccountID}`);
      sheet.getRange(startRow,1).setValue(account.name + ' - '+ account.accountId);
    }
  } catch (err) {
    Logger.log('listGTMContainers: '+err.stack);
    //SpreadsheetApp.getUi().alert('Error occoured in "listGTMContainers" function: \n'+err);
  }
}
// **** END LIST GTM CONTAINERS

// Maximum number of iterations
let maxIterations = 1;
// **** LIST GTM CONTAINERS
let manualGTMAnnotationTrigger = false;

function listGTMContainerVersionsyManually() {
  try{
    manualGTMAnnotationTrigger = true;
    maxIterations = 3;
    listGTMContainerVersions(manualGTMAnnotationTrigger);
  }catch(err){
    Logger.log('listGTMContainerVersionsyManually: '+err.stack);
    SpreadsheetApp.getUi().alert('Error occoured in "listGTMContainerVersionsyManually" function: \n'+err);
  } 
}

function listGTMContainerVersions() {
  try {
    if (!gtmContainerIDs) {
      SpreadsheetApp.getUi().alert("GTM Container is not set in Settings Sheet.");
      return
    }

    const annotationSheet = ss.getSheetByName(annotationTab);
    const gtmContainers = gtmContainerIDs.split(',');
    const containerVersionResult = [];

    // Loop through container Id's
    gtmContainers.forEach((id) => {
      const containerId = id;

      const containerVersionHeaderList = TagManager.Accounts.Containers.Version_headers.list(`accounts/${gtmAccountID}/containers/${containerId}`)

      if(containerVersionHeaderList) {     
        for (let i = containerVersionHeaderList.containerVersionHeader.length-1, counter = 0; i >= 0 && counter < maxIterations; i--, counter++) {
          Utilities.sleep(utilitieSleep);

          const containerVersionList = containerVersionHeaderList.containerVersionHeader[i];
          const containerVersionId = containerVersionList.containerVersionId;
        
          const containerVersions = TagManager.Accounts.Containers.Versions.get(`accounts/${gtmAccountID}/containers/${containerId}/versions/${containerVersionId}`)
          if(containerVersions) {

            const containerVersion = {};
            const container = containerVersions.container;
            let usageContext = container.usageContext;
 
            if (usageContext && usageContext.length > 0) {
              // If usageContext is an array and not empty
              usageContext = usageContext.join(", "); // Convert array to string if it has elements
              let annotationCategory = usageContext && usageContext.match("web") ? annotationSheet.getRange('AnnotationGTMWeb').getValue(): 'Annotation Category Not Found';
              if(usageContext.match("server")) {
                annotationCategory = annotationSheet.getRange('AnnotationGTMServer').getValue();
              } else if(usageContext.match("ios")) {
                annotationCategory = annotationSheet.getRange('AnnotationGTMIos').getValue();
              } else if(usageContext.match("android")) {
                annotationCategory = annotationSheet.getRange('AnnotationGTMAndroid').getValue();
              } else if(usageContext.match("amp")) {
                annotationCategory = annotationSheet.getRange('AnnotationGTMAmp').getValue();
              }

              containerVersion.container = container.name + ' - ' + container.publicId + ' - ' + containerId,
              containerVersion.annotationText = 'Version ID: ' + containerVersions.containerVersionId +
                                                '. Version Name: ' + containerVersions.name +
                                                '. \n\nDescription: ' + containerVersions.description +
                                                '. \n\nGTM URL: ' + containerVersions.tagManagerUrl,
              containerVersion.id = containerVersions.path,
              containerVersion.annotationCategory = annotationCategory

              containerVersionResult.push(containerVersion)
            }
          }
        }
      }
    });

    let count = annotationSheet.getRange(annotationRangeColumn).getDisplayValues().flat().filter(String).length;
    let rows = annotationSheet.getDataRange().offset(headerRowNumber, 0, count).getValues();

    const sheetData = [];
    rows.forEach((row, index) => {
      if (row[annotationIdColumn-1]) {
        const annotation = {
          id: row[annotationIdColumn-1].trim(),
          changeTime: row[annotationTimeColumn-1],
          userActorEmail: row[annotationAddedByColumn-1].trim(),
          annotationCategory: row[annotationCategoryColumn-1].trim(),
          annotationText: row[annotationDescriptionColumn-1].trim(),
          length: index
        }
        sheetData.push(annotation);
      }
    });

    const annotationData = [];
    const annotationDataDocumented = [];

    if(containerVersionResult) {
      containerVersionResult.forEach((annotation) => {
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
      const annotationCategory = annotation.annotationCategory;
      const annotationDate = Utilities.formatDate(new Date(), timezone, dateFormat);
      const annotationAddedBy = 'Not Available from API';
      const annotationText = annotation.annotationText;
      const gtmContainer = annotation.container;
      const annotationId = annotation.id;

      annotationSheet.appendRow([annotationDate, annotationCategory, annotationText, annotationAddedBy, gtmContainer, annotationId]);
    });

    if(manualGTMAnnotationTrigger) {
      SpreadsheetApp.getUi().alert('GTM Container Versions have been updated.');
    }
  } catch (err) {
    Logger.log('listGTMContainerVersions: '+err.stack);
    if(manualGTMAnnotationTrigger) {
      SpreadsheetApp.getUi().alert('Error occoured in "listGTMContainers" function: \n'+err);
    }
  }
}
// **** END LIST GTM CONTAINERS
