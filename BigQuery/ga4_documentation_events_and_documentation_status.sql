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
* Adjust settings in declare below if needed.
*/

/*** DECLARATIONS THAT CAN BE EDITED ***/
-- EVENTS
declare excluded_events_hardcoded string default ''; -- Events excluded from the documentation IN ADDITION to those uploaded from Google Sheet if needed. Separate events by comma.

/*** END DECLARATIONS THAT CAN BE EDITED ***/

/*** DECLARATIONS THAT SHOULDN'T BE EDITED ***/

-- QUERY PERIODS
declare day_interval_short int64;
declare day_interval_extended int64;
declare delete_event_count_after_days int64;

-- Combine declared excluded events with table-based events_exclusion
declare excluded_events string default (
  select string_agg(event, ', ')
  from (
    select distinct trim(value) as event
    from unnest(split(excluded_events_hardcoded, ',')) as value
    union distinct
    select distinct trim(value) as event
    from `your-project.analytics_XXX.ga4_documentation_bq_settings`,
    unnest(split(events_exclusion, ',')) as value
    where events_exclusion is not null and events_exclusion != ''
  )
);

-- Declare variables to check table existence
declare events_fresh_exists bool default false;
declare events_intraday_exists bool default false;
declare yesterday_events_exists bool default false;

--Logic for getting the event count for a longer period with the first query
declare day_interval int64;
declare is_initial_run bool default (
  select count(1) = 0 
  from `your-project.analytics_XXX.__TABLES_SUMMARY__`
  where table_id = 'ga4_documentation_events_daily_counts'
);

set day_interval_short = (
  select ep_day_interval_short
  from `your-project.analytics_XXX.ga4_documentation_bq_settings`
);

set day_interval_extended = (
  select ep_day_interval_extended
  from `your-project.analytics_XXX.ga4_documentation_bq_settings`
);

set delete_event_count_after_days = (
  select ep_delete_event_count_after_days
  from `your-project.analytics_XXX.ga4_documentation_bq_settings`
);

if is_initial_run then
  set day_interval = day_interval_extended; -- Extend period for the first run
else
  set day_interval = day_interval_short; -- Regular period
end if;

/*** END DECLARATIONS THAT SHOULDN'T BE EDITED ***/

-- Create the table if not exists
create table if not exists `your-project.analytics_XXX.ga4_documentation_events_and_documentation_status` (
  event_group string options(description='Event Group. Used for event categorization.'),
  event_name string options(description='Event Name.'),
  event_method string options(description='Type of tracking/data collection method. Implementation, Google Tag Manager setup etc.'),
  event_type string options(description='Type of event. Standard, custom event etc.'),
  key_event bool options(description='Is the Event a Key Event.'),
  key_event_counting string options(description='How is the Key Event counted (event/session).'),
  event_description string options(description='Event Description.'),
  event_comment string options(description='Event Comment. Additional information about the event.'),
  event_gtm_comment string options(description='Comment related to Google Tag Manager or GA4 setup. Ex. name of Tag in GTM that tracks this Event.'),
  event_documentation_status string options(description='Documentation in Google Sheet is joined with GA4 BQ data. Status can be: Documented and Data, Documented no Data and Not Documented.'),
  platform_web bool options(description='Coalesce of Google Sheet and GA4 BQ data. Is (or should) Event Name (be) tracked in the Web Platform.'),
  platform_android bool options(description='Coalesce of Google Sheet and GA4 BQ data. Is (or should) Event Name (be) tracked in the Android Platform.'),
  platform_ios bool options(description='Coalesce of Google Sheet and GA4 BQ data. Is (or should) Event Name (be) tracked in the iOS Platform.'),
  event_count_total int64 options(description='GA4 BQ data. Total Event Count.'),
  event_count_web int64 options(description='GA4 BQ data. Event Count for Web Platform.'),
  event_count_android int64 options(description='GA4 BQ data. Event Count for Android Platform.'),
  event_count_ios int64 options(description='GA4 BQ data. Event Count for iOS Platform.'),
  event_edited_time datetime options(description='Time when Event was edited in Google Sheet.'),
  event_uploaded_to_bq_time datetime options(description='Time when Event documentation was uploaded to BQ.'),
  event_last_seen_date_total date options(description='Date showing the last date the Event was "seen" overall.'),
  event_last_seen_date_web date options(description='Date showing the last date the Event was "seen" in the Web Platform.'),
  event_last_seen_date_android date options(description='Date showing the last date the Event was "seen" in the Android Platform.'),
  event_last_seen_date_ios date options(description='Date showing the last date the Event was "seen" in the iOS Platform.'),
  event_first_seen_date_total date options(description='Date showing the first date the Event was "seen" overall.'),
  event_first_seen_date_web date options(description='Date showing the first date the Event was "seen" in the Web Platform.'),
  event_first_seen_date_android date options(description='Date showing the first date the Event was "seen" in the Android Platform.'),
  event_first_seen_date_ios date options(description='Date showing the first date the Event was "seen" in the iOS Platform.')
);

-- Check if events_fresh_* table exists using __TABLES_SUMMARY__
set events_fresh_exists = (
  select count(1) > 0
  from `your-project.analytics_XXX.__TABLES_SUMMARY__`
  where table_id like 'events_fresh_%'
);

-- Check if events_intraday_* table exists using __TABLES_SUMMARY__
set events_intraday_exists = (
  select count(1) > 0
  from `your-project.analytics_XXX.__TABLES_SUMMARY__`
  where table_id like 'events_intraday_%'
);

-- Check if yesterday's events_* table exists using __TABLES_SUMMARY__
set yesterday_events_exists = (
  select count(1) > 0
  from `your-project.analytics_XXX.__TABLES_SUMMARY__`
  where table_id = concat('events_', format_date('%Y%m%d', date_sub(current_date(), interval 1 day)))
);

-- Create an empty temporary table with the same schema as your events tables
create temp table EventsData as
  select 
    event_date,
    event_name,
    platform
  from `your-project.analytics_XXX.events_*` limit 0;

begin
  if events_fresh_exists then
    -- Query events_fresh_* for the date range from startDate to today
    insert into EventsData
    select
      event_date,
      event_name,
      platform
    from `your-project.analytics_XXX.events_fresh_*`
    where _table_suffix between format_date('%Y%m%d', date_sub(current_date(), interval day_interval day))
      and format_date('%Y%m%d', current_date())
      and event_name not in unnest(split(excluded_events, ', '));
      
  else
    -- Query events_* table for the date range from startDate to yesterday
    insert into EventsData
    select 
      event_date,
      event_name,
      platform
    from `your-project.analytics_XXX.events_*`
    where _table_suffix between format_date('%Y%m%d', date_sub(current_date(), interval day_interval day))
      and format_date('%Y%m%d', date_sub(current_date(), interval 1 day))
      and event_name not in unnest(split(excluded_events, ', '));

    -- If events_intraday_* table exists, query it for today
    if events_intraday_exists then
      insert into EventsData
      select
        event_date,
        event_name,
        platform
      from `your-project.analytics_XXX.events_intraday_*`
      where _table_suffix = format_date('%Y%m%d', current_date())
      and event_name not in unnest(split(excluded_events, ', '));
    end if;

    -- If yesterday's events_* table doesn't exist, query yesterday's events_intraday_* table
    if not yesterday_events_exists then
      if events_intraday_exists then
        insert into EventsData
        select
          event_date,
          event_name,
          platform
        from `your-project.analytics_XXX.events_intraday_*`
        where _table_suffix = format_date('%Y%m%d', date_sub(current_date(), interval 1 day))
        and event_name not in unnest(split(excluded_events, ', '));
      end if;
    end if;
  end if;
end;

create temp table TempPreparedData as
  with EventCount as (
  select
    event_name,
    parse_date('%Y%m%d', event_date) as event_date,
    max(case when platform = 'WEB' then true else false end) as platform_web,
    max(case when platform = 'ANDROID' then true else false end) as platform_android,
    max(case when platform = 'IOS' then true else false end) as platform_ios,
    count(*) as event_count_total,
    sum(case when platform = 'WEB' then 1 else 0 end) as event_count_web,
    sum(case when platform = 'ANDROID' then 1 else 0 end) as event_count_android,
    sum(case when platform = 'IOS' then 1 else 0 end) as event_count_ios,
    max(parse_date('%Y%m%d', event_date)) as event_last_seen_date_total,
    max(case when platform = 'WEB' then parse_date('%Y%m%d', event_date) end) as event_last_seen_date_web,
    max(case when platform = 'ANDROID' then parse_date('%Y%m%d', event_date) end) as event_last_seen_date_android,
    max(case when platform = 'IOS' then parse_date('%Y%m%d', event_date) end) as event_last_seen_date_ios
  from EventsData
  group by event_name, event_date
),

FirstOccurrenceAllTime as (
  select
    event_name,
    min(parse_date('%Y%m%d', event_date)) as event_first_seen_date_total,
    min(case when platform = 'WEB' then parse_date('%Y%m%d', event_date) end) as event_first_seen_date_web,
    min(case when platform = 'ANDROID' then parse_date('%Y%m%d', event_date) end) as event_first_seen_date_android,
    min(case when platform = 'IOS' then parse_date('%Y%m%d', event_date) end) as event_first_seen_date_ios
  from EventsData
  group by event_name
),

AggregatedEventCount as (
  select
    ec.*,
    fo.event_first_seen_date_total,
    fo.event_first_seen_date_web,
    fo.event_first_seen_date_android,
    fo.event_first_seen_date_ios
  from EventCount ec
  left join FirstOccurrenceAllTime fo
    on ec.event_name = fo.event_name
),

PreparedData as (
  select
    coalesce(aec.event_name, ed.event_name) as event_name,
    aec.event_date,
    coalesce(aec.platform_web, ed.platform_web) as platform_web,
    coalesce(aec.platform_android, ed.platform_android) as platform_android,
    coalesce(aec.platform_ios, ed.platform_ios) as platform_ios,
    sum(aec.event_count_total) as event_count_total,
    sum(aec.event_count_web) as event_count_web,
    sum(aec.event_count_android) as event_count_android,
    sum(aec.event_count_ios) as event_count_ios,
    coalesce(aec.event_last_seen_date_total, ed.event_last_seen_date_total) as event_last_seen_date_total,
    coalesce(aec.event_last_seen_date_web, ed.event_last_seen_date_web) as event_last_seen_date_web,
    coalesce(aec.event_last_seen_date_android, ed.event_last_seen_date_android) as event_last_seen_date_android,
    coalesce(aec.event_last_seen_date_ios, ed.event_last_seen_date_ios) as event_last_seen_date_ios,
    -- Use first seen dates from `AggregatedEventCount` only if `ed` values are null
    case when ed.event_first_seen_date_total is null then aec.event_first_seen_date_total else ed.event_first_seen_date_total end as event_first_seen_date_total,
    case when ed.event_first_seen_date_web is null then aec.event_first_seen_date_web else ed.event_first_seen_date_web end as event_first_seen_date_web,
    case when ed.event_first_seen_date_android is null then aec.event_first_seen_date_android else ed.event_first_seen_date_android end as event_first_seen_date_android,
    case when ed.event_first_seen_date_ios is null then aec.event_first_seen_date_ios else ed.event_first_seen_date_ios end as event_first_seen_date_ios
  from
    `your-project.analytics_XXX.ga4_documentation_events_and_documentation_status` ed
  full join 
    AggregatedEventCount aec
    on aec.event_name = ed.event_name
  group by
    aec.event_name, ed.event_name, aec.event_date, aec.platform_web, ed.platform_web, aec.platform_android, ed.platform_android, aec.platform_ios, ed.platform_ios, aec.event_last_seen_date_total, ed.event_last_seen_date_total, aec.event_last_seen_date_web, ed.event_last_seen_date_web, aec.event_last_seen_date_android, ed.event_last_seen_date_android, aec.event_last_seen_date_ios, ed.event_last_seen_date_ios, ed.event_first_seen_date_total, aec.event_first_seen_date_total, ed.event_first_seen_date_web, aec.event_first_seen_date_web, ed.event_first_seen_date_android, aec.event_first_seen_date_android, ed.event_first_seen_date_ios, aec.event_first_seen_date_ios
)

select
  edoc.event_group,
  coalesce(pd.event_name, edoc.event_name) as event_name,
  pd.event_date,
  edoc.event_method,
  edoc.event_type,
  edoc.key_event,
  edoc.key_event_counting,
  case 
    when edoc.event_description is null then 'Not Documented' 
    else regexp_replace(edoc.event_description, r'\\r\\n|\\n', '\n')
  end as event_description,
  regexp_replace(edoc.event_comment, r'\\r\\n|\\n', '\n') as event_comment,
  regexp_replace(edoc.event_gtm_comment, r'\\r\\n|\\n', '\n') as event_gtm_comment,
  case 
    when edoc.event_name is null then 'Not Documented' 
    when edoc.event_group is not null and event_count_total > 0 then 'Documented and Data'
    else 'Documented no Data'
  end as event_documentation_status,
  coalesce(edoc.event_website, pd.platform_web) as platform_web,
  coalesce(edoc.event_android_app, pd.platform_android) as platform_android,
  coalesce(edoc.event_ios_app, pd.platform_ios) as platform_ios,
  coalesce(pd.event_count_total, 0) as event_count_total,
  coalesce(pd.event_count_web, 0) as event_count_web,
  coalesce(pd.event_count_android, 0) as event_count_android,
  coalesce(pd.event_count_ios, 0) as event_count_ios,
  edoc.event_edited_time,
  edoc.event_uploaded_to_bq_time,
  pd.event_last_seen_date_total,
  pd.event_last_seen_date_web,
  pd.event_last_seen_date_android,
  pd.event_last_seen_date_ios,
  pd.event_first_seen_date_total,
  pd.event_first_seen_date_web,
  pd.event_first_seen_date_android,
  pd.event_first_seen_date_ios
    
from 
  PreparedData pd
  full join (
    select
      event_name,
      event_group,
      event_method,
      event_type,
      key_event,
      key_event_counting,
      event_description,
      event_comment,
      event_gtm_comment,
      event_website,
      event_ios_app,
      event_android_app,
      event_edited_time,
      event_uploaded_to_bq_time
    from 
      `your-project.analytics_XXX.ga4_documentation_events`
    where 
      event_name not in ('ga4_config')
  ) eDoc 
    on edoc.event_name = pd.event_name
where
  (event_uploaded_to_bq_time is not null or event_count_total > 0)

group by 
  event_name,
  event_date,
  event_group,
  event_method,
  event_type,
  key_event,
  key_event_counting,
  event_description,
  event_comment,
  event_gtm_comment,
  event_website,
  event_ios_app,
  event_android_app,
  event_documentation_status,
  platform_web,
  platform_android,
  platform_ios,
  event_count_total,
  event_count_web,
  event_count_android,
  event_count_ios,
  event_edited_time,
  event_uploaded_to_bq_time,
  event_last_seen_date_total,
  event_last_seen_date_web,
  event_last_seen_date_android,
  event_last_seen_date_ios,
  event_first_seen_date_total,
  event_first_seen_date_web,
  event_first_seen_date_android,
  event_first_seen_date_ios
;

merge into `your-project.analytics_XXX.ga4_documentation_events_and_documentation_status` as target
using (
  select
    event_name,
    max(event_group) as event_group,
    max(event_method) as event_method,
    max(event_type) as event_type,
    max(key_event) as key_event,
    max(key_event_counting) as key_event_counting,
    max(event_description) as event_description,
    max(event_comment) as event_comment,
    max(event_gtm_comment) as event_gtm_comment,
    max(event_documentation_status) as event_documentation_status,
    max(platform_web) as platform_web,
    max(platform_android) as platform_android,
    max(platform_ios) as platform_ios,
    sum(event_count_total) as event_count_total,
    sum(event_count_web) as event_count_web,
    sum(event_count_android) as event_count_android,
    sum(event_count_ios) as event_count_ios,
    max(event_edited_time) as event_edited_time,
    max(event_uploaded_to_bq_time) as event_uploaded_to_bq_time,
    max(event_last_seen_date_total) as event_last_seen_date_total,
    max(event_last_seen_date_web) as event_last_seen_date_web,
    max(event_last_seen_date_android) as event_last_seen_date_android,
    max(event_last_seen_date_ios) as event_last_seen_date_ios,
    min(event_first_seen_date_total) as event_first_seen_date_total,
    min(event_first_seen_date_web) as event_first_seen_date_web,
    min(event_first_seen_date_android) as event_first_seen_date_android,
    min(event_first_seen_date_ios) as event_first_seen_date_ios
  from TempPreparedData
  group by event_name
) as source
on target.event_name = source.event_name

when matched then
  update set
    target.event_group = source.event_group,
    target.event_method = source.event_method,
    target.event_type = source.event_type,
    target.key_event = source.key_event,
    target.key_event_counting = source.key_event_counting,
    target.event_description = source.event_description,
    target.event_comment = source.event_comment,
    target.event_gtm_comment = source.event_gtm_comment,
    target.event_documentation_status = source.event_documentation_status,
    target.platform_web = source.platform_web,
    target.platform_android = source.platform_android,
    target.platform_ios = source.platform_ios,
    target.event_count_total = source.event_count_total,
    target.event_count_web = source.event_count_web,
    target.event_count_android = source.event_count_android,
    target.event_count_ios = source.event_count_ios,
    target.event_edited_time = source.event_edited_time,
    target.event_uploaded_to_bq_time = source.event_uploaded_to_bq_time,
    target.event_last_seen_date_total = source.event_last_seen_date_total,
    target.event_last_seen_date_web = source.event_last_seen_date_web,
    target.event_last_seen_date_android = source.event_last_seen_date_android,
    target.event_last_seen_date_ios = source.event_last_seen_date_ios,

    -- Preserve earliest first seen dates (same pattern for each)
    target.event_first_seen_date_total = case
      when target.event_first_seen_date_total is null then source.event_first_seen_date_total
      when source.event_first_seen_date_total is null then target.event_first_seen_date_total
      else least(target.event_first_seen_date_total, source.event_first_seen_date_total)
    end,
    target.event_first_seen_date_web = case
      when target.event_first_seen_date_web is null then source.event_first_seen_date_web
      when source.event_first_seen_date_web is null then target.event_first_seen_date_web
      else least(target.event_first_seen_date_web, source.event_first_seen_date_web)
    end,
    target.event_first_seen_date_android = case
      when target.event_first_seen_date_android is null then source.event_first_seen_date_android
      when source.event_first_seen_date_android is null then target.event_first_seen_date_android
      else least(target.event_first_seen_date_android, source.event_first_seen_date_android)
    end,
    target.event_first_seen_date_ios = case
      when target.event_first_seen_date_ios is null then source.event_first_seen_date_ios
      when source.event_first_seen_date_ios is null then target.event_first_seen_date_ios
      else least(target.event_first_seen_date_ios, source.event_first_seen_date_ios)
    end

when not matched by TARGET then
  insert (
    event_group, 
    event_name, 
    event_method, 
    event_type, 
    key_event, 
    key_event_counting, 
    event_description, 
    event_comment, 
    event_gtm_comment,
    event_documentation_status, 
    platform_web, 
    platform_android, 
    platform_ios, 
    event_count_total, 
    event_count_web, 
    event_count_android, 
    event_count_ios, 
    event_edited_time, 
    event_uploaded_to_bq_time, 
    event_last_seen_date_total, 
    event_last_seen_date_web, 
    event_last_seen_date_android, 
    event_last_seen_date_ios, 
    event_first_seen_date_total, 
    event_first_seen_date_web, 
    event_first_seen_date_android, 
    event_first_seen_date_ios
  )
  values (
    source.event_group, 
    source.event_name, 
    source.event_method, 
    source.event_type, 
    source.key_event, 
    source.key_event_counting, 
    source.event_description, 
    source.event_comment, 
    source.event_gtm_comment, 
    source.event_documentation_status, 
    source.platform_web, 
    source.platform_android, 
    source.platform_ios, 
    source.event_count_total, 
    source.event_count_web, 
    source.event_count_android, 
    source.event_count_ios, 
    source.event_edited_time, 
    source.event_uploaded_to_bq_time, 
    source.event_last_seen_date_total, 
    source.event_last_seen_date_web, 
    source.event_last_seen_date_android, 
    source.event_last_seen_date_ios, 
    source.event_first_seen_date_total, 
    source.event_first_seen_date_web, 
    source.event_first_seen_date_android, 
    source.event_first_seen_date_ios
  )
when not matched by source then
  delete;

/*** IMAGE DOCUMENTATION FOR EVENTS ***/
-- Step 1: Create the table if not exists
create table if not exists `your-project.analytics_XXX.ga4_documentation_events_and_images` (
    event_name string options(description='Event Name.'),
    event_image_documentation string options(description='URL to image.')
)
cluster by event_name;

merge into `your-project.analytics_XXX.ga4_documentation_events_and_images` as target
using (
select 
  event_name,
  case -- Fix Google Drive Image URL so it can be used in ex. Looker Studio
  when event_image like 'https://drive.google.com/file/d/%' then
    concat('https://drive.google.com/uc?id=', 
      substring(event_image, instr(event_image, '/d/') + 3, instr(event_image, '/view') - (instr(event_image, '/d/') + 3)))
    else
    event_image
  end as event_image_documentation
from
  `your-project.analytics_XXX.ga4_documentation_events`,
  unnest(split(event_image_documentation)) as event_image
where
  event_image_documentation is not null and event_image_documentation != ''
) as source
on target.event_image_documentation = source.event_image_documentation

when matched then
  update set
    target.event_image_documentation = source.event_image_documentation

when not matched then
  insert (event_name, event_image_documentation)
  values (source.event_name, source.event_image_documentation)

when not matched by source then
  delete;

/***** LOG DAILY EVENT count ****/
-- Step 1: Create the partitioned table if it doesn't exist
create table if not exists `your-project.analytics_XXX.ga4_documentation_events_daily_counts`
(
  event_date date options(description='Event Date.'),
  event_name string options(description='Event Name.'),
  event_count_total int64 options(description='Daily Total Event Count across Web and Apps.'),
  event_count_web int64 options(description='Daily Event Count for Web Platform.'),
  event_count_android int64 options(description='Daily Event Count for Android Platform.'),
  event_count_ios int64 options(description='Daily Event Count for iOS Platform.')
)
partition by event_date
cluster by event_name;

merge into `your-project.analytics_XXX.ga4_documentation_events_daily_counts` as target
using (
select
  event_date,
  event_name,
  coalesce(max(event_count_total), 0) as event_count_total,
  coalesce(max(event_count_web), 0) as event_count_web,
  coalesce(max(event_count_android), 0) as event_count_android,
  coalesce(max(event_count_ios), 0) as event_count_ios
from (
  -- Generate the range of dates and cross join with unique event data
  select distinct 
    date_sub(current_date(), interval day_offset day) as event_date,
    event_name
  from 
    TempPreparedData,
    unnest(generate_array(0, day_interval)) as day_offset
) as date_event_combinations
left join (
  -- Ensure TempPreparedData has unique rows for event_name and event_date
  select distinct
    event_date,
    event_name,
    max(event_count_total) as event_count_total,
    max(event_count_web) as event_count_web,
    max(event_count_android) as event_count_android,
    max(event_count_ios) as event_count_ios
  from TempPreparedData
  group by event_date, event_name
) as unique_events using (event_name, event_date)
group by event_date, event_name
order by event_date desc
) as source
on target.event_date = source.event_date and target.event_name = source.event_name

when matched then
  update set
    target.event_count_total = source.event_count_total,
    target.event_count_web = source.event_count_web,
    target.event_count_android = source.event_count_android,
    target.event_count_ios = source.event_count_ios

when not matched then
  insert (
    event_date,
    event_name,
    event_count_total,
    event_count_web,
    event_count_android,
    event_count_ios
  )
  values (
    source.event_date,
    source.event_name,
    source.event_count_total,
    source.event_count_web,
    source.event_count_android,
    source.event_count_ios
  );

   --**** DELETE AND CLEAN UP DATA ****
-- Delete event count data older than 365 days
delete from `your-project.analytics_XXX.ga4_documentation_events_daily_counts`
where event_date < date_sub(current_date(), interval delete_event_count_after_days day);
