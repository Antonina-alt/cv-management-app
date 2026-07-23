import { prisma } from "./prisma.js";
import { filterVisibleResumesByCandidateValues } from "./resumeContent.js";
import { toPublicUser } from "./publicUser.js";
import { isRecruiterOrAdmin, groupValuesByCandidateId, filterPositionsForUser } from "./positionVisibility.js";

const RESULT_LIMIT = 20;

const positionInclude = {
    attributes: { include: { attribute: true } },
    accessRules: { include: { attribute: true } },
};

const toPrefixTsQuery = async (query) => {
    const [row] = await prisma.$queryRaw`
        SELECT string_agg(quote_literal(lexeme) || ':*', ' & ') AS "tsQuery"
        FROM unnest(tsvector_to_array(to_tsvector('simple', ${query}))) AS lexeme
    `;
    return row?.tsQuery ?? null;
};

const positionMatchIds = (tsQuery) => prisma.$queryRaw`
    SELECT id FROM "Position"
    WHERE "searchVector" @@ to_tsquery('simple', ${tsQuery})
    ORDER BY ts_rank("searchVector", to_tsquery('simple', ${tsQuery})) DESC
    LIMIT ${RESULT_LIMIT}
`;

const toPositionResult = (position) => ({
    id: position.id,
    title: position.title,
    company: position.company,
    level: position.level,
    isPublic: position.isPublic,
});

const searchPositions = async (tsQuery, user) => {
    if (!tsQuery) return [];
    const matches = await positionMatchIds(tsQuery);
    if (matches.length === 0) return [];

    const positions = await prisma.position.findMany({
        where: { id: { in: matches.map((m) => m.id) } },
        include: positionInclude,
    });
    const visible = await filterPositionsForUser(positions, user);

    const rankById = new Map(matches.map((m, index) => [m.id, index]));
    return visible.sort((a, b) => rankById.get(a.id) - rankById.get(b.id)).map(toPositionResult);
};

const projectMatchIds = (tsQuery, query) => prisma.$queryRaw`
    SELECT DISTINCT p.id
    FROM "Project" p
    LEFT JOIN "ProjectTag" pt ON pt."projectId" = p.id
    LEFT JOIN "Tag" t ON t.id = pt."tagId"
    WHERE p."searchVector" @@ to_tsquery('simple', ${tsQuery})
       OR t."normalizedName" = ${query.trim().toLowerCase()}
    LIMIT ${RESULT_LIMIT}
`;

const toProjectResult = (user) => (project) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    tags: project.tags.map((t) => t.tag.name),
    candidate: isRecruiterOrAdmin(user)
        ? { id: project.candidate.id, firstName: project.candidate.firstName, lastName: project.candidate.lastName }
        : undefined,
});

const searchProjects = async (tsQuery, user, query) => {
    if (!user || !tsQuery) return [];
    const matches = await projectMatchIds(tsQuery, query);
    if (matches.length === 0) return [];

    const ids = matches.map((m) => m.id);
    const where = isRecruiterOrAdmin(user) ? { id: { in: ids } } : { id: { in: ids }, candidateId: user.id };
    const projects = await prisma.project.findMany({
        where,
        include: { candidate: true, tags: { include: { tag: true } } },
    });
    return projects.map(toProjectResult(user));
};

const resumeMatchIds = (tsQuery) => prisma.$queryRaw`
    SELECT DISTINCT r.id
    FROM "Resume" r
    JOIN "Position" p ON p.id = r."positionId"
    JOIN "User" u ON u.id = r."candidateId"
    LEFT JOIN "CandidateAttributeValue" cav
        ON cav."candidateId" = r."candidateId" AND cav."searchVector" @@ to_tsquery('simple', ${tsQuery})
    WHERE r.status = 'PUBLISHED'
      AND (
          p."searchVector" @@ to_tsquery('simple', ${tsQuery})
          OR u."searchVector" @@ to_tsquery('simple', ${tsQuery})
          OR cav.id IS NOT NULL
      )
    LIMIT ${RESULT_LIMIT}
`;

const resumeInclude = (recruiterId) => ({
    candidate: { include: { roles: true } },
    position: { include: positionInclude },
    _count: { select: { likes: true } },
    likes: { where: { recruiterId }, select: { recruiterId: true } },
});

const loadValuesByCandidate = async (candidateIds) => {
    if (candidateIds.length === 0) return new Map();
    const values = await prisma.candidateAttributeValue.findMany({ where: { candidateId: { in: candidateIds } } });
    return groupValuesByCandidateId(values);
};

const visibleResumeIds = (resumes, valuesByCandidateId) => {
    const positionsById = new Map(resumes.map((r) => [r.positionId, r.position]));
    const visible = [...positionsById].flatMap(([positionId, position]) =>
        filterVisibleResumesByCandidateValues(position, resumes.filter((r) => r.positionId === positionId), valuesByCandidateId));
    return new Set(visible.map((r) => r.id));
};

const toResumeResult = (resume) => ({
    id: resume.id,
    status: resume.status,
    candidate: toPublicUser(resume.candidate),
    position: { id: resume.position.id, title: resume.position.title, company: resume.position.company },
    likeCount: resume._count.likes,
    likedByMe: resume.likes.length > 0,
});

const searchResumes = async (tsQuery, user) => {
    if (!isRecruiterOrAdmin(user) || !tsQuery) return [];
    const matches = await resumeMatchIds(tsQuery);
    if (matches.length === 0) return [];

    const resumes = await prisma.resume.findMany({
        where: { id: { in: matches.map((m) => m.id) } },
        include: resumeInclude(user.id),
    });
    const valuesByCandidateId = await loadValuesByCandidate([...new Set(resumes.map((r) => r.candidateId))]);
    const visibleIds = visibleResumeIds(resumes, valuesByCandidateId);
    return resumes.filter((r) => visibleIds.has(r.id)).map(toResumeResult);
};

export const runSearch = async (query, user) => {
    const tsQuery = await toPrefixTsQuery(query);
    const [positions, projects, resumes] = await Promise.all([
        searchPositions(tsQuery, user),
        searchProjects(tsQuery, user, query),
        searchResumes(tsQuery, user),
    ]);
    return { positions, projects, resumes };
};
