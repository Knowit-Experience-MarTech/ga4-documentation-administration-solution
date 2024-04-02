# Apps Script
Apps Script used in the [Google Sheet](https://github.com/Knowit-Experience-MarTech/ga4-documentation-administration-solution) are found in this folder.

Beware that all scripts that interacts with the GA4 API ([Reporting API](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas) & [Admin API](https://developers.google.com/analytics/devguides/config/admin/v1/quotas)), there are **Limits and Quotas on API Requests**.

The Google Sheet integrates with several API's & Libraries:
* [Google Analytics Admin API](https://developers.google.com/analytics/devguides/config/admin/v1)
* [Google Analytics Reporting API](https://developers.google.com/analytics/devguides/reporting/data/v1)
* [BigQuery API](https://cloud.google.com/bigquery/docs/reference/rest)
* [FirestoreApp Library](https://github.com/grahamearley/FirestoreGoogleAppsScript)
* [Google Tag Manager API](https://developers.google.com/tag-platform/tag-manager/api/v2)

The first time you use an Apps Script function, Google will throw several warnings about safety: 
> **Google hasn’t verified this app**
> 
> The app is requesting access to sensitive info in your Google Account. Until the developer verifies this app with Google, you shouldn't use it.

It's not possible to verify this type of app unfortunately. If you are concerned about the access permissions required for the scripts, then I recommend you study the Apps Script code.

My "warning" is this:
> Do not grant everyone in your organization access to the Sheet. By accident someone could ex. delete or create conversions/dimensions/metrics in GA4. This Sheet makes operations like this easier, and the number of people having access to **your copy** of the Sheet should therefor be limited. I recommend to share the documentation this Google Sheet creates using ex. Looker Studio.

See also [Unverified apps](https://support.google.com/cloud/answer/7454865) from Google Support.

If you grant access to the Apps Script, the following permissions will be given. 

| Permission  | Comment |
| ------------- | ------------- |
| View and manage your data in Google BigQuery and see the email address for your Google Account | The solution can export Event & Parameter Documentation to BigQuery, and read Event & Parameter Count data from BigQuery. |
| See, edit, create and delete all your Google Sheets spreadsheets | The solution reads & writes data/information to the Sheet. |
| Edit Google Analytics management entities | The soluton can create, update & delete GA4 Conversions, Custom Dimensions & Metrics. |
| See and download your Google Analytics data | The solution can read GA4 Event Count. |
| View and manage your Google Analytics data | The solution can read GA4 Event Count. |
| Manage user permissions of your Google Tag Manager account and container | GTM Container Versions can be downloaded. Who can download the versions is based on access to GTM. |
| Publish your Google Tag Manager container versions | The solution isn't coded for publishing containers, only download versions.  |
| Manage your Google Tag Manager container versions | GTM Container Versions can be downloaded. |
| Manage your Google Tag Manager container and its subcomponents, excluding versioning and publishing | The solution isn't coded for managing containers, only download versions. |
| Connect to an external service | The Sheet can read and write data to Firestore (if you set it up) |
| Display and run third-party web content in prompts and sidebars inside Google applications | **Add/Edit Parameters** button in the **Events** Sheet is usiing this functionality. |


## This app is blocked / make the warnings "more kind"
Some users may not get any warnings, they will just get "**This app is blocked**". This shouldn't have anything to do with the scripts used in the Google Sheet, it's a common issue some users have with any Apps Script.

The best route (maybe) around this problem is to change the **Google Cloud Platform (GCP) Project Number** used by the Apps Script, and choose an existing GCP Project Number (ex. your BigQuery project). Users that should be able to run Apps Script in the Sheet must be added as users to this GCP Project. Since the Google Sheet is integrated with BigQuery (if you set it up), using the BigQuery GCP Project is probably a good solution, but that is up to you to decide.

* Choose **Extensions** from the Google Sheet menu.
  * Go to **Apps Script -> Project Settings**
    * Click **Change project** in the Google Cloud Platform (GCP) Project settings.
      * Add the **Project Number** and click **Set project**
   
The next step is to set up a [**OAuth consent screen**](https://console.cloud.google.com/apis/credentials/consent)
* Choose **Testing** as **publishing status**
* Add **test users** to the consent screen.
  * To be able to run Apps Script, they must be added as **test users**. There is a limitation of 100 test users, but 100 test users should never be granted access to your copy of the Sheet.
* Fill out other mandatory fields.
* Done. **This app is blocked** problem should now be solved, and you should also get less "aggressive" warnings.
   
