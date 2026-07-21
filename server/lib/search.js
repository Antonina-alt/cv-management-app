import { prisma } from "./prisma.js";
import { candidateHasPositionAccess } from "./positionAccess.js";
import { filterVisibleResumesByCandidateValues } from "./resumeContent.js";
import { toPublicUser } from "./publicUser.js";

const RESULT_LIMIT = 20;

const isRecruiterOrAdmin = (user) => Boolean(user) && (user.roles.includes("RECRUITER") || user.roles.includes("ADMIN"));

const positionInclude = {
    attributes: { include: { attribute: true } },
    accessRules: { include: { attribute: true } },
};

// Positions whose generated tsvector (title + company + description) matches the query,
// filtered to what the caller is allowed to see (same visibility rules as GET /api/positions).
const searchPositions = async (query, user) => {
    const matches = await prisma.$queryRaw`
        SELECT id FROM "Position"
        WHERE "searchVector" @@ websearch_to_tsquery('simple', ${query})
        ORDER BY ts_rank("searchVector", websearch_to_tsquery('simple', ${query})) DESC
        LIMIT ${RESULT_LIMIT}
    `;
    if (matches.length === 0) return [];

    const positions = await prisma.position.findMany({
        where: { id: { in: matches.map((m) => m.id) } },
        include: positionInclude,
    });

    let visible;
    if (!user) {
        visible = positions.filter((p) => p.isPublic);
    } else if (isRecruiterOrAdmin(user)) {
        visible = positions;
    } else {
        const values = await prisma.candidateAttributeValue.findMany({ where: { candidateId: user.id } });
        const valuesByAttributeId = new Map(values.map((v) => [v.attributeId, v]));
        visible = positions.filter((p) => candidateHasPositionAccess(p, valuesByAttributeId));
    }

    const orderById = new Map(matches.map((m, index) => [m.id, index]));
    return visible
        .sort((a, b) => orderById.get(a.id) - orderById.get(b.id))
        .map((p) => ({ id: p.id, title: p.title, company: p.company, level: p.level, isPublic: p.isPublic }));
};

// Projects whose generated tsvector (title + description) matches the query, or that carry a
// matching tag. Personal data, so only shown to the owning candidate or to recruiters/admins
// (who use it to discover candidates by project keywords).
const searchProjects = async (query, user) => {
    if (!user) return [];

    const matches = await prisma.$queryRaw`
        SELECT DISTINCT p.id
        FROM "Project" p
        LEFT JOIN "ProjectTag" pt ON pt."projectId" = p.id
        LEFT JOIN "Tag" t ON t.id = pt."tagId"
        WHERE p."searchVector" @@ websearch_to_tsquery('simple', ${query})
           OR t."normalizedName" = ${query.trim().toLowerCase()}
        LIMIT ${RESULT_LIMIT}
    `;
    if (matches.length === 0) return [];

    const where = isRecruiterOrAdmin(user)
        ? { id: { in: matches.map((m) => m.id) } }
        : { id: { in: matches.map((m) => m.id) }, candidateId: user.id };

    const projects = await prisma.project.findMany({
        where,
        include: { candidate: true, tags: { include: { tag: true } } },
    });

    return projects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        tags: p.tags.map((t) => t.tag.name),
        candidate: isRecruiterOrAdmin(user) ? { id: p.candidate.id, firstName: p.candidate.firstName, lastName: p.candidate.lastName } : undefined,
    }));
};

// Resumes are "almost virtual" (spec: no stored content), so matching happens through related
// data: the position's tsvector, the candidate's tsvector (name/location), and any filled-in
// STRING/TEXT attribute value's tsvector — all backed by GIN indexes, joined rather than
// queried per-candidate. Only recruiters/admins search resumes (candidates don't browse other
// candidates' resumes per the spec), and only PUBLISHED resumes the searcher still has access
// to are returned (mirrors GET /api/positions/:id's resume list).
const searchResumes = async (query, user) => {
    if (!isRecruiterOrAdmin(user)) return [];

    const matches = await prisma.$queryRaw`
        SELECT DISTINCT r.id
        FROM "Resume" r
        JOIN "Position" p ON p.id = r."positionId"
        JOIN "User" u ON u.id = r."candidateId"
        LEFT JOIN "CandidateAttributeValue" cav
            ON cav."candidateId" = r."candidateId" AND cav."searchVector" @@ websearch_to_tsquery('simple', ${query})
        WHERE r.status = 'PUBLISHED'
          AND (
              p."searchVector" @@ websearch_to_tsquery('simple', ${query})
              OR u."searchVector" @@ websearch_to_tsquery('simple', ${query})
              OR cav.id IS NOT NULL
          )
        LIMIT ${RESULT_LIMIT}
    `;
    if (matches.length === 0) return [];

    const resumes = await prisma.resume.findMany({
        where: { id: { in: matches.map((m) => m.id) } },
        include: {
            candidate: { include: { roles: true } },
            position: { include: positionInclude },
            _count: { select: { likes: true } },
            likes: { where: { recruiterId: user.id }, select: { recruiterId: true } },
        },
    });

    const candidateIds = [...new Set(resumes.map((r) => r.candidateId))];
    const candidateValues = candidateIds.length
        ? await prisma.candidateAttributeValue.findMany({ where: { candidateId: { in: candidateIds } } })
        : [];
    const valuesByCandidateId = new Map();
    for (const v of candidateValues) {
        if (!valuesByCandidateId.has(v.candidateId)) valuesByCandidateId.set(v.candidateId, new Map());
        valuesByCandidateId.get(v.candidateId).set(v.attributeId, v);
    }

    const positionsById = new Map(resumes.map((r) => [r.positionId, r.position]));
    const visibleByPosition = new Map();
    for (const [positionId, position] of positionsById) {
        const forPosition = resumes.filter((r) => r.positionId === positionId);
        visibleByPosition.set(positionId, filterVisibleResumesByCandidateValues(position, forPosition, valuesByCandidateId));
    }
    const visibleIds = new Set([...visibleByPosition.values()].flat().map((r) => r.id));

    return resumes
        .filter((r) => visibleIds.has(r.id))
        .map((r) => ({
            id: r.id,
            status: r.status,
            candidate: toPublicUser(r.candidate),
            position: { id: r.position.id, title: r.position.title, company: r.position.company },
            likeCount: r._count.likes,
            likedByMe: r.likes.length > 0,
        }));
};

export const runSearch = async (query, user) => {
    const [positions, projects, resumes] = await Promise.all([
        searchPositions(query, user),
        searchProjects(query, user),
        searchResumes(query, user),
    ]);
    return { positions, projects, resumes };
};
