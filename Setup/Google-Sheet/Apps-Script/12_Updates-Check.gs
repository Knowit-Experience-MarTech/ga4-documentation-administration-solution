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

  // --- read raw sheet tag ---
  const rawSheetTag = ss
    .getSheetByName(settingsTab)
    .getRange('SettingsVersion')
    .getValue()
    .toString();    // ensure it’s a string

  // --- grab raw GitHub tag ---
  const releases = JSON.parse(
    UrlFetchApp.fetch(
      'https://api.github.com/repos/Knowit-Experience-MarTech/ga4-documentation-administration-solution/releases'
    ).getContentText()
  );
  const latestGithubRelease = releases[0];
  const rawRepoTag = latestGithubRelease.tag_name;  // e.g. "v1.2" or "1.2"

  // --- helper to strip leading "v" or fallback ---
  function normalizeTag(rawTag) {
    if (rawTag.startsWith('v')) {
      return rawTag.substring(1);
    } else if (/^\d+(\.\d+)*$/.test(rawTag)) {
      return rawTag;
    } else {
      const parts = rawTag.split('v');
      return parts.length > 1 ? parts[1] : rawTag;
    }
  }

  // --- normalize both versions ---
  const sheetVersionStr = normalizeTag(rawSheetTag);
  const repoVersionStr  = normalizeTag(rawRepoTag);

  // --- parse to float (major.minor only) ---
  const sheetReleaseVersion  = parseFloat(sheetVersionStr);
  const latestGithubVersion  = parseFloat(repoVersionStr);

  // --- build truncated release notes ---
  const maxCharacters = 200;
  let truncatedBody = latestGithubRelease.body.length > maxCharacters 
    ? latestGithubRelease.body.substring(0, maxCharacters) + '...'
    : latestGithubRelease.body;

  // --- compare & prompt ---
  if (sheetReleaseVersion < latestGithubVersion) {
    ui.alert(
      'Update Available',
      messageText.newRelease
        + truncatedBody
        + `\n\nLink to release:\n`
        + latestGithubRelease.html_url,
      ui.ButtonSet.OK
    );
  } else {
    ui.alert('No updates available.');
  }
}
