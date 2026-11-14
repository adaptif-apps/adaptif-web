import { neon } from "@neondatabase/serverless";
import { portfolioSeed, type PortfolioProject } from "../data/portfolioSeed";

function getDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    import.meta.env.DATABASE_URL ||
    import.meta.env.POSTGRES_URL
  );
}

function getSql() {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("Missing DATABASE_URL / POSTGRES_URL environment variable.");
  }
  return neon(url);
}

let schemaReadyPromise: Promise<void> | null = null;

export async function ensurePortfolioSchema(): Promise<void> {
  if (schemaReadyPromise) return schemaReadyPromise;

  schemaReadyPromise = (async () => {
    const sql = getSql();

    await sql`
      CREATE TABLE IF NOT EXISTS portfolio_projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        image TEXT NOT NULL,
        gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_published BOOLEAN NOT NULL DEFAULT true,
        show_on_home BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      ALTER TABLE portfolio_projects
      ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN NOT NULL DEFAULT false
    `;

    const countRows = await sql`SELECT COUNT(*)::int AS count FROM portfolio_projects`;
    const count = Number(countRows[0]?.count ?? 0);

    // Non-destructive initial seed: only runs when the table is completely empty
    if (count === 0) {
      for (const item of portfolioSeed) {
        await sql`
          INSERT INTO portfolio_projects (
            id, title, description, tags, image, gallery, sort_order, is_published, show_on_home
          ) VALUES (
            ${item.id},
            ${item.title},
            ${item.description},
            ${JSON.stringify(item.tags)}::jsonb,
            ${item.image},
            ${JSON.stringify(item.gallery)}::jsonb,
            ${item.sortOrder},
            ${item.isPublished},
            ${item.showOnHome}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
    } else {
      // One-time default backfill if no projects are marked for Home yet
      const homeRows = await sql`SELECT COUNT(*)::int AS count FROM portfolio_projects WHERE show_on_home = true`;
      if (Number(homeRows[0]?.count ?? 0) === 0) {
        await sql`
          UPDATE portfolio_projects
          SET show_on_home = true
          WHERE id IN ('sideline-podcast', 'yum-yum-digital', 'morganic', 'dunamis-xp', 'forever-and-ever', 'platemakrs')
        `;
      }
    }
  })().catch((err) => {
    schemaReadyPromise = null;
    throw err;
  });

  return schemaReadyPromise;
}

function mapRow(row: Record<string, any>): PortfolioProject {
  const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
  const gallery = Array.isArray(row.gallery) ? row.gallery.map(String) : [];
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description ?? ""),
    tags,
    image: String(row.image),
    gallery: gallery.length > 0 ? gallery : [String(row.image)],
    sortOrder: Number(row.sort_order ?? 0),
    isPublished: Boolean(row.is_published ?? true),
    showOnHome: Boolean(row.show_on_home ?? false),
  };
}

export async function listProjects(options: { includeHidden?: boolean; onlyHome?: boolean } = {}): Promise<PortfolioProject[]> {
  const queryProjects = async () => {
    const sql = getSql();
    if (options.onlyHome) {
      return await sql`
        SELECT id, title, description, tags, image, gallery, sort_order, is_published, show_on_home
        FROM portfolio_projects
        WHERE is_published = true AND show_on_home = true
        ORDER BY sort_order ASC, created_at ASC
      `;
    }
    return options.includeHidden
      ? await sql`
          SELECT id, title, description, tags, image, gallery, sort_order, is_published, show_on_home
          FROM portfolio_projects
          ORDER BY sort_order ASC, created_at ASC
        `
      : await sql`
          SELECT id, title, description, tags, image, gallery, sort_order, is_published, show_on_home
          FROM portfolio_projects
          WHERE is_published = true
          ORDER BY sort_order ASC, created_at ASC
        `;
  };

  try {
    const rows = await queryProjects();
    return rows.map(mapRow);
  } catch (err: any) {
    // Run schema initialization/migration on read if table (42P01) or column (42703) does not exist yet
    if (err?.code === "42P01" || err?.code === "42703") {
      try {
        await ensurePortfolioSchema();
        const rows = await queryProjects();
        return rows.map(mapRow);
      } catch (retryErr) {
        console.error("[portfolioDb] Schema init retry failed, falling back to static seed:", retryErr);
      }
    } else {
      console.error("[portfolioDb] Falling back to static seed:", err);
    }
    if (options.onlyHome) {
      return portfolioSeed.filter((p) => p.isPublished && p.showOnHome);
    }
    return options.includeHidden
      ? portfolioSeed
      : portfolioSeed.filter((p) => p.isPublished);
  }
}

export function slugifyProjectId(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project";
}

export interface CreateProjectInput {
  id?: string;
  title: string;
  description?: string;
  tags?: string[];
  image: string;
  gallery?: string[];
  isPublished?: boolean;
  showOnHome?: boolean;
}

export async function createProject(input: CreateProjectInput): Promise<PortfolioProject> {
  await ensurePortfolioSchema();
  const sql = getSql();

  const baseId = slugifyProjectId(input.id?.trim() || input.title);
  let candidateId = baseId;
  let suffix = 2;

  while (true) {
    const existing = await sql`SELECT 1 FROM portfolio_projects WHERE id = ${candidateId} LIMIT 1`;
    if (existing.length === 0) break;
    candidateId = `${baseId}-${suffix++}`;
  }

  const maxOrderRows = await sql`SELECT COALESCE(MAX(sort_order), -1)::int AS max_order FROM portfolio_projects`;
  const nextOrder = Number(maxOrderRows[0]?.max_order ?? -1) + 1;

  const tags = Array.isArray(input.tags) ? input.tags.filter(Boolean) : [];
  const gallery =
    Array.isArray(input.gallery) && input.gallery.length > 0
      ? input.gallery.filter(Boolean)
      : [input.image];

  const rows = await sql`
    INSERT INTO portfolio_projects (
      id, title, description, tags, image, gallery, sort_order, is_published, show_on_home
    ) VALUES (
      ${candidateId},
      ${input.title.trim()},
      ${(input.description ?? "").trim()},
      ${JSON.stringify(tags)}::jsonb,
      ${input.image},
      ${JSON.stringify(gallery)}::jsonb,
      ${nextOrder},
      ${input.isPublished ?? true},
      ${input.showOnHome ?? false}
    )
    RETURNING id, title, description, tags, image, gallery, sort_order, is_published, show_on_home
  `;

  return mapRow(rows[0]);
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  tags?: string[];
  image?: string;
  gallery?: string[];
  sortOrder?: number;
  isPublished?: boolean;
  showOnHome?: boolean;
}

export async function updateProject(id: string, patch: UpdateProjectInput): Promise<PortfolioProject | null> {
  await ensurePortfolioSchema();
  const sql = getSql();

  const existingRows = await sql`
    SELECT id, title, description, tags, image, gallery, sort_order, is_published, show_on_home
    FROM portfolio_projects
    WHERE id = ${id}
    LIMIT 1
  `;
  if (existingRows.length === 0) return null;

  const current = mapRow(existingRows[0]);
  const nextTitle = patch.title !== undefined ? patch.title.trim() : current.title;
  const nextDesc = patch.description !== undefined ? patch.description.trim() : current.description;
  const nextTags = patch.tags !== undefined ? patch.tags.filter(Boolean) : current.tags;
  const nextImage = patch.image !== undefined ? patch.image : current.image;
  const nextGallery =
    patch.gallery !== undefined
      ? (patch.gallery.length > 0 ? patch.gallery.filter(Boolean) : [nextImage])
      : current.gallery;
  const nextOrder = patch.sortOrder !== undefined ? patch.sortOrder : current.sortOrder;
  const nextPublished = patch.isPublished !== undefined ? patch.isPublished : current.isPublished;
  const nextShowOnHome = patch.showOnHome !== undefined ? patch.showOnHome : current.showOnHome;

  const updated = await sql`
    UPDATE portfolio_projects
    SET
      title = ${nextTitle},
      description = ${nextDesc},
      tags = ${JSON.stringify(nextTags)}::jsonb,
      image = ${nextImage},
      gallery = ${JSON.stringify(nextGallery)}::jsonb,
      sort_order = ${nextOrder},
      is_published = ${nextPublished},
      show_on_home = ${nextShowOnHome},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, title, description, tags, image, gallery, sort_order, is_published, show_on_home
  `;

  return updated.length > 0 ? mapRow(updated[0]) : null;
}

export async function deleteProject(id: string): Promise<boolean> {
  await ensurePortfolioSchema();
  const sql = getSql();
  const rows = await sql`DELETE FROM portfolio_projects WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

export async function reorderProjects(orderedIds: string[]): Promise<void> {
  await ensurePortfolioSchema();
  const sql = getSql();
  for (let i = 0; i < orderedIds.length; i++) {
    await sql`
      UPDATE portfolio_projects
      SET sort_order = ${i}, updated_at = NOW()
      WHERE id = ${orderedIds[i]}
    `;
  }
}
