export interface FlashcardCandidate {
  front: string;
  back: string;
}

/**
 * Extracts flashcard candidates from Markdown text.
 *
 * Supported patterns:
 *  1. **Term** - answer       (hyphen)
 *  2. **Term**: answer        (colon)
 *  3. **Term** — answer       (em dash)
 *  4. **Term** – answer       (en dash)
 *  5. **Term** → answer       (arrow)
 *  6. **Term**, answer        (comma — only when answer is ≥3 words)
 *  7. ### Heading + first non-empty paragraph as answer
 *  8. ## Heading + first non-empty paragraph
 *
 * Returns deduplicated list (by front text, case-insensitive).
 */
export function extractFlashcards(markdown: string): FlashcardCandidate[] {
  const raw: FlashcardCandidate[] = [];
  const seen = new Set<string>();

  const add = (front: string, back: string) => {
    const f = front.trim();
    const b = back.trim();
    if (!f || !b || f.length > 200 || b.length > 1000) return;
    const key = f.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    raw.push({ front: f, back: b });
  };

  // Pattern 1-6: **Bold** <separator> answer (whole line)
  // Separators: - — – → : ,
  // For comma we require ≥3 words in the answer to reduce false positives
  const inlineRe =
    /\*\*(.+?)\*\*\s*([-—–→:]|,(?=\s+\S+\s+\S+\s+\S))\s*(.+?)(?=\n|$)/g;
  let m: RegExpExecArray | null;
  while ((m = inlineRe.exec(markdown)) !== null) {
    add(m[1], m[3]);
  }

  // Pattern 7-8: ## / ### Heading → next paragraph as answer
  // Split by headings of level 1-3
  const headingRe = /^(#{1,3})\s+(.+)$/gm;
  while ((m = headingRe.exec(markdown)) !== null) {
    const headingText = m[2].trim();
    const afterHeading = markdown.slice(m.index + m[0].length);
    // Find first non-empty block (not another heading)
    const firstBlock = afterHeading
      .split(/\n(?=#{1,3}\s)/) // stop at next heading
      [0]
      .split(/\n\n+/) // split into paragraphs
      .map(p => p.trim())
      .filter(p => p.length > 0 && !p.startsWith('#'))[0];

    if (firstBlock) {
      // Strip markdown formatting for cleaner answer
      const cleanBlock = firstBlock
        .replace(/\*\*(.+?)\*\*/g, '$1') // remove bold
        .replace(/\*(.+?)\*/g, '$1')     // remove italic
        .replace(/`(.+?)`/g, '$1')        // remove code
        .replace(/^[-*+]\s+/gm, '')       // remove list bullets
        .trim();
      if (cleanBlock.length >= 5 && cleanBlock.length <= 800) {
        add(headingText, cleanBlock);
      }
    }
  }

  return raw;
}

/**
 * Generates Obsidian-compatible YAML frontmatter for a note.
 */
export function buildFrontmatter(params: {
  title: string;
  tags?: string[];
  subject?: string;
  created: string;
  updated: string;
}): string {
  const lines = ['---'];
  lines.push(`title: "${params.title.replace(/"/g, '\\"')}"`);
  if (params.tags && params.tags.length > 0) {
    lines.push(`tags: [${params.tags.map(t => `"${t}"`).join(', ')}]`);
  } else {
    lines.push('tags: []');
  }
  if (params.subject) {
    lines.push(`subject: "${params.subject.replace(/"/g, '\\"')}"`);
  }
  lines.push(`created: ${params.created}`);
  lines.push(`updated: ${params.updated}`);
  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

/**
 * Parses YAML frontmatter from an .md file string.
 * Returns { frontmatter, body } where frontmatter is a key-value map.
 */
export function parseFrontmatter(content: string): {
  title?: string;
  tags?: string[];
  subject?: string;
  created?: string;
  updated?: string;
  body: string;
} {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) return { body: content };

  const fmRaw = fmMatch[1];
  const body = fmMatch[2].trimStart();

  const get = (key: string): string | undefined => {
    const re = new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, 'm');
    return fmRaw.match(re)?.[1]?.trim();
  };

  const tagsMatch = fmRaw.match(/^tags:\s*\[([^\]]*)\]/m);
  const tags = tagsMatch
    ? tagsMatch[1]
        .split(',')
        .map(t => t.trim().replace(/^"|"$/g, ''))
        .filter(Boolean)
    : undefined;

  return {
    title: get('title'),
    tags,
    subject: get('subject'),
    created: get('created'),
    updated: get('updated'),
    body,
  };
}
