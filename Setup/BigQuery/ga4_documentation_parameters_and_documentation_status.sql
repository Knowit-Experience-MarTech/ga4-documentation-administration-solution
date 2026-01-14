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
 * distributed under the License is distributed on an "as is" BASIS,
 * WITHOUT WARRANTIES or CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** Query related information **
* Replace "your-project.analytics_XXX" with your project and data set
* Adjust settings in declarations below if needed.
*/

-- ECOMMERCE EVENTS
declare ecommerce_events array<string> default [
  'add_payment_info','add_shipping_info','add_to_cart','add_to_wishlist',
  'begin_checkout','purchase','refund','remove_from_cart',
  'select_item','select_promotion','view_cart','view_item',
  'view_item_list','view_promotion'
];

-- QUERY PERIODS
declare day_interval_short int64; -- Number of min days queried.
declare day_interval_extended int64; -- Number of days to query the first time to get some parameter count data.
declare delete_parameter_count_after_days int64; -- Parameter count data older than this will be deleted.

-- Combine declared excluded events with table-based events_exclusion
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

-- Excluded events from settings table (normalized + deduped)
declare excluded_parameters string default (
  select string_agg(param, ', ')
  from (
    select distinct trim(value) as param
    from `your-project.analytics_XXX.ga4_documentation_bq_settings`,
    unnest(split(parameters_exclusion, ',')) as value
    where parameters_exclusion is not null and parameters_exclusion != ''
  )
);

--------------------------------------------------------------------------------
-- 2) Declarations for scope-based exclusions (except ITEM)
--------------------------------------------------------------------------------
declare global_exclusions string default '';
declare event_exclusions  string default '';
declare user_exclusions   string default '';
declare item_exclusions   string default '';

declare excl_event_arr    array<string>;
declare excl_user_arr     array<string>;
declare excl_item_arr     array<string>;

-- Declare variables to check table existence
declare events_fresh_exists     bool default false;
declare events_intraday_exists  bool default false;
declare yesterday_events_exists bool default false;

--Logic for getting the parameter count for a longer period with the first query
declare day_interval int64;
declare is_initial_run bool default (
  select count(1) = 0 
  from `your-project.analytics_XXX.INFORMATION_SCHEMA.TABLES`
  where table_name = 'ga4_documentation_parameters_daily_counts'
);

set day_interval_short = (
  select ep_day_interval_short
  from `your-project.analytics_XXX.ga4_documentation_bq_settings`
);

set day_interval_extended = (
  select ep_day_interval_extended
  from `your-project.analytics_XXX.ga4_documentation_bq_settings`
);

set delete_parameter_count_after_days = (
  select ep_delete_event_count_after_days
  from `your-project.analytics_XXX.ga4_documentation_bq_settings`
);

if is_initial_run then
  set day_interval = day_interval_extended; -- Extend period for the first run
else
  set day_interval = day_interval_short; -- Regular period
end if;

-- Create the table if not exists
create table if not exists `your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status` (
  event_name string options(description='Event Name.'),
  parameter_group string options(description='Parameter Group. Used for parameter categorization.'),
  parameter_display_name string options(description='Parameter Display Name.'),
  parameter_name string options(description='Parameter Name.'),
  parameter_scope string options(description='Parameter Scope. EVENT, USER, ITEM.'),
  parameter_type string options(description='Parameter Type. Custom Dimension, Custom Metric etc..'),
  parameter_format string options(description='Parameter Format. String, Currency, Standard etc..'),
  parameter_disallow_ads_personalization bool options(description='NPA (Non-Personalized Ads).'),
  parameter_example_value string options(description='Parameter example value.'),
  parameter_description string options(description='Parameter Description.'),
  parameter_gtm_comment string options(description='Comment related to Google Tag Manager or GA4 setup. Ex. name of Variable, Data Layer Name etc..'),
  ga4_config_parameter bool options(description='Parameters in Google Sheet that in the Events Sheet is added to the "fake" ga4_config Event Name will get this flag. These are global parameters that do not belong to a specific Event.'),
  parameter_count_total int64 options(description='Total count for parameter across Events and all Platforms (Web, iOS and Android).'),
  parameter_count_web int64 options(description='Total count for parameter across Events and the Web Platform.'),
  parameter_count_android int64 options(description='Total count for parameter across Events and the Android Platform.'),
  parameter_count_ios int64 options(description='Total count for parameter across Events and the iOS Platform.'),
  platform_web bool options(description='Coalesce of Google Sheet and GA4 BQ data. Is (or should) Parameter (be) tracked in the Web Platform.'),
  platform_android bool options(description='Coalesce of Google Sheet and GA4 BQ data. Is (or should) Parameter (be) tracked in the Android Platform.'),
  platform_ios bool options(description='Coalesce of Google Sheet and GA4 BQ data. Is (or should) Parameter (be) tracked in the iOS Platform.'),
  parameter_last_seen_date_total date options(description='Date showing the last date the Parameter was "seen" overall.'),
  parameter_last_seen_date_web date options(description='Date showing the last date the Parameter was "seen" in the Web platform.'),
  parameter_last_seen_date_android date options(description='Date showing the last date the Parameter was "seen" in the Android platform.'),
  parameter_last_seen_date_ios date options(description='Date showing the last date the Parameter was "seen" in the iOS platform.'),
  parameter_first_seen_date_total date options(description='Date showing the first date the Parameter was "seen" overall.'),
  parameter_first_seen_date_web date options(description='Date showing the first date the Parameter was "seen" in the Web Platform.'),
  parameter_first_seen_date_android date options(description='Date showing the first date the Parameter was "seen" in the Android Platform.'),
  parameter_first_seen_date_ios date options(description='Date showing the first date the Parameter was "seen" in the iOS Platform.'),
  parameter_documentation_status string options(description='Documentation in Google Sheet is joined with GA4 BQ data. Status can be: Documented and Data, Documented no Data and Not Documented.'),
  parameter_documentation_status_aggregated string options(description='Documentation in Google Sheet is joined with GA4 BQ data on a aggregated level. Status can be: Documented and Data, Documented no Data and Not Documented.'),
)
cluster by event_name, parameter_scope, parameter_name, parameter_documentation_status_aggregated;

-- Ensure the first-seen table exists (safe if already created)
create table if not exists `your-project.analytics_XXX.ga4_documentation_parameters_first_seen` (
  parameter_name string options(description='The name of the parameter.'),
  parameter_scope string options(description='The scope of the parameter.'),
  platform string options(description='The platform on which the parameter was observed.'),
  first_seen_date date options(description='The date when the parameter was first observed.')
)
cluster by parameter_name, parameter_scope, platform;

-- Check if events_fresh_* table exists using INFORMATION_SCHEMA.TABLES
set events_fresh_exists = (
  select count(1) > 0
  from `your-project.analytics_XXX.INFORMATION_SCHEMA.TABLES`
  where table_name like 'events_fresh_%'
);

-- Check if events_intraday_* table exists using INFORMATION_SCHEMA.TABLES
set events_intraday_exists = (
  select count(1) > 0
  from `your-project.analytics_XXX.INFORMATION_SCHEMA.TABLES`
  where table_name like 'events_intraday_%'
);

-- Check if yesterday's events_* table exists using INFORMATION_SCHEMA.TABLES
set yesterday_events_exists = (
  select count(1) > 0
  from `your-project.analytics_XXX.INFORMATION_SCHEMA.TABLES`
  where table_name = concat('events_', format_date('%Y%m%d', date_sub(current_date(), interval 1 day)))
);

create temp table parsed_exclusions as
select
  trim(split_parts[safe_offset(0)]) as param,
  upper(trim(split_parts[safe_offset(1)])) as scope
from (
  select split(trim(e), '|') as split_parts
  from unnest(split(excluded_parameters, ',')) as e
  where trim(e) <> ''
)
where trim(split_parts[safe_offset(0)]) <> '';

set excl_event_arr = (
  select ifnull(array_agg(distinct trim(param)), [])
  from parsed_exclusions
  where scope = 'EVENT' or scope is null or scope = ''
);

set excl_user_arr = (
  select ifnull(array_agg(distinct trim(param)), [])
  from parsed_exclusions
  where scope = 'USER' or scope is null or scope = ''
);

set excl_item_arr = (
  select ifnull(array_agg(distinct trim(param)), [])
  from parsed_exclusions
  where scope = 'ITEM' or scope is null or scope = ''
);

--------------------------------------------------------------------------------
-- 4) Populate our three variables: global, event, user
--------------------------------------------------------------------------------
set global_exclusions = (
  select string_agg(trim(param), ',')
  from parsed_exclusions
  where scope is null or scope = ''
);

set event_exclusions = (
  select string_agg(trim(param), ',')
  from parsed_exclusions
  where scope = 'EVENT'
);

set user_exclusions = (
  select string_agg(trim(param), ',')
  from parsed_exclusions
  where scope = 'USER'
);

set item_exclusions = (
  select string_agg(trim(param), ',')
  from parsed_exclusions
  where scope = 'ITEM'
);

-- Create a temporary table to store the events data
create temp table all_events as
select 
  parse_date('%Y%m%d', event_date) as event_date,
  event_name,
  platform,
  items,
  event_params,
  user_properties
from `your-project.analytics_XXX.events_*`
limit 0;

begin
  if events_fresh_exists then
    -- events_fresh_* from start to today
    insert into all_events
    select
      parse_date('%Y%m%d', event_date) as event_date,
      event_name,
      platform,
      items,
      array(
        select as struct ep.*
        from unnest(event_params) ep
        where ep.key not in unnest(excl_event_arr)
      ) as event_params,
      array(
        select as struct up.*
        from unnest(user_properties) up
        where up.key not in unnest(excl_user_arr)
      ) as user_properties
    from `your-project.analytics_XXX.events_fresh_*`
    where _table_suffix between format_date('%Y%m%d', date_sub(current_date(), interval day_interval day))
        and format_date('%Y%m%d', current_date())
      and event_name not in unnest(excluded_events);

  else
    -- events_* up to yesterday
    insert into all_events
    select
      parse_date('%Y%m%d', event_date) as event_date,
      event_name,
      platform,
      items,
      array(
        select as struct ep.*
        from unnest(event_params) ep
        where ep.key not in unnest(excl_event_arr)
      ) as event_params,
      array(
        select as struct up.*
        from unnest(user_properties) up
        where up.key not in unnest(excl_user_arr)
      ) as user_properties
    from `your-project.analytics_XXX.events_*`
    where _table_suffix between format_date('%Y%m%d', date_sub(current_date(), interval day_interval day))
        and format_date('%Y%m%d', date_sub(current_date(), interval 1 day))
      and event_name not in unnest(excluded_events);

    -- today from events_intraday_*
    if events_intraday_exists then
      insert into all_events
      select
        parse_date('%Y%m%d', event_date) as event_date,
        event_name,
        platform,
        items,
        array(
          select as struct ep.*
          from unnest(event_params) ep
          where ep.key not in unnest(excl_event_arr)
        ) as event_params,
        array(
          select as struct up.*
          from unnest(user_properties) up
          where up.key not in unnest(excl_user_arr)
        ) as user_properties
      from `your-project.analytics_XXX.events_intraday_*`
      where _table_suffix = format_date('%Y%m%d', current_date())
        and event_name not in unnest(excluded_events);
    end if;

    -- backfill yesterday from intraday if needed
    if not yesterday_events_exists then
      if events_intraday_exists then
        insert into all_events
        select
          parse_date('%Y%m%d', event_date) as event_date,
          event_name,
          platform,
          items,
          array(
            select as struct ep.*
            from unnest(event_params) ep
            where ep.key not in unnest(excl_event_arr)
          ) as event_params,
          array(
            select as struct up.*
            from unnest(user_properties) up
            where up.key not in unnest(excl_user_arr)
          ) as user_properties
        from `your-project.analytics_XXX.events_intraday_*`
        where _table_suffix = format_date('%Y%m%d', date_sub(current_date(), interval 1 day))
          and event_name not in unnest(excluded_events);
      end if;
    end if;
  end if;
end;

create temp table temp_prepared_parameter_data as
with 
  documentation_events as (
    select
      event_name,
      current_date() as event_date,
      'ITEM' as scope,
      event_item_parameter as parameter_name
      from 
        `your-project.analytics_XXX.ga4_documentation_events`,
        unnest(split(event_item_parameters)) as event_item_parameter
      where
        event_item_parameters is not null and event_item_parameters != ''
    
    union all

    select
      event_name,
      current_date() as event_date,
      'EVENT' as scope, 
      event_parameter as parameter_name
    from 
      `your-project.analytics_XXX.ga4_documentation_events`,
      unnest(split(event_parameters)) as event_parameter
    where
      event_parameters is not null and event_parameters != ''

    union all
    
    select 
      event_name,
      current_date() as event_date,
      'USER' as scope,
      event_user_parameter as parameter_name
    from
      `your-project.analytics_XXX.ga4_documentation_events`,
      unnest(split(event_user_parameters)) as event_user_parameter
    where
      event_user_parameters is not null and event_user_parameters != ''
  ),

processed_items as (
  select distinct
    ae.event_date,
    ae.event_name,
    ae.platform,
    it.item_id,
    it.item_name,
    it.item_brand,
    it.item_variant,
    it.item_category,
    it.item_category2,
    it.item_category3,
    it.item_category4,
    it.item_category5,
    it.price,
    it.quantity,
    it.coupon,
    it.affiliation,
    it.location_id,
    it.item_list_id,
    it.item_list_name,
    it.item_list_index,
    it.promotion_id,
    it.promotion_name,
    it.creative_name,
    it.creative_slot
  from all_events ae
  cross join unnest(ae.items) as it
  where ae.event_name in (select event from unnest(ecommerce_events) as event)
),

-- === EVENT-LEVEL PRESENCE FOR STANDARD ITEM FIELDS (per-event) ===
-- One row per *event* with boolean flags indicating whether ANY item in that event had each field.
item_presence_per_event as (
  select
    ae.event_date,
    ae.event_name,
    ae.platform,

    -- For each field, look across the items[] array for this single event.
    -- IFNULL(..., false) because an event with no items should evaluate to FALSE presence.
    ifnull( (select logical_or(i.item_id is not null and trim(cast(i.item_id as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_item_id,
    ifnull( (select logical_or(i.item_name is not null and trim(cast(i.item_name as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_item_name,
    ifnull( (select logical_or(i.item_brand is not null and trim(cast(i.item_brand as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_item_brand,
    ifnull( (select logical_or(i.item_variant is not null and trim(cast(i.item_variant as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_item_variant,
    ifnull( (select logical_or(i.item_category is not null and trim(cast(i.item_category as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_item_category,
    ifnull( (select logical_or(i.item_category2 is not null and trim(cast(i.item_category2  as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_item_category2,
    ifnull( (select logical_or(i.item_category3 is not null and trim(cast(i.item_category3  as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_item_category3,
    ifnull( (select logical_or(i.item_category4 is not null and trim(cast(i.item_category4  as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_item_category4,
    ifnull( (select logical_or(i.item_category5 is not null and trim(cast(i.item_category5  as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_item_category5,
    ifnull( (select logical_or(i.price is not null and trim(cast(i.price as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_price,
    ifnull( (select logical_or(i.quantity is not null and trim(cast(i.quantity as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_quantity,
    ifnull( (select logical_or(i.coupon is not null and trim(cast(i.coupon as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_coupon,
    ifnull( (select logical_or(i.affiliation is not null and trim(cast(i.affiliation as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_affiliation,
    ifnull( (select logical_or(i.location_id is not null and trim(cast(i.location_id as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_location_id,
    ifnull( (select logical_or(i.item_list_id is not null and trim(cast(i.item_list_id as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_item_list_id,
    ifnull( (select logical_or(i.item_list_name is not null and trim(cast(i.item_list_name  as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_item_list_name,
    ifnull( (select logical_or(i.item_list_index is not null and trim(cast(i.item_list_index as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_item_list_index,
    ifnull( (select logical_or(i.promotion_id is not null and trim(cast(i.promotion_id as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_promotion_id,
    ifnull( (select logical_or(i.promotion_name is not null and trim(cast(i.promotion_name as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_promotion_name,
    ifnull( (select logical_or(i.creative_name is not null and trim(cast(i.creative_name as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_creative_name,
    ifnull( (select logical_or(i.creative_slot is not null and trim(cast(i.creative_slot as string)) not in ('', '(not set)'))
        from unnest(ae.items) i), false) as p_creative_slot
  from all_events ae
  where ae.event_name in unnest(ecommerce_events)
),

-- Emit one row per event per standard field with count=1 when presence is TRUE.
item_standard_parameters as (
  select
    event_date,
    event_name,
    platform,
    parameter_name,
    1 as count,
    true as is_standard_item_param
  from (
    select * from item_presence_per_event
  ) unpivot (flag for parameter_name in (
      p_item_id as 'item_id',
      p_item_name as 'item_name',
      p_item_brand as 'item_brand',
      p_item_variant as 'item_variant',
      p_item_category as 'item_category',
      p_item_category2 as 'item_category2',
      p_item_category3 as 'item_category3',
      p_item_category4 as 'item_category4',
      p_item_category5 as 'item_category5',
      p_price as 'price',
      p_quantity as 'quantity',
      p_coupon as 'coupon',
      p_affiliation as 'affiliation',
      p_location_id as 'location_id',
      p_item_list_id as 'item_list_id',
      p_item_list_name as 'item_list_name',
      p_item_list_index as 'item_list_index',
      p_promotion_id as 'promotion_id',
      p_promotion_name as 'promotion_name',
      p_creative_name as 'creative_name',
      p_creative_slot as 'creative_slot'
  ))
  where flag
),

-- Unified parameter counts
parameter_counts as (
  -- EVENT scope
  select 
    event_date,
    ep.key  as parameter_name,
    'EVENT' as scope,
    event_name,
    platform,
    count(*) as count,
    false as is_standard_item_param
  from all_events
  cross join unnest(event_params) ep
  group by event_date, event_name, platform, parameter_name

  union all
  -- USER scope
  select 
    event_date,
    up.key  as parameter_name,
    'USER'  as scope,
    event_name,
    platform,
    count(*) as count,
    false as is_standard_item_param
  from all_events
  cross join unnest(user_properties) up
  group by event_date, event_name, platform, parameter_name

    union all
  -- ITEM scope (custom item_params) — EVENT-LEVEL PRESENCE (1 per event if any item has key with meaningful value)
  select
    event_date,
    parameter_name,
    'ITEM' as scope,
    event_name,
    platform,
    count(*) as count, -- one per (event_date,event_name,platform,param) if present in that event
    false as is_standard_item_param
  from (
    -- build, per event row, the distinct set of present keys in items.item_params
    select
      ae.event_date,
      ae.event_name,
      ae.platform,
      array(
        select distinct ip.key
        from unnest(ae.items) i
        cross join unnest(i.item_params) ip
        where ip.key not in unnest(excl_item_arr)
          and coalesce(
            trim(coalesce(
              ip.value.string_value,
              cast(ip.value.int_value   as string),
              cast(ip.value.float_value as string)
            )),
            ''
          ) not in ('', '(not set)')
      ) as present_keys
    from all_events ae
  ) ev
  cross join unnest(ev.present_keys) as parameter_name
  group by event_date, event_name, platform, parameter_name

  union all
  -- ITEM scope (standard item fields)
  select
    event_date,
    parameter_name,
    'ITEM' as scope,
    event_name,
    platform,
    count,
    is_standard_item_param
  from item_standard_parameters
),

global_params as (
  select distinct parameter_name, scope
  from documentation_events
  where event_name = 'ga4_config'
),

all_event_names as (
  select distinct event_name
  from parameter_counts
),

global_params_expanded as (
  select distinct aen.event_name, gp.parameter_name, gp.scope
  from all_event_names aen
  cross join global_params gp
),

documentation_events_final as (
  -- All normal documentation events (excluding ga4_config)
  select event_name, parameter_name, scope
  from documentation_events
  where event_name != 'ga4_config'

  union distinct

   -- Global parameters expanded to all event names
  select event_name, parameter_name, scope
  from global_params_expanded
),

count as (
  select distinct
    coalesce(pc.event_date, current_date()) as event_date,
    coalesce(def.event_name, pc.event_name) as event_name,
    coalesce(def.scope, pc.scope) as parameter_scope,
    coalesce(def.parameter_name, pc.parameter_name) as parameter_name,
    max(case when pc.platform = 'WEB' then true else false end) as platform_web,
    max(case when pc.platform = 'ANDROID' then true else false end) as platform_android,
    max(case when pc.platform = 'IOS' then true else false end) as platform_ios,
    case when gp.parameter_name is not null then true else false end as ga4_config_parameter,
    sum(case when pc.count is not null then pc.count else 0 end) as parameter_count_total,
    sum(case when pc.platform = 'WEB' and pc.count is not null then pc.count else 0 end) as parameter_count_web,
    sum(case when pc.platform = 'ANDROID' and pc.count is not null then pc.count else 0 end) as parameter_count_android,
    sum(case when pc.platform = 'IOS' and pc.count is not null then pc.count else 0 end) as parameter_count_ios,
    max(case when pc.count > 0 then pc.event_date else null end) as parameter_last_seen_date_total,
    max(case when pc.platform = 'WEB' and pc.count > 0 then pc.event_date else null end) as parameter_last_seen_date_web,
    max(case when pc.platform = 'ANDROID' and pc.count > 0 then pc.event_date else null end) as parameter_last_seen_date_android,
    max(case when pc.platform = 'IOS' and pc.count > 0 then pc.event_date else null end) as parameter_last_seen_date_ios,
    min(case when pc.count > 0 then pc.event_date else null end) as parameter_first_seen_date_total_calculated,
    min(case when pc.platform = 'WEB' and pc.count > 0 then pc.event_date else null end) as parameter_first_seen_date_web_calculated,
    min(case when pc.platform = 'ANDROID' and pc.count > 0 then pc.event_date else null end) as parameter_first_seen_date_android_calculated,
    min(case when pc.platform = 'IOS' and pc.count > 0 then pc.event_date else null end) as parameter_first_seen_date_ios_calculated,
    max(pc.is_standard_item_param) as is_standard_item_param
  from documentation_events_final def
  full join parameter_counts pc
    on def.event_name = pc.event_name
    and def.parameter_name = pc.parameter_name
    and def.scope = pc.scope
  left join global_params gp
    on gp.parameter_name = coalesce(def.parameter_name, pc.parameter_name)
    and gp.scope = coalesce(def.scope, pc.scope)
  group by event_date, event_name, parameter_name, parameter_scope, ga4_config_parameter
),

doc_item_params as (
  select distinct event_name, parameter_name
  from documentation_events
  where scope = 'ITEM'
),

prepared_data as (
  select
    c.event_date,
    c.event_name,

    gd.parameter_group,
    gd.parameter_display_name,
    coalesce(c.parameter_name, gd.parameter_name)  as parameter_name,
    coalesce(c.parameter_scope, gd.parameter_scope) as parameter_scope,

    gd.parameter_type,
    gd.parameter_format,
    gd.parameter_disallow_ads_personalization,
    gd.parameter_example_value,
    case 
      when gd.parameter_description is null then 'Not Documented' 
      else regexp_replace(gd.parameter_description, r'\\r\\n|\\n', '\n')
    end as parameter_description,
    regexp_replace(gd.parameter_gtm_comment, r'\\r\\n|\\n', '\n') as parameter_gtm_comment,

    c.ga4_config_parameter,

    -- Platform flags come from GA4 data but may be overridden by documentation
    coalesce(gd.parameter_web, c.platform_web) as platform_web,
    coalesce(gd.parameter_android, c.platform_android) as platform_android,
    coalesce(gd.parameter_ios, c.platform_ios) as platform_ios,

    -- Aggregated counts
    sum(c.parameter_count_total) as parameter_count_total,
    sum(c.parameter_count_web) as parameter_count_web,
    sum(c.parameter_count_android) as parameter_count_android,
    sum(c.parameter_count_ios) as parameter_count_ios,

    max(c.parameter_last_seen_date_total) as parameter_last_seen_date_total,
    max(c.parameter_last_seen_date_web) as parameter_last_seen_date_web,
    max(c.parameter_last_seen_date_android) as parameter_last_seen_date_android,
    max(c.parameter_last_seen_date_ios) as parameter_last_seen_date_ios,

    min(c.parameter_first_seen_date_total_calculated) as parameter_first_seen_date_total,
    min(c.parameter_first_seen_date_web_calculated) as parameter_first_seen_date_web,
    min(c.parameter_first_seen_date_android_calculated) as parameter_first_seen_date_android,
    min(c.parameter_first_seen_date_ios_calculated) as parameter_first_seen_date_ios
  from
    count c
    full join `your-project.analytics_XXX.ga4_documentation_parameters` gd
      on gd.parameter_name = c.parameter_name
     and gd.parameter_scope = c.parameter_scope

    left join doc_item_params dip
      on dip.event_name = c.event_name
     and dip.parameter_name = c.parameter_name
  where
    (
      -- Has data on any collected platform
      ((c.platform_web = true or c.platform_android = true or c.platform_ios = true)
       and c.parameter_count_total > 0)
    )
    or
    (
      -- Documented but zero data -> still include
      (gd.parameter_web = true or gd.parameter_ios = true or gd.parameter_android = true)
      and c.parameter_count_total = 0
      and gd.parameter_display_name is not null

      and not (
        coalesce(c.parameter_scope, gd.parameter_scope) = 'ITEM'
        and c.is_standard_item_param = true
        and dip.event_name is null  -- Not documented for this event/parameter
      )
    )
  group by
    c.event_date,
    c.event_name,
    gd.parameter_group,
    gd.parameter_display_name,
    coalesce(c.parameter_name, gd.parameter_name),
    coalesce(c.parameter_scope, gd.parameter_scope),
    coalesce(gd.parameter_web, c.platform_web),
    coalesce(gd.parameter_ios, c.platform_ios),
    coalesce(gd.parameter_android, c.platform_android),
    gd.parameter_type,
    gd.parameter_format,
    gd.parameter_disallow_ads_personalization,
    gd.parameter_example_value,
    gd.parameter_description,
    gd.parameter_gtm_comment,
    c.ga4_config_parameter,
    gd.parameter_web,
    gd.parameter_ios,
    gd.parameter_android
),

parameter_classification as (
  select distinct
    parameter_name,
    parameter_scope,
    -- Classification logic on aggregated data:
    case
      when max(parameter_display_name) is not null and sum(parameter_count_total) > 0
      then 'Documented and Data'

      when max(parameter_display_name) is null and sum(parameter_count_total) > 0
      then 'Not Documented'

      else 'Documented no Data'
    end as parameter_documentation_status_aggregated
  from prepared_data
  group by parameter_name, parameter_scope
),

resolved_first_seen as (
  select distinct
    parameter_name,
    parameter_scope,
    event_name,
    max(parameter_last_seen_date_total) as parameter_last_seen_date_total,
    max(parameter_last_seen_date_web) as parameter_last_seen_date_web,
    max(parameter_last_seen_date_android) as parameter_last_seen_date_android,
    max(parameter_last_seen_date_ios) as parameter_last_seen_date_ios,
    min(parameter_first_seen_date_total) as parameter_first_seen_date_total,
    min(parameter_first_seen_date_web) as parameter_first_seen_date_web,
    min(parameter_first_seen_date_android) as parameter_first_seen_date_android,
    min(parameter_first_seen_date_ios) as parameter_first_seen_date_ios,
  from your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status
  group by parameter_name, parameter_scope, event_name
)

select
  pd.event_date,
  pd.event_name,
  pd.parameter_group,
  pd.parameter_display_name,
  pd.parameter_name,
  pd.parameter_scope,
  pd.parameter_type,
  pd.parameter_format,
  pd.parameter_disallow_ads_personalization,
  pd.parameter_example_value,
  pd.parameter_description,
  pd.parameter_gtm_comment,
  pd.ga4_config_parameter,

  -- Counts aggregated in prepared_data
  pd.parameter_count_total,
  pd.parameter_count_web,
  pd.parameter_count_android,
  pd.parameter_count_ios,

  -- Platform flags
  pd.platform_web,
  pd.platform_android,
  pd.platform_ios,

  -- Last/first seen (prefer historical when present)
  coalesce(pd.parameter_last_seen_date_total, rf.parameter_last_seen_date_total) as parameter_last_seen_date_total,
  coalesce(pd.parameter_last_seen_date_web, rf.parameter_last_seen_date_web) as parameter_last_seen_date_web,
  coalesce(pd.parameter_last_seen_date_android, rf.parameter_last_seen_date_android) as parameter_last_seen_date_android,
  coalesce(pd.parameter_last_seen_date_ios, rf.parameter_last_seen_date_ios) as parameter_last_seen_date_ios,

  coalesce(rf.parameter_first_seen_date_total, pd.parameter_first_seen_date_total) as parameter_first_seen_date_total,
  coalesce(rf.parameter_first_seen_date_web, pd.parameter_first_seen_date_web) as parameter_first_seen_date_web,
  coalesce(rf.parameter_first_seen_date_android, pd.parameter_first_seen_date_android) as parameter_first_seen_date_android,
  coalesce(rf.parameter_first_seen_date_ios, pd.parameter_first_seen_date_ios) as parameter_first_seen_date_ios,

  pc_agg.parameter_documentation_status_aggregated
from prepared_data pd
left join parameter_classification pc_agg
  on pd.parameter_name = pc_agg.parameter_name
 and pd.parameter_scope = pc_agg.parameter_scope
left join resolved_first_seen rf
  on pd.parameter_name = rf.parameter_name
 and pd.parameter_scope = rf.parameter_scope
 and pd.event_name = rf.event_name
;

merge into `your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status` as target
using (
  -- Pre-aggregate external first-seen dates once
  with params_first_seen as (
    select
      parameter_name,
      parameter_scope,
      -- Total = earliest across any platform
      min(first_seen_date) as pfs_total,
      min(case when upper(platform) = 'WEB' then first_seen_date end) as pfs_web,
      min(case when upper(platform) = 'ANDROID' then first_seen_date end) as pfs_android,
      min(case when upper(platform) = 'IOS' then first_seen_date end) as pfs_ios
    from `your-project.analytics_XXX.ga4_documentation_parameters_first_seen`
    group by parameter_name, parameter_scope
  )

  select
    s.event_name,
    s.parameter_name,
    s.parameter_scope,

    any_value(s.parameter_display_name) as parameter_display_name,
    any_value(s.parameter_group) as parameter_group,
    any_value(s.parameter_type) as parameter_type,
    any_value(s.parameter_format) as parameter_format,
    any_value(s.parameter_disallow_ads_personalization) as parameter_disallow_ads_personalization,
    any_value(s.parameter_example_value) as parameter_example_value,
    any_value(s.parameter_description) as parameter_description,
    any_value(s.parameter_gtm_comment) as parameter_gtm_comment,
    any_value(s.ga4_config_parameter) as ga4_config_parameter,

    sum(s.parameter_count_total) as parameter_count_total,
    sum(s.parameter_count_web) as parameter_count_web,
    sum(s.parameter_count_android) as parameter_count_android,
    sum(s.parameter_count_ios) as parameter_count_ios,

    logical_or(s.platform_web) as platform_web,
    logical_or(s.platform_android) as platform_android,
    logical_or(s.platform_ios) as platform_ios,

    max(s.parameter_last_seen_date_total) as parameter_last_seen_date_total,
    max(s.parameter_last_seen_date_web) as parameter_last_seen_date_web,
    max(s.parameter_last_seen_date_android) as parameter_last_seen_date_android,
    max(s.parameter_last_seen_date_ios) as parameter_last_seen_date_ios,

    -- For first-seen, prefer external table *only when Not Documented*
    case
      when any_value(s.parameter_display_name) is null and sum(s.parameter_count_total) > 0
        then coalesce(min(pfs.pfs_total), min(s.parameter_first_seen_date_total))
      else min(s.parameter_first_seen_date_total)
    end as parameter_first_seen_date_total,

    -- web
    case
      when any_value(s.parameter_display_name) is null and sum(s.parameter_count_total) > 0
        then coalesce(min(pfs.pfs_web), min(s.parameter_first_seen_date_web))
      else min(s.parameter_first_seen_date_web)
    end as parameter_first_seen_date_web,

    -- android
    case
      when any_value(s.parameter_display_name) is null and sum(s.parameter_count_total) > 0
        then coalesce(min(pfs.pfs_android), min(s.parameter_first_seen_date_android))
      else min(s.parameter_first_seen_date_android)
    end as parameter_first_seen_date_android,

    -- ios
    case
      when any_value(s.parameter_display_name) is null and sum(s.parameter_count_total) > 0
        then coalesce(min(pfs.pfs_ios),     min(s.parameter_first_seen_date_ios))
      else min(s.parameter_first_seen_date_ios)
    end as parameter_first_seen_date_ios,

    case
      when any_value(s.parameter_display_name) is not null and sum(s.parameter_count_total) > 0
        then 'Documented and Data'
      when any_value(s.parameter_display_name) is null and sum(s.parameter_count_total) > 0
        then 'Not Documented'
      when any_value(s.parameter_display_name) is not null and sum(s.parameter_count_total) = 0
        then 'Documented no Data'
    end as parameter_documentation_status,

    max(s.parameter_documentation_status_aggregated)  as parameter_documentation_status_aggregated

  from temp_prepared_parameter_data s
  left join params_first_seen pfs
    on pfs.parameter_name = s.parameter_name
   and pfs.parameter_scope = s.parameter_scope
  group by s.event_name, s.parameter_name, s.parameter_scope
) as source
on  target.event_name = source.event_name
and target.parameter_name = source.parameter_name
and target.parameter_scope = source.parameter_scope

when matched then
  update set
    target.event_name = source.event_name,
    target.parameter_group = source.parameter_group,
    target.parameter_display_name = source.parameter_display_name,
    target.parameter_name = source.parameter_name,
    target.parameter_scope = source.parameter_scope,
    target.parameter_type = source.parameter_type,
    target.parameter_format = source.parameter_format,
    target.parameter_disallow_ads_personalization = source.parameter_disallow_ads_personalization,
    target.parameter_example_value = source.parameter_example_value,
    target.parameter_description = source.parameter_description,
    target.parameter_gtm_comment = source.parameter_gtm_comment,
    target.ga4_config_parameter = source.ga4_config_parameter,
    target.parameter_count_total = source.parameter_count_total,
    target.parameter_count_web = source.parameter_count_web,
    target.parameter_count_android = source.parameter_count_android,
    target.parameter_count_ios = source.parameter_count_ios,
    target.platform_web = source.platform_web,
    target.platform_android = source.platform_android,
    target.platform_ios = source.platform_ios,
    target.parameter_last_seen_date_total = source.parameter_last_seen_date_total,
    target.parameter_last_seen_date_web = source.parameter_last_seen_date_web,
    target.parameter_last_seen_date_android = source.parameter_last_seen_date_android,
    target.parameter_last_seen_date_ios = source.parameter_last_seen_date_ios,

    -- Only set first_seen fields if currently NULL (preserves existing history)
    target.parameter_first_seen_date_total = case
      when target.parameter_first_seen_date_total is null
        then source.parameter_first_seen_date_total
      else target.parameter_first_seen_date_total
    end,
    target.parameter_first_seen_date_web = case
      when target.parameter_first_seen_date_web is null
        then source.parameter_first_seen_date_web
      else target.parameter_first_seen_date_web
    end,
    target.parameter_first_seen_date_android = case
      when target.parameter_first_seen_date_android is null
        then source.parameter_first_seen_date_android
      else target.parameter_first_seen_date_android
    end,
    target.parameter_first_seen_date_ios = case
      when target.parameter_first_seen_date_ios is null
        then source.parameter_first_seen_date_ios
      else target.parameter_first_seen_date_ios
    end,

    target.parameter_documentation_status = source.parameter_documentation_status,
    target.parameter_documentation_status_aggregated = source.parameter_documentation_status_aggregated

when not matched then
  insert (
    event_name,
    parameter_group,
    parameter_display_name,
    parameter_name,
    parameter_scope,
    parameter_type,
    parameter_format,
    parameter_disallow_ads_personalization,
    parameter_example_value, 
    parameter_description,
    parameter_gtm_comment,
    ga4_config_parameter,
    parameter_count_total,
    parameter_count_web,
    parameter_count_android,
    parameter_count_ios,
    platform_web,
    platform_android,
    platform_ios,
    parameter_last_seen_date_total,
    parameter_last_seen_date_web,
    parameter_last_seen_date_android,
    parameter_last_seen_date_ios,
    parameter_first_seen_date_total,
    parameter_first_seen_date_web,
    parameter_first_seen_date_android,
    parameter_first_seen_date_ios,
    parameter_documentation_status,
    parameter_documentation_status_aggregated
  )
  values (
    source.event_name,
    source.parameter_group,
    source.parameter_display_name,
    source.parameter_name,
    source.parameter_scope,
    source.parameter_type,
    source.parameter_format,
    source.parameter_disallow_ads_personalization,
    source.parameter_example_value,
    source.parameter_description,
    source.parameter_gtm_comment,
    source.ga4_config_parameter,
    source.parameter_count_total,
    source.parameter_count_web,
    source.parameter_count_android,
    source.parameter_count_ios,
    source.platform_web,
    source.platform_android,
    source.platform_ios,
    source.parameter_last_seen_date_total,
    source.parameter_last_seen_date_web,
    source.parameter_last_seen_date_android,
    source.parameter_last_seen_date_ios,
    source.parameter_first_seen_date_total,
    source.parameter_first_seen_date_web,
    source.parameter_first_seen_date_android,
    source.parameter_first_seen_date_ios,
    source.parameter_documentation_status,
    source.parameter_documentation_status_aggregated
  );

-- Insert-only feed from the main status table (earliest across events)
merge into `your-project.analytics_XXX.ga4_documentation_parameters_first_seen` fs
using (
  with earliest as (
    select
      parameter_name,
      parameter_scope,
      min(parameter_first_seen_date_web)     as web_first_seen,
      min(parameter_first_seen_date_android) as android_first_seen,
      min(parameter_first_seen_date_ios)     as ios_first_seen
    from `your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status`
    group by parameter_name, parameter_scope
  )
  select parameter_name, parameter_scope, 'WEB' as platform, web_first_seen as first_seen_date
  from earliest
  where web_first_seen is not null

  union all
  select parameter_name, parameter_scope, 'ANDROID' as platform, android_first_seen as first_seen_date
  from earliest
  where android_first_seen is not null

  union all
  select parameter_name, parameter_scope, 'IOS' as platform, ios_first_seen as first_seen_date
  from earliest
  where ios_first_seen is not null
) src
on  fs.parameter_name = src.parameter_name
and fs.parameter_scope = src.parameter_scope
and fs.platform = src.platform
when not matched then
  insert (parameter_name, parameter_scope, platform, first_seen_date)
  values (src.parameter_name, src.parameter_scope, src.platform, src.first_seen_date);

-- Keep only (parameter, scope) keys that exist on the latest day of the current window
delete from `your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status` as target
where not exists (
    select 1
    from temp_prepared_parameter_data as source
    where target.event_name = source.event_name and target.parameter_name = source.parameter_name and target.parameter_scope = source.parameter_scope
);

/***** LOG DAILY PARAMETER COUNT ****/
create table if not exists `your-project.analytics_XXX.ga4_documentation_parameters_daily_counts`
(
  event_date date options(description='Event Date.'),
  parameter_name string options(description='Parameter Name.'),
  parameter_scope string options(description='Parameter Scope.'),
  event_name string options(description='Event Name.'),
  parameter_count_total int64 options(description='Daily Total Parameter Count across all platforms (Web, Android & iOS).'),
  parameter_count_web int64 options(description='Daily Parameter Count for Web Platform.'),
  parameter_count_android int64 options(description='Daily Parameter Count for Android Platform.'),
  parameter_count_ios int64 options(description='Daily Parameter Count for iOS Platform.')
)
partition by event_date
cluster by parameter_name, parameter_scope, event_name;

delete from `your-project.analytics_XXX.ga4_documentation_parameters_daily_counts`
where event_date between date_sub(current_date(), interval day_interval day) and current_date();

-- Insert new rows for parameters, excluding event_name = 'ga4_config'
insert into `your-project.analytics_XXX.ga4_documentation_parameters_daily_counts` (
  event_date,
  parameter_name,
  parameter_scope,
  event_name,
  parameter_count_total,
  parameter_count_web,
  parameter_count_android,
  parameter_count_ios
)
select
  event_date,
  parameter_name,
  parameter_scope,
  event_name,
  coalesce(max(parameter_count_total), 0) as parameter_count_total,
  coalesce(max(parameter_count_web), 0) as parameter_count_web,
  coalesce(max(parameter_count_android), 0) as parameter_count_android,
  coalesce(max(parameter_count_ios), 0) as parameter_count_ios
from (
  -- Generate the range of dates and cross join with unique parameter data
  select 
    date_sub(current_date(), interval day_offset day) as event_date,
    parameter_name,
    parameter_scope,
    event_name
  from 
    temp_prepared_parameter_data,
    unnest(generate_array(0, day_interval)) as day_offset
  where event_name != 'ga4_config' -- Exclude unwanted event_name
) as date_parameter_combinations
left join (
  -- Ensure temp_prepared_parameter_data has unique rows and exclude unwanted event_name
  select
    event_date,
    parameter_name,
    parameter_scope,
    event_name,
    max(parameter_count_total) as parameter_count_total,
    max(parameter_count_web) as parameter_count_web,
    max(parameter_count_android) as parameter_count_android,
    max(parameter_count_ios) as parameter_count_ios
  from temp_prepared_parameter_data
  where event_name != 'ga4_config' -- Exclude unwanted event_name
  group by event_date, parameter_name, parameter_scope, event_name
) as unique_parameters using (parameter_name, parameter_scope, event_name, event_date)
group by event_date, parameter_name, parameter_scope, event_name;

 --**** DELETE and CLEAN UP DATA ****
delete from `your-project.analytics_XXX.ga4_documentation_parameters_daily_counts`
where event_date < date_sub(current_date(), interval delete_parameter_count_after_days day);
