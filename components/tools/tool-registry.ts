import type { Project } from '@/lib/types';

/** Props every tool component receives. */
export interface ToolProps {
  project: Project;
}

export interface ToolMeta {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  description: string;
  functional: boolean;
}

/** Metadata for every tool that can appear in a scenario's tool list. */
export const toolMeta: Record<string, ToolMeta> = {
  'rubber-duck': {
    id: 'rubber-duck',
    name: 'Rubber Duck',
    icon: 'MessageCircle',
    description:
      'A shopping companion that knows your project. Think out loud, get honest second opinions.',
    functional: true,
  },
  'reverse-catalog': {
    id: 'reverse-catalog',
    name: 'Reverse Catalog',
    icon: 'Library',
    description:
      'Your personal catalog of things to find. Track what you want, where to get it, and for how much.',
    functional: true,
  },
  'recipe-builder': {
    id: 'recipe-builder',
    name: 'Recipe Builder',
    icon: 'UtensilsCrossed',
    description:
      'Build recipes and check off ingredients as you source them.',
    functional: true,
  },
  'website-watcher': {
    id: 'website-watcher',
    name: 'Website Watcher',
    icon: 'Eye',
    description:
      'Monitor bookstore websites for ISBN availability and price drops. Coming in v2.',
    functional: false,
  },
  '3d-visualizer': {
    id: '3d-visualizer',
    name: '3D Product Visualizer',
    icon: 'Boxes',
    description: 'Interactive 3D viewer for sneaker models. Coming in v2.',
    functional: false,
  },
  'price-watcher': {
    id: 'price-watcher',
    name: 'Price Watcher',
    icon: 'TrendingUp',
    description:
      'Track price evolution across multiple retailers. Get alerts for good opportunities. Coming in v2.',
    functional: false,
  },
};

export function getToolMeta(id: string): ToolMeta | undefined {
  return toolMeta[id];
}
