import { Scenario, ScenarioId } from './types';

export const scenarios: Record<string, Scenario> = {
  general: {
    id: 'general',
    name: 'General Shopping',
    description:
      'Track anything. A flexible workspace with every tool available — for any shopping pursuit that matters to you.',
    icon: 'ShoppingBag',
    color: '#7C3AED', // purple — distinct from the other three
    tools: [
      'rubber-duck',
      'reverse-catalog',
      'recipe-builder',
      '3d-visualizer',
      'website-watcher',
      'price-watcher',
    ],
    productSchema: [
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'model', label: 'Model / Variant', type: 'text' },
      {
        key: 'condition',
        label: 'Condition',
        type: 'select',
        options: ['Any', 'New', 'Like New', 'Good', 'Fair', 'For Parts'],
      },
      { key: 'size', label: 'Size / Dimensions', type: 'text' },
      { key: 'tags', label: 'Tags', type: 'tags' },
      { key: 'max_price', label: 'Max Price', type: 'currency' },
      {
        key: 'priority',
        label: 'Priority',
        type: 'select',
        options: ['Must Have', 'Nice to Have', 'Someday'],
      },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  books: {
    id: 'books',
    name: 'Books',
    description:
      'Hunt for books — especially rare and used editions in secondhand bookstores.',
    icon: 'BookOpen',
    color: '#8B6914',
    tools: ['rubber-duck', 'reverse-catalog', 'website-watcher'],
    productSchema: [
      { key: 'isbn', label: 'ISBN', type: 'text' },
      { key: 'author', label: 'Author', type: 'text' },
      { key: 'edition', label: 'Edition', type: 'text' },
      {
        key: 'condition',
        label: 'Desired Condition',
        type: 'select',
        options: ['Any', 'Good', 'Very Good', 'Fine', 'Like New'],
      },
      { key: 'max_price', label: 'Max Price', type: 'currency' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  recipes: {
    id: 'recipes',
    name: 'Recipes & Ingredients',
    description: 'Explore recipes and source the perfect ingredients.',
    icon: 'ChefHat',
    color: '#2E7D32',
    tools: ['rubber-duck', 'reverse-catalog', 'recipe-builder'],
    productSchema: [
      { key: 'ingredient_name', label: 'Ingredient', type: 'text' },
      { key: 'quantity', label: 'Quantity', type: 'text' },
      { key: 'quality', label: 'Quality / Origin', type: 'text' },
      { key: 'substitutes', label: 'Substitutes', type: 'tags' },
      { key: 'store', label: 'Preferred Store / Market', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'sneakers-streetwear': {
    id: 'sneakers-streetwear',
    name: 'Sneakers & Streetwear',
    description: 'Find sneakers and build outfits that go with them.',
    icon: 'Footprints',
    color: '#1565C0',
    tools: ['rubber-duck', 'reverse-catalog', '3d-visualizer', 'price-watcher'],
    productSchema: [
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'colorway', label: 'Colorway', type: 'text' },
      { key: 'size', label: 'Size', type: 'text' },
      { key: 'style_tags', label: 'Style Tags', type: 'tags' },
      { key: 'max_price', label: 'Max Price', type: 'currency' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
};

export function getScenario(id: ScenarioId | string): Scenario | undefined {
  return scenarios[id];
}

export const scenarioList: Scenario[] = Object.values(scenarios);
