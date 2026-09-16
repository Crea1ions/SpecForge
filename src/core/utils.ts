/**
 * SpecForge Core - Isomorphic Utilities
 * 
 * Works identically in Node.js, Web Browsers, CLI, and WebWorkers.
 * Strictly free of DOM, window, document, or React dependencies.
 */

import { GeneratedFile } from './types';

const encoder = new TextEncoder();

/**
 * Returns the UTF-8 byte length of a string without depending on browser-specific Blob API.
 */
export function getContentByteLength(content: string): number {
  return encoder.encode(content).length;
}

/**
 * Computes a deterministic 64-bit hex hash from generated files (paths and full contents).
 * Uses FNV-1a 64-bit hash algorithm over UTF-8 bytes.
 */
export function computeDeterministicFilesHash(files: GeneratedFile[]): string {
  // 1. Sort files deterministically by path
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

  // FNV-1a 64-bit constants
  let h1 = 0x811c9dc5;
  let h2 = 0x22137277;

  for (const file of sorted) {
    const payload = `${file.path}\0${file.language}\0${file.brickId}\0${file.content}\n`;
    const bytes = encoder.encode(payload);

    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      h1 = Math.imul(h1 ^ b, 0x01000193);
      h2 = Math.imul(h2 ^ (b + (h1 & 0xff)), 0x01000193);
    }
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${hex1}${hex2}`;
}
