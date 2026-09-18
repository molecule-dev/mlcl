-- music-daw: seed the global instrument library (NULL user_id = built-in).
-- Idempotent: each row only inserts when no library instrument with that
-- name already exists.

INSERT INTO instruments (user_id, name, category, type, settings)
SELECT NULL, 'Subtractive Synth', 'synth', 'oscillator',
       '{"waveform":"sawtooth","cutoff":2000,"resonance":0.4}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM instruments WHERE user_id IS NULL AND name = 'Subtractive Synth'
);

INSERT INTO instruments (user_id, name, category, type, settings)
SELECT NULL, 'FM Bass', 'synth', 'fm',
       '{"carrier":"sine","modulator":"sine","ratio":2,"depth":0.6}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM instruments WHERE user_id IS NULL AND name = 'FM Bass'
);

INSERT INTO instruments (user_id, name, category, type, settings)
SELECT NULL, 'Acoustic Drum Kit', 'drum', 'sampler',
       '{"kick":"kick.wav","snare":"snare.wav","hat":"hat.wav"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM instruments WHERE user_id IS NULL AND name = 'Acoustic Drum Kit'
);

INSERT INTO instruments (user_id, name, category, type, settings)
SELECT NULL, '808 Kit', 'drum', 'sampler',
       '{"kick":"808-kick.wav","snare":"808-snare.wav","hat":"808-hat.wav"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM instruments WHERE user_id IS NULL AND name = '808 Kit'
);

INSERT INTO instruments (user_id, name, category, type, settings)
SELECT NULL, 'Electric Piano', 'keys', 'sampler',
       '{"sample":"rhodes.wav","envelope":{"attack":0.01,"release":0.4}}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM instruments WHERE user_id IS NULL AND name = 'Electric Piano'
);

INSERT INTO instruments (user_id, name, category, type, settings)
SELECT NULL, 'Pad String', 'pad', 'oscillator',
       '{"waveform":"triangle","detune":0.2,"chorus":true}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM instruments WHERE user_id IS NULL AND name = 'Pad String'
);
