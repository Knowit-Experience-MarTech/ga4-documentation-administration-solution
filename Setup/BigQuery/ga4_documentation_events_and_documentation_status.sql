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

/** Query related information **
* Replace "your-project.analytics_XXX" with your project and data set
* Adjust settings in declarations below if needed.
*/

-- query periods
declare day_interval_short int64;
declare day_interval_extended int64;
declare delete_event_count_after_days int64;

-- excluded events from settings table (normalized + deduped)
declare excluded_events array<string> default (
  select array_agg(ee_array order by ee_array)
  from (
    select distinct trim(ee_array) as ee_array
    from `your-project.analytics_XXX.ga4_documentation_bq_settings`,
    unnest(split(events_exclusion, ',')) as ee_array
    where events_exclusion is not null
      and trim(ee_array) <> ''
  )
);

-- initial run logic
declare day_interval int64;

-- table existence flags
declare events_fresh_exists bool default false;
declare events_intraday_exists bool default false;
declare yesterday_events_exists bool default false;

-- reusable suffixes for wildcard reads
declare today_suffix string;
declare yest_suffix string;
declare start_suffix string;

declare is_initial_run bool default (
  select count(1) = 0
  from `your-project.analytics_XXX`.INFORMATION_SCHEMA.TABLES
  where table_name = 'ga4_documentation_events_daily_counts'
);

-- load settings
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
  set day_interval = day_interval_extended; -- first run = longer backfill
else
  set day_interval = day_interval_short; -- regular window
end if;

set today_suffix = format_date('%Y%m%d', current_date());
set yest_suffix  = format_date('%Y%m%d', date_sub(current_date(), interval 1 day));
set start_suffix = format_date('%Y%m%d', date_sub(current_date(), interval day_interval day));

/*** === target tables: create if needed === ***/
create table if not exists `your-project.analytics_XXX.ga4_documentation_events_and_documentation_status` (
  event_group string options(description='Event group/category used for organization (e.g., Engagement, Ecommerce).'),
  event_name string options(description='GA4 Event Name. Primary key for the documentation row.'),
  event_method string options(description='How the event is collected (e.g., GTM tag, SDK instrumentation, server-side).'),
  event_type string options(description='Event type classification (e.g., standard, custom).'),
  key_event bool options(description='Whether the event is marked as a Key Event in documentation.'),
  key_event_counting string options(description='Counting basis for the Key Event (e.g., Event, Session).'),

  event_description string options(description='Human-readable description of what the event represents and when it fires.'),
  event_comment string options(description='General notes about the event (implementation details, caveats).'),
  event_gtm_comment string options(description='Notes specific to GTM/GA4 setup (e.g., tag names, triggers).'),
  event_documentation_status string options(description='Join status between docs and data: "Documented and Data", "Documented no Data", or "Not Documented".'),

  platform_web bool options(description='Is/should the event be tracked on Web.'),
  platform_android bool options(description='Is/should the event be tracked on Android.'),
  platform_ios bool options(description='Is/should the event be tracked on iOS.'),

  event_count_total int64 options(description='Total observed event count across all platforms.'),
  event_count_web int64 options(description='Observed event count on Web.'),
  event_count_android int64 options(description='Observed event count on Android.'),
  event_count_ios int64 options(description='Observed event count on iOS.'),

  event_edited_time datetime options(description='Timestamp from the source documentation indicating when the event entry was last edited.'),
  event_uploaded_to_bq_time datetime options(description='When the documentation for this event was last imported to BigQuery.'),

  event_last_seen_date_total date options(description='Most recent date the event was observed on any platform.'),
  event_last_seen_date_web date options(description='Most recent date the event was observed on Web.'),
  event_last_seen_date_android date options(description='Most recent date the event was observed on Android.'),
  event_last_seen_date_ios date options(description='Most recent date the event was observed on iOS.'),

  event_first_seen_date_total date options(description='Earliest date the event was observed on any platform (per table history).'),
  event_first_seen_date_web date options(description='Earliest date the event was observed on Web.'),
  event_first_seen_date_android date options(description='Earliest date the event was observed on Android.'),
  event_first_seen_date_ios date options(description='Earliest date the event was observed on iOS.')
)
cluster by event_name;

create table if not exists `your-project.analytics_XXX.ga4_documentation_events_and_images` (
  event_name string options(description='Name of the event.'),
  event_image_documentation string options(description='URL to image.')
)
cluster by event_name;

create table if not exists `your-project.analytics_XXX.ga4_documentation_events_daily_counts` (
  event_date date options(description='Date on which the event counts were recorded.'),
  event_name string options(description='Name of the event being tracked.'),
  event_count_total int64 options(description='Total number of events recorded daily across all platforms.'),
  event_count_web int64 options(description='Number of events recorded daily for the Web platform.'),
  event_count_android int64 options(description='Number of events recorded daily for the Android platform.'),
  event_count_ios int64 options(description='Number of events recorded daily for the iOS platform.')
)
partition by event_date
cluster by event_name;

create table if not exists `your-project.analytics_XXX.ga4_documentation_events_first_seen` (
  event_name string options(description='Name of the event.'),
  platform string options(description='When the event was first seen for a platform.'),
  first_seen_date date options(description='Date when the event was first observed.')
)
cluster by event_name, platform;

/*** === source table availability === ***/
set events_fresh_exists = exists (
  select 1
  from `your-project.analytics_XXX`.INFORMATION_SCHEMA.TABLES
  where table_name like 'events_fresh_%'
);

set events_intraday_exists = exists (
  select 1
  from `your-project.analytics_XXX`.INFORMATION_SCHEMA.TABLES
  where table_name like 'events_intraday_%'
);

set yesterday_events_exists = exists (
  select 1
  from `your-project.analytics_XXX`.INFORMATION_SCHEMA.TABLES
  where table_name = concat('events_', yest_suffix)
);

/*** === stage raw events === ***/
create temp table events_data (
  event_date date,
  event_name string,
  platform string
);

if events_fresh_exists then
  insert into events_data
  select
    parse_date('%Y%m%d', event_date) as event_date,
    event_name,
    platform
  from `your-project.analytics_XXX.events_fresh_*`
  where _table_suffix between start_suffix and today_suffix
    and event_name not in unnest(excluded_events)
    and event_name is not null
    and platform in ('WEB','ANDROID','IOS');
else
  insert into events_data
  select
    parse_date('%Y%m%d', event_date),
    event_name,
    platform
  from `your-project.analytics_XXX.events_*`
  where _table_suffix between start_suffix and yest_suffix
    and event_name not in unnest(excluded_events)
    and event_name is not null
    and platform in ('WEB','ANDROID','IOS');

  if events_intraday_exists then
    insert into events_data
    select
      parse_date('%Y%m%d', event_date),
      event_name,
      platform
    from `your-project.analytics_XXX.events_intraday_*`
    where _table_suffix = today_suffix
      and event_name not in unnest(excluded_events)
      and event_name is not null
      and platform in ('WEB','ANDROID','IOS');
  end if;

  if not yesterday_events_exists and events_intraday_exists then
    insert into events_data
    select
      parse_date('%Y%m%d', event_date),
      event_name,
      platform
    from `your-project.analytics_XXX.events_intraday_*`
    where _table_suffix = yest_suffix
      and event_name not in unnest(excluded_events)
      and event_name is not null
      and platform in ('WEB','ANDROID','IOS');
  end if;
end if;

/*** === prep & enrich (first-seen computed without reading first_seen table) === ***/
create temp table temp_prepared_data as
with
eventcount as (
  select
    event_name,
    event_date,
    logical_or(upper(platform)='WEB') as platform_web,
    logical_or(upper(platform)='ANDROID') as platform_android,
    logical_or(upper(platform)='IOS') as platform_ios,
    count(*) as event_count_total,
    countif(upper(platform)='WEB') as event_count_web,
    countif(upper(platform)='ANDROID') as event_count_android,
    countif(upper(platform)='IOS') as event_count_ios,
    max(event_date) as event_last_seen_date_total,
    max(if(upper(platform)='WEB', event_date, null)) as event_last_seen_date_web,
    max(if(upper(platform)='ANDROID', event_date, null)) as event_last_seen_date_android,
    max(if(upper(platform)='IOS', event_date, null)) as event_last_seen_date_ios
  from events_data
  group by event_name, event_date
),

run_first_seen as (
  select
    event_name,
    min(event_date) as fs_total,
    min(if(upper(platform)='WEB', event_date, null)) as fs_web,
    min(if(upper(platform)='ANDROID', event_date, null)) as fs_android,
    min(if(upper(platform)='IOS', event_date, null)) as fs_ios
  from events_data
  group by event_name
),

aggregated_event_count as (
  select
    ec.*,
    rfs.fs_total as event_first_seen_date_total,
    rfs.fs_web   as event_first_seen_date_web,
    rfs.fs_android as event_first_seen_date_android,
    rfs.fs_ios   as event_first_seen_date_ios
  from eventcount ec
  left join run_first_seen rfs
    on ec.event_name = rfs.event_name
),

prepared_data as (
  select
    coalesce(aec.event_name, ed.event_name) as event_name,
    aec.event_date,
    coalesce(aec.platform_web, ed.platform_web) as platform_web,
    coalesce(aec.platform_android, ed.platform_android) as platform_android,
    coalesce(aec.platform_ios, ed.platform_ios) as platform_ios,
    aec.event_count_total,
    aec.event_count_web,
    aec.event_count_android,
    aec.event_count_ios,
    coalesce(aec.event_last_seen_date_total, ed.event_last_seen_date_total) as event_last_seen_date_total,
    coalesce(aec.event_last_seen_date_web, ed.event_last_seen_date_web) as event_last_seen_date_web,
    coalesce(aec.event_last_seen_date_android, ed.event_last_seen_date_android) as event_last_seen_date_android,
    coalesce(aec.event_last_seen_date_ios, ed.event_last_seen_date_ios) as event_last_seen_date_ios,
    ifnull(ed.event_first_seen_date_total, aec.event_first_seen_date_total) as event_first_seen_date_total,
    ifnull(ed.event_first_seen_date_web, aec.event_first_seen_date_web) as event_first_seen_date_web,
    ifnull(ed.event_first_seen_date_android, aec.event_first_seen_date_android) as event_first_seen_date_android,
    ifnull(ed.event_first_seen_date_ios, aec.event_first_seen_date_ios) as event_first_seen_date_ios
  from `your-project.analytics_XXX.ga4_documentation_events_and_documentation_status` ed
  full join aggregated_event_count aec
    on aec.event_name = ed.event_name
)

select
  edoc.event_group,
  coalesce(pd.event_name, edoc.event_name) as event_name,
  pd.event_date,
  edoc.event_method,
  edoc.event_type,
  edoc.key_event,
  edoc.key_event_counting,
  ifnull(regexp_replace(edoc.event_description, r'\\r\\n|\\n', '\n'), 'Not Documented') as event_description,
  regexp_replace(edoc.event_comment, r'\\r\\n|\\n', '\n') as event_comment,
  regexp_replace(edoc.event_gtm_comment, r'\\r\\n|\\n', '\n') as event_gtm_comment,
  case
    when edoc.event_name is null then 'Not Documented'
    when edoc.event_group is not null and pd.event_count_total > 0 then 'Documented and Data'
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
from prepared_data pd
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
  from `your-project.analytics_XXX.ga4_documentation_events`
  where event_name not in ('ga4_config')
) as edoc
on edoc.event_name = pd.event_name
where (edoc.event_uploaded_to_bq_time is not null or pd.event_count_total > 0);

/*** === upsert status table (keeps earliest via least logic) === ***/
merge into `your-project.analytics_XXX.ga4_documentation_events_and_documentation_status` as target
using (
  select
    tpd.event_name,
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
  from temp_prepared_data tpd
  group by tpd.event_name
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
when not matched by target then
  insert (
    event_group, event_name, event_method, event_type, key_event, key_event_counting,
    event_description, event_comment, event_gtm_comment, event_documentation_status,
    platform_web, platform_android, platform_ios,
    event_count_total, event_count_web, event_count_android, event_count_ios,
    event_edited_time, event_uploaded_to_bq_time,
    event_last_seen_date_total, event_last_seen_date_web, event_last_seen_date_android, event_last_seen_date_ios,
    event_first_seen_date_total, event_first_seen_date_web, event_first_seen_date_android, event_first_seen_date_ios
  )
  values (
    source.event_group, source.event_name, source.event_method, source.event_type, source.key_event, source.key_event_counting,
    source.event_description, source.event_comment, source.event_gtm_comment, source.event_documentation_status,
    source.platform_web, source.platform_android, source.platform_ios,
    source.event_count_total, source.event_count_web, source.event_count_android, source.event_count_ios,
    source.event_edited_time, source.event_uploaded_to_bq_time,
    source.event_last_seen_date_total, source.event_last_seen_date_web, source.event_last_seen_date_android, source.event_last_seen_date_ios,
    source.event_first_seen_date_total, source.event_first_seen_date_web, source.event_first_seen_date_android, source.event_first_seen_date_ios
  )
when not matched by source then
  delete;

/*** === append-only first_seen table: populate from STATUS (insert if missing; never update) === ***/
merge into `your-project.analytics_XXX.ga4_documentation_events_first_seen` as target
using (
  select event_name, 'WEB' as platform, event_first_seen_date_web as first_seen_date
  from `your-project.analytics_XXX.ga4_documentation_events_and_documentation_status`
  where platform_web is true and event_first_seen_date_web is not null
  union all
  select event_name, 'ANDROID' as platform, event_first_seen_date_android as first_seen_date
  from `your-project.analytics_XXX.ga4_documentation_events_and_documentation_status`
  where platform_android is true and event_first_seen_date_android is not null
  union all
  select event_name, 'IOS' as platform, event_first_seen_date_ios as first_seen_date
  from `your-project.analytics_XXX.ga4_documentation_events_and_documentation_status`
  where platform_ios is true and event_first_seen_date_ios is not null
) as source
on target.event_name = source.event_name
and target.platform = source.platform
when not matched then
  insert (event_name, platform, first_seen_date)
  values (source.event_name, source.platform, source.first_seen_date);

-- note: no "when matched" clause → append-only, never updates.

/*** === daily counts upsert === ***/
merge into `your-project.analytics_XXX.ga4_documentation_events_daily_counts` as target
using (
  with dates as (
    select d as event_date
    from unnest(generate_date_array(date_sub(current_date(), interval day_interval day), current_date())) as d
  ),
  names as (
    select distinct event_name from temp_prepared_data
  ),
  combos as (
    select event_date, event_name
    from dates cross join names
  ),
  unique_events as (
    select
      event_date,
      event_name,
      max(event_count_total) as event_count_total,
      max(event_count_web) as event_count_web,
      max(event_count_android) as event_count_android,
      max(event_count_ios) as event_count_ios
    from temp_prepared_data
    group by event_date, event_name
  )
  select
    c.event_date,
    c.event_name,
    coalesce(u.event_count_total, 0) as event_count_total,
    coalesce(u.event_count_web, 0) as event_count_web,
    coalesce(u.event_count_android, 0) as event_count_android,
    coalesce(u.event_count_ios, 0) as event_count_ios
  from combos c
  left join unique_events u using (event_date, event_name)
) as source
on target.event_date = source.event_date
and target.event_name = source.event_name
when matched then
  update set
    target.event_count_total = source.event_count_total,
    target.event_count_web = source.event_count_web,
    target.event_count_android = source.event_count_android,
    target.event_count_ios = source.event_count_ios
when not matched then
  insert (event_date, event_name, event_count_total, event_count_web, event_count_android, event_count_ios)
  values (source.event_date, source.event_name, source.event_count_total, source.event_count_web, source.event_count_android, source.event_count_ios);

-- retention: delete old daily rows
delete from `your-project.analytics_XXX.ga4_documentation_events_daily_counts`
where event_date < date_sub(current_date(), interval delete_event_count_after_days day);
