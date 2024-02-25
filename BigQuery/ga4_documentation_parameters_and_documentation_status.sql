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

create table if not exists `your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status` (
  event_name string,
  parameter_group string,
  parameter_display_name string,
  parameter_name string,
  parameter_scope string,
  parameter_type string,
  parameter_format string,
  parameter_disallow_ads_personalization bool,
  parameter_example_value string,
  parameter_description string,
  parameter_gtm_comment string,
  ga4_config_parameter bool,
  parameter_count_total int64,
  parameter_count_web int64,
  parameter_count_android int64,
  parameter_count_ios int64,
  event_website bool,
  event_ios_app bool,
  event_android_app bool,
  platform_web bool,
  platform_android bool,
  platform_ios bool,
  parameter_last_seen_date_total date,
  parameter_last_seen_date_web date,
  parameter_last_seen_date_android date,
  parameter_last_seen_date_ios date
);

create temp table TempPreparedData as
with DocumentationEvents as (
  select
    event_name,
    'ITEM' as scope,
    event_website,
    event_ios_app,
    event_android_app,
    event_item_parameter as parameter_name
    from 
      `your-project.analytics_XXX.ga4_documentation_events`,
      unnest(split(event_item_parameters)) as event_item_parameter
    where
      event_item_parameters is not null and event_item_parameters != ''
    
  union all

  select
    event_name,
    'EVENT' as scope, 
    event_website,
    event_ios_app,
    event_android_app,
    event_parameter as parameter_name
  from 
    `your-project.analytics_XXX.ga4_documentation_events`,
    unnest(split(event_parameters)) as event_parameter
  where
    event_parameters is not null and event_parameters != ''

  union all

  SELECT 
    event_name,
    'USER' as scope,
    event_website,
    event_ios_app,
    event_android_app,
    event_user_parameter as parameter_name
  from
    `your-project.analytics_XXX.ga4_documentation_events`,
    unnest(split(event_user_parameters)) as event_user_parameter
  where
    event_user_parameters is not null and event_user_parameters != ''
),

ParameterCounts as (

-- Query for event_params
select 
  event_params.key as parameter_name,
  count(event_params.key) as count,
  'EVENT' as scope,
  event_name,
  event_date,
  platform

from 
  `your-project.analytics_XXX.events_*` 
  cross join unnest(event_params) as event_params

where 
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())

  -- Exclude event parameters that aren't relevant for documentation.
  and event_params.key not in ('batch_ordering_id', 'batch_page_id', 'campaign', 'debug_mode', 'engaged_session_event', 'entrances', 'ga_session_id', 'ga_session_number', 'ignore_referrer', 'medium', 'page_title', 'session_engaged', 'source', 'term', 'content', 'traffic_type', 'unique_search_term', 'engagement_time_msec', 'page_referrer', 'dclid', 'gclsrc', 'gclid', 'campaign_id', 'prevenue_28d')
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by 
  event_params.key,
  event_name,
  event_date,
  platform

-- Query for user_properties
union all
select
  user_properties.key as parameter_name,
  count(user_properties.key) as count,
  'USER' as scope,
  event_name,
  event_date,
  platform

from
  `your-project.analytics_XXX.events_*` 
  cross join unnest(user_properties) as user_properties
   
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())

  -- Exclude user_properties parameters that aren't relevant for documentation.
  and user_properties.key not in ('prevenue_28d')
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')
    
group by 
  user_properties.key,
  event_name,
  event_date,
  platform

-- ***** ECOMMERCE *****
-- Ecommerce Event Data can be found in event_params.key, so we don't have to run specific queries for transaction_id etc.

-- Query for item_params.key (Item scoped Custom Dimensions)
union all
select
  item_params.key as parameter_name,
  count(item_params.key) as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform

from    
  `your-project.analytics_XXX.events_*`, 
  unnest(items) as items,
  unnest(items.item_params) as item_params
    
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by 
  item_params.key,
  event_name,
  event_date,
  platform
  
-- Standard ITEMS
-- Ecommerce part for item_name
union all
select
  'item_name' as parameter_name,
  countif(items.item_name is not null and trim(cast(items.item_name as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for item_id
union all
select
  'item_id' as parameter_name,
  countif(items.item_id is not null and trim(cast(items.item_id as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for item_brand
union all
select
  'item_brand' as parameter_name,
  countif(items.item_brand is not null and trim(cast(items.item_brand as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for item_variant
union all
select
  'item_variant' as parameter_name,
  countif(items.item_variant is not null and trim(cast(items.item_variant as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for item_category
union all
select
  'item_category' as parameter_name,
  countif(items.item_category is not null and trim(cast(items.item_category as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for item_category2
union all
select
  'item_category2' as parameter_name,
  countif(items.item_category2 is not null and trim(cast(items.item_category2 as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for item_category3
union all
select
  'item_category3' as parameter_name,
  countif(items.item_category3 is not null and trim(cast(items.item_category3 as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for item_category4
union all
select
  'item_category4' as parameter_name,
  countif(items.item_category4 is not null and trim(cast(items.item_category4 as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for item_category5
union all
select
  'item_category5' as parameter_name,
  countif(items.item_category5 is not null and trim(cast(items.item_category5 as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for price
union all
select
  'price' as parameter_name,
  countif(items.price is not null and trim(cast(items.price as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for quantity
union all
select
  'quantity' as parameter_name,
  countif(items.quantity is not null and trim(cast(items.quantity as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for coupon
union all
select
  'coupon' as parameter_name,
  countif(items.coupon is not null and trim(cast(items.coupon as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for affiliation
union all
select
  'affiliation' as parameter_name,
  countif(items.affiliation is not null and trim(cast(items.affiliation as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for location_id
union all
select
  'location_id' as parameter_name,
  countif(items.location_id is not null and trim(cast(items.location_id as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for item_list_id
union all
select
  'item_list_id' as parameter_name,
  countif(items.item_list_id is not null and trim(cast(items.item_list_id as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for item_list_name
union all
select
  'item_list_name' as parameter_name,
  countif(items.item_list_name is not null and trim(cast(items.item_list_name as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for item_list_index
union all
select
  'index' as parameter_name,
  countif(items.item_list_index is not null and trim(cast(items.item_list_index as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for promotion_id
union all
select
  'promotion_id' as parameter_name,
  countif(items.promotion_id is not null and trim(cast(items.promotion_id as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for promotion_name
union all
select
  'promotion_name' as parameter_name,
  countif(items.promotion_name is not null and trim(cast(items.promotion_name as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for creative_name
union all
select
  'creative_name' as parameter_name,
  countif(items.creative_name is not null and trim(cast(items.creative_name as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

-- Ecommerce part for creative_slot
union all
select
  'creative_slot' as parameter_name,
  countif(items.creative_slot is not null and trim(cast(items.creative_slot as string)) != '(not set)') as count,
  'ITEM' as scope,
  event_name,
  event_date,
  platform
from
  `your-project.analytics_XXX.events_*`,
  unnest(items) as items
where
  regexp_extract(_table_suffix, '[0-9]+') between format_date("%Y%m%d", date_sub(current_date(), interval 3 day))
  and format_date('%Y%m%d', current_date())
  and event_name not in ('session_start', 'first_visit', 'first_open', 'user_engagement')

group by
  parameter_name,
  event_name,
  event_date,
  platform

),

Count as (
select
  coalesce(pc.event_name, de.event_name) as event_name,
  coalesce(pc.scope, de.scope) as parameter_scope,
  coalesce(pc.parameter_name, de.parameter_name) as parameter_name,
  de.event_website,
  de.event_android_app,
  de.event_ios_app,
  case when platform = 'WEB' then true else false end as platform_web,
  case when platform = 'ANDROID' then true else false end as platform_android,
  case when platform = 'IOS' then true else false end as platform_ios,
  case 
    when de.event_name != 'ga4_config'
    then false
    else true
  end as ga4_config_parameter,
  platform,
  sum(case when pc.count is not null then pc.count else 0 end) as parameter_count_total,
  sum(case when platform = 'WEB' and pc.count is not null then pc.count else 0 end) as parameter_count_web,
  sum(case when platform = 'ANDROID' and pc.count is not null then pc.count else 0 end) as parameter_count_android,
  sum(case when platform = 'IOS' and pc.count is not null then pc.count else 0 end) as parameter_count_ios,
  max(cast(event_date as date format 'YYYYMMDD')) as parameter_last_seen_date_total,
  case when platform = 'WEB' then max(cast(event_date as date format 'YYYYMMDD')) end as parameter_last_seen_date_web,
  case when platform = 'ANDROID' then max(cast(event_date as date format 'YYYYMMDD')) end as parameter_last_seen_date_android,
  case when platform = 'IOS' then max(cast(event_date as date format 'YYYYMMDD')) end as parameter_last_seen_date_ios

from
  ParameterCounts pc
  full join DocumentationEvents de
  on de.event_name = pc.event_name and de.parameter_name = pc.parameter_name and de.scope = pc.scope

group by
  event_name,
  ga4_config_parameter,
  parameter_name,
  parameter_scope,
  de.event_website,
  de.event_android_app,
  de.event_ios_app,
  platform
),

PreparedData as (
select distinct
  event_name,
  gd.parameter_group,
  gd.parameter_display_name,
  coalesce(c.parameter_name, gd.parameter_name) as parameter_name,
  coalesce(c.parameter_scope, gd.parameter_scope) as parameter_scope,
  gd.parameter_type,
  gd.parameter_format,
  gd.parameter_disallow_ads_personalization,
  gd.parameter_example_value,
  gd.parameter_description,
  gd.parameter_gtm_comment,
  case 
    when ga4_config_parameter is true and parameter_display_name is null
    then false
    else ga4_config_parameter
  end as ga4_config_parameter,
  parameter_count_total,
  parameter_count_web,
  parameter_count_android,
  parameter_count_ios,
  event_website,
  event_ios_app,
  event_android_app,
  platform_web,
  platform_android,
  platform_ios,
  parameter_last_seen_date_total,
  parameter_last_seen_date_web,
  parameter_last_seen_date_android,
  parameter_last_seen_date_ios

from
  Count c
  full join `your-project.analytics_XXX.ga4_documentation_parameters` gd on gd.parameter_name = c.parameter_name and gd.parameter_scope = c.parameter_scope

where
  event_name not in ('ga4_config')
  and (parameter_display_name is not null)
  or (platform is not null and parameter_count_total > 0)
)
select distinct
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
  pd.parameter_count_total,
  pd.parameter_count_web,
  pd.parameter_count_android,
  pd.parameter_count_ios,
  pd.event_website,
  pd.event_ios_app,
  pd.event_android_app,
  pd.platform_web,
  pd.platform_android,
  pd.platform_ios,
  coalesce(pd.parameter_last_seen_date_total, pc.parameter_last_seen_date_total) as parameter_last_seen_date_total,
  coalesce(pd.parameter_last_seen_date_web, pc.parameter_last_seen_date_web) as parameter_last_seen_date_web,
  coalesce(pd.parameter_last_seen_date_android, pc.parameter_last_seen_date_android) as parameter_last_seen_date_android,
  coalesce(pd.parameter_last_seen_date_ios, pc.parameter_last_seen_date_ios) as parameter_last_seen_date_ios
from
    `your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status` pc
    left join PreparedData pd on pd.event_name = pc.event_name and pd.parameter_name = pc.parameter_name and pd.parameter_scope = pc.parameter_scope
;

merge into `your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status` as target
using TempPreparedData as source
on target.event_name = source.event_name and target.parameter_name = source.parameter_name and target.parameter_scope = source.parameter_scope

when matched then
  update set
    event_name = source.event_name,
    parameter_group = source.parameter_group,
    parameter_display_name = source.parameter_display_name,
    parameter_name = source.parameter_name,
    parameter_scope = source.parameter_scope,
    parameter_type = source.parameter_type,
    parameter_format = source.parameter_format,
    parameter_disallow_ads_personalization = source.parameter_disallow_ads_personalization,
    parameter_example_value = source.parameter_example_value,
    parameter_description = source.parameter_description,
    parameter_gtm_comment = source.parameter_gtm_comment,
    ga4_config_parameter = source.ga4_config_parameter,
    parameter_count_total = source.parameter_count_total,
    parameter_count_web = source.parameter_count_web,
    parameter_count_android = source.parameter_count_android,
    parameter_count_ios = source.parameter_count_ios,
    event_website = source.event_website,
    event_ios_app = source.event_ios_app,
    event_android_app = source.event_android_app,
    platform_web = source.platform_web,
    platform_android = source.platform_android,
    platform_ios = source.platform_ios,
    parameter_last_seen_date_total = source.parameter_last_seen_date_total,
    parameter_last_seen_date_web = source.parameter_last_seen_date_web,
    parameter_last_seen_date_android = source.parameter_last_seen_date_android,
    parameter_last_seen_date_ios = source.parameter_last_seen_date_ios

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
      event_website,
      event_ios_app,
      event_android_app,
      platform_web,
      platform_android,
      platform_ios,
      parameter_last_seen_date_total,
      parameter_last_seen_date_web,
      parameter_last_seen_date_android,
      parameter_last_seen_date_ios)

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
      source.event_website,
      source.event_ios_app,
      source.event_android_app,
      source.platform_web,
      source.platform_android,
      source.platform_ios,
      source.parameter_last_seen_date_total,
      source.parameter_last_seen_date_web,
      source.parameter_last_seen_date_android,
      source.parameter_last_seen_date_ios);

delete from `your-project.analytics_XXX.ga4_documentation_parameters_and_documentation_status` as target
where not exists (
    select 1
    from TempPreparedData as source
    where target.event_name = source.event_name and target.parameter_name = source.parameter_name and target.parameter_scope = source.parameter_scope
);
