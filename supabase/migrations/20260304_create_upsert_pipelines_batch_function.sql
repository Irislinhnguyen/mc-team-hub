-- ========================================
-- Create UPSERT RPC Function for Batch Pipeline Operations
-- ========================================
-- Purpose: Allow efficient batch upsert of pipelines from sync process
-- Handles both INSERT (new pipelines) and UPDATE (existing pipelines)
-- Bypasses PostgREST schema cache issues

CREATE OR REPLACE FUNCTION upsert_pipelines_batch(
  pipelines_array JSONB
)
RETURNS TABLE (
  id UUID,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pipeline_record JSONB;
  pipeline_id UUID;
  existing_id UUID;
  result_record RECORD;
BEGIN
  -- Create temporary table to store results
  CREATE TEMPORARY TABLE IF NOT EXISTS batch_results (
    id UUID,
    success BOOLEAN,
    error_message TEXT
  );

  -- Clear previous results
  TRUNCATE TABLE batch_results;

  -- Process each pipeline in the array
  FOR pipeline_record IN SELECT * FROM jsonb_array_elements(pipelines_array)
  LOOP
    BEGIN
      -- Extract fields from JSON
      -- Check if this is an UPDATE (has id) or INSERT (no id)
      pipeline_id := (pipeline_record->>'id');

      IF pipeline_id IS NOT NULL THEN
        -- UPDATE: Check if pipeline exists
        SELECT id INTO existing_id
        FROM pipelines
        WHERE id = pipeline_id;

        IF existing_id IS NOT NULL THEN
          -- Update existing pipeline
          UPDATE pipelines
          SET
            user_id = COALESCE((pipeline_record->>'user_id')::UUID, user_id),
            key = (pipeline_record->>'key'),
            name = (pipeline_record->>'name'),
            description = (pipeline_record->>'description'),
            fiscal_year = (pipeline_record->>'fiscal_year')::INTEGER,
            fiscal_quarter = (pipeline_record->>'fiscal_quarter')::INTEGER,
            "group" = (pipeline_record->>'group'),
            quarterly_sheet_id = (pipeline_record->>'quarterly_sheet_id')::UUID,
            sheet_row_number = (pipeline_record->>'sheet_row_number')::INTEGER,

            -- Basic Info
            classification = (pipeline_record->>'classification'),
            poc = (pipeline_record->>'poc'),
            team = (pipeline_record->>'team'),
            pid = (pipeline_record->>'pid'),
            publisher = (pipeline_record->>'publisher'),
            mid = (pipeline_record->>'mid'),
            medianame = (pipeline_record->>'medianame'),
            domain = (pipeline_record->>'domain'),
            channel = (pipeline_record->>'channel'),
            region = (pipeline_record->>'region'),
            product = (pipeline_record->>'product'),
            affected_zones = (pipeline_record->>'affected_zones')::TEXT[],

            -- Revenue Metrics
            imp = (pipeline_record->>'imp')::BIGINT,
            ecpm = (pipeline_record->>'ecpm')::DECIMAL(10,4),
            max_gross = (pipeline_record->>'max_gross')::DECIMAL(15,2),
            revenue_share = (pipeline_record->>'revenue_share')::DECIMAL(5,2),
            day_gross = (pipeline_record->>'day_gross')::DECIMAL(15,2),
            day_net_rev = (pipeline_record->>'day_net_rev')::DECIMAL(15,2),
            q_gross = (pipeline_record->>'q_gross')::DECIMAL(15,2),
            q_net_rev = (pipeline_record->>'q_net_rev')::DECIMAL(15,2),

            -- Status & Timeline
            status = (pipeline_record->>'status'),
            progress_percent = (pipeline_record->>'progress_percent')::INTEGER,
            starting_date = (pipeline_record->>'starting_date')::DATE,
            end_date = (pipeline_record->>'end_date')::DATE,
            proposal_date = (pipeline_record->>'proposal_date')::DATE,
            interested_date = (pipeline_record->>'interested_date')::DATE,
            acceptance_date = (pipeline_record->>'acceptance_date')::DATE,
            ready_to_deliver_date = (pipeline_record->>'ready_to_deliver_date')::DATE,
            actual_starting_date = (pipeline_record->>'actual_starting_date')::DATE,
            close_won_date = (pipeline_record->>'close_won_date')::DATE,
            closed_date = (pipeline_record->>'closed_date')::DATE,

            -- S- confirmation
            s_confirmation_status = (pipeline_record->>'s_confirmation_status'),
            s_confirmed_at = (pipeline_record->>'s_confirmed_at')::TIMESTAMPTZ,
            s_declined_at = (pipeline_record->>'s_declined_at')::TIMESTAMPTZ,
            s_confirmation_notes = (pipeline_record->>'s_confirmation_notes'),

            -- Action Tracking
            action_date = (pipeline_record->>'action_date')::DATE,
            next_action = (pipeline_record->>'next_action'),
            action_detail = (pipeline_record->>'action_detail'),
            action_progress = (pipeline_record->>'action_progress'),

            -- Other
            forecast_type = (pipeline_record->>'forecast_type'),
            competitors = (pipeline_record->>'competitors'),
            metadata = COALESCE(pipeline_record->>'metadata', '{}'::JSONB)::JSONB,

            -- Audit fields
            updated_at = NOW()
          WHERE id = pipeline_id;

          INSERT INTO batch_results (id, success, error_message)
          VALUES (pipeline_id, TRUE, NULL);

        ELSE
          -- Pipeline ID provided but doesn't exist - treat as error
          INSERT INTO batch_results (id, success, error_message)
          VALUES (pipeline_id, FALSE, 'Pipeline not found');
        END IF;

      ELSE
        -- INSERT: Create new pipeline
        INSERT INTO pipelines (
          user_id,
          key,
          name,
          description,
          fiscal_year,
          fiscal_quarter,
          "group",
          quarterly_sheet_id,
          sheet_row_number,

          -- Basic Info
          classification,
          poc,
          team,
          pid,
          publisher,
          mid,
          medianame,
          domain,
          channel,
          region,
          product,
          affected_zones,

          -- Revenue Metrics
          imp,
          ecpm,
          max_gross,
          revenue_share,
          day_gross,
          day_net_rev,
          q_gross,
          q_net_rev,

          -- Status & Timeline
          status,
          progress_percent,
          starting_date,
          end_date,
          proposal_date,
          interested_date,
          acceptance_date,
          ready_to_deliver_date,
          actual_starting_date,
          close_won_date,
          closed_date,

          -- S- confirmation
          s_confirmation_status,
          s_confirmed_at,
          s_declined_at,
          s_confirmation_notes,

          -- Action Tracking
          action_date,
          next_action,
          action_detail,
          action_progress,

          -- Other
          forecast_type,
          competitors,
          metadata,

          -- Audit fields
          created_by,
          updated_by
        )
        VALUES (
          (pipeline_record->>'user_id')::UUID,
          (pipeline_record->>'key'),
          (pipeline_record->>'name'),
          (pipeline_record->>'description'),
          (pipeline_record->>'fiscal_year')::INTEGER,
          (pipeline_record->>'fiscal_quarter')::INTEGER,
          (pipeline_record->>'group'),
          (pipeline_record->>'quarterly_sheet_id')::UUID,
          (pipeline_record->>'sheet_row_number')::INTEGER,

          -- Basic Info
          (pipeline_record->>'classification'),
          (pipeline_record->>'poc'),
          (pipeline_record->>'team'),
          (pipeline_record->>'pid'),
          (pipeline_record->>'publisher'),
          (pipeline_record->>'mid'),
          (pipeline_record->>'medianame'),
          (pipeline_record->>'domain'),
          (pipeline_record->>'channel'),
          (pipeline_record->>'region'),
          (pipeline_record->>'product'),
          (pipeline_record->>'affected_zones')::TEXT[],

          -- Revenue Metrics
          (pipeline_record->>'imp')::BIGINT,
          (pipeline_record->>'ecpm')::DECIMAL(10,4),
          (pipeline_record->>'max_gross')::DECIMAL(15,2),
          (pipeline_record->>'revenue_share')::DECIMAL(5,2),
          (pipeline_record->>'day_gross')::DECIMAL(15,2),
          (pipeline_record->>'day_net_rev')::DECIMAL(15,2),
          (pipeline_record->>'q_gross')::DECIMAL(15,2),
          (pipeline_record->>'q_net_rev')::DECIMAL(15,2),

          -- Status & Timeline
          (pipeline_record->>'status'),
          (pipeline_record->>'progress_percent')::INTEGER,
          (pipeline_record->>'starting_date')::DATE,
          (pipeline_record->>'end_date')::DATE,
          (pipeline_record->>'proposal_date')::DATE,
          (pipeline_record->>'interested_date')::DATE,
          (pipeline_record->>'acceptance_date')::DATE,
          (pipeline_record->>'ready_to_deliver_date')::DATE,
          (pipeline_record->>'actual_starting_date')::DATE,
          (pipeline_record->>'close_won_date')::DATE,
          (pipeline_record->>'closed_date')::DATE,

          -- S- confirmation
          (pipeline_record->>'s_confirmation_status'),
          (pipeline_record->>'s_confirmed_at')::TIMESTAMPTZ,
          (pipeline_record->>'s_declined_at')::TIMESTAMPTZ,
          (pipeline_record->>'s_confirmation_notes'),

          -- Action Tracking
          (pipeline_record->>'action_date')::DATE,
          (pipeline_record->>'next_action'),
          (pipeline_record->>'action_detail'),
          (pipeline_record->>'action_progress'),

          -- Other
          (pipeline_record->>'forecast_type'),
          (pipeline_record->>'competitors'),
          COALESCE((pipeline_record->>'metadata')::JSONB, '{}'::JSONB),

          -- Audit fields
          (pipeline_record->>'created_by')::UUID,
          (pipeline_record->>'updated_by')::UUID
        )
        RETURNING id INTO pipeline_id;

        INSERT INTO batch_results (id, success, error_message)
        VALUES (pipeline_id, TRUE, NULL);
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        -- Log error for this pipeline
        INSERT INTO batch_results (id, success, error_message)
        VALUES (
          COALESCE(pipeline_id, '00000000-0000-0000-0000-000000000000'::UUID),
          FALSE,
          SQLERRM
        );
    END;
  END LOOP;

  -- Return results
  RETURN QUERY SELECT id, success, error_message FROM batch_results;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_pipelines_batch(JSONB) TO authenticated;

COMMENT ON FUNCTION upsert_pipelines_batch(JSONB) IS 'Batch upsert pipelines from sync process. Handles both INSERT (new pipelines) and UPDATE (existing pipelines). Returns array of results with success status.';