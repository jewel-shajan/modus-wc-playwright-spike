import fs from 'node:fs';
import { GRAPH_PATH } from './paths.js';

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

export interface ComponentGraph {
  edges?: GraphEdge[];
  reverseImpact?: Record<string, string[]>;
}

export function loadGraph(): ComponentGraph {
  const raw = fs.readFileSync(GRAPH_PATH, 'utf8');
  return JSON.parse(raw) as ComponentGraph;
}

const TAG_FROM_PATH =
  /src\/components\/(modus-wc-[a-z0-9-]+)\//;

export function tagsFromDiffPaths(paths: string[]): string[] {
  const tags = new Set<string>();
  for (const filePath of paths) {
    const match = TAG_FROM_PATH.exec(filePath.replace(/\\/g, '/'));
    if (match) {
      tags.add(match[1]);
    }
  }
  return [...tags].sort();
}

export function composeChildren(graph: ComponentGraph, tag: string): string[] {
  const edges = graph.edges ?? [];
  const children = new Set<string>();
  for (const edge of edges) {
    if (
      edge.source === tag &&
      (edge.type === 'composes' || edge.type === 'slot' || edge.type === 'hosts')
    ) {
      children.add(edge.target);
    }
  }
  return [...children].sort();
}

export function parentDependents(
  graph: ComponentGraph,
  tag: string
): string[] {
  return [...(graph.reverseImpact?.[tag] ?? [])].sort();
}

export interface ResolvedScope {
  changedTags: string[];
  parentTags: string[];
  composeChildTags: string[];
  /** Tags to run Playwright folders for (slugs derived separately). */
  runTags: string[];
}

export function resolveScope(
  changedTags: string[],
  options: { includeParents?: boolean; parentCap?: number } = {}
): ResolvedScope {
  const graph = loadGraph();
  const parentCap = options.parentCap ?? 3;
  const parentSet = new Set<string>();
  const childSet = new Set<string>();

  for (const tag of changedTags) {
    for (const child of composeChildren(graph, tag)) {
      childSet.add(child);
    }
    if (options.includeParents) {
      for (const parent of parentDependents(graph, tag)) {
        parentSet.add(parent);
      }
    }
  }

  const parentTags = [...parentSet].sort().slice(0, parentCap);
  const composeChildTags = [...childSet].sort();
  const runSet = new Set<string>(changedTags);
  if (options.includeParents) {
    for (const p of parentTags) {
      runSet.add(p);
    }
  }

  return {
    changedTags,
    parentTags,
    composeChildTags,
    runTags: [...runSet].sort(),
  };
}
