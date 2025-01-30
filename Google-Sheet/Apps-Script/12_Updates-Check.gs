/**
 * Copyright 2025 Knowit Experience
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

const messageText = {
  newRelease: `
    There is a new version of this tool available. Please use the latest version
    of the tool by following the release instructions:
    https://github.com/Knowit-Experience-MarTech/ga4-documentation-administration-solution/releases
    
    Update Details:
  `
}

/**
 * Checks if this is the latest version of the script and sheet.
 * If not, it prompts the user to follow the release instructions.
 */
function checkForUpdates() {
  const ui = SpreadsheetApp.getUi();

  // Get sheet version.
  const sheetReleaseVersion = ss.getSheetByName(settingsTab).getRange('SettingsVersion').getValue();

  // Get Github version.
  const releases = JSON.parse(
    UrlFetchApp.fetch(
      'https://api.github.com/repos/Knowit-Experience-MarTech/ga4-documentation-administration-solution/releases'
    ).getContentText());
  const latestGithubRelease = releases[0];
  const latestGithubVersion = parseFloat(
    latestGithubRelease.tag_name);
	
  const maxCharacters = 200;
  let truncatedBody = latestGithubRelease.body.length > maxCharacters 
    ? latestGithubRelease.body.substring(0, maxCharacters) + '...'
    : latestGithubRelease.body;
  
  if (sheetReleaseVersion < latestGithubVersion) {
    const title = 'Update Avilable';
    const message = messageText.newRelease + truncatedBody + `\n\n` + 'Link to release: ' + `\n` + latestGithubRelease.html_url;
    ui.alert(title, message, ui.ButtonSet.OK);
  } else {
    ui.alert('No updates avaialable.');
  }
}
