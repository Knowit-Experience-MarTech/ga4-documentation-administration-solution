# Firestore and Server-side Google Tag Manager
If you are using **Server-side Google Tag Manager** (sGTM), **Firestore** can be integrated in the data collection in real-time. Here are some possible use cases:

* **Flag** GA4 Events that are being collected and not documented.
* **Route** GA4 Events to a different GA4 Property if Events aren’t documented.
* **Block** GA4 Events that aren’t documented.
* Add **event_group** parameter (Custom Dimension) from your documentation to the **Event Name** in real-time.

These examples aren’t randomly selected. This functionality can be found in some other Event based analytics tools, and also in third party solutions that handles Event documentation.

## Syncing GA4 Events & Parameters to Firestore
[**Google Cloud Firestore**](https://cloud.google.com/firestore) is a NoSQL document database built for automatic scaling, high performance, and ease of application development.

To access Firestore with Apps Script, the [**Firestore library**](https://github.com/grahamearley/FirestoreGoogleAppsScript) has been installed in this Google Sheet.

Firestore free quota per day is 50,000 document Reads, 20,000 document Writes and 20,000 document Deletes. See [**Firestore pricing**](https://cloud.google.com/firestore/pricing) for more information.

**Syncing GA4 Events & Parameters to Firestore works like this:**

* If the Event Name isn’t in Firestore, the Event Name & Parameters will be added.
* If the Event Name is in Firestore & Google Sheet, the Event Name & Parameters will be updated.
* If the Event Name is in Firestore, but not Google Sheet, the Event Name & Parameters will be deleted from Firestore.

**The following data is synchronized with Firestore:**

| Parameter | Description |
| ------------- | ------------- |
| change_status | **added** or **updated** |
| date_edited  | Date event_name or parameters was edited. Date comes from Autofilled Time column.  |
| event_group | **Event Group** from Events Sheet. |
| event_name | **Event Name** from Events Sheet. |
| event_parameters | **Event Parameters** from Events Sheet. Array. |
| items | **Item Parameters** from Events Sheet. Array. |
| user_properties | **User Scoped Parameters** from Events Sheet. Array. |

![Firestore Event Documentation](images/firestore-event-documentation.png)

## Google Cloud & Firestore Setup
Either create a new [**Google Cloud Project**](https://console.cloud.google.com/projectcreate) for the Firestore setup, or add Firestore to your existing **sGTM project**.

### Firestore Setup
Follow the steps below to set up Firestore.

* [Select a Cloud Firestore mode](https://console.cloud.google.com/firestore/create-database)
  * Select Native Mode
* Choose where to store your data
  * Create Database
 
#### Create a Google Service Account
To connect this Google Sheet to Firestore, the easiest way is to create a **Google Service Account** with **read/write access** to your Firestore database. Giving a service account access to your datastore is like giving access to a user’s account, but this account is strictly used by your script, not by a person.

* Open the [**Google Service Accounts page**](https://console.cloud.google.com/projectselector2/iam-admin/serviceaccounts).
* Select the Firestore project, and then click **“Create Service Account“**.
* For your service account’s role, choose **Datastore > Cloud Datastore Owner**.
* Check the **“Furnish a new private key”** box and select **JSON** as your **key type**.
* When you press **“Create“**, your browser will download a **.json** file with your private key.
* Save the .json file locally.

## Firestore Setup in Google Sheet
* Go to the **Settings** Sheet and **Firestore settings**.
* Insert the following values from the .json file:
  * **Client Email** -> **client_email** from the .json file
  * **Project ID** -> **project_id** from the .json file
  * **Private Key** -> **private_key** from the .json file
* **First Collection** -> Name of first collection. Suggested name **event_data**.
  * See [**Firestore Collections**](https://cloud.google.com/firestore/docs/data-model#collections) help text.
* **Sheet Settings** -> **Date Format**. Dropdown menu.
  * Date stored comes from **Autofilled Time** in the **Event Sheet**.

**Firestore Settings** will be stored as [**Apps Script Script Properties**](https://developers.google.com/apps-script/guides/properties).

## Server-side Google Tag Manager Setup
The last part of the puzzle is to either **flag**, **block** or **route** undocumented Events in **Server-side GTM**. In the example setup here, we are going to **flag** undocumented Events.

### Firestore Lookup Variable
To do that we are going to use a **Firestore Lookup Variable**. For detailed information about this variable, see the [**Enrich Server-side Data With Cloud Firestore**](https://www.simoahava.com/analytics/enrich-server-side-data-with-cloud-firestore/) by _Simo Ahava_. Do especially read the [**Override Project ID part**](https://www.simoahava.com/analytics/enrich-server-side-data-with-cloud-firestore/#override-project-id) if Server-side GTM and Firestore are in 2 different Google Cloud projects.

| Settings | Value | Description |
| ------------- | ------------- | ------------- |
| Lookup type | Document path | Help text from the Firestore Lookup Variable: “Look up a document by specifying its components (collection, document, subcollection)“. |
| Document path | event_data/{{Event Name}} | If you have chosen a different **First Collection** in the **Firestore Setting** in Google Sheet, replace **event_data** with your choice. |
| Key Path | event_group | Will return **Event Group** from the Google Sheet. |
| Override Project ID | your-firestore-project-id | If Firestore lives in a different Google Cloud Project, you have to override Project ID. |
| Convert undefined | not-documented | Undocumented Events will be flagged as **not-documented** Event Group. See settings in the Firestore Lookup image below. |

![Firestore Variable in Server-side GTM](images/sgtm-firestore-variable.png)

Now edit your **GA4 Tag** in **sGTM**. In the **Parameters to Add / Edit** section, add **event_group** as a parameter, and your **Firestore Lookup Variable** as **Value**.
![GA4 Tag in Server-side GTM](images/ga4-tag-sgtm.png)

The image from the **GA4 Explore report** shows the result of this setup. **Core Web Vital Events** haven't been documented, and are flagged as **not_documented**.

![GA4 Exploration not-documented Event Group](images/ga4-event_group-not-documented.png )
