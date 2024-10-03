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

/** Query related information **
* Replace your-project.analytics_XXX with your project and data set
* As default 3 days of data is queried. Change the number of days to what suits your needs best.
* To get a feeling of the size of the query, comment out "create table" & "create temp table" line, end of "create temp table", and the "merge" part.
*/
-- Create the table if not exists

create table if not exists `your-project.analytics_XXX.ga4_documentation_events_and_documentation_status` (
  event_group string,
  event_name string,
  event_method string,
  event_type string,
  key_event bool,
  key_event_counting string,
  event_description string,
  event_comment string,
  event_gtm_comment string,
  event_website bool,
  event_ios_app bool,
  event_android_app bool,
  event_documentation_status string,
  platform_web bool,
  platform_android bool,
  platform_ios bool,
  event_count_total int64,
  event_count_web int64,
  event_count_android int64,
  event_count_ios int64,
  event_edited_time datetime,
  event_uploaded_to_bq_time datetime,
  event_last_seen_date_total date,
  event_last_seen_date_web date,
  event_last_seen_date_android date,
  event_last_seen_date_ios date,
  event_first_seen_date_total date,
  event_first_seen_date_web date,
  event_first_seen_date_android date,
  event_first_seen_date_ios date,
);

create temp table TempPreparedData as
with EventCount as (
  select
    event_name,
    case when platform = 'WEB' then true end as platform_web,
    case when platform = 'ANDROID' then true end as platform_android,
    case when platform = 'IOS' then true end as platform_ios,
    count(event_name) as event_count_total,
    case when platform = 'WEB' then count(event_name) else 0 end as event_count_web,
    case when platform = 'ANDROID' then count(event_name) else 0 end as event_count_android,
    case when platform = 'IOS' then count(event_name) else 0 end as event_count_ios,
    max(cast(event_date as date format 'YYYYMMDD')) as event_last_seen_date_total,
    case when platform = 'WEB' then max(cast(event_date as date format 'YYYYMMDD')) end as event_last_seen_date_web,
    case when platform = 'ANDROID' then max(cast(event_date as date format 'YYYYMMDD')) end as event_last_seen_date_android,
    case when platform = 'IOS' then max(cast(event_date as date format 'YYYYMMDD')) end as event_last_seen_date_ios
  from 
    `your-project.analytics_XXX.events_*`
  where 
    regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
    and format_date('%Y%m%d', current_date())
    and event_name not in ('session_start', 'first_visit', 'user_engagement', 'first_open')
  group by
    event_name,
    platform
),

FirstOccurrenceAllTime as (
  select
    event_name,
    min(cast(event_date as date format 'YYYYMMDD')) as event_first_seen_date_calculated,
    case when platform = 'WEB' then min(cast(event_date as date format 'YYYYMMDD')) end as event_first_seen_date_web_calculated,
    case when platform = 'ANDROID' then min(cast(event_date as date format 'YYYYMMDD')) end as event_first_seen_date_android_calculated,
    case when platform = 'IOS' then min(cast(event_date as date format 'YYYYMMDD')) end as event_first_seen_date_ios_calculated
  from 
    `your-project.analytics_XXX.events_*`
  where 
    event_name not in ('session_start', 'first_visit', 'user_engagement', 'first_open')
    and regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day)) and format_date('%Y%m%d', current_date()) -- Add -- before and (the date query) for true first seen date the first (and maybe second) time you run the query. This may however be really hefty query, and can be costly. To get a feeling of the size of the query, comment out "create table" & "create temp table" line, end of "create temp table", and the "merge" part.
  group by
    event_name,
    platform
),

PreparedData as (
  select
    coalesce(ec.event_name, ed.event_name) as event_name,
    coalesce(ec.platform_web, ed.platform_web) as platform_web,
    coalesce(ec.platform_android, ed.platform_android) as platform_android,
    coalesce(ec.platform_ios, ed.platform_ios) as platform_ios,
    ec.event_count_total,
    ec.event_count_web,
    ec.event_count_android,
    ec.event_count_ios,
    coalesce(ec.event_last_seen_date_total, ed.event_last_seen_date_total) as event_last_seen_date_total,
    coalesce(ec.event_last_seen_date_web, ed.event_last_seen_date_web) as event_last_seen_date_web,
    coalesce(ec.event_last_seen_date_android, ed.event_last_seen_date_android) as event_last_seen_date_android,
    coalesce(ec.event_last_seen_date_ios, ed.event_last_seen_date_ios) as event_last_seen_date_ios,
    coalesce(ed.event_first_seen_date_total, fa.event_first_seen_date_calculated) as event_first_seen_date_total,
    coalesce(ed.event_first_seen_date_web, fa.event_first_seen_date_web_calculated) as event_first_seen_date_web,
    coalesce(ed.event_first_seen_date_android, fa.event_first_seen_date_android_calculated) as event_first_seen_date_android,
    coalesce(ed.event_first_seen_date_ios, fa.event_first_seen_date_ios_calculated) as event_first_seen_date_ios
  from
    `your-project.analytics_XXX.ga4_documentation_events_and_documentation_status` ed
  left join 
    EventCount ec 
    on ec.event_name = ed.event_name
  left join 
    FirstOccurrenceAllTime fa
    on ed.event_name = fa.event_name
    and ed.event_first_seen_date_total is null -- Only join if no existing first seen date
)

select
  edoc.event_group,
  coalesce(pd.event_name, edoc.event_name) as event_name,
  edoc.event_method,
  edoc.event_type,
  edoc.key_event,
  edoc.key_event_counting,
  event_description,
  edoc.event_comment,
  edoc.event_gtm_comment,
  edoc.event_website,
  edoc.event_ios_app,
  edoc.event_android_app,
  case 
    when edoc.event_name is null then 'Not Documented' 
    when edoc.event_group is not null and event_count_total > 0 then 'Documented and Data'
    else 'Documented no Data'
  end as event_documentation_status,
  coalesce(pd.platform_web, false) as platform_web,
  coalesce(pd.platform_android, false) as platform_android,
  coalesce(pd.platform_ios, false) as platform_ios,
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
using TempPreparedData as source
on target.event_name = source.event_name

when matched then
  update set
    event_name = source.event_name,
    event_group = source.event_group,
    event_method = source.event_method,
    event_type = source.event_type,
    key_event = source.key_event,
    key_event_counting = source.key_event_counting,
    event_description = source.event_description,
    event_comment = source.event_comment,
    event_gtm_comment = source.event_gtm_comment,
    event_website = source.event_website,
    event_ios_app = source.event_ios_app,
    event_android_app = source.event_android_app,
    event_documentation_status = source.event_documentation_status,
    platform_web = source.platform_web,
    platform_android = source.platform_android,
    platform_ios = source.platform_ios,
    event_count_total = source.event_count_total,
    event_count_web = source.event_count_web,
    event_count_android = source.event_count_android,
    event_count_ios = source.event_count_ios,
    event_edited_time = source.event_edited_time,
    event_uploaded_to_bq_time = source.event_uploaded_to_bq_time,
    event_last_seen_date_total = source.event_last_seen_date_total,
    event_last_seen_date_web = source.event_last_seen_date_web,
    event_last_seen_date_android = source.event_last_seen_date_android,
    event_last_seen_date_ios = source.event_last_seen_date_ios,
    event_first_seen_date_total = source.event_first_seen_date_total,
    event_first_seen_date_web = source.event_first_seen_date_web,
    event_first_seen_date_android = source.event_first_seen_date_android,
    event_first_seen_date_ios = source.event_first_seen_date_ios

when not matched then
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
    source.event_website, 
    source.event_ios_app, 
    source.event_android_app, 
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
  );

delete from `your-project.analytics_XXX.ga4_documentation_events_and_documentation_status`
where event_name not in (
    select event_name
    from TempPreparedData
);
