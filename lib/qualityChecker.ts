import type { TailoredResume, JdAnalysis } from "./resumeSchema";

export interface QualityReport {
  missingKeywords: string[];
  matchedKeywords: string[];
  weakBullets: number;
  totalBullets: number;
  longestBulletWords: number;
  bulletsWithMetrics: number;
  clichesFound: string[];
  warnings: string[];
}

const WEAK_VERBS = new Set([
  "worked", "helped", "assisted", "responsible for", "tasked with", "handled", "did", "made"
]);

const CLICHES = [
  "team player", "hard worker", "detail-oriented", "detail oriented", "synergy", 
  "dynamic", "self-starter", "thought leader", "results-driven", "results driven",
  "go-getter", "think outside the box"
];

function countWords(str: string) {
  return str.split(/\s+/).filter(Boolean).length;
}

export function analyzeResume(resume: TailoredResume, analysis: JdAnalysis | null): QualityReport {
  const report: QualityReport = {
    missingKeywords: [],
    matchedKeywords: [],
    weakBullets: 0,
    totalBullets: 0,
    longestBulletWords: 0,
    bulletsWithMetrics: 0,
    clichesFound: [],
    warnings: [],
  };

  // Compile full resume text for keyword / cliche searching
  const fullText = [
    resume.summary,
    ...resume.skills,
    ...resume.experience.flatMap(e => [e.company, e.title, ...e.bullets]),
    ...resume.projects.flatMap(p => [p.title, ...p.bullets]),
  ].join(" ").toLowerCase();

  // 1. Keywords
  if (analysis) {
    const allKeywords = [...new Set([...(analysis.hardSkills || []), ...(analysis.keywords || [])])];
    for (const kw of allKeywords) {
      if (!kw) continue;
      if (fullText.includes(kw.toLowerCase())) {
        report.matchedKeywords.push(kw);
      } else {
        report.missingKeywords.push(kw);
      }
    }
  }

  // 2. Cliches
  const foundCliches = new Set<string>();
  for (const cliche of CLICHES) {
    if (fullText.includes(cliche)) {
      foundCliches.add(cliche);
    }
  }
  report.clichesFound = Array.from(foundCliches);
  if (report.clichesFound.length > 0) {
    report.warnings.push(`Found ${report.clichesFound.length} overused cliché(s). Consider replacing them with concrete examples.`);
  }

  // 3. Bullets Analysis
  const allBullets = [
    ...resume.experience.flatMap(e => e.bullets),
    ...resume.projects.flatMap(p => p.bullets)
  ];
  report.totalBullets = allBullets.length;

  const actionVerbs = new Map<string, number>();

  for (const bullet of allBullets) {
    const lower = bullet.toLowerCase().trim();
    const words = lower.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    if (wordCount > report.longestBulletWords) {
      report.longestBulletWords = wordCount;
    }

    // Check for metrics (digits)
    if (/\d/.test(bullet)) {
      report.bulletsWithMetrics++;
    }

    // Check for weak verbs
    const firstTwoWords = words.slice(0, 2).join(" ");
    if (words.length > 0) {
      if (WEAK_VERBS.has(words[0]) || WEAK_VERBS.has(firstTwoWords)) {
        report.weakBullets++;
      }
      
      // Track starting verbs to find redundancy
      const firstWord = words[0].replace(/[^a-z]/g, '');
      if (firstWord && !WEAK_VERBS.has(firstWord)) {
         actionVerbs.set(firstWord, (actionVerbs.get(firstWord) || 0) + 1);
      }
    }
  }

  if (report.weakBullets > 0) {
    report.warnings.push(`Found ${report.weakBullets} bullet(s) starting with weak verbs (e.g., 'helped', 'worked'). Start with strong action verbs (e.g., 'Architected', 'Developed').`);
  }

  if (report.longestBulletWords > 35) {
    report.warnings.push(`Longest bullet is ${report.longestBulletWords} words. Consider keeping bullets under 30 words for readability.`);
  }

  // 4. Redundancy
  for (const [verb, count] of actionVerbs.entries()) {
    if (count > 3) {
      report.warnings.push(`You started ${count} bullets with the word '${verb}'. Try varying your action verbs.`);
    }
  }

  // 5. Contact Info
  if (!resume.contact.email && !resume.contact.phone) {
    report.warnings.push("Missing contact information (Email/Phone).");
  }

  return report;
}
