ALTER TABLE "CandidateAttributeValue" ADD COLUMN "searchVector" tsvector
    GENERATED ALWAYS AS (to_tsvector('simple', coalesce("stringValue", ''))) STORED;

ALTER TABLE "Position" ADD COLUMN "searchVector" tsvector
    GENERATED ALWAYS AS (
        to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("company", '') || ' ' || coalesce("description", ''))
    ) STORED;

ALTER TABLE "Project" ADD COLUMN "searchVector" tsvector
    GENERATED ALWAYS AS (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("description", ''))) STORED;

ALTER TABLE "User" ADD COLUMN "searchVector" tsvector
    GENERATED ALWAYS AS (
        to_tsvector('simple', coalesce("firstName", '') || ' ' || coalesce("lastName", '') || ' ' || coalesce("location", ''))
    ) STORED;

CREATE INDEX "CandidateAttributeValue_searchVector_idx" ON "CandidateAttributeValue" USING GIN ("searchVector");

CREATE INDEX "Position_searchVector_idx" ON "Position" USING GIN ("searchVector");

CREATE INDEX "Project_searchVector_idx" ON "Project" USING GIN ("searchVector");

CREATE INDEX "User_searchVector_idx" ON "User" USING GIN ("searchVector");
