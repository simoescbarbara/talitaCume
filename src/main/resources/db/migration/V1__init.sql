-- Needed so a GiST index can combine equality (therapist_id) with range overlap.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Everyone who signs in: women looking for help (CLIENT) and therapists (THERAPIST).
-- Personal data under LGPD; anything about why someone seeks therapy is sensitive health data (art. 11).
CREATE TABLE account (
    id              uuid PRIMARY KEY,
    name            varchar(200) NOT NULL,
    -- Stored lowercased; the unique index makes "Ana@x.com" and "ana@x.com" the same account.
    email           varchar(200) NOT NULL,
    -- Brazilian phone with area code, digits only: 10 (landline) or 11 (mobile) digits.
    phone           varchar(11)  NOT NULL,
    -- Spring Security delegating format, e.g. "{bcrypt}$2a$10$...". Never the password itself.
    password_hash   varchar(255) NOT NULL,
    role            varchar(16)  NOT NULL,
    created_at      timestamptz  NOT NULL
);
CREATE UNIQUE INDEX account_email_uq ON account (lower(email));

-- Login sessions. The browser holds a random token in an HttpOnly cookie; only its SHA-256 is stored,
-- so a leaked table cannot be replayed as cookies.
CREATE TABLE account_session (
    token_hash      varchar(64) PRIMARY KEY,
    account_id      uuid        NOT NULL REFERENCES account (id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL,
    expires_at      timestamptz NOT NULL
);
CREATE INDEX account_session_account_idx ON account_session (account_id);
CREATE INDEX account_session_expires_idx ON account_session (expires_at);

-- A therapist's public profile. Hidden from search until someone checks the CRP and sets verified_at.
CREATE TABLE therapist (
    account_id      uuid PRIMARY KEY REFERENCES account (id) ON DELETE CASCADE,
    -- Conselho Regional de Psicologia registration, normalized to "06/123456".
    crp             varchar(12)   NOT NULL,
    approach        varchar(100)  NOT NULL,
    bio             varchar(2000) NOT NULL,
    -- How faith shows up in the sessions, in the therapist's words. Optional.
    faith_note      varchar(500),
    -- Comma-separated Topic names, e.g. "ANXIETY,GRIEF".
    topics          varchar(400)  NOT NULL,
    city            varchar(100)  NOT NULL,
    modality        varchar(16)   NOT NULL,
    session_minutes integer       NOT NULL CHECK (session_minutes BETWEEN 30 AND 120),
    price_cents     integer       CHECK (price_cents >= 0),
    verified_at     timestamptz,
    created_at      timestamptz   NOT NULL
);
CREATE UNIQUE INDEX therapist_crp_uq ON therapist (crp);

-- Weekly availability in local time. Sessions are cut from these windows, session_minutes each.
CREATE TABLE availability_rule (
    id              uuid PRIMARY KEY,
    therapist_id    uuid        NOT NULL REFERENCES therapist (account_id) ON DELETE CASCADE,
    day_of_week     varchar(16) NOT NULL,
    start_time      time        NOT NULL,
    end_time        time        NOT NULL,
    CHECK (end_time > start_time)
);
CREATE INDEX availability_rule_therapist_idx ON availability_rule (therapist_id);

CREATE TABLE appointment (
    id              uuid PRIMARY KEY,
    therapist_id    uuid          NOT NULL REFERENCES therapist (account_id),
    client_id       uuid          NOT NULL REFERENCES account (id),
    starts_at       timestamptz   NOT NULL,
    ends_at         timestamptz   NOT NULL,
    -- What the client wants to share before the first session. Sensitive: only she and her therapist see it.
    note            varchar(1000),
    -- She asked for faith to be part of the sessions. Faith is welcome, never imposed.
    wants_faith     boolean       NOT NULL,
    status          varchar(16)   NOT NULL,
    created_at      timestamptz   NOT NULL,
    CONSTRAINT valid_range CHECK (ends_at > starts_at),
    -- The double-booking guard: the database refuses overlapping active appointments
    -- for the same therapist, no matter how many app instances race.
    CONSTRAINT no_overlapping_appointments EXCLUDE USING gist (
        therapist_id WITH =,
        tstzrange(starts_at, ends_at) WITH &&
    ) WHERE (status <> 'CANCELLED')
);
CREATE INDEX appointment_therapist_time_idx ON appointment (therapist_id, starts_at);
CREATE INDEX appointment_client_time_idx ON appointment (client_id, starts_at);
