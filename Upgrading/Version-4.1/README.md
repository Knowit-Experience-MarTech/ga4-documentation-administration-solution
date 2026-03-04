# Upgrading to Version 4.1

This version fixed a SQL bug with images used in documentation. They were not saved to `ga4_documentation_events_and_images` table.

### BigQuery

Replace the following Scheduled Queries:

* [ga4_documentation_events_and_documentation_status](../../Setup/BigQuery/ga4_documentation_events_and_documentation_status.sql)

## Google Sheet

After you have done **all the changes**, go to **Settings** in the **Google Sheet**. Scroll down to **Version**, and add **v4.1** as the new version.
