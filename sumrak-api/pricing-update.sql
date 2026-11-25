UPDATE settings
SET value = (value - 'quality') || '{
  "windows":{"front":4000,"rear":4000,"fs":2000,"rs":2000},
  "lights":{"headlights":2000,"taillights":2000},
  "booking":{"front":2000,"rear":2000,"fs":1000,"rs":1000,"headlights":1000,"taillights":1000},
  "removal":{"front":2000,"rear":2000,"fs":1000,"rs":1000,"headlights":1000,"taillights":1000}
}'::jsonb
WHERE key='pricing';
