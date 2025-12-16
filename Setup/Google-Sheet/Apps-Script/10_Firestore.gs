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

// **** FIRESTORE ****
let manualFirestoreTrigger = false;

function uploadToFirestoreManually() {
  try{
    manualFirestoreTrigger = true;
    uploadToFirestore(manualFirestoreTrigger);
  }catch(err){
    Logger.log('uploadToFirestoreManually: '+err.stack);
    SpreadsheetApp.getUi().alert('Error occoured in "uploadToFirestoreManually" function: \n'+err);
  } 
}

// **** FIRESTORE ****
function uploadToFirestore() {
/* See 
https://github.com/grahamearley/FirestoreGoogleAppsScript 
and 
https://levelup.gitconnected.com/import-data-from-google-sheets-to-firestore-using-google-apps-script-b6f857f82a2
*/

  // Check if the Firestore credentials are set
  if (!(firestoreCloudClientEmail && firestoreCloudProjectId && firestoreCloudKey) && manualFirestoreTrigger) {
    SpreadsheetApp.getUi().alert('Cloud Client Email, Project ID & Key are not set. No data is sent to Firestore.');
    return; // Exit the function early if credentials are missing
  } 

  const email = firestoreCloudClientEmail.toString();
  const projectId = firestoreCloudProjectId.toString();
  const key = firestoreCloudKey.toString();

  const firestore = FirestoreApp.getFirestore (email, key, projectId);
  // Read data from Firestore
  const firestorePath = firestoreFirstCollection+"/";
  const firestoreDocuments = firestore.getDocuments(firestorePath);
  const firestoreData = [];

  for (let a = 0; a < firestoreDocuments.length; a++) {
    firestoreData.push(firestoreDocuments[a].path);
  }

  const date = Utilities.formatDate(new Date(), timezone, "yyyy-MM-dd HH:mm:ss"); 

  const range = eventRangeColumn;
  const file = ss.getSheetByName(eventTab);
  const rowOffset = headerRowNumber;
  const count = file.getRange(range).getDisplayValues().flat().filter(String).length;
  const lastRow = count+rowOffset;

  let rows = file.getDataRange().offset(headerRowNumber, 0, lastRow - headerRowNumber).getValues();

  const sheetData = [];
  // Loop through the rows
  for (let i=0;i<rows.length;i++){
    const data = {};

    data.event_group = rows[i][eventGroupColumn-1];
    data.event_name = rows[i][eventNameColumn-1];

    if(rows[i][eventParametersColumn-1]){
      data.event_parameters = rows[i][eventParametersColumn-1].replace(/\r\n|\n|' '/g, ',').split(",");
      JSON.stringify(data.event_parameters);
    }
    if(rows[i][eventItemParametersColumn-1]){
      data.items = rows[i][eventItemParametersColumn-1].replace(/\r\n|\n|' '/g, ',').split(",");
        JSON.stringify(data.items);
    }
    if(rows[i][eventUserParametersColumn-1]){
      data.user_properties = rows[i][eventUserParametersColumn-1].replace(/\r\n|\n|' '/g, ',').split(",");
        JSON.stringify(data.userProperties);
    }
    if(rows[i][eventEditedTimeColumn-1]) {
      data.date_edited = JSON.stringify(Utilities.formatDate(rows[i][eventEditedTimeColumn-1], timezone, dateFormat+" HH:mm")); 
    }

    // UPDATE OR ADD DATA IN FIRESTORE
    try {
      if (inArray(firestorePath+data.event_name, firestoreData)) {     
        // Events are both in Sheet & Firestore, update content in Firestore
        data.change_status = "updated";
        firestore.updateDocument(firestorePath+data.event_name, data, true);
      } else {
        // Events are only in Sheet, add content to Firestore
        data.change_status = "added";
        firestore.createDocument(firestorePath+data.event_name,data);
      };
    } catch (err) {
      Logger.log('Update or Add data in Firestore: '+err.stack);
      SpreadsheetApp.getUi().alert('Update or Add data in Firestore failed: \n'+err);
    };
      sheetData.push(firestorePath+data.event_name);
  }

  // DELETE DATA IN FIRESTORE
  // Delete Events that are in Firestore, but not in Sheet
  try {
    let deleteFirestoreData = firestoreData.filter(e => sheetData.indexOf(e) === -1);
    if(deleteFirestoreData && deleteFirestoreData !="") {
      const data = {};
      data.change_status = "deleted";
      data.date = JSON.stringify(date);

      for(let d = 0; d < deleteFirestoreData.length; d++) {
        const deleteFirestorePath = deleteFirestoreData[d];
        firestore.deleteDocument(deleteFirestorePath);
      }
    }
    
    if(manualFirestoreTrigger) {
    SpreadsheetApp.getUi().alert("Documentation was uploaded to Firestore.");
  }
  } catch (err) {
    Logger.log('Delete data in Firestore:'+err.stack)
    SpreadsheetApp.getUi().alert('Delete data in Firestore failed: \n'+err);
  }
}