-- Add salary_amount to rooms table
alter table rooms add column salary_amount numeric not null default 200;
