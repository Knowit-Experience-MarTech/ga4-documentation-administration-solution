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
 * distributed under the License is distributed on an "as is" BASIS,
 * WITHOUT WARRANTIES or CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** Query related information **
* Replace your-project.analytics_XXX with your project and data set
* Adjust settings in declarations below if needed.
*/

-- *** DECLARATIONS THAT CAN BE EDITED ***
-- EVENTS
declare excluded_events_hardcoded string default ''; -- Hard coded events that should be excluded from the documentation. Separate Events by comma.

-- PARAMETERS
declare excluded_parameters_hardcoded string default ''; -- Hard coded parameters that should excluded from the documentation. Parameter Scope doesn't matter. Separate parameters by comma.

-- ECOMMERCE EVENTS
declare ecommerce_events string default 'add_payment_info, add_shipping_info, add_to_cart, add_to_wishlist, begin_checkout, purchase, refund, remove_from_cart, select_item, select_promotion, view_cart, view_item, view_item_list, view_promotion'; -- Ecommerce Events.

-- *** END DECLARATIONS THAT CAN BE EDITED ***

-- *** DECLARATIONS THAT SHOULDN¨T BE EDITED ***

-- QUERY PERIODS
declare day_interval_short int64; -- Number of min days queried.
declare day_interval_extended int64; -- Number of days to query the first time to get some parameter count data.
declare delete_parameter_count_after_days int64; -- Parameter count data older than this will be deleted.

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

-- Combine declared excluded parameters with table-based parameters_exclusion
declare excluded_parameters string default (
  select string_agg(param, ', ')
  from (
    select distinct trim(value) as param
    from unnest(split(excluded_parameters_hardcoded, ',')) as value
    union distinct
    select distinct trim(value) as param
    from `your-project.analytics_XXX.ga4_documentation_bq_settings`,
    unnest(split(parameters_exclusion, ',')) as value
    where parameters_exclusion is not null and parameters_exclusion != ''
  )
);

--------------------------------------------------------------------------------
-- 2) New Declarations for scope-based exclusions (except ITEM)
--------------------------------------------------------------------------------
declare global_exclusions string default '';
declare event_exclusions string default '';
declare user_exclusions string default '';
declare item_exclusions string default '';

-- Declare variables to check table existence
declare events_fresh_exists bool default false;
declare events_intraday_exists bool default false;
declare yesterday_events_exists bool default false;

--Logic for getting the parameter count for a longer period with the first query
declare day_interval int64;
declare is_initial_run bool default (
  select count(1) = 0 
  from `your-project.analytics_XXX.__TABLES_SUMMARY__`
  where table_id = 'ga4_documentation_parameters_daily_counts'
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


-- *** END DECLARATIONS THAT SHOULDN¨T BE EDITED ***

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

create temp table parsed_exclusions as
select
  trim(SPLIT_PARTS[safe_offset(0)]) as param,
  upper(trim(SPLIT_PARTS[safe_offset(1)])) as scope
from (
  select split(trim(e), '|') as SPLIT_PARTS
  from unnest(split(excluded_parameters, ',')) as e
  where trim(e) <> ''
)
where trim(SPLIT_PARTS[safe_offset(0)]) <> '';

--------------------------------------------------------------------------------
-- 4) Populate our three new variables: global, event, user
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
create temp table AllEvents as
select 
  parse_date('%Y%m%d', event_date) as event_date,
  event_name,
  platform,
  items,
  event_params,
  user_properties
from `your-project.analytics_XXX.events_*`
limit 0;

-- Populate AllEvents based on conditional logic
begin
  if events_fresh_exists then
    -- Query events_fresh_* for the date range from startDate to today
    insert into AllEvents
    select
      parse_date('%Y%m%d', event_date) as event_date,
      event_name,
      platform,
      items,
      array(
        select as struct ep.*
        from unnest(event_params) as ep
         where ep.key not in unnest(
          split(
            case
              when (global_exclusions is null or trim(global_exclusions) = '')
                and (event_exclusions is null or trim(event_exclusions) = '')
              then ''  -- both are null/empty => exclude nothing

              when (global_exclusions is null or trim(global_exclusions) = '')
              then trim(event_exclusions)  -- only global_exclusions is null/empty

              when (event_exclusions is null or trim(event_exclusions) = '')
              then trim(global_exclusions) -- only event_exclusions is null/empty

              else concat(trim(global_exclusions), ',', trim(event_exclusions))
            end,
          ','  -- split on commas
          )
        )
      ) as event_param,
      -- user_properties => exclude (global + USER)
       array(
        select as struct up.*
        from unnest(user_properties) as up
         where up.key not in unnest(
          split(
            case
              when (global_exclusions is null or trim(global_exclusions) = '')
                and (user_exclusions is null or trim(user_exclusions) = '')
              then ''  -- both are null/empty => exclude nothing

              when (global_exclusions is null or trim(global_exclusions) = '')
              then trim(user_exclusions)  -- only global_exclusions is null/empty

              when (user_exclusions is null or trim(user_exclusions) = '')
              then trim(global_exclusions) -- only user_exclusions is null/empty

              else concat(trim(global_exclusions), ',', trim(user_exclusions))
            end,
          ','  -- split on commas
          )
        )
      ) as user_properties
    from `your-project.analytics_XXX.events_fresh_*`
    where _table_suffix between format_date('%Y%m%d', date_sub(current_date(), interval day_interval day))
      and format_date('%Y%m%d', current_date())
      and event_name not in unnest(split(excluded_events, ', '));

  else
    -- Query events_* table for the date range from startDate to yesterday
    insert into AllEvents
    select
      parse_date('%Y%m%d', event_date) as event_date,
      event_name,
      platform,
      items,
      array(
        select as struct ep.*
        from unnest(event_params) as ep
         where ep.key not in unnest(
          split(
            case
              when (global_exclusions is null or trim(global_exclusions) = '')
                and (event_exclusions is null or trim(event_exclusions) = '')
              then ''  -- both are null/empty => exclude nothing

              when (global_exclusions is null or trim(global_exclusions) = '')
              then trim(event_exclusions)  -- only global_exclusions is null/empty

              when (event_exclusions is null or trim(event_exclusions) = '')
              then trim(global_exclusions) -- only event_exclusions is null/empty

              else concat(trim(global_exclusions), ',', trim(event_exclusions))
            end,
          ','  -- split on commas
          )
        )
      ) as event_param,
      -- user_properties => exclude (global + USER)
       array(
        select as struct up.*
        from unnest(user_properties) as up
         where up.key not in unnest(
          split(
            case
              when (global_exclusions is null or trim(global_exclusions) = '')
                and (user_exclusions is null or trim(user_exclusions) = '')
              then ''  -- both are null/empty => exclude nothing

              when (global_exclusions is null or trim(global_exclusions) = '')
              then trim(user_exclusions)  -- only global_exclusions is null/empty

              when (user_exclusions is null or trim(user_exclusions) = '')
              then trim(global_exclusions) -- only user_exclusions is null/empty

              else concat(trim(global_exclusions), ',', trim(user_exclusions))
            end,
          ','  -- split on commas
          )
        )
      ) as user_properties
    from `your-project.analytics_XXX.events_*`
    where _table_suffix between format_date('%Y%m%d', date_sub(current_date(), interval day_interval day))
      and format_date('%Y%m%d', date_sub(current_date(), interval 1 day))
      and event_name not in unnest(split(excluded_events, ', '));

    -- If events_intraday_* table exists, query it for today
    if events_intraday_exists then
      insert into AllEvents
      select
        parse_date('%Y%m%d', event_date) as event_date,
        event_name,
        platform,
        items,
        array(
          select as struct ep.*
          from unnest(event_params) as ep
          where ep.key not in unnest(
            split(
              case
                when (global_exclusions is null or trim(global_exclusions) = '')
                  and (event_exclusions is null or trim(event_exclusions) = '')
                then ''  -- both are null/empty => exclude nothing

                when (global_exclusions is null or trim(global_exclusions) = '')
                then trim(event_exclusions)  -- only global_exclusions is null/empty

                when (event_exclusions is null or trim(event_exclusions) = '')
                then trim(global_exclusions) -- only event_exclusions is null/empty

                else concat(trim(global_exclusions), ',', trim(event_exclusions))
              end,
            ','  -- split on commas
            )
          )
        ) as event_param,
        -- user_properties => exclude (global + USER)
       array(
        select as struct up.*
        from unnest(user_properties) as up
          where up.key not in unnest(
            split(
              case
                when (global_exclusions is null or trim(global_exclusions) = '')
                  and (user_exclusions is null or trim(user_exclusions) = '')
                then ''  -- both are null/empty => exclude nothing

                when (global_exclusions is null or trim(global_exclusions) = '')
                then trim(user_exclusions)  -- only global_exclusions is null/empty

                when (user_exclusions is null or trim(user_exclusions) = '')
                then trim(global_exclusions) -- only user_exclusions is null/empty

                else concat(trim(global_exclusions), ',', trim(user_exclusions))
              end,
            ','  -- split on commas
            )
          )
        ) as user_properties
      from `your-project.analytics_XXX.events_intraday_*`
      where _table_suffix = format_date('%Y%m%d', current_date())
        and event_name not in unnest(split(excluded_events, ', '));
    end if;

    -- If yesterday's events_* table doesn't exist, query yesterday's events_intraday_* table
    if not yesterday_events_exists then
      if events_intraday_exists then
        insert into AllEvents
        select
          parse_date('%Y%m%d', event_date) as event_date,
          event_name,
          platform,
          items,
          array(
            select as struct ep.*
            from unnest(event_params) as ep
            where ep.key not in unnest(
              split(
                case
                  when (global_exclusions is null or trim(global_exclusions) = '')
                    and (event_exclusions is null or trim(event_exclusions) = '')
                  then ''  -- both are null/empty => exclude nothing

                  when (global_exclusions is null or trim(global_exclusions) = '')
                  then trim(event_exclusions)  -- only global_exclusions is null/empty

                  when (event_exclusions is null or trim(event_exclusions) = '')
                  then trim(global_exclusions) -- only event_exclusions is null/empty

                  else concat(trim(global_exclusions), ',', trim(event_exclusions))
                end,
              ','  -- split on commas
              )
            )
          ) as event_param,
          -- user_properties => exclude (global + USER)
          array(
            select as struct up.*
            from unnest(user_properties) as up
             where up.key not in unnest(
              split(
                case
                  when (global_exclusions is null or trim(global_exclusions) = '')
                    and (user_exclusions is null or trim(user_exclusions) = '')
                  then ''  -- both are null/empty => exclude nothing

                  when (global_exclusions is null or trim(global_exclusions) = '')
                  then trim(user_exclusions)  -- only global_exclusions is null/empty

                  when (user_exclusions is null or trim(user_exclusions) = '')
                  then trim(global_exclusions) -- only user_exclusions is null/empty

                  else concat(trim(global_exclusions), ',', trim(user_exclusions))
                end,
              ','  -- split on commas
              )
            )
          ) as user_properties
        from `your-project.analytics_XXX.events_intraday_*`
        where _table_suffix = format_date('%Y%m%d', date_sub(current_date(), interval 1 day))
          and event_name not in unnest(split(excluded_events, ', '));
      end if;
    end if;
  end if;
end;

create temp table TempPreparedParameterData as
with 
  DocumentationEvents as (
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

  ProcessedItems as (
    select distinct
      event_name,
      event_date,
      platform,
      item_id,
      item_name,
      item_brand,
      item_variant,
      item_category,
      item_category2,
      item_category3,
      item_category4,
      item_category5,
      price,
      quantity,
      coupon,
      affiliation,
      location_id,
      item_list_id,
      item_list_name,
      item_list_index,
      promotion_id,
      promotion_name,
      creative_name,
      creative_slot
    from (
      select
        event_name,
        event_date,
        platform,
        items.*
      from AllEvents
      cross join unnest(items) as items
      where event_name in (
        select trim(event)
        from unnest(split(ecommerce_events, ',')) as event
      )
    )
  ),

  ItemStandardParameters as (
    select ['item_id',
      'item_name',
      'item_brand',
      'item_variant',
      'item_category',
      'item_category2',
      'item_category3',
      'item_category4',
      'item_category5',
      'price',
      'quantity',
      'coupon',
      'affiliation',
      'location_id',
      'item_list_id',
      'item_list_name',
      'item_list_index',
      'promotion_id',
      'promotion_name',
      'creative_name',
      'creative_slot'] as item_standard_parameters
  ),

  ParameterCounts as (
  -- Query for event_params
    select 
      event_date,
      event_params.key as parameter_name,
      'EVENT' as scope,
      event_name,
      platform,
      count(event_params.key) as count
    from 
      AllEvents
    cross join unnest(event_params) as event_params
    group by event_params.key, event_name, event_date, platform

    -- Query for user_properties
    union all
    -- Query for user_properties
    select 
      event_date,
      user_properties.key as parameter_name,
      'USER' as scope,
      event_name,
      platform,
      count(user_properties.key) as count
    from 
      AllEvents
    cross join unnest(user_properties) as user_properties
    group by user_properties.key, event_name, event_date, platform

    -- ***** ECOMMERCE *****
    -- Ecommerce Event Data can be found in event_params.key, so we don't have to run specific queries for transaction_id etc.

   -- Query for item_params.key (Item scoped Custom Dimensions)
    union all
    select
      event_date,
      item_params.key as parameter_name,
      'ITEM' as scope,
      event_name,
      platform,
      count(item_params.key) as count
    from 
      AllEvents
    cross join unnest(items) as items  -- Unnesting items
    cross join unnest(items.item_params) as item_params
    where item_params.key not in unnest(
      split(
        case
          when (global_exclusions is null or trim(global_exclusions) = '')
           and (item_exclusions is null or trim(item_exclusions) = '')
        then ''  -- both null/empty => excludes nothing

        when (global_exclusions is null or trim(global_exclusions) = '')
        then trim(item_exclusions)  -- only global is empty

        when (item_exclusions is null or trim(item_exclusions) = '')
        then trim(global_exclusions) -- only item_exclusions is empty

        else concat(trim(global_exclusions), ',', trim(item_exclusions))
        end,
      ','  -- split on commas
      )
    )
    group by item_params.key, event_name, event_date, platform
  
    -- Standard ITEMS
    union all
    select
      pi.event_date,
      parameter_name,
      'ITEM' as scope,
      pi.event_name,
      pi.platform,
      countif(
        (parameter_name = 'item_id' and pi.item_id is not null and trim(cast(pi.item_id as string)) != '(not set)') or
        (parameter_name = 'item_name' and pi.item_name is not null and trim(cast(pi.item_name as string)) != '(not set)') or
        (parameter_name = 'item_variant' and pi.item_brand is not null and trim(cast(pi.item_variant as string)) != '(not set)') or
        (parameter_name = 'item_brand' and pi.item_brand is not null and trim(cast(pi.item_brand as string)) != '(not set)') or
        (parameter_name = 'item_category' and pi.item_category is not null and trim(cast(pi.item_category as string)) != '(not set)') or
        (parameter_name = 'item_category2' and pi.item_category2 is not null and trim(cast(pi.item_category2 as string)) != '(not set)') or
        (parameter_name = 'item_category3' and pi.item_category3 is not null and trim(cast(pi.item_category3 as string)) != '(not set)') or
        (parameter_name = 'item_category4' and pi.item_category4 is not null and trim(cast(pi.item_category4 as string)) != '(not set)') or
        (parameter_name = 'item_category5' and pi.item_category5 is not null and trim(cast(pi.item_category5 as string)) != '(not set)') or
        (parameter_name = 'price' and pi.price is not null and trim(cast(pi.price as string)) != '(not set)') or
        (parameter_name = 'quantity' and pi.quantity is not null and trim(cast(pi.quantity as string)) != '(not set)') or
        (parameter_name = 'coupon' and pi.coupon is not null and trim(cast(pi.coupon as string)) != '(not set)') or
        (parameter_name = 'affiliation' and pi.affiliation is not null and trim(cast(pi.affiliation as string)) != '(not set)') or
        (parameter_name = 'location_id' and pi.location_id is not null and trim(cast(pi.location_id as string)) != '(not set)') or
        (parameter_name = 'item_list_id' and pi.item_list_id is not null and trim(cast(pi.item_list_id as string)) != '(not set)') or
        (parameter_name = 'item_list_name' and pi.item_list_name is not null and trim(cast(pi.item_list_name as string)) != '(not set)') or
        (parameter_name = 'item_list_index' and pi.item_list_index is not null and trim(cast(pi.item_list_index as string)) != '(not set)') or
        (parameter_name = 'promotion_id' and pi.promotion_id is not null and trim(cast(pi.promotion_id as string)) != '(not set)') or
        (parameter_name = 'promotion_name' and pi.promotion_name is not null and trim(cast(pi.promotion_name as string)) != '(not set)') or
        (parameter_name = 'creative_name' and pi.creative_name is not null and trim(cast(pi.creative_name as string)) != '(not set)') or
        (parameter_name = 'creative_slot' and pi.creative_slot is not null and trim(cast(pi.creative_slot as string)) != '(not set)')
      ) as count
    from ProcessedItems as pi
    cross join ItemStandardParameters as isp
    cross join unnest(isp.item_standard_parameters) as parameter_name
    group by pi.event_date, parameter_name, pi.event_name, pi.platform
  ),

  GlobalParams as (
    select distinct parameter_name, scope
    from DocumentationEvents
    where event_name = 'ga4_config'
  ),

  AllEventNames as (
    select distinct event_name
    from ParameterCounts
  ),

  GlobalParamsExpanded as (
    select aen.event_name, gp.parameter_name, gp.scope
    from AllEventNames aen
    cross join GlobalParams gp
  ),

  DocumentationEventsFinal as (
    -- All normal documentation events (excluding ga4_config)
    select event_name, parameter_name, scope
    from DocumentationEvents
    where event_name != 'ga4_config'

    union distinct

    -- Global parameters expanded to all event names
    select event_name, parameter_name, scope
    from GlobalParamsExpanded
  ),


Count as (
  select
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
    min(case when pc.platform = 'IOS' and pc.count > 0 then pc.event_date else null end) as parameter_first_seen_date_ios_calculated
  from DocumentationEventsFinal def
  full join ParameterCounts pc
    on def.event_name = pc.event_name
    and def.parameter_name = pc.parameter_name
    and def.scope = pc.scope
  left join GlobalParams gp
    on gp.parameter_name = coalesce(def.parameter_name, pc.parameter_name)
    and gp.scope = coalesce(def.scope, pc.scope)
  group by event_date, event_name, parameter_name, parameter_scope, ga4_config_parameter
),

PreparedData as (
  select distinct
    event_date,
    event_name,
    gd.parameter_group,
    gd.parameter_display_name,
    coalesce(c.parameter_name, gd.parameter_name) as parameter_name,
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
    ga4_config_parameter,
    coalesce(gd.parameter_web, platform_web) as platform_web,
    coalesce(gd.parameter_android, platform_android) as platform_android,
    coalesce(gd.parameter_ios, platform_ios) as platform_ios,
    -- Aggregate platform-specific counts into single row
    sum(parameter_count_total) as parameter_count_total,
    sum(parameter_count_web) as parameter_count_web,
    sum(parameter_count_android) as parameter_count_android,
    sum(parameter_count_ios) as parameter_count_ios,
    max(parameter_last_seen_date_total) as parameter_last_seen_date_total,
    max(parameter_last_seen_date_web) as parameter_last_seen_date_web,
    max(parameter_last_seen_date_android) as parameter_last_seen_date_android,
    max(parameter_last_seen_date_ios) as parameter_last_seen_date_ios,
    min(parameter_first_seen_date_total_calculated) as parameter_first_seen_date_total,
    min(parameter_first_seen_date_web_calculated) as parameter_first_seen_date_web,
    min(parameter_first_seen_date_android_calculated) as parameter_first_seen_date_android,
    min(parameter_first_seen_date_ios_calculated) as parameter_first_seen_date_ios
from
  Count c
  full join your-project.analytics_XXX.ga4_documentation_parameters gd on gd.parameter_name = c.parameter_name and gd.parameter_scope = c.parameter_scope
where
  (
    -- Parameter has counts on at least one documented/collected platform
    ((platform_web = true or platform_android = true or platform_ios = true) and parameter_count_total > 0)
  )
  or
  (
    (gd.parameter_web = true or gd.parameter_ios  = true or gd.parameter_android = true)
    and parameter_count_total = 0
    and parameter_display_name is not null
  )
group by
  event_date,
  event_name,
  gd.parameter_group,
  gd.parameter_display_name,
  parameter_name,
  parameter_scope,
  platform_web,
  platform_ios,
  platform_android,
  gd.parameter_type,
  gd.parameter_format,
  gd.parameter_disallow_ads_personalization,
  gd.parameter_example_value,
  gd.parameter_description,
  gd.parameter_gtm_comment,
  ga4_config_parameter,
  gd.parameter_web,
  gd.parameter_ios,
  gd.parameter_android
),

ParameterClassification as (
  select
    parameter_name,
    parameter_scope,
    -- Now do the classification logic on aggregated data:
    case
      when max(parameter_display_name) is not null
           and sum(parameter_count_total) > 0
      then 'Documented and Data'

      when max(parameter_display_name) is null
           and sum(parameter_count_total) > 0
      then 'Not Documented'

      else 'Documented no Data'
    end as parameter_documentation_status_aggregated
  from PreparedData
  group by parameter_name, parameter_scope
),

ResolvedFirstSeen as (
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
select distinct
  pd.event_date,
  max(pd.event_name) as event_name,
  max(pd.parameter_group) as parameter_group,
  max(pd.parameter_display_name) as parameter_display_name,
  max(pd.parameter_name) as parameter_name,
  max(pd.parameter_scope) as parameter_scope,
  max(pd.parameter_type) as parameter_type,
  max(pd.parameter_format) as parameter_format,
  max(pd.parameter_disallow_ads_personalization) as parameter_disallow_ads_personalization,
  max(pd.parameter_example_value) as parameter_example_value,
  max(pd.parameter_description) as parameter_description,
  max(pd.parameter_gtm_comment) as parameter_gtm_comment,
  max(pd.ga4_config_parameter) as ga4_config_parameter,
  sum(pd.parameter_count_total) as parameter_count_total,
  sum(pd.parameter_count_web) as parameter_count_web,
  sum(pd.parameter_count_android) as parameter_count_android,
  sum(pd.parameter_count_ios) as parameter_count_ios,
  max(pd.platform_web) as platform_web,
  max(pd.platform_android) as platform_android,
  max(pd.platform_ios) as platform_ios,
  coalesce(max(pd.parameter_last_seen_date_total), max(rf.parameter_last_seen_date_total)) as parameter_last_seen_date_total,
  coalesce(max(pd.parameter_last_seen_date_web), max(rf.parameter_last_seen_date_web)) as parameter_last_seen_date_web,
  coalesce(max(pd.parameter_last_seen_date_android), max(rf.parameter_last_seen_date_android)) as parameter_last_seen_date_android,
  coalesce(max(pd.parameter_last_seen_date_ios), max(rf.parameter_last_seen_date_ios)) as parameter_last_seen_date_ios,
  coalesce(min(rf.parameter_first_seen_date_total), min(pd.parameter_first_seen_date_total)) as parameter_first_seen_date_total,
  coalesce(min(rf.parameter_first_seen_date_web), min(pd.parameter_first_seen_date_web)) as parameter_first_seen_date_web,
  coalesce(min(rf.parameter_first_seen_date_android), min(pd.parameter_first_seen_date_android)) as parameter_first_seen_date_android,
  coalesce(min(rf.parameter_first_seen_date_ios), min(pd.parameter_first_seen_date_ios)) as parameter_first_seen_date_ios,
  max(pc_agg.parameter_documentation_status_aggregated) as parameter_documentation_status_aggregated
from
    your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status pc
    right join PreparedData pd 
      on pd.event_name = pc.event_name 
      and pd.parameter_name = pc.parameter_name 
      and pd.parameter_scope = pc.parameter_scope
    left join ParameterClassification pc_agg
        on pd.parameter_name = pc_agg.parameter_name
        and pd.parameter_scope = pc_agg.parameter_scope
    left join ResolvedFirstSeen rf
      on pd.parameter_name = rf.parameter_name 
      and pd.parameter_scope = rf.parameter_scope 
      and pd.event_name = rf.event_name

group by 
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
  pd.platform_web,
  pd.platform_android,
  pd.platform_ios,
  pd.parameter_gtm_comment,
  pd.ga4_config_parameter;

  
merge into `your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status` as target
using (
  select distinct
    event_name,
    parameter_name,
    parameter_scope,
    parameter_display_name,
    max(parameter_group) as parameter_group,
    max(parameter_type) as parameter_type,
    max(parameter_format) as parameter_format,
    max(parameter_disallow_ads_personalization) as parameter_disallow_ads_personalization,
    max(parameter_example_value) as parameter_example_value,
    max(parameter_description) as parameter_description,
    max(parameter_gtm_comment) as parameter_gtm_comment,
    max(ga4_config_parameter) as ga4_config_parameter,
    sum(parameter_count_total) as parameter_count_total,
    sum(parameter_count_web) as parameter_count_web,
    sum(parameter_count_android) as parameter_count_android,
    sum(parameter_count_ios) as parameter_count_ios,
    max(platform_web) as platform_web,
    max(platform_android) as platform_android,
    max(platform_ios) as platform_ios,
    max(parameter_last_seen_date_total) as parameter_last_seen_date_total,
    max(parameter_last_seen_date_web) as parameter_last_seen_date_web,
    max(parameter_last_seen_date_android) as parameter_last_seen_date_android,
    max(parameter_last_seen_date_ios) as parameter_last_seen_date_ios,
    min(parameter_first_seen_date_total) as parameter_first_seen_date_total,
    min(parameter_first_seen_date_web) as parameter_first_seen_date_web,
    min(parameter_first_seen_date_android) as parameter_first_seen_date_android,
    min(parameter_first_seen_date_ios) as parameter_first_seen_date_ios,
    case
      when parameter_display_name is not null
        and sum(parameter_count_total) > 0
      then 'Documented and Data'
    
      when parameter_display_name is null
        and sum(parameter_count_total) > 0
      then 'Not Documented'
    
     when parameter_display_name is not null
        and sum(parameter_count_total) = 0
      then 'Documented no Data'
    end as parameter_documentation_status,
    max(parameter_documentation_status_aggregated) as parameter_documentation_status_aggregated
  from TempPreparedParameterData
  group by event_name, parameter_name, parameter_scope, parameter_display_name
) as source
on target.event_name = source.event_name 
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
    target.parameter_first_seen_date_total = case 
      when target.parameter_first_seen_date_total is null 
        and source.parameter_first_seen_date_total is not null 
      then source.parameter_first_seen_date_total
      else target.parameter_first_seen_date_total
    end,
    target.parameter_first_seen_date_web = case 
      when target.parameter_first_seen_date_web is null 
        and source.parameter_first_seen_date_web is not null 
      then source.parameter_first_seen_date_web
      else target.parameter_first_seen_date_web
    end,
    target.parameter_first_seen_date_android = case 
      when target.parameter_first_seen_date_android is null 
        and source.parameter_first_seen_date_android is not null 
      then source.parameter_first_seen_date_android
      else target.parameter_first_seen_date_android
    end,
    target.parameter_first_seen_date_ios = case 
      when target.parameter_first_seen_date_ios is null 
        and source.parameter_first_seen_date_ios is not null 
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

delete from `your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status` as target
where not exists (
    select 1
    from TempPreparedParameterData as source
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

-- Delete old rows within the specified range
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
    TempPreparedParameterData,
    unnest(generate_array(0, day_interval)) as day_offset
  where event_name != 'ga4_config' -- Exclude unwanted event_name
) as date_parameter_combinations
left join (
  -- Ensure TempPreparedParameterData has unique rows and exclude unwanted event_name
  select
    event_date,
    parameter_name,
    parameter_scope,
    event_name,
    max(parameter_count_total) as parameter_count_total,
    max(parameter_count_web) as parameter_count_web,
    max(parameter_count_android) as parameter_count_android,
    max(parameter_count_ios) as parameter_count_ios
  from TempPreparedParameterData
  where event_name != 'ga4_config' -- Exclude unwanted event_name
  group by event_date, parameter_name, parameter_scope, event_name
) as unique_parameters using (parameter_name, parameter_scope, event_name, event_date)
group by event_date, parameter_name, parameter_scope, event_name
order by event_date desc;

 --**** DELETE and CLEAN UP DATA ****
-- Delete parameter count data older than 365 days
delete from `your-project.analytics_XXX.ga4_documentation_parameters_daily_counts`
where event_date < date_sub(current_date(), interval delete_parameter_count_after_days day);
