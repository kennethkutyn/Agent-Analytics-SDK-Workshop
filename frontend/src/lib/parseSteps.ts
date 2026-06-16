import { StepConfig } from '../types';

/**
 * Parse the editor content to determine which steps are active.
 * A step block is "active" when the code lines between its markers
 * are uncommented (don't start with #).
 */
export function parseStepConfig(code: string): StepConfig {
  return {
    step_1_ai_sdk: isBlockUncommented(code, 'STEP 1'),
    step_2_user_identity: isBlockUncommented(code, 'STEP 2'),
    step_3_sessions: isBlockUncommented(code, 'STEP 3'),
    step_4_scoring: isBlockUncommented(code, 'STEP 4'),
    step_5_code_eval: isBlockUncommented(code, 'STEP 5'),
    step_6_llm_judge: isBlockUncommented(code, 'STEP 6'),
  };
}

function isBlockUncommented(code: string, stepMarker: string): boolean {
  const lines = code.split('\n');

  // Find the start marker line
  const startIdx = lines.findIndex((line) =>
    line.includes(`------ ${stepMarker}`)
  );
  if (startIdx === -1) return false;

  // Find the end marker (line of dashes)
  let endIdx = -1;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].match(/^\s*# -{10,}/)) {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) return false;

  // Get the code lines between markers (skip description comments and blank lines)
  const codeLines = lines.slice(startIdx + 1, endIdx).filter((line) => {
    const trimmed = line.trim();
    // Skip empty lines and description-only comment lines
    if (trimmed === '' || trimmed === '#') return false;
    // Skip lines that are clearly descriptions (start with "# " followed by text that isn't code)
    if (trimmed.match(/^#\s+(Uncomment|That's|Now|Build|measure|Links|Every|session|Deterministic|Edit|Runs|Compare|Free|Live|Uses|Session|Label|Open)/i))
      return false;
    return true;
  });

  if (codeLines.length === 0) return false;

  // The block is "uncommented" if at least one code line doesn't start with #
  const uncommentedLines = codeLines.filter((line) => {
    const trimmed = line.trim();
    return !trimmed.startsWith('#');
  });

  return uncommentedLines.length > 0;
}
