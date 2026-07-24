import { JdAnalysis, Project } from "./resumeSchema";

/**
 * LOCAL project matcher — agent 2. Zero API tokens.
 *
 * Scores each stored project against the JD keywords using weighted token
 * overlap (with light normalization + a small synonym map). This is cheap,
 * deterministic, and keeps the whole profile from ever being sent to the paid
 * model — only the top-N projects go downstream.
 *
 * Upgrade path: swap scoreProject() for cosine similarity over local
 * embeddings (@xenova/transformers) without changing callers.
 */

const STOP = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "using",
  "used", "at", "by", "as", "is", "are", "be", "we", "our", "you", "your", "will",
  "experience", "years", "year", "strong", "good", "knowledge", "ability", "work",
]);

const SYNONYMS: Record<string, string[]> = {
  js: ["javascript"],
  javascript: ["js"],
  ts: ["typescript"],
  typescript: ["ts"],
  react: ["reactjs", "react.js"],
  node: ["nodejs", "node.js"],
  postgres: ["postgresql"],
  ml: ["machine", "learning"],
  ai: ["artificial", "intelligence"],
  k8s: ["kubernetes"],
};

function normalize(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));

  const expanded = new Set<string>();
  for (const t of tokens) {
    expanded.add(t);
    for (const syn of SYNONYMS[t] || []) expanded.add(syn);
  }
  return [...expanded];
}

function projectText(p: Project): string {
  return [p.title, p.role, p.stack.join(" "), p.description, p.bullets.join(" ")].join(" ");
}

export interface ScoredProject {
  project: Project;
  score: number;
  matched: string[];
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function scoreProjects(projects: Project[], analysis: JdAnalysis, jdEmbedding?: number[]): ScoredProject[] {
  // Weight hard skills + keywords more than generic responsibilities text.
  const weighted: Array<{ term: string; weight: number }> = [];
  for (const s of analysis.hardSkills) weighted.push({ term: s.toLowerCase(), weight: 3 });
  for (const k of (analysis.keywords || [])) weighted.push({ term: k.toLowerCase(), weight: 2 });
  for (const r of (analysis.responsibilities || [])) {
    for (const t of normalize(r)) weighted.push({ term: t, weight: 1 });
  }

  return projects
    .map((project) => {
      const tokens = new Set(normalize(projectText(project)));
      let score = 0;
      const matched: string[] = [];
      for (const { term, weight } of weighted) {
        const parts = normalize(term);
        const hit = parts.some((part) => tokens.has(part));
        if (hit) {
          score += weight;
          matched.push(term);
        }
      }

      // If semantic matching is enabled, use cosine similarity as the primary score!
      // We scale it from -1..1 to 0..100. We still compute `matched` above to serve as the "explanation".
      if (jdEmbedding && project.embedding && project.embedding.length > 0) {
        const similarity = cosineSimilarity(project.embedding, jdEmbedding);
        // Map 0..1 to 0..100 (cosine can be negative, but for text embeddings it's mostly 0..1)
        score = Math.max(0, Math.round(similarity * 100));
      }

      return { project, score, matched: [...new Set(matched)] };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Select the projects to send downstream. Returns the top-N by score, but
 * always at least one (so a brand-new keyword set never yields an empty
 * resume) and drops zero-score projects when better ones exist.
 */
export function selectProjects(
  projects: Project[],
  analysis: JdAnalysis,
  topN = 2,
  jdEmbedding?: number[]
): ScoredProject[] {
  if (projects.length === 0) return [];
  const scored = scoreProjects(projects, analysis, jdEmbedding);
  const withScore = scored.filter((s) => s.score > 0);
  const chosen = (withScore.length > 0 ? withScore : scored).slice(0, topN);
  return chosen;
}
