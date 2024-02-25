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

function addAnnotation() {
  try{
    const sheet = ss.getSheetByName(annotationTab);

    const annotationText = sheet.getRange('AnnotationText').getValue();
    const annotationCategory = sheet.getRange('AnnotationCategory').getValue();
    let annotationDate = sheet.getRange('AnnotationDate').getValue();
    annotationDate = annotationDate ? Utilities.formatDate(annotationDate, timezone, dateFormat) : Utilities.formatDate(new Date(), timezone, dateFormat);
    
    const obscureEmail = (email) => {
      const [name, domain] = email.split('@');
      return `${name[0]}${new Array(name.length).join('*')}@${domain}`;
    };

    let annotationAddedBy = Session.getActiveUser().getEmail();
    if (annotationSettings === 'Redacted') {
      annotationAddedBy = obscureEmail(annotationAddedBy)
    } else if (annotationSettings === 'No') {
      annotationAddedBy = 'Hidden by Settings'
    }

    const ga4Property = ss.getSheetByName(settingsTab).getRange('SettingsGA4Property').getValue();

    if (!annotationCategory) {
      SpreadsheetApp.getUi().alert('Annotation Category must be selected');
    } else if (!annotationText) {
      SpreadsheetApp.getUi().alert('Annotation Text must be filled out.\n Also, Annotation Text Cell must be deselected (click into Annotation Category or Date if you already have written an Annotation, and click on the "Add Annotation" button again.)');
    }else {
      sheet.appendRow([annotationDate, annotationCategory, annotationText, annotationAddedBy, ga4Property]);

      SpreadsheetApp.getUi().alert("Annotation was added:\n"+annotationText);
      sheet.getRange('annotationText').clearContent();
      sheet.getRange('annotationCategory').clearContent();
    }
  }catch(err){
    Logger.log('addAnnotation: '+err.stack);
    SpreadsheetApp.getUi().alert('Error occoured in "addAnnotation" function: \n'+err);
  } 
}

let manualAnnotationTrigger = false;

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

  function getDateXDaysFromToday(xDays) {
    const today = new Date();
    let historicDate = new Date();
    historicDate.setDate(today.getDate() - xDays);
    
    const year = historicDate.getFullYear();
    let month = historicDate.getMonth() + 1; // getMonth() returns 0-11
    let day = historicDate.getDate();

    // Add leading zero to month and day if necessary
    month = month < 10 ? '0' + month : month;
    day = day < 10 ? '0' + day : day;

    const formattedDate = year + '-' + month + '-' + day;
    return formattedDate;
  }

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
    
    const historyResult = propertyHistory.changeHistoryEvents;
    const changeHistoryEvents = [];

    historyResult.forEach((history) => {
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
      changes: history.changes.map(change => {
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
        } else if( // Handling attributionSettings
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
          resourceAfterChange && resourceAfterChange
        ) {
          resourceData = {
            action: change.action,
            resource: resourceAfterChange,
            itemType: 'New Item Type in API\n',
          };
        } else if (change.action && !resourceAfterChange) {
          // Handling the case when resourceAfterChange is empty
          let itemType = change.resource;
          if (itemType) {

            // Mapping object
            const itemTypeMapping = {
              'customDimensions': 'Custom Dimension',
              'customMetrics': 'Custom Metric',
              'conversionEvents': 'Conversion Events',
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
    let lastRow = count+headerRowNumber;
    let rows = annotationSheet.getDataRange().offset(headerRowNumber, 0, count).getValues();

    const annotationCategory = annotationSheet.getRange('AnnotationGA4ChangeHistory').getValue();

    const sheetData = [];
    rows.forEach((row, index) => {
      if (row[annotationIdColumn-1]) {
        const annotation = {
          id: row[annotationIdColumn-1].trim(),
          changeTime: row[annotationTimeColumn-1],
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

      annotationSheet.appendRow([annotationDate, annotationCategory, annotationText, annotationAddedBy, ga4Property, annotationId]);
    });
    
    if(manualAnnotationTrigger) {
      SpreadsheetApp.getUi().alert('GA4 Property Change History has been updated.');
    }

  }catch(err){
    Logger.log('getGA4ChangeHistory: '+err.stack);
    if(manualAnnotationTrigger) {
      SpreadsheetApp.getUi().alert('Error occoured in "getGA4ChangeHistory" function: \n'+err);
    }
  } 
}

