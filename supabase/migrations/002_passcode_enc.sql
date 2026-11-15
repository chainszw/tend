-- Lets signed-in members see the circle passcode so they can invite others.
-- The scrypt hash in passcode_hash is still the only thing used to sign in;
-- passcode_enc is AES-256-GCM ciphertext keyed from SESSION_SECRET.
alter table circles add column if not exists passcode_enc text;
