/**
 * Copyright 2025 Knowit Experience Oslo
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     https://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "as IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** Query related information **
* Replace your-project.analytics_XXX with your project and data set
*/

declare parameter_col_do_not_exists bool;
declare parameter_col_status_do_not_exists bool;
declare parameter_status_col_exists bool;
declare event_status_col_exists bool;
declare event_daily_count_exists bool;
declare parameters_daily_count_exists bool;
declare anomaly_exists bool;
declare anomaly_sessions_exists bool;
declare bq_settings_exists bool;

/*** Add colums if table exist ***/
set parameter_col_do_not_exists = (
  select count(*) = 0
  from `your-project.analytics_XXX.INFORMATION_SCHEMA.COLUMNS`
  where table_name = 'ga4_documentation_parameters'
    and column_name = 'parameter_web'
);

if parameter_col_do_not_exists  then
  execute immediate "alter table `your-project.analytics_XXX.ga4_documentation_parameters` add column parameter_web bool";
  execute immediate "alter table `your-project.analytics_XXX.ga4_documentation_parameters` add column parameter_ios bool";
  execute immediate "alter table `your-project.analytics_XXX.ga4_documentation_parameters` add column parameter_android bool";
end if;

set parameter_col_status_do_not_exists = (
  select count(*) = 0
  from `your-project.analytics_XXX.INFORMATION_SCHEMA.COLUMNS`
  where table_name = 'ga4_documentation_parameters_and_documentation_status'
    and column_name = 'parameter_documentation_status'
);

if parameter_col_status_do_not_exists  then
  execute immediate "alter table `your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status` add column parameter_documentation_status string";
  execute immediate "alter table `your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status` add column parameter_documentation_status_aggregated string";
end if;

/*** Drop redundant tables if columns exist ***/
set parameter_status_col_exists  = (
  select count(*) > 0
  from `your-project.analytics_XXX.INFORMATION_SCHEMA.COLUMNS`
  where table_name = 'ga4_documentation_parameters_and_documentation_status'
    and column_name = 'event_website'
);

if parameter_status_col_exists  then
  execute immediate "alter table `your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status` drop column event_website";
  execute immediate "alter table `your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status` drop column event_ios_app";
  execute immediate "alter table `your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status` drop column event_android_app";
end if;

/*** Drop redundant tables if columns exist ***/
set event_status_col_exists = (
  select count(*) > 0
  from `your-project.analytics_XXX.INFORMATION_SCHEMA.COLUMNS`
  where table_name = 'ga4_documentation_events_and_documentation_status'
    and column_name = 'event_website'
);

if event_status_col_exists then
  execute immediate "alter table `your-project.analytics_XXX.ga4_documentation_events_and_documentation_status` drop column event_website";
  execute immediate "alter table `your-project.analytics_XXX.ga4_documentation_events_and_documentation_status` drop column event_ios_app";
  execute immediate "alter table `your-project.analytics_XXX.ga4_documentation_events_and_documentation_status` drop column event_android_app";
end if;

/*** Add description to tables ***/

alter table `your-project.analytics_XXX.ga4_documentation_events_and_documentation_status`
alter column event_group
  set options(description = 'Event Group. Used for event categorization.'),
alter column event_name
  set options(description = 'Event Name.'),
alter column event_method
  set options(description = 'Type of tracking/data collection method. Implementation, Google Tag Manager setup etc.'),
alter column event_type
  set options(description = 'Type of event. Standard, custom event etc.'),
alter column key_event
  set options(description = 'Is the Event a Key Event.'),
alter column key_event_counting
  set options(description = 'How is the Key Event counted (event/session).'),
alter column event_description
  set options(description = 'Event Description.'),
alter column event_comment
  set options(description = 'Event Comment. Additional information about the event.'),
alter column event_gtm_comment
  set options(description = 'Comment related to Google Tag Manager or GA4 setup. Ex. name of Tag in GTM that tracks this Event.'),
alter column event_documentation_status
  set options(description = 'Documentation in Google Sheet is joined with GA4 BQ data. Status can be: Documented and Data, Documented no Data and Not Documented.'),
alter column platform_web
  set options(description = 'Coalesce of Google Sheet and GA4 BQ data. Is (or should) Event Name (be) tracked in the Web Platform.'),
alter column platform_android
  set options(description = 'Coalesce of Google Sheet and GA4 BQ data. Is (or should) Event Name (be) tracked in the Android Platform.'),
alter column platform_ios
  set options(description = 'Coalesce of Google Sheet and GA4 BQ data. Is (or should) Event Name (be) tracked in the iOS Platform.'),
alter column event_count_total
  set options(description = 'GA4 BQ data. Total Event Count.'),
alter column event_count_web
  set options(description = 'GA4 BQ data. Event Count for Web Platform.'),
alter column event_count_android
  set options(description = 'GA4 BQ data. Event Count for Android Platform.'),
alter column event_count_ios
  set options(description = 'GA4 BQ data. Event Count for iOS Platform'),
alter column event_edited_time
  set options(description = 'Time when Event was edited in Google Sheet.'),
alter column event_uploaded_to_bq_time
  set options(description = 'Time when Event documentation was uploaded to BQ.'),
alter column event_last_seen_date_total
  set options(description = 'Date showing the last date the Event was "seen" overall.'),
alter column event_last_seen_date_web
  set options(description = 'Date showing the last date the Event was "seen" in the Web Platform.'),
alter column event_last_seen_date_android
  set options(description = 'Date showing the last date the Event was "seen" in the Android Platform.'),
alter column event_last_seen_date_ios
  set options(description = 'Date showing the last date the Event was "seen" in the iOS Platform.'),
alter column event_first_seen_date_total
  set options(description = 'Date showing the first date the Event was "seen" overall.'),
alter column event_first_seen_date_web
  set options(description = 'Date showing the first date the Event was "seen" in the Web Platform.'),
alter column event_first_seen_date_android
  set options(description = 'Date showing the first date the Event was "seen" in the Android Platform.'),
alter column event_first_seen_date_ios
  set options(description = 'Date showing the first date the Event was "seen" in the iOS Platform.')
;

set event_daily_count_exists = (
  select count(1) > 0
  from `your-project.analytics_XXX.__TABLES_SUMMARY__`
  where table_id = 'ga4_documentation_events_daily_counts'
);

if event_daily_count_exists then
  execute immediate """
    alter table `your-project.analytics_XXX.ga4_documentation_events_daily_counts`
    alter column event_date
      set options(description = 'Event Date.'),
    alter column event_name
      set options(description = 'Event Name.'),
    alter column event_count_total
      set options(description = 'Daily Total Event Count across Web and Apps.'),
    alter column event_count_web
      set options(description = 'Daily Event Count for Web Platform.'),
    alter column event_count_android
      set options(description = 'Daily Event Count for Android Platform.'),
    alter column event_count_ios
      set options(description = 'Daily Event Count for iOS Platform.')
  """;
end if;


alter table `your-project.analytics_XXX.ga4_documentation_events_and_images`
alter column event_name
  set options(description = 'Event Name.'),
alter column event_image_documentation
  set options(description = 'URL to image.')
;  

alter table `your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status`
alter column event_name
  set options(description = 'Event Name.'),
alter column parameter_group
  set options(description = 'Parameter Group. Used for parameter categorization.'),
alter column parameter_display_name
  set options(description = 'Parameter Display Name.'),
alter column parameter_name
  set options(description = 'Parameter Name.'),
alter column parameter_scope
  set options(description = 'Parameter Scope. EVENT, USER, ITEM.'),
alter column parameter_type
  set options(description = 'Parameter Type. Custom Dimension, Custom Metric etc..'),
alter column parameter_format
  set options(description = 'Parameter Format. String, Currency, Standard etc..'),
alter column parameter_disallow_ads_personalization
  set options(description = 'NPA (Non-Personalized Ads).'),
alter column parameter_example_value
  set options(description = 'Parameter example value.'),
alter column parameter_description
  set options(description = 'Parameter Description.'),
alter column parameter_gtm_comment
  set options(description = 'Comment related to Google Tag Manager or GA4 setup. Ex. name of Variable, Data Layer Name etc..'),
alter column ga4_config_parameter
  set options(description = 'Parameters in Google Sheet that in the Events Sheet is added to the "fake" ga4_config Event Name will get this flag. These are global parameters that do not belong to a specific Event.'),
alter column parameter_count_total
  set options(description = 'Total count for parameter across Events and all Platforms (Web, iOS and Android).'),
alter column parameter_count_web
  set options(description = 'Total count for parameter across Events and the Web Platform.'),
alter column parameter_count_android
  set options(description = 'Total count for parameter across Events and the Android Platform.'),
alter column parameter_count_ios
  set options(description = 'Total count for parameter across Events and the iOS Platform.'),
alter column platform_web
  set options(description = 'Coalesce of Google Sheet and GA4 BQ data. Is (or should) Parameter (be) tracked in the Web Platform.'),
alter column platform_android
  set options(description = 'Coalesce of Google Sheet and GA4 BQ data. Is (or should) Parameter (be) tracked in the Android Platform.'),
alter column platform_ios
  set options(description = 'Coalesce of Google Sheet and GA4 BQ data. Is (or should) Parameter (be) tracked in the iOS Platform.'),
alter column parameter_last_seen_date_total
  set options(description = 'Date showing the last date the Parameter was "seen" overall.'),
alter column parameter_last_seen_date_web
  set options(description = 'Date showing the last date the Parameter was "seen" in the Web Platform.'),
alter column parameter_last_seen_date_android
  set options(description = 'Date showing the last date the Parameter was "seen" in the Android Platform.'),
alter column parameter_last_seen_date_ios
  set options(description = 'Date showing the last date the Parameter was "seen" in the iOS Platform.'),
alter column parameter_first_seen_date_total
  set options(description = 'Date showing the first date the Parameter was "seen" overall.'),
alter column parameter_first_seen_date_web
  set options(description = 'Date showing the first date the Parameter was "seen" in the Web Platform.'),
alter column parameter_first_seen_date_android
  set options(description = 'Date showing the first date the Parameter was "seen" in the Android Platform.'),
alter column parameter_first_seen_date_ios
  set options(description = 'Date showing the first date the Parameter was "seen" in the iOS Platform.'),
alter column parameter_documentation_status
  set options(description = 'Documentation in Google Sheet is joined with GA4 BQ data. Status can be: Documented and Data, Documented no Data and Not Documented.'),
alter column parameter_documentation_status_aggregated
  set options(description = 'Documentation in Google Sheet is joined with GA4 BQ data on a aggregated level. Status can be: Documented and Data, Documented no Data and Not Documented.')
;

set parameters_daily_count_exists = (
  select count(1) > 0
  from `your-project.analytics_XXX.__TABLES_SUMMARY__`
  where table_id = 'ga4_documentation_parameters_daily_counts'
);

if parameters_daily_count_exists then
  execute immediate """
    alter table `your-project.analytics_XXX.ga4_documentation_parameters_daily_counts`
    alter column event_date
      set options(description = 'Event Date.'),
    alter column parameter_name
      set options(description = 'Parameter Name.'),
    alter column parameter_scope
      set options(description = 'Parameter Scope.'),
    alter column event_name
      set options(description = 'Event Name.'),
    alter column parameter_count_total
      set options(description = 'Daily Total Parameter Count across all platforms (Web, Android & iOS).'),
    alter column parameter_count_web
      set options(description = 'Daily Parameter Count for Web Platform.'),
    alter column parameter_count_android
      set options(description = 'Daily Parameter Count for Android Platform.'),
    alter column parameter_count_ios
      set options(description = 'Daily Parameter Count for iOS Platform.')
  """;
end if;

set anomaly_exists = (
  select count(1) > 0
  from `your-project.analytics_XXX.__TABLES_SUMMARY__`
  where table_id = 'ga4_documentation_anomaly_detection'
);

if anomaly_exists then
  execute immediate """
    alter table `your-project.analytics_XXX.ga4_documentation_anomaly_detection`
    alter column event_date
      set options(description = 'Event Date.'),
    alter column platform
      set options(description = 'Platform can be WEB, IOS or ANDROID.'),
    alter column event_or_parameter_name
      set options(description = 'event_name or parameter_name.'),
    alter column event_or_parameter_type
      set options(description = 'Can be either "event" or "parameter".'),
    alter column actual_count
      set options(description = 'Actual Count for the Event or Parameter.'),
    alter column expected_count
      set options(description = 'Standard Deviation Expected Count.'),
    alter column anomaly_description
      set options(description = 'Anomaly described as text.'),
    alter column net_change_percentage
      set options(description = 'Anomaly change expressed as percent in the format 0.1 = 10%, 1 = 100% etc.'),
    alter column parameter_scope
      set options(description = 'Parameter Scope if the anomaly is for a parameter.'),
    alter column event_name
      set options(description = 'Event Name. Relevant for parameter anomaly.'),
    alter column upper_bound
      set options(description = 'Upper Bound deviation from expected value. This can help with post-analysis, debugging, and tuning the detection sensitivity.'),
    alter column lower_bound
      set options(description = 'Lower Bound deviation from expected value.  This can help with post-analysis, debugging, and tuning the detection sensitivity.')
  """;
end if;

set anomaly_sessions_exists = (
  select count(1) > 0
  from `your-project.analytics_XXX.__TABLES_SUMMARY__`
  where table_id = 'ga4_documentation_anomaly_detection_session_counts'
);

if anomaly_sessions_exists then
  execute immediate """
    alter table `your-project.analytics_XXX.ga4_documentation_anomaly_detection_session_counts`
    alter column event_date
      set options(description = 'Event Date.'),
    alter column platform
      set options(description = 'Platform can be WEB, IOS or ANDROID.'),
    alter column session_count_total
      set options(description = 'Total count of sessions for platform.')
  """;
end if;

set bq_settings_exists = (
  select count(1) > 0
  from `your-project.analytics_XXX.__TABLES_SUMMARY__`
  where table_id = 'ga4_documentation_bq_settings'
);

if bq_settings_exists then
  execute immediate """
    alter table `your-project.analytics_XXX.ga4_documentation_bq_settings`
    alter column events_exclusion
      set options(description = 'Events that should be excluded from queries. Events comes from Exclude Events from SQL Query in Settings in Google Sheet.'),
    alter column parameters_exclusion
      set options(description = 'Parameters that should be excluded from queries. Parameters comes from Exclude Params from Query in Settings in Google Sheet.'),
    alter column ep_day_interval_short
      set options(description = 'Number of days to query for Events and Parameters  (e.g. last 1 day). Value comes from Day Interval Short in Advanced Settings in Google Sheet. Declared in query as day_interval_short.'),
    alter column ep_day_interval_extended
      set options(description = 'Number of days to query the first time to get some event & parameter count data. If you have lots of data, cost may occur if you are selecting a long period. For anomaly detection you need at least 28 days of data. Value comes from Day Interval Extended in Advanced Settings in Google Sheet. Declared in query as day_interval_extended.'),
    alter column ep_delete_event_count_after_days
      set options(description = 'Event  & parameter daily count data older than this will be deleted. Value comes from Delete Count Data After Number of Days in Advanced Settings in Google Sheet. Declared in query as delete_event_count_after_days.'),
    alter column anomaly_day_interval_short
      set options(description = 'Number of days to check for anomalies (e.g., last 1 day). Value comes from Day Interval Short Anomalies in Advanced Settings in Google Sheet. Declared in query as day_interval_short.'),
    alter column anomaly_day_interval_extended
      set options(description = 'Number of days to query the first time to get some session count data. Value comes from Day Interval Extended Anomalies in Advanced Settings in Google Sheet. Declared in query as day_interval_extended.'),
    alter column anomaly_days_before_anomaly_detection
      set options(description = 'Minimum number of days of data collected before running anomaly detection. With standard deviation model, 28 days (as minimum) is recommended. With day of week adjustment, 56 or 84 is recommended. Value comes from Minimum Number of Days before Anomaly Detection in Advanced Settings in Google Sheet. Declared in query as days_before_anomaly_detection.'),
    alter column anomaly_day_interval_large
      set options(description = 'Number of Days for rolling statistics (e.g., last 90 days). Value comes from Rolling Statistics Interval in Advanced Settings in Google Sheet. Declared in query as day_interval_large.'),
    alter column anomaly_delete_anomaly_data_after_days
      set options(description = 'Anomaly data older than this will be deleted. Value comes from Delete Anomaly Data After Number of Days in Advanced Settings in Google Sheet. Declared in query as delete_anomaly_data_after_days.'),
    alter column anomaly_day_interval_new_events_params
      set options(description = 'Number of days to check for new events and parameters. (e.g. last 1 day). Value comes from Number of Days to check for new Events or Parameters in Advanced Settings in Google Sheet. Declared in query as day_interval_new_events_params.'),
    alter column anomaly_stddev_model_setting
      set options(description = 'Standard Deviation model can either be "standard" or "dayofweek". dayofweek = adjusted for day of week. standard = not adjusted for day of week. Value comes from Standard Deviation Model Setting in Advanced Settings in Google Sheet. Declared in query as stddev_model_setting.'),
    alter column anomaly_min_expected_count
      set options(description = 'Minimum expected count threshold for anomaly detection. If expected count is equal to or lower than this number, no anomaly detection will be run. Delcared in query as min_expected_count.'),
    alter column anomaly_stddev_multiplier
      set options(description = 'Multiplier for standard deviation. Standard deviation for events and parameters. Scale goes from 1 to 3. Default setting is 3; lower sensitivity, fewer false positives. Value comes from Standard Deviation Multiplier in Advanced Settings in Google Sheet. Declared in query as stddev_multiplier.'),
    alter column anomaly_events_explained_by_sessions_threshold
      set options(description = 'If an event anomaly is reported, and should have been explained by changes in sessions, increase the number. Decrease the number for the opposite scenario. Value comes from Events Explained by Sessions Threshold in Advanced Settings in Google Sheet. Declared in query as events_explained_by_sessions_threshold.'),
    alter column anomaly_parameters_explained_by_sessions_threshold
      set options(description = 'If an parameter anomaly is reported, and should have been explained by changes in sessions, increase the number. Decrease the number for the opposite scenario. Value comes from Parameters Explained by Sessions Threshold in Advanced Settings in Google Sheet. Declared in query as parameters_explained_by_sessions_threshold.'),
    alter column events_anomaly_exclusion
      set options(description = 'Exclude Events from Anomaly Detection. These Events are in addition to Events excluded in the Settings Sheet.')
  """;
end if;

create table if not exists `your-project.analytics_XXX.ga4_documentation_bq_settings` (
  events_exclusion string options(description='Events that should be excluded from queries. Events comes from Exclude Events from SQL Query in Settings in Google Sheet.'),
  parameters_exclusion string options(description='Parameters that should be excluded from queries. Parameters comes from Exclude Params from Query in Settings in Google Sheet.'),
  ep_day_interval_short int64 options(description='Number of days to query for Events and Parameters  (e.g. last 1 day). Value comes from Day Interval Short in Advanced Settings in Google Sheet. Declared in query as day_interval_short.'),
  ep_day_interval_extended int64 options(description='Number of days to query the first time to get some event & parameter count data. If you have lots of data, cost may occur if you are selecting a long period. For anomaly detection you need at least 28 days of data. Value comes from Day Interval Extended in Advanced Settings in Google Sheet. Declared in query as day_interval_extended.'),
  ep_delete_event_count_after_days int64 options(description='Event  & parameter daily count data older than this will be deleted. Value comes from Delete Count Data After Number of Days in Advanced Settings in Google Sheet. Declared in query as delete_event_count_after_days.'),
  anomaly_day_interval_short int64 options(description='Number of days to check for anomalies (e.g., last 1 day). Value comes from Day Interval Short Anomalies in Advanced Settings in Google Sheet. Declared in query as day_interval_short.'),
  anomaly_day_interval_extended int64 options(description='Number of days to check for anomalies (e.g., last 1 day). Value comes from Day Interval Short Anomalies in Advanced Settings in Google Sheet. Declared in query as day_interval_short.'),
  anomaly_days_before_anomaly_detection int64 options(description='Minimum number of days of data collected before running anomaly detection. With standard deviation model, 28 days (as minimum) is recommended. With day of week adjustment, 56 or 84 is recommended. Value comes from Minimum Number of Days before Anomaly Detection in Advanced Settings in Google Sheet. Declared in query as days_before_anomaly_detection.'),
  anomaly_day_interval_large int64 options(description='Number of Days for rolling statistics (e.g., last 90 days). Value comes from Rolling Statistics Interval in Advanced Settings in Google Sheet. Declared in query as day_interval_large.'),
  anomaly_delete_anomaly_data_after_days int64 options(description='Anomaly data older than this will be deleted. Value comes from Delete Anomaly Data After Number of Days in Advanced Settings in Google Sheet. Declared in query as delete_anomaly_data_after_days.'),
  anomaly_day_interval_new_events_params int64 options(description='Number of days to check for new events and parameters. (e.g. last 1 day). Value comes from Number of Days to check for new Events or Parameters in Advanced Settings in Google Sheet. Declared in query as day_interval_new_events_params.'),
  anomaly_stddev_model_setting string options(description='Standard Deviation model can either be "standard" or "dayofweek". dayofweek = adjusted for day of week. standard = not adjusted for day of week. Value comes from Standard Deviation Model Setting in Advanced Settings in Google Sheet. Declared in query as stddev_model_setting.'),
  anomaly_min_expected_count int64 options(description='Minimum expected count threshold for anomaly detection. If expected count is equal to or lower than this number, no anomaly detection will be run. Delcared in query as min_expected_count.'),
  anomaly_stddev_multiplier float64 options(description='Multiplier for standard deviation. Standard deviation for events and parameters. Scale goes from 1 to 3. Default setting is 3; lower sensitivity, fewer false positives. Value comes from Standard Deviation Multiplier in Advanced Settings in Google Sheet. Declared in query as stddev_multiplier.'),
  anomaly_events_explained_by_sessions_threshold float64 options(description='If an event anomaly is reported, and should have been explained by changes in sessions, increase the number. Decrease the number for the opposite scenario. Value comes from Events Explained by Sessions Threshold in Advanced Settings in Google Sheet. Declared in query as events_explained_by_sessions_threshold.'),
  anomaly_parameters_explained_by_sessions_threshold float64 options(description='If an parameter anomaly is reported, and should have been explained by changes in sessions, increase the number. Decrease the number for the opposite scenario. Value comes from Parameters Explained by Sessions Threshold in Advanced Settings in Google Sheet. Declared in query as parameters_explained_by_sessions_threshold.'),
  events_anomaly_exclusion string options(description='Exclude Events from Anomaly Detection. These Events are in addition to Events excluded in the Settings Sheet.')
);

