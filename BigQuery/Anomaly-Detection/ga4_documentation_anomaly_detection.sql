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
Replace your-project.analytics_XXX with your project and data set.
Adjust settings in declare below if needed.
*/

begin

/***********************
 1) DECLARATIONS / GET SETTINGS
************************/
declare min_expected_count int64;
declare stddev_multiplier float64;
declare events_explained_by_sessions_threshold float64;
declare parameters_explained_by_sessions_threshold float64;
declare stddev_model_setting string;
declare day_interval_short int64;
declare day_interval_new_events_params int64;
declare day_interval_extended int64;
declare day_interval_large int64;
declare delete_anomaly_data_after_days int64;
declare days_before_anomaly_detection int64;

declare stddev_model_order_events string;
declare stddev_model_partitions_events string;
declare stddev_model_partitions_events_sessions string;
declare stddev_model_order_parameters string;
declare stddev_model_partitions_parameters string;
declare stddev_model_partitions_parameters_sessions string default 'pc.platform';

declare excluded_events string;
declare events_anomaly_exclusion string;
declare today_string string default format_date('%Y%m%d', current_date());
declare yesterday_string string default format_date('%Y%m%d', date_sub(current_date(), interval 1 day));
declare start_date_string string;
declare events_fresh_exists bool;
declare events_intraday_exists bool;
declare events_yesterday_exists bool;
declare is_initial_run bool;
declare query_string string;
declare intraday_query_string string;

/*** 2) LOAD SETTINGS FROM BQ ***/
set min_expected_count = (
  select anomaly_min_expected_count
  from `your-project.analytics_XXX.ga4_documentation_bq_settings`
);
set stddev_multiplier = (
  select anomaly_stddev_multiplier
  from `your-project.analytics_XXX.ga4_documentation_bq_settings`
);
set events_explained_by_sessions_threshold = (
  select anomaly_events_explained_by_sessions_threshold
  from `your-project.analytics_XXX.ga4_documentation_bq_settings`
);
set parameters_explained_by_sessions_threshold = (
  select anomaly_parameters_explained_by_sessions_threshold
  from `your-project.analytics_XXX.ga4_documentation_bq_settings`
);
set stddev_model_setting = (
  select anomaly_stddev_model_setting
  from `your-project.analytics_XXX.ga4_documentation_bq_settings`
);
set days_before_anomaly_detection = (
  select anomaly_days_before_anomaly_detection
  from `your-project.analytics_XXX.ga4_documentation_bq_settings`
);
set day_interval_short = (
  select anomaly_day_interval_short
  from `your-project.analytics_XXX.ga4_documentation_bq_settings`
);
set day_interval_new_events_params = (
  select anomaly_day_interval_new_events_params
  from `your-project.analytics_XXX.ga4_documentation_bq_settings`
);
set day_interval_extended = (
  select anomaly_day_interval_extended
  from `your-project.analytics_XXX.ga4_documentation_bq_settings`
);
set day_interval_large = (
  select anomaly_day_interval_large
  from `your-project.analytics_XXX.ga4_documentation_bq_settings`
);
set delete_anomaly_data_after_days = (
  select anomaly_delete_anomaly_data_after_days
  from `your-project.analytics_XXX.ga4_documentation_bq_settings`
);

/** Combine declared excluded events with table-based events_exclusion **/
set excluded_events = (
  select string_agg(event, ', ')
  from (
    select distinct trim(value) as event
    from `your-project.analytics_XXX.ga4_documentation_bq_settings`,
        unnest(split(events_anomaly_exclusion, ',')) as value
    where events_anomaly_exclusion is not null 
      and events_anomaly_exclusion != ''

    union distinct

    select distinct trim(value) as event
    from `your-project.analytics_XXX.ga4_documentation_bq_settings`,
         unnest(split(events_exclusion, ',')) as value
    where events_exclusion is not null 
      and events_exclusion != ''
  )
);

/*** 3) set PARTITION STRINGS DYNAMICALLY ***/
if stddev_model_setting = 'dayofweek' then
  set stddev_model_partitions_events = 'ec.event_name, ec.platform, extract(dayofweek from ec.event_date)';
  set stddev_model_partitions_events_sessions = 'ec.platform, extract(dayofweek from ec.event_date)';
  set stddev_model_partitions_parameters = 'pc.parameter_name, pc.parameter_scope, pc.event_name, pc.platform, extract(dayofweek from pc.event_date)';
  set stddev_model_partitions_parameters_sessions = 'pc.platform, extract(dayofweek from pc.event_date)';
else
  set stddev_model_partitions_events = 'ec.event_name, ec.platform';
  set stddev_model_partitions_events_sessions = 'ec.platform';
  set stddev_model_partitions_parameters = 'pc.parameter_name, pc.parameter_scope, pc.event_name, pc.platform';
  set stddev_model_partitions_parameters_sessions = 'pc.platform';
end if;

set stddev_model_order_events = 'ec.event_date';
set stddev_model_order_parameters = 'pc.event_date';

/*** 4) DETERMINE IF INITIAL RUN, set start_date_string ***/
set is_initial_run = (
  select count(1) = 0
  from `your-project.analytics_XXX.__TABLES_SUMMARY__`
  where table_id = 'ga4_documentation_anomaly_detection_session_counts'
);
if is_initial_run then
  set start_date_string = format_date('%Y%m%d', date_sub(current_date(), interval day_interval_extended - 1 day));
else
  set start_date_string = format_date('%Y%m%d', date_sub(current_date(), interval day_interval_short - 1 day));
end if;

/*** 5) CREATE ANOMALY TABLES IF NOT EXISTS ***/
create table if not exists `your-project.analytics_XXX.ga4_documentation_anomaly_detection` (
  event_date date,
  platform string,
  event_or_parameter_name string,
  event_or_parameter_type string,
  actual_count int64,
  expected_count float64,
  anomaly_description string,
  net_change_percentage float64,
  parameter_scope string,
  event_name string,
  upper_bound float64,
  lower_bound float64
)
partition by event_date
cluster by platform, event_or_parameter_name, event_or_parameter_type, parameter_scope;

create table if not exists `your-project.analytics_XXX.ga4_documentation_anomaly_detection_session_counts` (
  event_date date,
  platform string,
  session_count_total int64
)
partition by event_date
cluster by platform;

/*** 6) BUILD TempSessionData ***/
set events_fresh_exists = (
  select count(1) > 0 
  from `your-project.analytics_XXX.__TABLES_SUMMARY__`
  where table_id = concat('events_fresh_', today_string)
);
set events_intraday_exists = (
  select count(1) > 0 
  from `your-project.analytics_XXX.__TABLES_SUMMARY__`
  where table_id = concat('events_intraday_', today_string)
);
set events_yesterday_exists = (
  select count(1) > 0 
  from `your-project.analytics_XXX.__TABLES_SUMMARY__`
  where table_id = concat('events_', yesterday_string)
);

if events_fresh_exists then
  set query_string = '''
    create temp table TempSessionData as
    select
      parse_date('%Y%m%d', event_date) as event_date,
      count(distinct concat(user_pseudo_id, '_', (
        select value.int_value from unnest(event_params) where key = 'ga_session_id'
      ))) as session_count_total,
      platform
    from `your-project.analytics_XXX.events_fresh_*`
    where _table_suffix between "''' || start_date_string || '''" and "''' || today_string || '''"
      and event_name not in (
        select trim(event) from unnest(split("''' || excluded_events || '''", ",")) as event
      )
    group by event_date, platform
    order by event_date, platform
  ''';
  execute immediate query_string;
else
  -- build the main query first
  set query_string = '''
    select
      parse_date('%Y%m%d', event_date) as event_date,
      count(distinct concat(user_pseudo_id, '_', (
        select value.int_value from unnest(event_params) where key = 'ga_session_id'
      ))) as session_count_total,
      platform
    from `your-project.analytics_XXX.events_*`
    where _table_suffix between "''' || start_date_string || '''" and "''' || yesterday_string || '''"
      and event_name not in (
        select trim(event) from unnest(split("''' || excluded_events || '''", ",")) as event
      )
    group by event_date, platform
    order by event_date, platform
  ''';

  if events_intraday_exists then
    if not events_yesterday_exists then
      set intraday_query_string = '''
        select
          parse_date('%Y%m%d', event_date) as event_date,
          count(distinct concat(user_pseudo_id, '_', (
            select value.int_value from unnest(event_params) where key = 'ga_session_id'
          ))) as session_count_total,
          platform
        from `your-project.analytics_XXX.events_intraday_*`
        where _table_suffix between "''' || yesterday_string || '''" and "''' || today_string || '''"
          and event_name not in (
            select trim(event) from unnest(split("''' || excluded_events || '''", ",")) as event
          )
        group by event_date, platform
        order by event_date, platform
      ''';
    else
      set intraday_query_string = '''
        select
          parse_date('%Y%m%d', event_date) as event_date,
          count(distinct concat(user_pseudo_id, '_', (
            select value.int_value from unnest(event_params) where key = 'ga_session_id'
          ))) as session_count_total,
          platform
        from `your-project.analytics_XXX.events_intraday_*`
        where _table_suffix = "''' || today_string || '''"
          and event_name not in (
            select trim(event) from unnest(split("''' || excluded_events || '''", ",")) as event
          )
        group by event_date, platform
        order by event_date, platform
      ''';
    end if;

    set query_string = '''
      create temp table TempSessionData as
      (''' || query_string || ''')
      union all
      (''' || intraday_query_string || ''')
    ''';
    execute immediate query_string;
  else
    set query_string = '''
      create temp table TempSessionData as
      ''' || query_string || ''';
    ''';
    execute immediate query_string;
  end if;
end if;

/*** 7) merge the session data into anomaly_detection_session_counts ***/
merge `your-project.analytics_XXX.ga4_documentation_anomaly_detection_session_counts` T
using (
  select *
  from TempSessionData
  where platform is not null and platform != ''
) S
on T.event_date = S.event_date
   and T.platform = S.platform
when matched then
  update set session_count_total = S.session_count_total
when not matched then
  insert (event_date, platform, session_count_total)
  values (S.event_date, S.platform, S.session_count_total);

/***************************************************************
 8) CREATE TEMP TABLE AllAnomalies as (WITH all the CTEs + UNION)
***************************************************************/
set query_string = '''
create or replace temp table AllAnomalies as
with
  SessionData as (
    select 
      event_date,
      platform,
      session_count_total
    from `your-project.analytics_XXX.ga4_documentation_anomaly_detection_session_counts`
    where event_date >= date_sub(current_date(), interval ''' || cast(day_interval_large as string) || ''' day)
      and platform is not null and platform != ''
  ),

  EventCounts as (
    select
      ec.event_date,
      ec.event_name,
      ec.event_count_web,
      ec.event_count_android,
      ec.event_count_ios,
      sd.platform
    from `your-project.analytics_XXX.ga4_documentation_events_daily_counts` ec
    left join SessionData sd
      on ec.event_date = sd.event_date
    where ec.event_date >= date_sub(current_date(), interval ''' || cast(day_interval_large as string) || ''' day)
      and ec.event_name not in (
        select trim(event) 
        from unnest(split("''' || excluded_events || '''", ",")) as event
      )
      and sd.platform is not null
      and sd.platform != ''
    group by ec.event_date, ec.event_name, ec.event_count_web, ec.event_count_android, ec.event_count_ios, sd.platform
  ),

  -- EventStats ...
  EventStats as (
    select 
      ec.event_date,
      ec.event_name,
      ec.platform,
      ec.event_count_web,
      ec.event_count_android,
      ec.event_count_ios,
      avg(event_count_web) over (
        partition by ''' || stddev_model_partitions_events || '''
        order by ''' || stddev_model_order_events || '''
        rows between 28 preceding and 1 preceding
      ) as avg_event_count_web,
      -- etc ...
      stddev(event_count_web) over (
        partition by ''' || stddev_model_partitions_events || '''
        order by ''' || stddev_model_order_events || '''
        rows between 28 preceding and 1 preceding
      ) as stddev_event_count_web,

      avg(event_count_android) over (
        partition by ''' || stddev_model_partitions_events || '''
        order by ''' || stddev_model_order_events || '''
        rows between 28 preceding and 1 preceding
      ) as avg_event_count_android,
      stddev(event_count_android) over (
        partition by ''' || stddev_model_partitions_events || '''
        order by ''' || stddev_model_order_events || '''
        rows between 28 preceding and 1 preceding
      ) as stddev_event_count_android,

      avg(event_count_ios) over (
        partition by ''' || stddev_model_partitions_events || '''
        order by ''' || stddev_model_order_events || '''
        rows between 28 preceding and 1 preceding
      ) as avg_event_count_ios,
      stddev(event_count_ios) over (
        partition by ''' || stddev_model_partitions_events || '''
        order by ''' || stddev_model_order_events || '''
        rows between 28 preceding and 1 preceding
      ) as stddev_event_count_ios,

      sc.session_count_total,
      avg(sc.session_count_total) over (
        partition by ''' || stddev_model_partitions_events_sessions || '''
        order by ''' || stddev_model_order_events || '''
        rows between 28 preceding and 1 preceding
      ) as avg_session_count_total
    from EventCounts ec
    left join TempSessionData sc
      on ec.event_date = sc.event_date and ec.platform = sc.platform
    where ec.event_date < current_date()
      and ec.platform = sc.platform
      and ec.event_name in (
        select event_name
        from EventCounts
        group by event_name
        having count(distinct event_date) >= ''' || cast(days_before_anomaly_detection as string) || '''
      )
  ),

  EventAnomalies as (
    select 
      es.event_date,
      es.event_name as event_or_parameter_name,
      'event' as event_or_parameter_type,
      es.platform,
      es.event_count_web as actual_count,
      es.avg_event_count_web as expected_count,
      cast(null as string) as parameter_scope,
      es.event_name as event_name,
          round((es.event_count_web - es.avg_event_count_web) / es.avg_event_count_web, 2) as net_change_percentage,
          round(es.avg_event_count_web + ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_web, 2) as upper_bound,
          round(es.avg_event_count_web - ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_web, 2) as lower_bound,
          case
            when abs((es.event_count_web - es.avg_event_count_web) / es.avg_event_count_web) 
                 <= abs((ss.session_count_total - es.avg_session_count_total) / es.avg_session_count_total) 
                    + ''' || cast(events_explained_by_sessions_threshold as string) || ''' 
            then 'SessionExplains'
            when es.event_count_web > (es.avg_event_count_web + ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_web)
            then concat(
              'Spike in Web Event ', es.event_name,
              '. Actual = ', es.event_count_web,
              ', Expected = ', round(es.avg_event_count_web, 2),
              '. Net change: ', round((es.event_count_web - es.avg_event_count_web) / es.avg_event_count_web * 100, 2),
              '%. Upper Bound: ', round(es.avg_event_count_web + ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_web, 2),
              '. Lower Bound: ', round(es.avg_event_count_web - ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_web, 2),'.'
            )
            when es.event_count_web < (es.avg_event_count_web - ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_web)
            then concat(
              'Drop in Web Event ', es.event_name,
              '. Actual = ', es.event_count_web,
              ', Expected = ', round(es.avg_event_count_web, 2),
              '. Net change: ', round((es.event_count_web - es.avg_event_count_web) / es.avg_event_count_web * 100, 2),
              '%. Upper Bound: ', round(es.avg_event_count_web + ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_web, 2),
              '. Lower Bound: ', round(es.avg_event_count_web - ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_web, 2),'.'
            )
            else null
          end as anomaly_description
    from EventStats es
    left join TempSessionData ss
    on es.event_date = ss.event_date and es.platform = ss.platform
    where es.avg_event_count_web >= ''' || cast(min_expected_count as string) || ''' 
      and es.event_date between date_sub(current_date(), interval ''' || cast(day_interval_short as string) || ''' day)
                              and date_sub(current_date(), interval 1 day)
      and es.platform = ss.platform and es.platform = 'WEB'

    union all

    select 
      es.event_date,
      es.event_name as event_or_parameter_name,
      'event' as event_or_parameter_type,
      es.platform,
      es.event_count_android as actual_count,
      es.avg_event_count_android as expected_count,
      cast(null as string) as parameter_scope,
      es.event_name as event_name,
          round((es.event_count_android - es.avg_event_count_android) / es.avg_event_count_android, 2) as net_change_percentage,
          round(es.avg_event_count_android + ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_android, 2) as upper_bound,
          round(es.avg_event_count_android - ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_android, 2) as lower_bound,
          case
            when abs((es.event_count_android - es.avg_event_count_android) / es.avg_event_count_android) 
                 <= abs((ss.session_count_total - es.avg_session_count_total) / es.avg_session_count_total) 
                    + ''' || cast(events_explained_by_sessions_threshold as string) || '''
            then 'SessionExplains'
            when es.event_count_android > (es.avg_event_count_android + ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_android)
            then concat(
              'Spike in Android Event ', es.event_name,
              '. Actual = ', es.event_count_android,
              ', Expected = ', round(es.avg_event_count_android, 2),
              '. Net change: ', round((es.event_count_android - es.avg_event_count_android) / es.avg_event_count_android * 100, 2),
              '%. Upper Bound: ', round(es.avg_event_count_android + ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_android, 2),
              '. Lower Bound: ', round(es.avg_event_count_android - ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_android, 2),'.'
            )
            when es.event_count_android < (es.avg_event_count_android - ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_android)
            then concat(
              'Drop in Android Event ', es.event_name,
              '. Actual = ', es.event_count_android,
              ', Expected = ', round(es.avg_event_count_android, 2),
              '. Net change: ', round((es.event_count_android - es.avg_event_count_android) / es.avg_event_count_android * 100, 2),
              '%. Upper Bound: ', round(es.avg_event_count_android + ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_android, 2),
              '. Lower Bound: ', round(es.avg_event_count_android - ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_android, 2),'.'
            )
            else null
          end as anomaly_description
    from EventStats es
    left join TempSessionData ss
    on es.event_date = ss.event_date and es.platform = ss.platform
    where es.avg_event_count_web >= ''' || cast(min_expected_count as string) || ''' 
      and es.event_date between date_sub(current_date(), interval ''' || cast(day_interval_short as string) || ''' day)
                              and date_sub(current_date(), interval 1 day)
      and es.platform = ss.platform and es.platform = 'ANDROID'

    union all

    select 
      es.event_date,
      es.event_name as event_or_parameter_name,
      'event' as event_or_parameter_type,
      es.platform,
      es.event_count_ios as actual_count,
      es.avg_event_count_ios as expected_count,
      cast(null as string) as parameter_scope,
      es.event_name as event_name,
          round((es.event_count_ios - es.avg_event_count_ios) / es.avg_event_count_ios, 2) as net_change_percentage,
          round(es.avg_event_count_ios + ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_ios, 2) as upper_bound,
          round(es.avg_event_count_ios - ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_ios, 2) as lower_bound,
          case
            when abs((es.event_count_ios - es.avg_event_count_ios) / es.avg_event_count_ios)
                 <= abs((ss.session_count_total - es.avg_session_count_total) / es.avg_session_count_total)
                    + ''' || cast(events_explained_by_sessions_threshold as string) || '''
            then 'SessionExplains'
            when es.event_count_ios > (es.avg_event_count_ios + ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_ios)
            then concat(
              'Spike in iOS Event ', es.event_name,
              '. Actual = ', es.event_count_ios,
              ', Expected = ', round(es.avg_event_count_ios, 2),
              '. Net change: ', round((es.event_count_ios - es.avg_event_count_ios) / es.avg_event_count_ios * 100, 2),
              '%. Upper Bound: ', round(es.avg_event_count_ios + ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_ios, 2),
              '. Lower Bound: ', round(es.avg_event_count_ios - ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_ios, 2),'.'
            )
            when es.event_count_ios < (es.avg_event_count_ios - ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_ios)
            then concat(
              'Drop in iOS Event ', es.event_name,
              '. Actual = ', es.event_count_ios,
              ', Expected = ', round(es.avg_event_count_ios, 2),
              '. Net change: ', round((es.event_count_ios - es.avg_event_count_ios) / es.avg_event_count_ios * 100, 2),
              '%. Upper Bound: ', round(es.avg_event_count_ios + ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_ios, 2),
              '. Lower Bound: ', round(es.avg_event_count_ios - ''' || cast(stddev_multiplier as string) || ''' * es.stddev_event_count_ios, 2),'.'
            )
            else null
          end as anomaly_description
    from EventStats es
    left join TempSessionData ss
    on es.event_date = ss.event_date and es.platform = ss.platform
    where es.avg_event_count_web >= ''' || cast(min_expected_count as string) || ''' 
      and es.event_date between date_sub(current_date(), interval ''' || cast(day_interval_short as string) || ''' day)
                              and date_sub(current_date(), interval 1 day)
      and es.platform = ss.platform and es.platform = 'IOS'
  ),

  -- Parameter Anomalies
   ParameterCounts as (
    select
      pc.event_date,
      pc.event_name,
      pc.parameter_name,
      pc.parameter_scope,
      pc.parameter_count_web,
      pc.parameter_count_android,
      pc.parameter_count_ios,
      sd.platform
    from 
      `your-project.analytics_XXX.ga4_documentation_parameters_daily_counts` pc
    left join 
      SessionData sd
    on 
      pc.event_date = sd.event_date
    where 
      pc.event_date >= date_sub(current_date(), interval ''' || cast(day_interval_large as string) || ''' day)
      and pc.event_name not in (select trim(event)
        from unnest(split("''' || excluded_events || '''", ",")) as event
      )
      and sd.platform is not null and sd.platform != ''
    group by 
      pc.event_date, pc.event_name, pc.parameter_name,pc.parameter_scope, pc.parameter_count_web, pc.parameter_count_android, pc.parameter_count_ios, sd.platform
  ),

  ParameterStats as (
    select 
      pc.event_date,
      pc.event_name,
      pc.parameter_name,
      pc.parameter_scope,
      pc.platform,
      pc.parameter_count_web,
      pc.parameter_count_android,
      pc.parameter_count_ios,
          avg(parameter_count_web) over (
            partition by ''' || stddev_model_partitions_parameters || '''
            order by ''' || stddev_model_order_parameters || '''
            rows between 28 preceding and 1 preceding
          ) as avg_parameter_count_web,

          stddev(parameter_count_web) over (
            partition by ''' || stddev_model_partitions_parameters || '''
            order by ''' || stddev_model_order_parameters || '''
            rows between 28 preceding and 1 preceding
          ) as stddev_parameter_count_web,

          avg(parameter_count_android) over (
            partition by ''' || stddev_model_partitions_parameters || '''
            order by ''' || stddev_model_order_parameters || '''
            rows between 28 preceding and 1 preceding
          ) as avg_parameter_count_android,

          stddev(parameter_count_android) over (
            partition by ''' || stddev_model_partitions_parameters || '''
            order by ''' || stddev_model_order_parameters || '''
            rows between 28 preceding and 1 preceding
          ) as stddev_parameter_count_android,

          avg(parameter_count_ios) over (
            partition by ''' || stddev_model_partitions_parameters || '''
            order by ''' || stddev_model_order_parameters || '''
            rows between 28 preceding and 1 preceding
          ) as avg_parameter_count_ios,

          stddev(parameter_count_ios) over (
            partition by ''' || stddev_model_partitions_parameters || '''
            order by ''' || stddev_model_order_parameters || '''
            rows between 28 preceding and 1 preceding
          ) as stddev_parameter_count_ios,

          sc.session_count_total,
          avg(sc.session_count_total) over (
            partition by ''' || stddev_model_partitions_parameters_sessions || '''
            order by ''' || stddev_model_order_parameters || '''
            rows between 28 preceding and 1 preceding
          ) as avg_session_count_total
    from ParameterCounts pc
    left join TempSessionData sc
      on pc.event_date = sc.event_date and pc.platform = sc.platform
    where 
      pc.event_date < current_date()
      and pc.platform = sc.platform
      and pc.parameter_name in (
        select parameter_name
        from ParameterCounts
        group by parameter_name
        having count(distinct event_date) >= ''' || cast(days_before_anomaly_detection as string) || '''
    )
  ),

  ParameterAnomalies as (
    select 
      ps.event_date,
      ps.platform,
      ps.parameter_name as event_or_parameter_name,
      ps.parameter_scope,
      ps.event_name,
      'parameter' as event_or_parameter_type,
      ps.parameter_count_web as actual_count,
      ps.avg_parameter_count_web as expected_count,
          round((ps.parameter_count_web - ps.avg_parameter_count_web) / ps.avg_parameter_count_web, 2) as net_change_percentage,
          round(ps.avg_parameter_count_web + ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_web, 2) as upper_bound,
          round(ps.avg_parameter_count_web - ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_web, 2) as lower_bound,
          case
            when abs((ps.parameter_count_web - ps.avg_parameter_count_web) / ps.avg_parameter_count_web)
                 <= abs((ss.session_count_total - ps.avg_session_count_total) / ps.avg_session_count_total)
                    + ''' || cast(parameters_explained_by_sessions_threshold as string) || '''
            then 'SessionExplains'
            when ps.parameter_count_web > (ps.avg_parameter_count_web + ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_web)
            then concat(
              'Spike in Web Parameter ', ps.parameter_name,
              ' (Scope: ', ps.parameter_scope, '). ',
              '. Actual = ', ps.parameter_count_web,
              ', Expected = ', round(ps.avg_parameter_count_web, 2),
              '. Net change: ', round((ps.parameter_count_web - ps.avg_parameter_count_web) / ps.avg_parameter_count_web * 100, 2),
              '%. Upper Bound: ', round(ps.avg_parameter_count_web + ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_web, 2),
              '. Lower Bound: ', round(ps.avg_parameter_count_web - ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_web, 2),'.'
            )
            when ps.parameter_count_web < (ps.avg_parameter_count_web - ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_web)
            then concat(
              'Drop in Web Parameter ', ps.parameter_name,
              ' (Scope: ', ps.parameter_scope, '). ',
              '. Actual = ', ps.parameter_count_web,
              ', Expected = ', round(ps.avg_parameter_count_web, 2),
              '. Net change: ', round((ps.parameter_count_web - ps.avg_parameter_count_web) / ps.avg_parameter_count_web * 100, 2),
              '%. Upper Bound: ', round(ps.avg_parameter_count_web + ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_web, 2),
              '. Lower Bound: ', round(ps.avg_parameter_count_web - ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_web, 2),'.'
            )
            else null
          end as anomaly_description
    from ParameterStats ps
    left join TempSessionData ss
    on ps.event_date = ss.event_date and ps.platform = ss.platform
    left join EventAnomalies ea
    on ps.event_date = ea.event_date and ps.platform = ea.platform and ps.event_name = ea.event_or_parameter_name
    where ps.avg_parameter_count_web >= ''' || cast(min_expected_count as string) || '''
      and ps.event_date between date_sub(current_date(), interval ''' || cast(day_interval_short as string) || ''' day)
                              and date_sub(current_date(), interval 1 day)
      and ea.anomaly_description is null and ea.anomaly_description != 'SessionExplains'
      and ps.platform = ss.platform and ps.platform = 'WEB'
      and (
        (ps.parameter_count_web > (ps.avg_parameter_count_web + 3 * ps.stddev_parameter_count_web))
        or (ps.parameter_count_web < (ps.avg_parameter_count_web - 3 * ps.stddev_parameter_count_web))
      )
  
    union all

    select 
      ps.event_date,
      ps.platform,
      ps.parameter_name as event_or_parameter_name,
      ps.parameter_scope,
      ps.event_name,
      'parameter' as event_or_parameter_type,
      ps.parameter_count_android as actual_count,
      avg_parameter_count_android as expected_count,
          round((ps.parameter_count_android - ps.avg_parameter_count_android) / ps.avg_parameter_count_android, 2) as net_change_percentage,
          round(ps.avg_parameter_count_android + ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_android, 2) as upper_bound,
          round(ps.avg_parameter_count_android - ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_android, 2) as lower_bound,
          case
            when abs((ps.parameter_count_android - ps.avg_parameter_count_android) / ps.avg_parameter_count_android)
                 <= abs((ss.session_count_total - ps.avg_session_count_total) / ps.avg_session_count_total)
                    + ''' || cast(parameters_explained_by_sessions_threshold as string) || '''
            then 'SessionExplains'
            when ps.parameter_count_android > (ps.avg_parameter_count_android + ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_android)
            then concat(
              'Spike in Android Parameter ', ps.parameter_name,
              ' (Scope: ', ps.parameter_scope, '). ',
              '. Actual = ', ps.parameter_count_android,
              ', Expected = ', round(ps.avg_parameter_count_android, 2),
              '. Net change: ', round((ps.parameter_count_android - ps.avg_parameter_count_android) / ps.avg_parameter_count_android * 100, 2),
              '%. Upper Bound: ', round(ps.avg_parameter_count_android + ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_android, 2),
              '. Lower Bound: ', round(ps.avg_parameter_count_android - ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_android, 2),'.'
            )
            when ps.parameter_count_web < (ps.avg_parameter_count_android - ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_android)
            then concat(
              'Drop in Android Parameter ', ps.parameter_name,
              ' (Scope: ', ps.parameter_scope, '). ',
              '. Actual = ', ps.parameter_count_android,
              ', Expected = ', round(ps.avg_parameter_count_android, 2),
              '. Net change: ', round((ps.parameter_count_android - ps.avg_parameter_count_android) / ps.avg_parameter_count_android * 100, 2),
              '%. Upper Bound: ', round(ps.avg_parameter_count_android + ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_android, 2),
              '. Lower Bound: ', round(ps.avg_parameter_count_android - ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_android, 2),'.'
            )
            else null
          end as anomaly_description
    from ParameterStats ps
    left join TempSessionData ss
    on ps.event_date = ss.event_date and ps.platform = ss.platform
    left join EventAnomalies ea
    on ps.event_date = ea.event_date and ps.platform = ea.platform and ps.event_name = ea.event_or_parameter_name
    where ps.avg_parameter_count_android >= ''' || cast(min_expected_count as string) || '''
      and ps.event_date between date_sub(current_date(), interval ''' || cast(day_interval_short as string) || ''' day)
        and date_sub(current_date(), interval 1 day)
      and ea.anomaly_description is null and ea.anomaly_description != 'SessionExplains'
      and ps.platform = ss.platform and ps.platform = 'ANDROID'
      and (
        (ps.parameter_count_android > (ps.avg_parameter_count_android + 3 * ps.stddev_parameter_count_android))
        or (ps.parameter_count_android < (ps.avg_parameter_count_android - 3 * ps.stddev_parameter_count_android))
      )

    union all

    select 
      ps.event_date,
      ps.platform,
      ps.parameter_name as event_or_parameter_name,
      ps.parameter_scope,
      ps.event_name,
      'parameter' as event_or_parameter_type,
      ps.parameter_count_ios as actual_count,
      avg_parameter_count_ios as expected_count,
          round((ps.parameter_count_ios - ps.avg_parameter_count_ios) / ps.avg_parameter_count_ios, 2) as net_change_percentage,
          round(ps.avg_parameter_count_ios + ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_ios, 2) as upper_bound,
          round(ps.avg_parameter_count_ios - ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_ios, 2) as lower_bound,
          case
            when abs((ps.parameter_count_ios - ps.avg_parameter_count_ios) / ps.avg_parameter_count_ios)
                 <= abs((ss.session_count_total - ps.avg_session_count_total) / ps.avg_session_count_total)
                    + ''' || cast(parameters_explained_by_sessions_threshold as string) || '''
            then 'SessionExplains'
            when ps.parameter_count_ios > (ps.avg_parameter_count_ios + ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_ios)
            then concat(
              'Spike in iOS Parameter ', ps.parameter_name,
              ' (Scope: ', ps.parameter_scope, '). ',
              '. Actual = ', ps.parameter_count_ios,
              ', Expected = ', round(ps.avg_parameter_count_ios, 2),
              '. Net change: ', round((ps.parameter_count_ios - ps.avg_parameter_count_ios) / ps.avg_parameter_count_ios * 100, 2),
              '%. Upper Bound: ', round(ps.avg_parameter_count_ios + ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_ios, 2),
              '. Lower Bound: ', round(ps.avg_parameter_count_ios - ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_ios, 2),'.'
            )
            when ps.parameter_count_ios < (ps.avg_parameter_count_ios - ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_ios)
            then concat(
              'Drop in iOS Parameter ', ps.parameter_name,
              ' (Scope: ', ps.parameter_scope, '). ',
              '. Actual = ', ps.parameter_count_ios,
              ', Expected = ', round(ps.avg_parameter_count_ios, 2),
              '. Net change: ', round((ps.parameter_count_ios - ps.avg_parameter_count_ios) / ps.avg_parameter_count_ios * 100, 2),
              '%. Upper Bound: ', round(ps.avg_parameter_count_ios + ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_ios, 2),
              '. Lower Bound: ', round(ps.avg_parameter_count_ios - ''' || cast(stddev_multiplier as string) || ''' * ps.stddev_parameter_count_ios, 2),'.'
            )
            else null
          end as anomaly_description
    from ParameterStats ps
    left join TempSessionData ss
    on ps.event_date = ss.event_date and ps.platform = ss.platform
    left join EventAnomalies ea
    on ps.event_date = ea.event_date and ps.platform = ea.platform and ps.event_name = ea.event_or_parameter_name
    where ps.avg_parameter_count_ios >= ''' || cast(min_expected_count as string) || '''
      and ps.event_date between date_sub(current_date(), interval ''' || cast(day_interval_short as string) || ''' day)
                              and date_sub(current_date(), interval 1 day)
      and ea.anomaly_description is null and ea.anomaly_description != 'SessionExplains'
      and ps.platform = ss.platform and ps.platform = 'IOS'
      and(
        (ps.parameter_count_ios > (ps.avg_parameter_count_ios + 3 * ps.stddev_parameter_count_ios))
        or (ps.parameter_count_ios < (ps.avg_parameter_count_ios - 3 * ps.stddev_parameter_count_ios))
      )
  ),

  EventStatus as (
    -- Step 3: Get the first seen dates for each platform from the documentation status table
    select distinct
      event_name,
      min(event_first_seen_date_web) as event_first_seen_date_web,
      min(event_first_seen_date_android) as event_first_seen_date_android,
      min(event_first_seen_date_ios) as event_first_seen_date_ios
    from `your-project.analytics_XXX.ga4_documentation_events_and_documentation_status`
    group by event_name
  ),
 
  NewEvents as (
    select distinct
      ec.event_date,
      ec.event_name as event_or_parameter_name,
      'event' as event_or_parameter_type,
      tsd.platform,
      case
        when tsd.platform = 'WEB'
          and ec.event_count_web > 0
          and ec.event_date = es.event_first_seen_date_web
        then concat('New Web Event Detected: ', ec.event_name, '.')

        when ec.event_count_android > 0
          and ec.event_date = es.event_first_seen_date_android
          and tsd.platform = 'ANDROID'
        then concat('New Android Event Detected: ', ec.event_name, '.')

        when ec.event_count_ios > 0
          and ec.event_date = es.event_first_seen_date_ios
          and tsd.platform = 'IOS'
        then concat('New iOS Event Detected: ', ec.event_name, '.')

        else null
      end as anomaly_description,
      case
        when tsd.platform = 'WEB' then ec.event_count_web
        when tsd.platform = 'ANDROID' then ec.event_count_android
        when tsd.platform = 'IOS' then ec.event_count_ios
      end as actual_count
    from EventCounts ec
    left join EventStatus es
      on ec.event_name = es.event_name
    left join TempSessionData tsd
      on ec.event_date = tsd.event_date
    where ec.event_date between date_sub(current_date(), interval ''' || cast(day_interval_new_events_params as string) || ''' day) and current_date()
      and (
        (tsd.platform = 'WEB'
          and ec.event_date = es.event_first_seen_date_web
        )
      or 
        (ec.event_date = es.event_first_seen_date_android 
          and tsd.platform = 'ANDROID'
      )
      or  
        (ec.event_date =  es.event_first_seen_date_ios 
          and tsd.platform = 'IOS'
        )
      )
  ),

  ParameterStatus as (
    select distinct
      parameter_name,
      parameter_scope,
      min(parameter_first_seen_date_web) as parameter_first_seen_date_web,
      min(parameter_first_seen_date_android) as parameter_first_seen_date_android,
      min(parameter_first_seen_date_ios) as parameter_first_seen_date_ios
    from `your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status`
    group by parameter_name, parameter_scope
  ),

  NewParameterCounts as (
    select distinct
      event_date,
      parameter_name,
      parameter_scope,
      sum(parameter_count_web) as parameter_count_web,
      sum(parameter_count_android) as parameter_count_android,
      sum(parameter_count_ios) as parameter_count_ios
    from 
      `your-project.analytics_XXX.ga4_documentation_parameters_daily_counts`
    where 
      event_date between date_sub(current_date(), interval ''' || cast(day_interval_new_events_params as string) || ''' day) and current_date()
    group by 
      event_date, parameter_name, parameter_scope
  ),

  NewParameters as (
    select distinct
      pc.event_date,
      pc.parameter_name as event_or_parameter_name,
      'parameter' as event_or_parameter_type,
      pc.parameter_scope,
      tsd.platform,
      case
        when tsd.platform = 'WEB'
          and pc.parameter_count_web > 0
          and pc.event_date = ps.parameter_first_seen_date_web
        then concat(
          'New Web Parameter Detected. ',
          '. Parameter: ', pc.parameter_name, 
          '. Scope: ', pc.parameter_scope, '.'
        )

        when tsd.platform = 'ANDROID'
          and pc.parameter_count_android > 0
          and pc.event_date = ps.parameter_first_seen_date_android
        then concat(
          'New Android Parameter Detected. Parameter: ', 
          pc.parameter_name, 
          '. Scope: ', pc.parameter_scope, '.'
        )

        when tsd.platform = 'IOS'
          and pc.parameter_count_ios > 0
          and pc.event_date = ps.parameter_first_seen_date_ios
        then concat(
          'New iOS Parameter Detected. Parameter: ', 
          pc.parameter_name, 
          '. Scope: ', pc.parameter_scope, '.'
        )

        else null
      end as anomaly_description,
      case
        when tsd.platform = 'WEB' then pc.parameter_count_web
        when tsd.platform = 'ANDROID' then pc.parameter_count_android
        when tsd.platform = 'IOS' then pc.parameter_count_ios
      end as actual_count
    from NewParameterCounts pc
    left join ParameterStatus ps
      on pc.parameter_name = ps.parameter_name 
     and pc.parameter_scope = ps.parameter_scope
    left join TempSessionData tsd
      on pc.event_date = tsd.event_date
      and tsd.platform = 'WEB'
    where pc.event_date between date_sub(current_date(), interval ''' || cast(day_interval_new_events_params as string) || ''' day) and current_date()
      and (
        (tsd.platform = 'WEB'
          and pc.parameter_count_web > 0
          and pc.event_date = ps.parameter_first_seen_date_web)
        or (tsd.platform = 'ANDROID' 
          and pc.parameter_count_android > 0
          and pc.event_date = ps.parameter_first_seen_date_android)
        or (tsd.platform = 'IOS' 
          and pc.parameter_count_ios > 0
          and pc.event_date = ps.parameter_first_seen_date_ios)
      )
  ),

  -- Step 8: Combine them all
  FinalAnomalies as (
    select 
      event_date,
      platform,
      event_or_parameter_name,
      event_or_parameter_type,
      actual_count,
      expected_count,
      anomaly_description,
      net_change_percentage,
      parameter_scope,
      event_name,
      upper_bound,
      lower_bound
    from EventAnomalies
    where anomaly_description is not null
      and anomaly_description != 'SessionExplains'

    union all

    select
      event_date,
      platform,
      event_or_parameter_name,
      event_or_parameter_type,
      actual_count,
      0 as expected_count,
      anomaly_description,
      1 as net_change_percentage,
      null as parameter_scope,
      event_or_parameter_name as event_name,
      null as upper_bound,
      null as lower_bound
    from NewEvents
    where anomaly_description is not null

    union all

    select
      event_date,
      platform,
      event_or_parameter_name,
      event_or_parameter_type,
      actual_count,
      expected_count,
      anomaly_description,
      net_change_percentage,
      parameter_scope,
      event_name,
      upper_bound,
      lower_bound
    from ParameterAnomalies
    where anomaly_description is not null
      and anomaly_description != 'SessionExplains'

    union all

    select
      event_date,
      platform,
      event_or_parameter_name,
      event_or_parameter_type,
      actual_count,
      0 as expected_count,
      anomaly_description,
      1 as net_change_percentage,
      parameter_scope,
      null as event_name,
      null as upper_bound,
      null as lower_bound
    from NewParameters
    where anomaly_description is not null
  )

select *
from FinalAnomalies
''';

execute immediate query_string;

/*** 9) merge from AllAnomalies into ga4_documentation_anomaly_detection ***/
set query_string = '''
merge `your-project.analytics_XXX.ga4_documentation_anomaly_detection` T
using (
  select * from AllAnomalies
) S
on T.event_date = S.event_date
   and T.platform = S.platform
   and T.event_or_parameter_name = S.event_or_parameter_name
   and T.event_or_parameter_type = S.event_or_parameter_type

when matched then
  update set
    actual_count = S.actual_count,
    expected_count = S.expected_count,
    anomaly_description = S.anomaly_description,
    net_change_percentage = S.net_change_percentage,
    parameter_scope = S.parameter_scope,
    event_name = S.event_name,
    upper_bound = S.upper_bound,
    lower_bound = S.lower_bound

when not matched by target then
  insert (
    event_date,
    platform,
    event_or_parameter_name,
    event_or_parameter_type,
    actual_count,
    expected_count,
    anomaly_description,
    net_change_percentage,
    parameter_scope,
    event_name,
    upper_bound,
    lower_bound
  )
  values (
    S.event_date,
    S.platform,
    S.event_or_parameter_name,
    S.event_or_parameter_type,
    S.actual_count,
    S.expected_count,
    S.anomaly_description,
    S.net_change_percentage,
    S.parameter_scope,
    S.event_name,
    S.upper_bound,
    S.lower_bound
  );
''';

execute immediate query_string;

/*** 10) CLEAN UP OLD DATA ***/
set query_string = '''
delete from `your-project.analytics_XXX.ga4_documentation_anomaly_detection_session_counts`
where event_date < date_sub(current_date(), interval ''' || cast(delete_anomaly_data_after_days as string) || ''' day)
''';
execute immediate query_string;

set query_string = '''
delete from `your-project.analytics_XXX.ga4_documentation_anomaly_detection`
where event_date < date_sub(current_date(), interval ''' || cast(delete_anomaly_data_after_days as string) || ''' day)
''';
execute immediate query_string;

end;