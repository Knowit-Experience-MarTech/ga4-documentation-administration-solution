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
* Replace "your_project.analytics_XXX" with your project and data set
*/

begin

/***********************
 1) DECLARATIONS / GET SETTINGS
************************/
declare min_expected_count float64;
declare stddev_multiplier float64;
declare events_explained_by_sessions_threshold float64;
declare parameters_explained_by_sessions_threshold float64;
declare stddev_model_setting string;
declare day_interval_new_events_params int64;
declare day_interval_short int64;
declare day_interval_large int64;
declare day_interval_extended int64;
declare window_rows_large int64;
declare delete_anomaly_data_after_days int64;
declare days_before_anomaly_detection int64;

declare stddev_model_order_events string;
declare stddev_model_partitions_events string;
declare stddev_model_partitions_events_sessions string;
declare stddev_model_order_parameters string;
declare stddev_model_partitions_parameters string;
declare stddev_model_partitions_parameters_sessions string default 'pc.platform';

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
  from `your_project.analytics_XXX.ga4_documentation_bq_settings`
);
set stddev_multiplier = (
  select anomaly_stddev_multiplier
  from `your_project.analytics_XXX.ga4_documentation_bq_settings`
);
set events_explained_by_sessions_threshold = (
  select anomaly_events_explained_by_sessions_threshold
  from `your_project.analytics_XXX.ga4_documentation_bq_settings`
);
set parameters_explained_by_sessions_threshold = (
  select anomaly_parameters_explained_by_sessions_threshold
  from `your_project.analytics_XXX.ga4_documentation_bq_settings`
);
set stddev_model_setting = (
  select anomaly_stddev_model_setting
  from `your_project.analytics_XXX.ga4_documentation_bq_settings`
);
set days_before_anomaly_detection = (
  select anomaly_days_before_anomaly_detection
  from `your_project.analytics_XXX.ga4_documentation_bq_settings`
);
set day_interval_short = (
  select anomaly_day_interval_short
  from `your_project.analytics_XXX.ga4_documentation_bq_settings`
);
set day_interval_new_events_params = (
  select anomaly_day_interval_new_events_params
  from `your_project.analytics_XXX.ga4_documentation_bq_settings`
);
set day_interval_extended = (
  select anomaly_day_interval_extended
  from `your_project.analytics_XXX.ga4_documentation_bq_settings`
);
set day_interval_large = (
  select anomaly_day_interval_large
  from `your_project.analytics_XXX.ga4_documentation_bq_settings`
);
set delete_anomaly_data_after_days = (
  select anomaly_delete_anomaly_data_after_days
  from `your_project.analytics_XXX.ga4_documentation_bq_settings`
);

/*** 3) Dynamic partition specs (no quotes later) ***/
if stddev_model_setting = 'dayofweek' then
  set stddev_model_partitions_events = 'ec.event_name, ec.platform, extract(dayofweek from ec.event_date)';
  set stddev_model_partitions_events_sessions = 'ec.platform, extract(dayofweek from ec.event_date)';
  set stddev_model_partitions_parameters = 'pc.parameter_name, pc.parameter_scope, pc.event_name, pc.platform, extract(dayofweek from pc.event_date)';
  set stddev_model_partitions_parameters_sessions = 'pc.platform, extract(dayofweek from pc.event_date)';
  set window_rows_large = cast(round(day_interval_large / 7.0) as int64);
else
  set stddev_model_partitions_events = 'ec.event_name, ec.platform';
  set stddev_model_partitions_events_sessions = 'ec.platform';
  set stddev_model_partitions_parameters = 'pc.parameter_name, pc.parameter_scope, pc.event_name, pc.platform';
  set stddev_model_partitions_parameters_sessions = 'pc.platform';
  set window_rows_large = day_interval_large;
end if;

set stddev_model_order_events = 'ec.event_date';
set stddev_model_order_parameters = 'pc.event_date';

/*** 4) INITIAL RUN WINDOW ***/
set is_initial_run = (
  select count(1) = 0
  from `your_project.analytics_XXX.INFORMATION_SCHEMA.TABLES`
  where table_name = 'ga4_documentation_anomaly_detection_session_counts'
);
if is_initial_run then
  set start_date_string = format_date('%Y%m%d', date_sub(current_date(), interval day_interval_extended day));
else
  set start_date_string = format_date('%Y%m%d', date_sub(current_date(), interval day_interval_short day));
end if;

/*** 5) CREATE TARGET TABLES IF NEEDED ***/
create table if not exists `your_project.analytics_XXX.ga4_documentation_anomaly_detection` (
  event_date date options(description='Date for which the anomaly detection is performed.'),
  platform string options(description='The platform on which the event or parameter was recorded.'),
  event_or_parameter_name string options(description='Name of the event or parameter being analyzed for anomalies.'),
  event_or_parameter_type string options(description='The type of the event or parameter being analyzed.'),
  actual_count int64 options(description='The actual count of the event or parameter on the given date.'),
  expected_count float64 options(description='The expected count of the event or parameter based on the model.'),
  anomaly_description string options(description='A description of the detected anomaly.'),
  net_change_percentage float64 options(description='The percentage change between the actual count and the expected count.'),
  parameter_scope string options(description='The scope of the parameter, such as event or user.'),
  event_name string options(description='The name of the event associated with the anomaly.'),
  upper_bound float64 options(description='The upper bound of the expected range for the event or parameter count.'),
  lower_bound float64 options(description='The lower bound of the expected range for the event or parameter count.')
)
partition by event_date
cluster by platform, event_or_parameter_name, event_or_parameter_type, parameter_scope;

create table if not exists `your_project.analytics_XXX.ga4_documentation_anomaly_detection_session_counts` (
  event_date date options(description='The date on which the session counts were recorded.'),
  platform string options(description='The platform where the sessions occurred, such as WEB, IOS, or ANDROID.'),
  session_count_total int64 options(description='The total count of sessions for a specific platform on a given date.')
)
partition by event_date
cluster by platform;

/*** 6) Excluded_events + first_seen_date maps ***/
create temp table excluded_events as
select distinct trim(val) as event_name
from (
  select value as val
  from `your_project.analytics_XXX.ga4_documentation_bq_settings`,
       unnest(split(events_anomaly_exclusion, ',')) as value
  where coalesce(events_anomaly_exclusion,'') != ''
  union all
  select value
  from `your_project.analytics_XXX.ga4_documentation_bq_settings`,
       unnest(split(events_exclusion, ',')) as value
  where coalesce(events_exclusion,'') != ''
)
where trim(val) != '';

-- Event first_seen_date map
create or replace temp table event_first_seen_map as
select event_name, platform, min(first_seen_date) as first_seen_date
from `your_project.analytics_XXX.ga4_documentation_events_first_seen`
group by event_name, platform;

-- Parameter first_seen_date map
create or replace temp table parameter_first_seen_map as
select parameter_name, parameter_scope, platform, min(first_seen_date) as first_seen_date
from `your_project.analytics_XXX.ga4_documentation_parameters_first_seen`
group by parameter_name, parameter_scope, platform;

/*** 7) BUILD temp_session_data ***/
set events_fresh_exists = (
  select count(1) > 0
  from `your_project.analytics_XXX.INFORMATION_SCHEMA.TABLES`
  where table_name = concat('events_fresh_', today_string)
);
set events_intraday_exists = (
  select count(1) > 0
  from `your_project.analytics_XXX.INFORMATION_SCHEMA.TABLES`
  where table_name = concat('events_intraday_', today_string)
);
set events_yesterday_exists = (
  select count(1) > 0
  from `your_project.analytics_XXX.INFORMATION_SCHEMA.TABLES`
  where table_name = concat('events_', yesterday_string)
);

if events_fresh_exists then
  set query_string = '''
    create temp table temp_session_data as
    select
      parse_date('%Y%m%d', event_date) as event_date,
      count(distinct concat(user_pseudo_id, '_', (
        select value.int_value from unnest(event_params) where key = 'ga_session_id'
      ))) as session_count_total,
      platform
    from `your_project.analytics_XXX.events_fresh_*`
    where _table_suffix between "''' || start_date_string || '''" and "''' || today_string || '''"
    group by event_date, platform
  ''';
  execute immediate query_string;
else
  set query_string = '''
    select
      parse_date('%Y%m%d', event_date) as event_date,
      count(distinct concat(user_pseudo_id, '_', (
        select value.int_value from unnest(event_params) where key = 'ga_session_id'
      ))) as session_count_total,
      platform
    from `your_project.analytics_XXX.events_*`
    where _table_suffix between "''' || start_date_string || '''" and "''' || yesterday_string || '''"
    group by event_date, platform
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
        from `your_project.analytics_XXX.events_intraday_*`
        where _table_suffix between "''' || yesterday_string || '''" and "''' || today_string || '''"
        group by event_date, platform
      ''';
    else
      set intraday_query_string = '''
        select
          parse_date('%Y%m%d', event_date) as event_date,
          count(distinct concat(user_pseudo_id, '_', (
            select value.int_value from unnest(event_params) where key = 'ga_session_id'
          ))) as session_count_total,
          platform
        from `your_project.analytics_XXX.events_intraday_*`
        where _table_suffix = "''' || today_string || '''"
        group by event_date, platform
      ''';
    end if;

    set query_string = '''
      create temp table temp_session_data as
      (''' || query_string || ''')
      union all
      (''' || intraday_query_string || ''')
    ''';
    execute immediate query_string;
  else
    set query_string = 'create temp table temp_session_data as ' || query_string || ';';
    execute immediate query_string;
  end if;
end if;

/*** 8) MERGE session data ***/
merge `your_project.analytics_XXX.ga4_documentation_anomaly_detection_session_counts` T
using (
  select * from temp_session_data
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
 9) CREATE TEMP TABLE all_anomalies (events, parameters, new-detections)
***************************************************************/
set query_string = '''
create or replace temp table all_anomalies as
with
  session_data as (
    select event_date, platform, session_count_total
    from `your_project.analytics_XXX.ga4_documentation_anomaly_detection_session_counts`
    where event_date >= date_sub(current_date(), interval @DAY_INTERVAL_LARGE@ day)
      and platform is not null and platform != ''
  ),

  /* ===== Events: counts → eligibility → stats ===== */
  event_counts as (
    select
      ec.event_date,
      ec.event_name,
      p.platform,
      p.event_count
    from `your_project.analytics_XXX.ga4_documentation_events_daily_counts` ec
    join session_data sd on sd.event_date = ec.event_date
    cross join unnest([
      struct('WEB' as platform, ec.event_count_web as event_count),
      struct('ANDROID' as platform, ec.event_count_android as event_count),
      struct('IOS' as platform, ec.event_count_ios as event_count)
    ]) p
    where ec.event_date >= date_sub(current_date(), interval @DAY_INTERVAL_LARGE@ day)
      and not exists (select 1 from excluded_events x where x.event_name = ec.event_name)
      and sd.platform = p.platform
  ),

  event_eligible as (
    select event_name, platform, count(distinct event_date) as n_days
    from event_counts
    group by event_name, platform
  ),

  event_stats as (
    select
      ec.event_date,
      ec.event_name,
      ec.platform,
      ec.event_count,
      avg(ec.event_count) over (
        partition by @EVENT_PARTITIONS@
        order by @EVENT_ORDER@
        rows between @WINDOW_ROWS_LARGE@ preceding and 1 preceding
      ) as avg_event_count,
      stddev(ec.event_count) over (
        partition by @EVENT_PARTITIONS@
        order by @EVENT_ORDER@
        rows between @WINDOW_ROWS_LARGE@ preceding and 1 preceding
      ) as stddev_event_count,
      sc.session_count_total,
      avg(sc.session_count_total) over (
        partition by @EVENT_SESS_PARTITIONS@
        order by @EVENT_ORDER@
        rows between @WINDOW_ROWS_LARGE@ preceding and 1 preceding
      ) as avg_session_count_total
    from event_counts ec
    join event_eligible ee
      on ee.event_name = ec.event_name
     and ee.platform   = ec.platform
     and ee.n_days    >= @DAYS_BEFORE@
    left join session_data sc
      on sc.event_date = ec.event_date
     and sc.platform   = ec.platform
    where ec.event_date < current_date()
  ),

  /* ---- Events: boolean flag (only anomalous when sessions are STABLE) ---- */
  event_flags as (
    select
      es.event_date,
      es.platform,
      es.event_name,
      -- how much sessions moved vs their own average
      abs(
        safe_divide(
          es.session_count_total - es.avg_session_count_total,
          es.avg_session_count_total
        )
      ) as session_delta_pct,
      (
        -- enough history + in detection window
        es.avg_event_count >= @MIN_EXPECTED@
        and es.event_date between date_sub(current_date(), interval @DAY_INTERVAL_SHORT@ day)
          and date_sub(current_date(), interval 1 day)
        -- need session baseline
        and es.session_count_total    is not null
        and es.avg_session_count_total is not null
        -- sessions must be "stable": big traffic swings kill anomalies
        and abs(
              safe_divide(
                es.session_count_total - es.avg_session_count_total,
                es.avg_session_count_total
              )
            ) < @SESS_THRESHOLD_EVENTS@
        -- event must be out of band vs its own history
        and (
          es.event_count > es.avg_event_count + @STDDEV_MULT@ * es.stddev_event_count
          or es.event_count < es.avg_event_count - @STDDEV_MULT@ * es.stddev_event_count
        )
        and abs(es.event_count - es.avg_event_count) > (es.avg_event_count * 0.10)
      ) as event_is_anomalous
    from event_stats es
  ),

  event_session_instability as (
    /* Platform-level view: how wild are sessions on this date? */
    select
      event_date,
      platform,
      max(session_delta_pct) as max_session_delta_pct
    from event_flags
    group by event_date, platform
  ),

  /* ---- Events: Anomaly Detection (Traffic-Adjusted, Clamped, & Scaled) ---- */
  
  /* 1. Calculate Traffic Multiplier with Safety Clamp */
  traffic_multiplier as (
      select 
        es.event_date, 
        es.platform, 
        es.event_name,
        -- CLAMP: Multiplier cannot go below 0.5 or above 3.0.
        -- Should prevent "Exploded" expectations if session history is weird.
        greatest(0.5, least(3.0, coalesce(safe_divide(es.session_count_total, es.avg_session_count_total), 1.0))) as val
      from event_stats es
  ),

  event_anomalies as (
    select
      es.event_date,
      es.platform,
      es.event_name as event_or_parameter_name,
      'event' as event_or_parameter_type,
      es.event_count as actual_count,
      -- EXPECTED COUNT: History * Traffic Multiplier
      (es.avg_event_count * tm.val) as expected_count,
      case
        -- SPIKE LOGIC: 
        -- Check if Actual > Expected + (Z-Score * StdDev * Sqrt(Traffic))
        -- We multiply StdDev by SQRT(Traffic) because higher volume = higher natural noise.
        when es.event_count > (es.avg_event_count * tm.val) + (@STDDEV_MULT@ * es.stddev_event_count * sqrt(tm.val)) 
        then concat(
          'Spike in ', es.platform, ' Event ', es.event_name,
          '. Actual=', es.event_count,
          ', Expected=', cast(round(es.avg_event_count * tm.val, 0) as string),
          '. Net Change=', coalesce(format('%+.2f (%+.2f%%)', es.event_count - (es.avg_event_count * tm.val),     100 * safe_divide(es.event_count - (es.avg_event_count * tm.val), (es.avg_event_count * tm.val)))
          )
        )
        -- DROP LOGIC:
        when es.event_count < (es.avg_event_count * tm.val) - (@STDDEV_MULT@ * es.stddev_event_count * sqrt(tm.val)) 
        then concat(
          'Drop in ', es.platform, ' Event ', es.event_name,
          '. Actual=', es.event_count,
          ', Expected=', cast(round(es.avg_event_count * tm.val, 0) as string),
          '. Net Change=', coalesce(format('%+.2f (%+.2f%%)', es.event_count - (es.avg_event_count * tm.val), 100 * safe_divide(es.event_count - (es.avg_event_count * tm.val), (es.avg_event_count * tm.val)))
          )
        )
      end as anomaly_description,
      -- NET CHANGE %
      round(
        safe_divide(
          es.event_count - (es.avg_event_count * tm.val),
          (es.avg_event_count * tm.val)
        ),
        2
      ) as net_change_percentage,
      cast(null as string) as parameter_scope,
      es.event_name as event_name,
      -- UPPER BOUND: Expected + Scaled Deviation
      round((es.avg_event_count * tm.val) + (@STDDEV_MULT@ * es.stddev_event_count * sqrt(tm.val)), 2) as upper_bound,
      -- LOWER BOUND: Expected - Scaled Deviation
      greatest(round((es.avg_event_count * tm.val) - (@STDDEV_MULT@ * es.stddev_event_count * sqrt(tm.val)), 2), 0) as lower_bound

    from event_stats es
    join traffic_multiplier tm 
      on tm.event_date = es.event_date 
      and tm.platform = es.platform 
      and tm.event_name = es.event_name
      
    /* Join flags to ensure basic data quality requirements (like min history) met */
    join event_flags ef
      on ef.event_date = es.event_date
      and ef.platform = es.platform
      and ef.event_name = es.event_name

    where 
      -- 1. Basic Threshold (Filter out tiny events)
      es.avg_event_count >= @MIN_EXPECTED@
      -- 2. Statistical Significance Check (The Math)
      and (
        es.event_count > (es.avg_event_count * tm.val) + (@STDDEV_MULT@ * es.stddev_event_count * sqrt(tm.val)) 
        OR 
        es.event_count < (es.avg_event_count * tm.val) - (@STDDEV_MULT@ * es.stddev_event_count * sqrt(tm.val)) 
      )
      -- 3. "Real World" Significance Check
      -- The difference must be at least 10% of the expected value.
      -- This stops "Stable" events with 0 StdDev from flagging on tiny changes.
      and abs(
        es.event_count - (es.avg_event_count * tm.val)
      ) > (
        (es.avg_event_count * tm.val) * 0.10
      )
  ),

  /* ===== Parameters: counts → eligibility → stats ===== */
  parameter_counts as (
    select
      pc.event_date,
      pc.event_name,
      pc.parameter_name,
      pc.parameter_scope,
      p.platform,
      p.parameter_count
    from `your_project.analytics_XXX.ga4_documentation_parameters_daily_counts` pc
    join session_data sd
      on sd.event_date = pc.event_date
    cross join unnest([
      struct('WEB' as platform, pc.parameter_count_web as parameter_count),
      struct('ANDROID' as platform, pc.parameter_count_android as parameter_count),
      struct('IOS' as platform, pc.parameter_count_ios as parameter_count)
    ]) p
    where pc.event_date >= date_sub(current_date(), interval @DAY_INTERVAL_LARGE@ day)
      and not exists (
        select 1 from excluded_events x where x.event_name = pc.event_name
      )
      and sd.platform = p.platform
  ),

  parameter_eligible as (
    select
      parameter_name,
      parameter_scope,
      event_name,
      platform,
      count(distinct event_date) as n_days
    from parameter_counts
    group by 1,2,3,4
  ),

  parameter_stats as (
    select
      pc.event_date,
      pc.event_name,
      pc.parameter_name,
      pc.parameter_scope,
      pc.platform,
      pc.parameter_count,
      avg(pc.parameter_count) over (
        partition by @PARAM_PARTITIONS@
        order by @PARAM_ORDER@
        rows between @WINDOW_ROWS_LARGE@ preceding and 1 preceding
      ) as avg_parameter_count,
      stddev(pc.parameter_count) over (
        partition by @PARAM_PARTITIONS@
        order by @PARAM_ORDER@
        rows between @WINDOW_ROWS_LARGE@ preceding and 1 preceding
      ) as stddev_parameter_count,
      sc.session_count_total,
      avg(sc.session_count_total) over (
        partition by @PARAM_SESS_PARTITIONS@
        order by @PARAM_ORDER@
        rows between @WINDOW_ROWS_LARGE@ preceding and 1 preceding
      ) as avg_session_count_total
    from parameter_counts pc
    join parameter_eligible pe
      on pe.parameter_name = pc.parameter_name
     and pe.parameter_scope = pc.parameter_scope
     and pe.event_name = pc.event_name
     and pe.platform = pc.platform
     and pe.n_days >= @DAYS_BEFORE@
    left join session_data sc
      on sc.event_date = pc.event_date
     and sc.platform   = pc.platform
    where pc.event_date < current_date()
  ),

/* ===== Parameters: Anomaly Detection (Traffic-Adjusted, Clamped & Scaled) ===== */

  /* 1. Calculate Parameter-Specific Traffic Multiplier */
  parameter_traffic_multiplier as (
      select 
        ps.event_date, 
        ps.platform, 
        ps.event_name,
        ps.parameter_name, 
        ps.parameter_scope,
        -- CLAMP: Keep multiplier between 0.5 and 3.0
        greatest(0.5, least(3.0, coalesce(safe_divide(ps.session_count_total, ps.avg_session_count_total), 1.0))) as val
      from parameter_stats ps
  ),

  parameter_anomalies as (
    select
      ps.event_date,
      ps.platform,
      ps.parameter_name as event_or_parameter_name,
      'parameter' as event_or_parameter_type,
      ps.parameter_count as actual_count,

      -- EXPECTED COUNT: History * Traffic Multiplier
      (ps.avg_parameter_count * ptm.val) as expected_count,

      case
        -- SPIKE LOGIC: Actual > Expected + (StdDev * Sqrt(Multiplier))
        when ps.parameter_count > (ps.avg_parameter_count * ptm.val) + (@STDDEV_MULT@ * ps.stddev_parameter_count * sqrt(ptm.val))
        then concat(
          'Spike in ', ps.platform, ' Parameter: ', ps.parameter_name,
          ' Event: ', ps.event_name, '. Scope: ', ps.parameter_scope,
          '. Actual=', ps.parameter_count,
          ', Expected=', cast(round(ps.avg_parameter_count * ptm.val, 0) as string),
          '. Net Change=',
          coalesce(
            format(
              '%+.2f (%+.2f%%)',
              ps.parameter_count - (ps.avg_parameter_count * ptm.val),
              100 * safe_divide(
                ps.parameter_count - (ps.avg_parameter_count * ptm.val),
                (ps.avg_parameter_count * ptm.val)
              )
            )
          )
        )

        -- DROP LOGIC: Actual < Expected - (StdDev * Sqrt(Multiplier))
        when ps.parameter_count < (ps.avg_parameter_count * ptm.val) - (@STDDEV_MULT@ * ps.stddev_parameter_count * sqrt(ptm.val))
        then concat(
          'Drop in ', ps.platform, ' Parameter: ', ps.parameter_name,
          ' Event: ', ps.event_name, '. Scope: ', ps.parameter_scope,
          '. Actual=', ps.parameter_count,
          ', Expected=', cast(round(ps.avg_parameter_count * ptm.val, 0) as string),
          '. Net Change=',
          coalesce(
            format(
              '%+.2f (%+.2f%%)',
              ps.parameter_count - (ps.avg_parameter_count * ptm.val),
              100 * safe_divide(
                ps.parameter_count - (ps.avg_parameter_count * ptm.val),
                (ps.avg_parameter_count * ptm.val)
              )
            )
          )
        )
        else null
      end as anomaly_description,

      -- NET CHANGE %
      round(
        safe_divide(
          ps.parameter_count - (ps.avg_parameter_count * ptm.val),
          (ps.avg_parameter_count * ptm.val)
        ),
        2
      ) as net_change_percentage,
      
      ps.parameter_scope,
      ps.event_name,
      
      -- UPPER BOUND: Scaled Mean + Scaled StdDev
      round(
        (ps.avg_parameter_count * ptm.val) + (@STDDEV_MULT@ * ps.stddev_parameter_count * sqrt(ptm.val)),
        2
      ) as upper_bound,
      
      -- LOWER BOUND: Scaled Mean - Scaled StdDev
      greatest(
        round(
          (ps.avg_parameter_count * ptm.val) - (@STDDEV_MULT@ * ps.stddev_parameter_count * sqrt(ptm.val)),
          2
        ),
        0
      ) as lower_bound

 from parameter_stats ps
    
    -- Join the multiplier
    join parameter_traffic_multiplier ptm
      on ptm.event_date = ps.event_date
      and ptm.platform = ps.platform
      and ptm.event_name = ps.event_name
      and ptm.parameter_name = ps.parameter_name
      and ptm.parameter_scope = ps.parameter_scope

    /* 1) HIERARCHY CHECK (Existing): If Parent Event IS anomalous, drop parameter */
    left join event_flags ef
      on ef.event_date = ps.event_date
      and ef.platform = ps.platform
      and ef.event_name = ps.event_name
      and ef.event_is_anomalous = true

    /* 2) Join Event Stats to get the actual event count */
    left join event_stats es_counts
      on es_counts.event_date = ps.event_date
      and es_counts.platform = ps.platform
      and es_counts.event_name = ps.event_name

    /* 3) INSTABILITY CHECK */
    left join event_session_instability esi
      on esi.event_date = ps.event_date
      and esi.platform = ps.platform

    where
      -- Min History Check
      ps.avg_parameter_count >= @MIN_EXPECTED@
      and ps.event_date between date_sub(current_date(), interval @DAY_INTERVAL_SHORT@ day)
        and date_sub(current_date(), interval 1 day)

      -- EXCLUSION A: Sessions must be stable
      and (esi.max_session_delta_pct is null
        or esi.max_session_delta_pct < @SESS_THRESHOLD_PARAMS@)

      -- EXCLUSION B: Parent Event must NOT be anomalous
      and ef.event_name is null

      -- EXCLUSION C: CONSISTENCY SHIELD 
      -- If Parameter Count is within 1% of Event Count, and the Event was safe (checked above),
      -- then we FORCE the parameter to be safe too.
      and (
         es_counts.event_count is null -- Safety fallback if join fails
         OR
         safe_divide(abs(ps.parameter_count - es_counts.event_count), es_counts.event_count) > 0.01
      )

      -- ANOMALY DETECTION (Traffic Adjusted)
      and (
        ps.parameter_count > (ps.avg_parameter_count * ptm.val) + (@STDDEV_MULT@ * ps.stddev_parameter_count * sqrt(ptm.val))
        or 
        ps.parameter_count < (ps.avg_parameter_count * ptm.val) - (@STDDEV_MULT@ * ps.stddev_parameter_count * sqrt(ptm.val))
      )

      -- LOW VARIANCE CHECK
      and abs(
        ps.parameter_count - (ps.avg_parameter_count * ptm.val)
      ) > (
        (ps.avg_parameter_count * ptm.val) * 0.10
      )
  ),

  /* ===== Parameter daily rollup (for NEW detection; includes today) ===== */
  parameter_daily_rollup as (
    select
      event_date,
      parameter_name,
      parameter_scope,
      platform,
      sum(parameter_count) as parameter_count
    from (
      select
        pc.event_date,
        pc.parameter_name,
        pc.parameter_scope,
        p.platform,
        p.parameter_count
      from `your_project.analytics_XXX.ga4_documentation_parameters_daily_counts` pc
      cross join unnest([
        struct('WEB' as platform, pc.parameter_count_web as parameter_count),
        struct('ANDROID' as platform, pc.parameter_count_android as parameter_count),
        struct('IOS' as platform, pc.parameter_count_ios as parameter_count)
      ]) p
    )
    where event_date between date_sub(current_date(), interval @DAY_INTERVAL_NEW@ day)
      and current_date()
    group by event_date, parameter_name, parameter_scope, platform
  ),

  /* ===== New Events (includes today) ===== */
  new_events as (
    select
      ec.event_date,
      ec.platform,
      ec.event_name as event_or_parameter_name,
      'event' as event_or_parameter_type,
      ec.event_count as actual_count,
      cast(0 as float64) as expected_count,
      concat('New ',ec.platform,' Event detected: ',ec.event_name,'.') as anomaly_description,
      cast(1 as float64) as net_change_percentage,
      cast(null as string) as parameter_scope,
      ec.event_name as event_name,
      cast(null as float64) as upper_bound,
      cast(null as float64) as lower_bound
    from event_counts ec
    join event_first_seen_map fs
      on fs.event_name=ec.event_name and fs.platform=ec.platform
    where ec.event_date between date_sub(current_date(),interval @DAY_INTERVAL_NEW@ day) and current_date()
      and ec.event_count>0
      and ec.event_date=fs.first_seen_date
  ),

  /* ===== New Parameters (includes today) ===== */
  new_parameters as (
    select
      p.event_date,
      p.platform,
      p.parameter_name as event_or_parameter_name,
      'parameter' as event_or_parameter_type,
      p.parameter_count as actual_count,
      cast(0 as float64) as expected_count,
      concat('New ', p.platform, ' Parameter detected: ', p.parameter_name, '. Scope: ', p.parameter_scope, '.') as anomaly_description,
      cast(1 as float64) as net_change_percentage,
      p.parameter_scope,
      cast(null as string) as event_name,
      cast(null as float64) as upper_bound,
      cast(null as float64) as lower_bound
    from parameter_daily_rollup p
    join parameter_first_seen_map ps
      on ps.parameter_name = p.parameter_name
     and ps.parameter_scope = p.parameter_scope
     and ps.platform = p.platform
    where p.parameter_count > 0
      and p.event_date = ps.first_seen_date
  ),

  /* ===== Union & finalize ===== */
  final_anomalies as (
    select
      event_date, platform, event_or_parameter_name, event_or_parameter_type,
      any_value(actual_count) as actual_count,
      any_value(expected_count) as expected_count,
      any_value(anomaly_description) as anomaly_description,
      any_value(net_change_percentage) as net_change_percentage,
      any_value(parameter_scope) as parameter_scope,
      any_value(event_name) as event_name,
      any_value(upper_bound) as upper_bound,
      any_value(lower_bound) as lower_bound
    from (
      select * from event_anomalies where anomaly_description is not null
      union all
      select * from new_events
      union all
      select * from parameter_anomalies where anomaly_description is not null
      union all
      select * from new_parameters
    )
    group by event_date, platform, event_or_parameter_name, event_or_parameter_type
  )

select * from final_anomalies
''';

set query_string = replace(query_string, '@EVENT_PARTITIONS@', stddev_model_partitions_events);
set query_string = replace(query_string, '@EVENT_SESS_PARTITIONS@', stddev_model_partitions_events_sessions);
set query_string = replace(query_string, '@PARAM_PARTITIONS@', stddev_model_partitions_parameters);
set query_string = replace(query_string, '@PARAM_SESS_PARTITIONS@', stddev_model_partitions_parameters_sessions);
set query_string = replace(query_string, '@EVENT_ORDER@', stddev_model_order_events);
set query_string = replace(query_string, '@PARAM_ORDER@', stddev_model_order_parameters);

set query_string = replace(query_string, '@WINDOW_ROWS_LARGE@', cast(window_rows_large as string));
set query_string = replace(query_string, '@DAY_INTERVAL_LARGE@', cast(day_interval_large as string));
set query_string = replace(query_string, '@DAY_INTERVAL_SHORT@', cast(day_interval_short as string));
set query_string = replace(query_string, '@DAY_INTERVAL_NEW@', cast(day_interval_new_events_params as string));
set query_string = replace(query_string, '@DAYS_BEFORE@', cast(days_before_anomaly_detection as string));

set query_string = replace(query_string, '@MIN_EXPECTED@', cast(min_expected_count as string));
set query_string = replace(query_string, '@STDDEV_MULT@', cast(stddev_multiplier as string));
set query_string = replace(query_string, '@SESS_THRESHOLD_EVENTS@', cast(events_explained_by_sessions_threshold as string));
set query_string = replace(query_string, '@SESS_THRESHOLD_PARAMS@', cast(parameters_explained_by_sessions_threshold as string));

execute immediate query_string;

/*** 10) MERGE results ***/
set query_string = '''
merge `your_project.analytics_XXX.ga4_documentation_anomaly_detection` T
using (select * from all_anomalies) S
on T.event_date = S.event_date
 and T.platform = S.platform
 and T.event_or_parameter_name = S.event_or_parameter_name
 and T.event_or_parameter_type = S.event_or_parameter_type
when matched then update set
  actual_count = S.actual_count,
  expected_count = S.expected_count,
  anomaly_description = S.anomaly_description,
  net_change_percentage = S.net_change_percentage,
  parameter_scope = S.parameter_scope,
  event_name = S.event_name,
  upper_bound = S.upper_bound,
  lower_bound = S.lower_bound
when not matched then insert (
  event_date, platform, event_or_parameter_name, event_or_parameter_type,
  actual_count, expected_count, anomaly_description, net_change_percentage,
  parameter_scope, event_name, upper_bound, lower_bound
) values (
  S.event_date, S.platform, S.event_or_parameter_name, S.event_or_parameter_type,
  S.actual_count, S.expected_count, S.anomaly_description, S.net_change_percentage,
  S.parameter_scope, S.event_name, S.upper_bound, S.lower_bound
);
''';
execute immediate query_string;

/*** 11) CLEAN UP OLD DATA ***/
set query_string = '''
delete from `your_project.analytics_XXX.ga4_documentation_anomaly_detection_session_counts`
where event_date < date_sub(current_date(), interval @DELETE_AFTER@ day)
''';
set query_string = replace(query_string, '@DELETE_AFTER@', cast(delete_anomaly_data_after_days as string));
execute immediate query_string;

set query_string = '''
delete from `your_project.analytics_XXX.ga4_documentation_anomaly_detection`
where event_date < date_sub(current_date(), interval @DELETE_AFTER@ day)
''';
set query_string = replace(query_string, '@DELETE_AFTER@', cast(delete_anomaly_data_after_days as string));
execute immediate query_string;

end;
