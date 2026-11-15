-- Neon Realtime publication for teacher monitoring
-- This publication enables real-time subscriptions to tutor sessions, messages, interventions, and intervention actions

CREATE PUBLICATION teacher_monitoring FOR TABLE 
  tutor_sessions, 
  messages, 
  interventions, 
  intervention_actions;