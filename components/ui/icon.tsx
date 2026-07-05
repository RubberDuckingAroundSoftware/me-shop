import {
  BookOpen,
  ChefHat,
  Footprints,
  MessageCircle,
  Library,
  Boxes,
  Eye,
  TrendingUp,
  UtensilsCrossed,
  HelpCircle,
  ShoppingBag,
  Plus,
  type LucideIcon,
} from 'lucide-react';

// Explicit map keeps the bundle small and avoids dynamic-import overhead.
const registry: Record<string, LucideIcon> = {
  BookOpen,
  ChefHat,
  Footprints,
  MessageCircle,
  Library,
  Boxes,
  Eye,
  TrendingUp,
  UtensilsCrossed,
  HelpCircle,
  ShoppingBag,
  Plus,
};

export interface IconProps {
  name: string;
  className?: string;
}

/** Render a Lucide icon by its string name (falls back to HelpCircle). */
export function Icon({ name, className }: IconProps) {
  const Cmp = registry[name] ?? HelpCircle;
  return <Cmp className={className} />;
}

export function getLucideIcon(name: string): LucideIcon {
  return registry[name] ?? HelpCircle;
}
