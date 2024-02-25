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

-- Replace your-project.analytics_123 with your project and data set

-- Step 1: Create the table if not exists
create table if not exists `your-project.analytics_123.ga4_documentation_events_and_images` (
    event_name string,
    event_image_documentation string
);

-- Step 2: Delete existing data from the table
delete from `your-project.analytics_123.ga4_documentation_events_and_images` WHERE true;

-- Step 3: Insert new data into the table
insert into `your-project.analytics_123.ga4_documentation_events_and_images`
select 
  event_name,
  case -- Fix Google Drive Image URL so it can be used in ex. Looker Studio
  when event_image like 'https://drive.google.com/file/d/%' then
    concat('https://drive.google.com/uc?id=', 
      substring(event_image, INSTR(event_image, '/d/') + 3, instr(event_image, '/view') - (instr(event_image, '/d/') + 3)))
    else
    event_image
  end as event_image_documentation
from
  `your-project.analytics_123.ga4_documentation_events`,
  unnest(split(event_image_documentation)) as event_image
where
  event_image_documentation is not null and event_image_documentation != '';
