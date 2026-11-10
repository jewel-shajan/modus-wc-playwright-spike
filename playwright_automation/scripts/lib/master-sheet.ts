import fs from 'node:fs';

export interface SheetRow {
  rowNumber: number;
  component: string;
  scenarioId: string;
  title: string;
  automate: boolean;
  raw: Record<string, string>;
}

const COMPONENT_KEYS = ['component', 'components', 'wc', 'tag', 'name'];
const ID_KEYS = ['id', 'test id', 'test_id', 'case id', 'case_id'];
const TITLE_KEYS = ['title', 'scenario', 'test case', 'test_case', 'description'];
const AUTOMATE_KEYS = ['automate', 'automation', 'playwright', 'e2e'];

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function pickColumn(
  headers: string[],
  keys: string[]
): string | undefined {
  for (const header of headers) {
    const norm = normalizeHeader(header);
    if (keys.some((key) => norm.includes(key))) {
      return header;
    }
  }
  return undefined;
}

function parseAutomate(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) {
    return true;
  }
  if (['no', 'n', 'manual', 'skip', 'false', '0'].includes(v)) {
    return false;
  }
  return true;
}

/** Minimal RFC4180-style CSV line parser (handles quoted fields). */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

export function loadMasterSheet(csvPath: string): SheetRow[] {
  if (!fs.existsSync(csvPath)) {
    return [];
  }

  const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  const componentCol = pickColumn(headers, COMPONENT_KEYS);
  const idCol = pickColumn(headers, ID_KEYS);
  const titleCol = pickColumn(headers, TITLE_KEYS);
  const automateCol = pickColumn(headers, AUTOMATE_KEYS);

  const rows: SheetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const raw: Record<string, string> = {};
    headers.forEach((header, idx) => {
      raw[header] = values[idx] ?? '';
    });

    const component = componentCol ? raw[componentCol] ?? '' : '';
    const scenarioId = idCol ? raw[idCol] ?? '' : `ROW-${i + 1}`;
    const title = titleCol ? raw[titleCol] ?? '' : component;
    const automate = automateCol
      ? parseAutomate(raw[automateCol] ?? '')
      : true;

    if (!component.trim()) {
      continue;
    }

    rows.push({
      rowNumber: i + 1,
      component: component.trim(),
      scenarioId: scenarioId.trim(),
      title: title.trim(),
      automate,
      raw,
    });
  }

  return rows;
}

export function sheetRowsForTag(rows: SheetRow[], tag: string): SheetRow[] {
  const slug = tag.replace(/^modus-wc-/, '');
  const patterns = [
    tag.toLowerCase(),
    slug.toLowerCase(),
    slug.replace(/-/g, ' ').toLowerCase(),
  ];

  return rows.filter((row) => {
    const c = row.component.toLowerCase();
    return patterns.some(
      (pattern) => c === pattern || c.includes(pattern) || pattern.includes(c)
    );
  });
}
