-- Auto-calculate pipeline revenue from status
-- Replicates Google Sheet VLOOKUP and revenue formulas

-- Step 1: Create function to get progress from status (VLOOKUP)
CREATE OR REPLACE FUNCTION get_progress_from_status(status_code TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE status_code
    WHEN '【S】' THEN 100
    WHEN '【S-】' THEN 100
    WHEN '【A】' THEN 80
    WHEN '【B】' THEN 60
    WHEN '【C+】' THEN 50
    WHEN '【C】' THEN 30
    WHEN '【C-】' THEN 5
    WHEN '【D】' THEN 100
    WHEN '【E】' THEN 0
    ELSE 50 -- Default
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Create function to auto-calculate max_gross, day_gross, day_net_rev
CREATE OR REPLACE FUNCTION auto_calculate_daily_revenue()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate max_gross from imp and ecpm
  IF NEW.imp IS NOT NULL AND NEW.ecpm IS NOT NULL THEN
    NEW.max_gross := (NEW.imp / 1000.0) * NEW.ecpm;
  ELSE
    NEW.max_gross := NULL;
  END IF;

  -- Calculate day_gross from max_gross
  IF NEW.max_gross IS NOT NULL THEN
    NEW.day_gross := NEW.max_gross / 30.0;
  ELSE
    NEW.day_gross := NULL;
  END IF;

  -- Calculate day_net_rev from day_gross and revenue_share
  -- revenue_share is stored as decimal (0.20 = 20%, not 0.002)
  IF NEW.day_gross IS NOT NULL AND NEW.revenue_share IS NOT NULL THEN
    NEW.day_net_rev := NEW.day_gross * NEW.revenue_share;
  ELSE
    NEW.day_net_rev := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create function to auto-calculate progress_percent from status
CREATE OR REPLACE FUNCTION auto_set_progress_from_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-set progress_percent based on status
  NEW.progress_percent := get_progress_from_status(NEW.status);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to auto-calculate daily revenue (runs FIRST)
DROP TRIGGER IF EXISTS trigger_auto_calculate_daily_revenue ON pipelines;
CREATE TRIGGER trigger_auto_calculate_daily_revenue
  BEFORE INSERT OR UPDATE ON pipelines
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_daily_revenue();

-- Step 5: Create trigger to auto-set progress on INSERT/UPDATE (runs SECOND)
DROP TRIGGER IF EXISTS trigger_auto_set_progress ON pipelines;
CREATE TRIGGER trigger_auto_set_progress
  BEFORE INSERT OR UPDATE ON pipelines
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_progress_from_status();

-- Step 6: Update ALL existing pipelines with correct calculated values
UPDATE pipelines
SET
  progress_percent = get_progress_from_status(status),
  max_gross = CASE
    WHEN imp IS NOT NULL AND ecpm IS NOT NULL THEN (imp / 1000.0) * ecpm
    ELSE NULL
  END,
  day_gross = CASE
    WHEN imp IS NOT NULL AND ecpm IS NOT NULL THEN ((imp / 1000.0) * ecpm) / 30.0
    ELSE NULL
  END,
  day_net_rev = CASE
    WHEN imp IS NOT NULL AND ecpm IS NOT NULL AND revenue_share IS NOT NULL
    THEN (((imp / 1000.0) * ecpm) / 30.0) * revenue_share
    ELSE NULL
  END;

-- Step 5: Create function to calculate delivery days for a month
CREATE OR REPLACE FUNCTION calculate_delivery_days(
  starting_date DATE,
  target_year INTEGER,
  target_month INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  month_start DATE;
  month_end DATE;
  days_in_month INTEGER;
BEGIN
  -- If no starting date, default to 30 days
  IF starting_date IS NULL THEN
    RETURN 30;
  END IF;

  -- Calculate month boundaries
  month_start := make_date(target_year, target_month, 1);
  month_end := (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  days_in_month := EXTRACT(DAY FROM month_end);

  -- If starting date is after month end, return 0
  IF starting_date > month_end THEN
    RETURN 0;
  END IF;

  -- If starting date is before month start, return full month
  IF starting_date <= month_start THEN
    RETURN days_in_month;
  END IF;

  -- Starting date is within the month
  RETURN days_in_month - EXTRACT(DAY FROM starting_date) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 6: Create function to get current quarter months
CREATE OR REPLACE FUNCTION get_current_quarter_months()
RETURNS TABLE(year INTEGER, month INTEGER) AS $$
DECLARE
  current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  fiscal_month INTEGER;
  quarter_start_month INTEGER;
  target_month INTEGER;
  target_year INTEGER;
BEGIN
  -- Determine fiscal month (Apr=4, May=5, ..., Mar=16)
  IF current_month >= 4 THEN
    fiscal_month := current_month;
  ELSE
    fiscal_month := current_month + 12;
  END IF;

  -- Calculate quarter start (4, 7, 10, or 13)
  quarter_start_month := FLOOR((fiscal_month - 4) / 3) * 3 + 4;

  -- Generate 3 months
  FOR i IN 0..2 LOOP
    target_month := quarter_start_month + i;
    target_year := current_year;

    -- Handle Q4 (Jan-Mar) crossing year boundary
    IF target_month > 12 THEN
      target_month := target_month - 12;
      target_year := target_year + 1;
    END IF;

    year := target_year;
    month := target_month;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 7: Create function to recalculate q_gross and q_net_rev for a pipeline
CREATE OR REPLACE FUNCTION recalculate_pipeline_quarterly(pipeline_id UUID)
RETURNS VOID AS $$
DECLARE
  pipeline RECORD;
  quarter_month RECORD;
  delivery_days INTEGER;
  gross_revenue NUMERIC;
  net_revenue NUMERIC;
  total_q_gross NUMERIC := 0;
  total_q_net NUMERIC := 0;
  progress_multiplier NUMERIC;
  is_zero_revenue BOOLEAN;
BEGIN
  -- Fetch pipeline
  SELECT * INTO pipeline FROM pipelines WHERE id = pipeline_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Check if zero revenue status
  is_zero_revenue := pipeline.status IN ('【D】', '【E】', '【F】');

  -- Get progress multiplier
  progress_multiplier := COALESCE(pipeline.progress_percent, 0) / 100.0;

  -- Delete old monthly forecasts
  DELETE FROM pipeline_monthly_forecast WHERE pipeline_monthly_forecast.pipeline_id = recalculate_pipeline_quarterly.pipeline_id;

  -- Calculate for each month in current quarter
  FOR quarter_month IN SELECT * FROM get_current_quarter_months() LOOP
    delivery_days := calculate_delivery_days(
      pipeline.starting_date,
      quarter_month.year,
      quarter_month.month
    );

    IF is_zero_revenue OR pipeline.day_gross IS NULL OR pipeline.day_net_rev IS NULL THEN
      gross_revenue := 0;
      net_revenue := 0;
    ELSE
      gross_revenue := pipeline.day_gross * progress_multiplier * delivery_days;
      net_revenue := pipeline.day_net_rev * progress_multiplier * delivery_days;
    END IF;

    total_q_gross := total_q_gross + gross_revenue;
    total_q_net := total_q_net + net_revenue;

    -- Insert monthly forecast
    INSERT INTO pipeline_monthly_forecast (
      pipeline_id,
      year,
      month,
      delivery_days,
      gross_revenue,
      net_revenue
    ) VALUES (
      recalculate_pipeline_quarterly.pipeline_id,
      quarter_month.year,
      quarter_month.month,
      delivery_days,
      ROUND(gross_revenue::NUMERIC, 2),
      ROUND(net_revenue::NUMERIC, 2)
    );
  END LOOP;

  -- Update pipeline q_gross and q_net_rev
  UPDATE pipelines
  SET
    q_gross = ROUND(total_q_gross::NUMERIC, 2),
    q_net_rev = ROUND(total_q_net::NUMERIC, 2)
  WHERE id = recalculate_pipeline_quarterly.pipeline_id;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to auto-recalculate on relevant changes
CREATE OR REPLACE FUNCTION trigger_recalculate_pipeline_revenue()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate when key fields change
  IF (TG_OP = 'INSERT') OR
     (OLD.status IS DISTINCT FROM NEW.status) OR
     (OLD.day_gross IS DISTINCT FROM NEW.day_gross) OR
     (OLD.day_net_rev IS DISTINCT FROM NEW.day_net_rev) OR
     (OLD.starting_date IS DISTINCT FROM NEW.starting_date) OR
     (OLD.progress_percent IS DISTINCT FROM NEW.progress_percent) THEN

    -- Recalculate quarterly revenue
    PERFORM recalculate_pipeline_quarterly(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_recalculate_revenue ON pipelines;
CREATE TRIGGER trigger_auto_recalculate_revenue
  AFTER INSERT OR UPDATE ON pipelines
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_pipeline_revenue();

-- Step 9: Recalculate ALL existing pipelines (one-time operation)
-- This will be done via a separate batch update to avoid timeout
