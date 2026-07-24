CREATE TYPE "Role" AS ENUM ('CANDIDATE', 'RECRUITER', 'ADMIN');

CREATE TYPE "AttributeType" AS ENUM ('STRING', 'TEXT', 'IMAGE', 'NUMBER', 'DATE', 'DATE_RANGE', 'BOOLEAN', 'SELECT');

CREATE TYPE "ResumeStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TYPE "Language" AS ENUM ('EN', 'RU');

CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK');

CREATE TYPE "SystemAttributeKey" AS ENUM ('FIRST_NAME', 'LAST_NAME', 'LOCATION', 'PROFILE_IMAGE');

CREATE TYPE "AccessOperator" AS ENUM ('EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'GREATER_THAN_OR_EQUALS', 'LESS_THAN', 'LESS_THAN_OR_EQUALS', 'IS_TRUE', 'IS_FALSE');

CREATE TYPE "PositionLevel" AS ENUM ('JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD', 'C_LEVEL');

DROP TABLE "Candidate";

CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "location" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "language" "Language" NOT NULL DEFAULT 'EN',
    "theme" "Theme" NOT NULL DEFAULT 'LIGHT',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserRole" (
    "userId" UUID NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","role")
);

CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "candidateId" UUID NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tag" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectTag" (
    "projectId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "ProjectTag_pkey" PRIMARY KEY ("projectId","tagId")
);

CREATE TABLE "Attribute" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "description" TEXT,
    "type" "AttributeType" NOT NULL,
    "systemKey" "SystemAttributeKey",
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" UUID NOT NULL,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttributeCategory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AttributeCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttributeOption" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "attributeId" UUID NOT NULL,

    CONSTRAINT "AttributeOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateAttributeValue" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "attributeId" UUID NOT NULL,
    "stringValue" TEXT,
    "numberValue" DECIMAL(65,30),
    "booleanValue" BOOLEAN,
    "dateValue" TIMESTAMP(3),
    "dateFrom" TIMESTAMP(3),
    "dateTo" TIMESTAMP(3),
    "imageUrl" TEXT,
    "selectedOptionId" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateAttributeValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Position" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "company" TEXT,
    "level" "PositionLevel",
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "maxProjects" INTEGER NOT NULL DEFAULT 3,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PositionProjectTag" (
    "positionId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "PositionProjectTag_pkey" PRIMARY KEY ("positionId","tagId")
);

CREATE TABLE "PositionAttribute" (
    "positionId" UUID NOT NULL,
    "attributeId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionAttribute_pkey" PRIMARY KEY ("positionId","attributeId")
);

CREATE TABLE "PositionAccessRule" (
    "id" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "attributeId" UUID NOT NULL,
    "operator" "AccessOperator" NOT NULL,
    "stringValue" TEXT,
    "numberValue" DECIMAL(65,30),
    "dateValue" TIMESTAMP(3),
    "dateFrom" TIMESTAMP(3),
    "dateTo" TIMESTAMP(3),
    "optionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionAccessRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PositionComment" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "positionId" UUID NOT NULL,
    "authorId" UUID NOT NULL,

    CONSTRAINT "PositionComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Resume" (
    "id" UUID NOT NULL,
    "status" "ResumeStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "candidateId" UUID NOT NULL,
    "positionId" UUID NOT NULL,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResumeLike" (
    "resumeId" UUID NOT NULL,
    "recruiterId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeLike_pkey" PRIMARY KEY ("resumeId","recruiterId")
);

CREATE TABLE "OAuthAccount" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE INDEX "UserRole_role_idx" ON "UserRole"("role");

CREATE INDEX "Project_candidateId_idx" ON "Project"("candidateId");

CREATE UNIQUE INDEX "Tag_normalizedName_key" ON "Tag"("normalizedName");

CREATE INDEX "ProjectTag_tagId_idx" ON "ProjectTag"("tagId");

CREATE UNIQUE INDEX "Attribute_normalizedName_key" ON "Attribute"("normalizedName");

CREATE UNIQUE INDEX "Attribute_systemKey_key" ON "Attribute"("systemKey");

CREATE INDEX "Attribute_categoryId_idx" ON "Attribute"("categoryId");

CREATE UNIQUE INDEX "AttributeCategory_normalizedName_key" ON "AttributeCategory"("normalizedName");

CREATE UNIQUE INDEX "AttributeOption_attributeId_label_key" ON "AttributeOption"("attributeId", "label");

CREATE INDEX "CandidateAttributeValue_attributeId_idx" ON "CandidateAttributeValue"("attributeId");

CREATE INDEX "CandidateAttributeValue_selectedOptionId_idx" ON "CandidateAttributeValue"("selectedOptionId");

CREATE UNIQUE INDEX "CandidateAttributeValue_candidateId_attributeId_key" ON "CandidateAttributeValue"("candidateId", "attributeId");

CREATE INDEX "Position_updatedAt_idx" ON "Position"("updatedAt" DESC);

CREATE INDEX "PositionProjectTag_tagId_idx" ON "PositionProjectTag"("tagId");

CREATE INDEX "PositionAttribute_attributeId_idx" ON "PositionAttribute"("attributeId");

CREATE INDEX "PositionAccessRule_positionId_idx" ON "PositionAccessRule"("positionId");

CREATE INDEX "PositionAccessRule_attributeId_idx" ON "PositionAccessRule"("attributeId");

CREATE INDEX "PositionAccessRule_optionId_idx" ON "PositionAccessRule"("optionId");

CREATE INDEX "PositionComment_positionId_createdAt_idx" ON "PositionComment"("positionId", "createdAt");

CREATE INDEX "PositionComment_authorId_idx" ON "PositionComment"("authorId");

CREATE INDEX "Resume_status_createdAt_idx" ON "Resume"("status", "createdAt");

CREATE INDEX "Resume_positionId_idx" ON "Resume"("positionId");

CREATE UNIQUE INDEX "Resume_candidateId_positionId_key" ON "Resume"("candidateId", "positionId");

CREATE INDEX "ResumeLike_recruiterId_idx" ON "ResumeLike"("recruiterId");

CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

CREATE UNIQUE INDEX "OAuthAccount_provider_providerAccountId_key" ON "OAuthAccount"("provider", "providerAccountId");

CREATE UNIQUE INDEX "OAuthAccount_userId_provider_key" ON "OAuthAccount"("userId", "provider");

ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectTag" ADD CONSTRAINT "ProjectTag_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectTag" ADD CONSTRAINT "ProjectTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attribute" ADD CONSTRAINT "Attribute_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AttributeCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AttributeOption" ADD CONSTRAINT "AttributeOption_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandidateAttributeValue" ADD CONSTRAINT "CandidateAttributeValue_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandidateAttributeValue" ADD CONSTRAINT "CandidateAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandidateAttributeValue" ADD CONSTRAINT "CandidateAttributeValue_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "AttributeOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PositionProjectTag" ADD CONSTRAINT "PositionProjectTag_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PositionProjectTag" ADD CONSTRAINT "PositionProjectTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PositionAttribute" ADD CONSTRAINT "PositionAttribute_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PositionAttribute" ADD CONSTRAINT "PositionAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PositionAccessRule" ADD CONSTRAINT "PositionAccessRule_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PositionAccessRule" ADD CONSTRAINT "PositionAccessRule_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PositionAccessRule" ADD CONSTRAINT "PositionAccessRule_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "AttributeOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PositionComment" ADD CONSTRAINT "PositionComment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PositionComment" ADD CONSTRAINT "PositionComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Resume" ADD CONSTRAINT "Resume_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Resume" ADD CONSTRAINT "Resume_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResumeLike" ADD CONSTRAINT "ResumeLike_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResumeLike" ADD CONSTRAINT "ResumeLike_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
