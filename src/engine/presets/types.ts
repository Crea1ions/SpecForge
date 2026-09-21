/**
 * Type d'un preset d'architecture.
 */

import { ProjectSpecification } from '../../core';

export interface ArchitecturePreset {
  id: string;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  category: 'fullstack' | 'desktop' | 'backend' | 'frontend' | 'mobile';
  spec: ProjectSpecification;
}
