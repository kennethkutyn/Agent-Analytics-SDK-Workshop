/**
 * Toggle a step block between commented and uncommented.
 * Finds the block between STEP markers and flips code lines.
 * Description lines (Uncomment..., That's it..., etc.) stay commented.
 */
export function toggleStepBlock(code: string, stepNum: number): string {
  const marker = `STEP ${stepNum}`;
  const lines = code.split('\n');

  // Find start marker
  const startIdx = lines.findIndex((line) => line.includes(`------ ${marker}`));
  if (startIdx === -1) return code;

  // Find end marker
  let endIdx = -1;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].match(/^\s*# -{10,}/)) {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) return code;

  // Determine if block is currently commented (all code lines start with #)
  const blockLines = lines.slice(startIdx + 1, endIdx);
  const codeLineIndices: number[] = [];

  blockLines.forEach((line, offset) => {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed === '#') return;
    // Skip description lines
    if (trimmed.match(/^#\s+(Uncomment|That's|Now|Build|measure|Links|Every|Session|Deterministic|Edit|Runs|Compare|Free|Live|Uses|Label|Open|-\s*\[)/i)) return;
    codeLineIndices.push(startIdx + 1 + offset);
  });

  if (codeLineIndices.length === 0) return code;

  // Check if currently active (at least one code line is uncommented)
  const isActive = codeLineIndices.some((idx) => !lines[idx].trim().startsWith('#'));

  if (isActive) {
    // Comment out: add "# " prefix to each code line
    for (const idx of codeLineIndices) {
      const line = lines[idx];
      const leadingWhitespace = line.match(/^(\s*)/)?.[1] || '';
      const content = line.trimStart();
      if (!content.startsWith('#')) {
        lines[idx] = leadingWhitespace + '# ' + content;
      }
    }
  } else {
    // Uncomment: remove "# " prefix from each code line
    for (const idx of codeLineIndices) {
      const line = lines[idx];
      const leadingWhitespace = line.match(/^(\s*)/)?.[1] || '';
      let content = line.trimStart();
      // Remove "# " or "#" prefix (one layer only)
      if (content.startsWith('# ')) {
        content = content.slice(2);
      } else if (content.startsWith('#')) {
        content = content.slice(1);
      }
      lines[idx] = leadingWhitespace + content;
    }
  }

  return lines.join('\n');
}
