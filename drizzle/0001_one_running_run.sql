CREATE UNIQUE INDEX IF NOT EXISTS "agent_runs_one_running" ON "agent_runs" USING btree ("agent") WHERE "agent_runs"."status" = 'running';
