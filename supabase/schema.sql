-- Income sources table
create table income (
  id uuid primary key default uuid_generate_v4(),
  amount numeric(10,2) not null,
  source text not null,           -- e.g. "Client Payment - Car wash franchise"
  category text not null check (category in ('Client','Investment','Grant','Loan','Revenue','Other')),
  received_by text not null,      -- Sourabh / Asher / Subin
  payment_method text not null check (payment_method in ('Cash','UPI','Card','Bank transfer')),
  income_date timestamptz default now(),
  notes text,
  created_at timestamptz default now()
);

alter publication supabase_realtime add table income;
