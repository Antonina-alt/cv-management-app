import { prisma } from "../lib/prisma.js";
import { filterVisibleResumesByCandidateValues } from "../lib/resumeContent.js";
import { toPublicUser } from "../lib/users.js";
import { filterPositionsForUser, groupValuesByCandidateId } from "../lib/positionVisibility.js";
import { isAdmin, isRecruiterOrAdmin } from "../lib/roles.js";

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

const projectMatchIds = (tsQuery, query) => prisma.$queryRaw`
    SELECT DISTINCT p.id
    FROM "Project" p
    LEFT JOIN "ProjectTag" pt ON pt."projectId" = p.id
    LEFT JOIN "Tag" t ON t.id = pt."tagId"
    WHERE p."searchVector" @@ to_tsquery('simple', ${tsQuery})
       OR t."normalizedName" = ${query.trim().toLowerCase()}
    LIMIT ${RESULT_LIMIT}
`;

const resumeMatchIds = (tsQuery, includeDrafts) => prisma.$queryRaw`
    SELECT DISTINCT r.id
    FROM "Resume" r
    JOIN "Position" p ON p.id = r."positionId"
    JOIN "User" u ON u.id = r."candidateId"
    LEFT JOIN "CandidateAttributeValue" cav
        ON cav."candidateId" = r."candidateId" AND cav."searchVector" @@ to_tsquery('simple', ${tsQuery})
    WHERE (${includeDrafts} OR r.status = 'PUBLISHED')
      AND (
          p."searchVector" @@ to_tsquery('simple', ${tsQuery})
          OR u."searchVector" @@ to_tsquery('simple', ${tsQuery})
          OR cav.id IS NOT NULL
      )
    LIMIT ${RESULT_LIMIT}
`;

const sortByMatches = (items, matches) => {
    const rank = new Map(matches.map(({ id }, index) => [id, index]));
    return items.sort((left, right) => rank.get(left.id) - rank.get(right.id));
};

const toPositionResult = ({ id, title, company, level, isPublic }) => ({
    id,
    title,
    company,
    level,
    isPublic,
});

const searchPositions = async (tsQuery, user) => {
    if (!tsQuery) return [];
    const matches = await positionMatchIds(tsQuery);
    if (!matches.length) return [];
    const positions = await prisma.position.findMany({
        where: { id: { in: matches.map(({ id }) => id) } },
        include: positionInclude,
    });
    return sortByMatches(await filterPositionsForUser(positions, user), matches).map(toPositionResult);
};

const projectWhere = (user, ids) => isRecruiterOrAdmin(user)
    ? { id: { in: ids } }
    : { id: { in: ids }, candidateId: user.id };

const toProjectResult = (user) => (project) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    tags: project.tags.map(({ tag }) => tag.name),
    candidate: isRecruiterOrAdmin(user) ? {
        id: project.candidate.id,
        firstName: project.candidate.firstName,
        lastName: project.candidate.lastName,
    } : undefined,
});

const searchProjects = async (tsQuery, user, query) => {
    if (!user || !tsQuery) return [];
    const matches = await projectMatchIds(tsQuery, query);
    if (!matches.length) return [];
    const projects = await prisma.project.findMany({
        where: projectWhere(user, matches.map(({ id }) => id)),
        include: { candidate: true, tags: { include: { tag: true } } },
    });
    return sortByMatches(projects, matches).map(toProjectResult(user));
};

const resumeInclude = (recruiterId) => ({
    candidate: { include: { roles: true } },
    position: { include: positionInclude },
    _count: { select: { likes: true } },
    likes: { where: { recruiterId }, select: { recruiterId: true } },
});

const loadValuesByCandidate = async (candidateIds) => {
    if (!candidateIds.length) return new Map();
    const values = await prisma.candidateAttributeValue.findMany({
        where: { candidateId: { in: candidateIds } },
    });
    return groupValuesByCandidateId(values);
};

const groupResumesByPosition = (resumes) => resumes.reduce((groups, resume) => {
    const group = groups.get(resume.positionId) ?? [];
    group.push(resume);
    return groups.set(resume.positionId, group);
}, new Map());

const visibleResumeIds = (resumes, values, user) => {
    if (isAdmin(user)) return new Set(resumes.map(({ id }) => id));
    const groups = groupResumesByPosition(resumes);
    const visible = [...groups.values()].flatMap((group) => (
        filterVisibleResumesByCandidateValues(group[0].position, group, values)
    ));
    return new Set(visible.map(({ id }) => id));
};

const toResumeResult = (resume) => ({
    id: resume.id,
    status: resume.status,
    candidate: toPublicUser(resume.candidate),
    position: {
        id: resume.position.id,
        title: resume.position.title,
        company: resume.position.company,
    },
    likeCount: resume._count.likes,
    likedByMe: resume.likes.length > 0,
});

const searchResumes = async (tsQuery, user) => {
    if (!isRecruiterOrAdmin(user) || !tsQuery) return [];
    const matches = await resumeMatchIds(tsQuery, isAdmin(user));
    if (!matches.length) return [];
    const resumes = await prisma.resume.findMany({
        where: { id: { in: matches.map(({ id }) => id) } },
        include: resumeInclude(user.id),
    });
    const candidateIds = [...new Set(resumes.map(({ candidateId }) => candidateId))];
    const visibleIds = visibleResumeIds(resumes, await loadValuesByCandidate(candidateIds), user);
    return sortByMatches(resumes.filter(({ id }) => visibleIds.has(id)), matches).map(toResumeResult);
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
