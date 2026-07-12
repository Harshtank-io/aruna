'use client';

import type { ReactNode } from 'react';

/** ponytail: tiny MD subset for scout briefings — no react-markdown dep */

function inlineMarks(text: string): ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(
        <strong key={key++} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <code
          key={key++}
          className="border border-line bg-paper-soft px-1 py-0.5 font-mono text-[0.85em] text-ink"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length > 0 ? parts : [text];
}

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'p'; text: string };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i] ?? '';
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.slice(2) });
      i += 1;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.slice(3) });
      i += 1;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.slice(4) });
      i += 1;
      continue;
    }
    if (trimmed.startsWith('>')) {
      blocks.push({
        type: 'quote',
        text: trimmed.replace(/^>\s?/, ''),
      });
      i += 1;
      continue;
    }
    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const itemLine = (lines[i] ?? '').trim();
        if (!itemLine) {
          break;
        }
        const bullet = itemLine.match(/^[-*]\s+(.*)$/);
        const numbered = itemLine.match(/^\d+\.\s+(.*)$/);
        if (bullet) {
          items.push(bullet[1] ?? '');
          i += 1;
          continue;
        }
        if (numbered) {
          items.push(numbered[1] ?? '');
          i += 1;
          continue;
        }
        break;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    const para: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = (lines[i] ?? '').trim();
      if (
        !next ||
        next.startsWith('#') ||
        next.startsWith('>') ||
        /^[-*]\s+/.test(next) ||
        /^\d+\.\s+/.test(next)
      ) {
        break;
      }
      para.push(next);
      i += 1;
    }
    blocks.push({ type: 'p', text: para.join(' ') });
  }

  return blocks;
}

export function BriefingPanel({ markdown }: { markdown: string }) {
  const blocks = parseBlocks(markdown);

  return (
    <article className="box mt-5 overflow-hidden">
      <header className="border-b border-line bg-paper-soft px-4 py-3">
        <h3 className="label-caps text-accent">AI briefing</h3>
      </header>
      <div className="briefing-prose space-y-3 px-4 py-4">
        {blocks.map((block, index) => {
          if (block.type === 'h1') {
            return (
              <h2
                key={index}
                className="font-modern text-xl font-bold leading-tight tracking-tight text-ink"
              >
                {inlineMarks(block.text)}
              </h2>
            );
          }
          if (block.type === 'h2') {
            return (
              <h3
                key={index}
                className="font-modern mt-2 border-t border-line pt-3 text-sm font-bold uppercase tracking-[0.12em] text-accent"
              >
                {inlineMarks(block.text)}
              </h3>
            );
          }
          if (block.type === 'h3') {
            return (
              <h4
                key={index}
                className="font-modern text-base font-semibold text-ink"
              >
                {inlineMarks(block.text)}
              </h4>
            );
          }
          if (block.type === 'quote') {
            return (
              <blockquote
                key={index}
                className="border-l-2 border-accent bg-paper-soft px-3 py-2 text-sm leading-relaxed text-ink-soft"
              >
                {inlineMarks(block.text)}
              </blockquote>
            );
          }
          if (block.type === 'list') {
            return (
              <ul key={index} className="space-y-2 pl-0">
                {block.items.map((item, itemIndex) => (
                  <li
                    key={itemIndex}
                    className="relative pl-4 text-sm leading-relaxed text-ink before:absolute before:left-0 before:top-[0.55em] before:size-1.5 before:bg-accent"
                  >
                    {inlineMarks(item)}
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <p
              key={index}
              className="text-sm leading-relaxed text-ink-soft"
            >
              {inlineMarks(block.text)}
            </p>
          );
        })}
      </div>
    </article>
  );
}
