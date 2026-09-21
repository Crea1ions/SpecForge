/**
 * Helpers partagés par les briques : construction des GeneratedFile.
 */

import { GeneratedFile } from '../types';
import { getContentByteLength } from '../utils';

export function makeFile(
  path: string,
  content: string,
  language: GeneratedFile['language'],
  brickId: string,
  brickName: string,
  brickVersion: string,
  reason: string,
  decisionRef?: string
): GeneratedFile {
  return {
    path,
    content: content.trimStart(),
    language,
    size: getContentByteLength(content),
    brickId,
    brickName,
    brickVersion,
    reason,
    decisionRef,
  };
}

/** Fichier binaire : `contentBase64` est stocké tel quel, `size` = octets réels décodés. */
export function makeBinaryFile(
  path: string,
  contentBase64: string,
  brickId: string,
  brickName: string,
  brickVersion: string,
  reason: string,
  decisionRef?: string
): GeneratedFile {
  const padding = contentBase64.endsWith('==') ? 2 : contentBase64.endsWith('=') ? 1 : 0;
  return {
    path,
    content: contentBase64,
    encoding: 'base64',
    language: 'binary',
    size: Math.floor((contentBase64.length * 3) / 4) - padding,
    brickId,
    brickName,
    brickVersion,
    reason,
    decisionRef,
  };
}
