# Apps Script

Apps Scripts used in the [Google Sheet](/Google-Sheet) are located in this folder.

### Important Notes on API Quotas
Any script interacting with the GA4 APIs ([Reporting API](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas) & [Admin API](https://developers.google.com/analytics/devguides/config/admin/v1/quotas)) is subject to **API request limits and quotas**. Please be mindful of these limits, especially with bulk operations.

### Integrated APIs & Libraries
The Google Sheet connects with various APIs and libraries:

- [Google Analytics Admin API](https://developers.google.com/analytics/devguides/config/admin/v1)
- [Google Analytics Reporting API](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [BigQuery API](https://cloud.google.com/bigquery/docs/reference/rest)
- [FirestoreApp Library](https://github.com/grahamearley/FirestoreGoogleAppsScript)
- [Google Tag Manager API](https://developers.google.com/tag-platform/tag-manager/api/v2)

### App Permissions & Warnings
The first time you use an Apps Script function, Google will display warnings like:
> **Google hasn’t verified this app**  
> The app is requesting access to sensitive info in your Google Account. Until verified by Google, use it cautiously.

Unfortunately, this app can’t be verified due to its nature. If you have concerns, I recommend reviewing the Apps Script code directly.

**Access Warning:**
> Limit access to the sheet. Accidental changes to GA4 conversions, dimensions, or metrics could occur, so restrict access to trusted users. Share documentation through a platform like Looker Studio instead.

See [Unverified apps](https://support.google.com/cloud/answer/7454865) for more details.

When you grant access, the script receives the following permissions:

| Permission                                           | Purpose                                                                                             |
|------------------------------------------------------|-----------------------------------------------------------------------------------------------------|
| View and manage BigQuery data                        | Allows exporting and reading Event & Parameter data from BigQuery.                                  |
| See, edit, create, and delete Google Sheets          | Manages data within the Sheet.                                                                      |
| Edit Google Analytics entities                       | Enables creation, updates, and deletion of GA4 conversions, custom dimensions, and metrics.         |
| View and manage GA4 data                             | Reads GA4 Event Count data.                                                                        |
| Manage Google Tag Manager access                     | Allows GTM container versions to be downloaded (not modified or published).                         |
| Connect to external services                         | Enables data read/write to Firestore if configured.                                                 |
| Display third-party content in prompts and sidebars  | Supports the **Add/Edit Parameters** button functionality in the **Events** Sheet.                  |

### Resolving "This app is blocked" or Reducing Warnings
Some users may encounter a "**This app is blocked**" error. This is a general issue with Google Apps Scripts and not specific to this sheet.

One solution is to switch the **Google Cloud Platform (GCP) Project Number** used by the Apps Script to an existing GCP Project (e.g., your BigQuery project). All users who should run Apps Script in the sheet must be added as users to this GCP project.

1. Go to **Extensions** → **Apps Script** → **Project Settings** in the Google Sheet.
2. Under **Google Cloud Platform (GCP) Project settings**, select **Change project**.
3. Enter the **Project Number** and click **Set project**.

Then, set up an [**OAuth consent screen**](https://console.cloud.google.com/apis/credentials/consent) as follows:

1. Choose **Testing** as the **publishing status**.
2. Add **test users** (those who will access the sheet) under the consent screen setup.
3. Complete all mandatory fields.
   
This setup should resolve the "This app is blocked" issue and reduce security warnings. 

The downside with using **Testing** is that you may have to authorize the script on a weekly basis.
