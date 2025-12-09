-- Add note column to Term table
alter table public."Term" add column note text;

-- Remove usage column from Translation table
alter table public."Translation" drop column usage;
