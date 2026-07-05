/**
 * Seed the meShop database with sample data.
 * Run with: pnpm db:seed   (or pnpm db:reset to wipe first)
 *
 * Written standalone (raw better-sqlite3) so it can run under tsx without
 * Next.js path-alias resolution.
 */
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.DATABASE_PATH || path.join('db', 'meshop.db');
const resolved = path.isAbsolute(DB_PATH)
  ? DB_PATH
  : path.join(process.cwd(), DB_PATH);

fs.mkdirSync(path.dirname(resolved), { recursive: true });

const db = new Database(resolved);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(
  path.join(process.cwd(), 'db', 'schema.sql'),
  'utf8'
);
db.exec(schema);

// Clear existing data (idempotent seed).
db.exec(`
  DELETE FROM products;
  DELETE FROM conversations;
  DELETE FROM recipes;
  DELETE FROM projects;
  DELETE FROM llm_config;
  DELETE FROM users;
`);

// Demo user — owns all the sample data below. Password: "meshop".
const DEMO_USER_ID = 'seed_user';
const DEMO_PASSWORD = 'meshop';
const hashedPassword = bcrypt.hashSync(DEMO_PASSWORD, 10);

db.prepare(
  `INSERT INTO users (id, email, name, password, created_at, updated_at)
   VALUES (@id, @email, @name, @password, @createdAt, @updatedAt)`
).run({
  id: DEMO_USER_ID,
  email: 'demo@meshop.world',
  name: 'Demo User',
  password: hashedPassword,
  createdAt: '2026-05-01T08:00:00Z',
  updatedAt: '2026-05-01T08:00:00Z',
});

const projects = [
  {
    id: 'proj_rare_scifi',
    name: 'Rare Sci-Fi Collection',
    scenarioId: 'books',
    createdAt: '2026-05-10T08:00:00Z',
    updatedAt: '2026-06-28T14:30:00Z',
  },
  {
    id: 'proj_sunday_italian',
    name: 'Sunday Italian Dinner',
    scenarioId: 'recipes',
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-30T09:15:00Z',
  },
  {
    id: 'proj_fall_rotation',
    name: 'Fall Rotation 2026',
    scenarioId: 'sneakers-streetwear',
    createdAt: '2026-06-15T12:00:00Z',
    updatedAt: '2026-07-01T16:45:00Z',
  },
  {
    id: 'proj_home_office',
    name: 'Home Office Setup',
    scenarioId: 'general',
    createdAt: '2026-06-20T09:00:00Z',
    updatedAt: '2026-07-03T11:20:00Z',
  },
];

const products = [
  {
    id: 'prod_dune_1st',
    projectId: 'proj_rare_scifi',
    name: 'Dune — First Edition',
    description:
      'Frank Herbert, 1965 Chilton Books first edition. Hunting for a copy in at least Good condition with intact dust jacket.',
    metadata: {
      isbn: 'none (pre-ISBN)',
      author: 'Frank Herbert',
      edition: '1st Edition, 1st Printing (Chilton, 1965)',
      condition: 'Good',
      max_price: '5000',
      notes:
        'Dust jacket is the holy grail. Prices have been climbing since the Villeneuve films. Check AbeBooks weekly.',
    },
    sources: [
      {
        url: 'https://www.abebooks.com',
        storeName: 'AbeBooks',
        price: 6500,
        currency: 'USD',
        notes: 'Several listings, most above budget',
      },
      {
        url: 'https://www.biblio.com',
        storeName: 'Biblio',
        notes: 'Occasionally appears, set alert',
      },
    ],
    status: 'hunting',
  },
  {
    id: 'prod_neuromancer_1st',
    projectId: 'proj_rare_scifi',
    name: 'Neuromancer — First Edition',
    description:
      'William Gibson, 1984 Ace Books first edition. The book that launched cyberpunk.',
    metadata: {
      isbn: '0-441-56959-5',
      author: 'William Gibson',
      edition: '1st Edition, Ace Books, 1984',
      condition: 'Very Good',
      max_price: '2000',
      notes:
        'Mass market paperback original — there was no hardcover first. Look for unread copies with tight spine.',
    },
    sources: [
      {
        url: 'https://www.abebooks.com',
        storeName: 'AbeBooks',
        price: 1800,
        currency: 'USD',
      },
    ],
    status: 'found',
  },
  {
    id: 'prod_lefthand_1st',
    projectId: 'proj_rare_scifi',
    name: 'The Left Hand of Darkness — First Edition',
    description: 'Ursula K. Le Guin, 1969. Ace Books hardcover first edition.',
    metadata: {
      isbn: 'none',
      author: 'Ursula K. Le Guin',
      edition: '1st Edition, Ace, 1969',
      condition: 'Any',
      max_price: '800',
      notes: 'Flexible on condition. Just want a first printing.',
    },
    sources: [],
    status: 'hunting',
  },
  {
    id: 'prod_am1_patta',
    projectId: 'proj_fall_rotation',
    name: "Nike Air Max 1 x Patta 'Waves'",
    description: 'The monarch orange colorway. Grail tier.',
    metadata: {
      brand: 'Nike',
      model: 'Air Max 1 x Patta',
      colorway: 'Monarch / Noise Aqua',
      size: 'EU 43 / US 9.5',
      style_tags: 'retro,collab,patta,fall',
      max_price: '350',
      notes: 'Resale prices fluctuate. Watch StockX and GOAT for dips.',
    },
    sources: [
      {
        url: 'https://stockx.com',
        storeName: 'StockX',
        price: 380,
        currency: 'USD',
        notes: 'Slightly above budget, waiting for dip',
      },
      {
        url: 'https://www.goat.com',
        storeName: 'GOAT',
        price: 395,
        currency: 'USD',
      },
    ],
    status: 'hunting',
  },
  {
    id: 'prod_nb550',
    projectId: 'proj_fall_rotation',
    name: "New Balance 550 'White Green'",
    description: 'Clean pair for everyday rotation. Below retail if possible.',
    metadata: {
      brand: 'New Balance',
      model: '550',
      colorway: 'White / Green',
      size: 'EU 43 / US 9.5',
      style_tags: 'everyday,clean,casual',
      max_price: '120',
      notes: 'These restock often. Patience.',
    },
    sources: [
      {
        url: 'https://www.newbalance.com',
        storeName: 'New Balance',
        price: 110,
        currency: 'USD',
        notes: 'In stock, but waiting for a promo code',
      },
    ],
    status: 'found',
  },
  {
    id: 'prod_stussy_hoodie',
    projectId: 'proj_fall_rotation',
    name: 'Stüssy Basic Hoodie — Black',
    description: 'Goes with everything in the fall rotation. Size L.',
    metadata: {
      brand: 'Stüssy',
      model: 'Basic Stüssy Hoodie',
      colorway: 'Black',
      size: 'L',
      style_tags: 'basic,layer,streetwear',
      max_price: '100',
      notes: 'Simple. Black. Done.',
    },
    sources: [
      {
        url: 'https://www.stussy.com',
        storeName: 'Stüssy',
        price: 95,
        currency: 'USD',
      },
    ],
    status: 'bought',
  },
  {
    id: 'prod_monitor',
    projectId: 'proj_home_office',
    name: 'LG 27UK850-W 27" 4K Monitor',
    description:
      '4K IPS panel with USB-C. Good color accuracy for the price. Hunting for a refurbished unit.',
    metadata: {
      category: 'Monitor',
      brand: 'LG',
      model: '27UK850-W',
      condition: 'Like New',
      size: '27 inch',
      tags: '4K,USB-C,IPS,refurbished',
      max_price: '280',
      priority: 'Must Have',
      notes:
        'Check manufacturer refurb store. Also look at the 27UL850 (newer revision, same panel).',
    },
    sources: [
      {
        url: 'https://www.lg.com',
        storeName: 'LG Refurb Store',
        price: 299,
        currency: 'USD',
        notes: 'Refurbished units appear sporadically',
      },
      {
        url: 'https://www.backmarket.com',
        storeName: 'Back Market',
        price: 265,
        currency: 'USD',
        notes: 'Grade A available',
      },
    ],
    status: 'hunting',
  },
  {
    id: 'prod_chair',
    projectId: 'proj_home_office',
    name: 'Herman Miller Aeron — Size B',
    description: 'The classic. Looking for a used one from an office liquidator.',
    metadata: {
      category: 'Chair',
      brand: 'Herman Miller',
      model: 'Aeron Remastered',
      condition: 'Good',
      size: 'B (Medium)',
      tags: 'ergonomic,mesh,office',
      max_price: '600',
      priority: 'Must Have',
      notes:
        'Office liquidators in Bucharest sometimes have these from multinational office closures. Also check OLX.',
    },
    sources: [
      {
        url: 'https://www.olx.ro',
        storeName: 'OLX Romania',
        notes: "Search weekly for 'Herman Miller' or 'Aeron'",
      },
    ],
    status: 'hunting',
  },
  {
    id: 'prod_keyboard',
    projectId: 'proj_home_office',
    name: 'Keychron Q1 Pro — Gateron Brown',
    description: 'Wireless, hot-swappable, aluminum. Endgame territory.',
    metadata: {
      category: 'Keyboard',
      brand: 'Keychron',
      model: 'Q1 Pro',
      condition: 'New',
      size: '75%',
      tags: 'mechanical,wireless,hot-swap,aluminum',
      max_price: '200',
      priority: 'Nice to Have',
      notes:
        'Not urgent. Current keyboard works fine. Wait for a holiday sale.',
    },
    sources: [
      {
        url: 'https://www.keychron.com',
        storeName: 'Keychron',
        price: 199,
        currency: 'USD',
      },
    ],
    status: 'found',
  },
  {
    id: 'prod_deskmat',
    projectId: 'proj_home_office',
    name: 'Grovemade Wool Felt Desk Pad',
    description: 'Large, dark grey. Ties the desk together.',
    metadata: {
      category: 'Desk Accessory',
      brand: 'Grovemade',
      model: 'Wool Felt Desk Pad',
      condition: 'New',
      size: 'Large (36" x 17")',
      tags: 'desk,wool,minimal',
      max_price: '120',
      priority: 'Someday',
      notes: 'Pure aesthetics purchase. Last on the list.',
    },
    sources: [
      {
        url: 'https://grovemade.com',
        storeName: 'Grovemade',
        price: 120,
        currency: 'USD',
      },
    ],
    status: 'hunting',
  },
];

const recipes = [
  {
    id: 'recipe_cacio',
    projectId: 'proj_sunday_italian',
    name: 'Cacio e Pepe',
    description: 'The Roman classic. Three ingredients, zero margin for error.',
    servings: 4,
    prepTime: '5 min',
    cookTime: '15 min',
    ingredients: [
      {
        name: 'Spaghetti (or tonnarelli)',
        quantity: '400',
        unit: 'g',
        found: true,
        sourceStore: 'Local market',
      },
      {
        name: 'Pecorino Romano DOP',
        quantity: '200',
        unit: 'g',
        notes:
          "Must be genuine Pecorino Romano, not generic. Grate it yourself — pre-grated won't emulsify.",
        found: false,
      },
      {
        name: 'Black pepper',
        quantity: '2',
        unit: 'tbsp',
        notes:
          'Whole Tellicherry peppercorns, freshly cracked. This is a pepper dish — quality matters.',
        found: true,
        sourceStore: 'Obor market',
      },
    ],
    instructions: [
      'Bring a large pot of water to boil. Salt it less than usual — the Pecorino is very salty.',
      'Toast the cracked black pepper in a dry large skillet over medium heat for 1-2 minutes until fragrant.',
      'Add 2 ladles of pasta water to the pepper skillet. Let it simmer.',
      'Cook the pasta 1 minute short of al dente. Reserve 2 cups of pasta water before draining.',
      'Finely grate the Pecorino into a bowl. Add small ladlefuls of warm (NOT boiling) pasta water, stirring into a smooth cream.',
      'Add the pasta to the pepper skillet. Toss over low heat, adding the Pecorino cream in batches. Work it — toss, add cream, toss, add a splash of pasta water if needed.',
      'The sauce should be silky, coating every strand. Not clumpy, not watery. Serve immediately.',
    ],
    notes:
      'The common mistake is adding the cheese directly to a hot pan — it seizes into clumps. The trick is making the cream separately with warm (not hot) water, then combining off-heat.',
  },
  {
    id: 'recipe_tiramisu',
    projectId: 'proj_sunday_italian',
    name: 'Tiramisu',
    description: 'No shortcuts. No cream cheese. The real thing.',
    servings: 8,
    prepTime: '30 min',
    cookTime: '0 min (4h chill)',
    ingredients: [
      { name: 'Egg yolks', quantity: '6', found: true },
      { name: 'Granulated sugar', quantity: '150', unit: 'g', found: true },
      {
        name: 'Mascarpone',
        quantity: '500',
        unit: 'g',
        notes:
          'Real Italian mascarpone. Galbani is widely available and good.',
        found: false,
      },
      {
        name: 'Espresso',
        quantity: '300',
        unit: 'ml',
        notes: 'Strong, cooled completely. Moka pot is fine.',
        found: true,
      },
      {
        name: 'Savoiardi (ladyfingers)',
        quantity: '300',
        unit: 'g',
        notes: 'Dry, Italian-style. Not the soft sponge kind.',
        found: false,
      },
      {
        name: 'Unsweetened cocoa powder',
        quantity: '2',
        unit: 'tbsp',
        found: true,
      },
      {
        name: 'Marsala wine (optional)',
        quantity: '2',
        unit: 'tbsp',
        notes: 'Or dark rum. Adds depth but can skip for a family version.',
        found: false,
      },
    ],
    instructions: [
      'Beat egg yolks with sugar until thick, pale, and ribbon-like — about 5 minutes with electric beaters.',
      'Fold in the mascarpone gently until smooth. Do not overmix or it will thin out.',
      'Combine cooled espresso with Marsala/rum in a shallow dish.',
      'Quickly dip each ladyfinger into the espresso — one second per side. They should be moist but not soggy.',
      'Line the bottom of a 9x13 dish with dipped ladyfingers.',
      'Spread half the mascarpone cream over the ladyfingers.',
      'Repeat: another layer of dipped ladyfingers, then the remaining cream.',
      'Cover and refrigerate for at least 4 hours, ideally overnight.',
      'Dust generously with cocoa powder just before serving.',
    ],
    notes:
      'Tiramisu improves over 24 hours as the flavors meld. Make it the day before if you can.',
  },
  {
    id: 'list_cable_mgmt',
    projectId: 'proj_home_office',
    name: 'Cable Management Kit',
    description: 'Everything needed to clean up the desk cable situation.',
    servings: null,
    prepTime: null,
    cookTime: null,
    ingredients: [
      { name: 'Cable tray (under-desk mount)', quantity: '1', found: false },
      {
        name: 'Velcro cable ties (pack of 50)',
        quantity: '1',
        found: true,
        sourceStore: 'Amazon',
      },
      {
        name: 'USB-C hub (7-port, powered)',
        quantity: '1',
        notes:
          'Must have at least 2x USB-A, 1x HDMI, 1x SD card reader',
        found: false,
      },
      { name: 'Cable sleeve (2m, black)', quantity: '2', found: false },
      {
        name: 'Power strip (6 outlets, surge protected)',
        quantity: '1',
        found: true,
        sourceStore: 'Local electronics store',
      },
      {
        name: 'Desk grommet (60mm, black)',
        quantity: '1',
        notes: 'For routing cables through the desk surface',
        found: false,
      },
    ],
    instructions: [
      'Mount the cable tray under the desk surface using the included screws.',
      'Route all power cables into the cable tray. Use velcro ties to bundle them.',
      'Install the desk grommet — drill a 60mm hole in the back-right corner of the desk.',
      'Run the USB-C hub cable and monitor cable through the grommet.',
      'Wrap exposed cable runs in the cable sleeve.',
      'Connect everything to the power strip inside the cable tray.',
      'Use remaining velcro ties to secure any loose cables to the desk legs.',
    ],
    notes:
      "Measure the desk underside before buying the cable tray — some designs don't fit with certain desk frames.",
  },
];

const conversations = [
  {
    id: 'conv_scifi_1',
    projectId: 'proj_rare_scifi',
    messages: [
      {
        role: 'user',
        content:
          'I found a listing for Dune first edition at $6,500 on AbeBooks. The dust jacket has some edge wear but it\'s mostly intact. Is this a fair price?',
        timestamp: '2026-06-25T10:30:00Z',
      },
      {
        role: 'assistant',
        content:
          "For a first edition, first printing of Dune with the original Chilton dust jacket, $6,500 is within the typical range — though it's on the higher side for a jacket with edge wear. Copies in fine condition with pristine jackets have sold for $10,000-15,000+, so there's a significant premium for condition. A few things worth checking: Is it confirmed first printing? Look for the Chilton Books imprint and no mention of later printings on the copyright page. How's the binding? Tight spine, no cocked boards? If the jacket wear is limited to edges and there are no tears or chips, you might try offering $5,500 and see if they negotiate.",
        timestamp: '2026-06-25T10:31:00Z',
      },
      {
        role: 'user',
        content:
          "That's helpful. I think I'll watch it for a few weeks and see if the price moves. Added it to my sources.",
        timestamp: '2026-06-25T10:35:00Z',
      },
    ],
  },
  {
    id: 'conv_italian_1',
    projectId: 'proj_sunday_italian',
    messages: [
      {
        role: 'user',
        content:
          'I can\'t find real Pecorino Romano DOP anywhere near me. The supermarket only has generic pecorino. Will it work for cacio e pepe?',
        timestamp: '2026-06-28T09:00:00Z',
      },
      {
        role: 'assistant',
        content:
          "Generic pecorino will work but you'll notice a difference. Pecorino Romano DOP is saltier, sharper, and has a grainier texture that emulsifies differently in the pasta water. A generic pecorino (especially a younger one) tends to be milder and smoother — your sauce might taste flatter and need more seasoning. Two options: try an Italian specialty store or order online (it ships fine since it's hard cheese), or use the generic but add a bit of Parmigiano-Reggiano to compensate for the sharpness. About a 70/30 ratio of pecorino to parm. Not traditional, but it works.",
        timestamp: '2026-06-28T09:01:00Z',
      },
    ],
  },
  {
    id: 'conv_sneakers_1',
    projectId: 'proj_fall_rotation',
    messages: [
      {
        role: 'user',
        content:
          "I'm building a fall rotation around earth tones. I've got the Patta AM1s and the NB 550s shortlisted. What kind of pants and layers would tie them together?",
        timestamp: '2026-07-01T16:00:00Z',
      },
      {
        role: 'assistant',
        content:
          "With those two anchors you've got a nice contrast — the Patta AM1s are a statement piece (that monarch orange is loud in the best way), and the NB 550s are your clean everyday option. For pants that work with both: olive cargo pants (straight leg, not baggy), charcoal wool trousers for a high-low contrast, and a classic pair of straight-leg raw denim. For layers: a black hoodie is the workhorse (you've already got the Stüssy one), add a fleece vest in cream or oatmeal for the AM1 days, and a simple navy chore jacket that bridges both sneakers. The key is keeping the rest neutral so the AM1s pop and the 550s blend.",
        timestamp: '2026-07-01T16:01:00Z',
      },
    ],
  },
  {
    id: 'conv_office_1',
    projectId: 'proj_home_office',
    messages: [
      {
        role: 'user',
        content:
          "I found an Aeron on OLX for 450 EUR but it's the older model, not the remastered. The seller says it's from 2015. Is it worth it?",
        timestamp: '2026-07-02T14:00:00Z',
      },
      {
        role: 'assistant',
        content:
          'A 2015 Aeron is the pre-remastered ("Classic") version. Still an excellent chair — the core ergonomics are the same. Main differences from the Remastered: the Classic has a slightly different tilt mechanism, the armpad adjustment is less granular, and the mesh material is the older Pellicle (still great, just different texture). At 450 EUR for a ~11 year old unit, here\'s what to check: does the mesh have any sag or deformation? Are the armpad surfaces intact (they crack with age)? Does the tilt lock work in all positions? Does the pneumatic cylinder hold height overnight? If it passes those checks, 450 EUR is reasonable for Romania. You could try offering 380-400 EUR — sellers on OLX expect negotiation.',
        timestamp: '2026-07-02T14:01:00Z',
      },
      {
        role: 'user',
        content:
          "Good call on the cylinder test. I'll ask the seller if I can sit in it for 10 minutes before deciding. Adding it to my sources.",
        timestamp: '2026-07-02T14:10:00Z',
      },
    ],
  },
];

const insertProject = db.prepare(
  `INSERT INTO projects (id, user_id, name, scenario_id, metadata, created_at, updated_at)
   VALUES (@id, @userId, @name, @scenarioId, '{}', @createdAt, @updatedAt)`
);
for (const p of projects) insertProject.run({ ...p, userId: DEMO_USER_ID });

const insertProduct = db.prepare(
  `INSERT INTO products (id, user_id, project_id, name, description, metadata, sources, status, created_at, updated_at)
   VALUES (@id, @userId, @projectId, @name, @description, @metadata, @sources, @status, @createdAt, @updatedAt)`
);
for (const p of products) {
  const project = projects.find((pr) => pr.id === p.projectId)!;
  insertProduct.run({
    id: p.id,
    userId: DEMO_USER_ID,
    projectId: p.projectId,
    name: p.name,
    description: p.description,
    metadata: JSON.stringify(p.metadata),
    sources: JSON.stringify(p.sources),
    status: p.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}

const insertRecipe = db.prepare(
  `INSERT INTO recipes (id, user_id, project_id, name, description, servings, prep_time, cook_time, ingredients, instructions, notes, created_at, updated_at)
   VALUES (@id, @userId, @projectId, @name, @description, @servings, @prepTime, @cookTime, @ingredients, @instructions, @notes, @createdAt, @updatedAt)`
);
for (const r of recipes) {
  const project = projects.find((pr) => pr.id === r.projectId)!;
  insertRecipe.run({
    id: r.id,
    userId: DEMO_USER_ID,
    projectId: r.projectId,
    name: r.name,
    description: r.description,
    servings: r.servings,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    ingredients: JSON.stringify(r.ingredients),
    instructions: JSON.stringify(r.instructions),
    notes: r.notes,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}

const insertConversation = db.prepare(
  `INSERT INTO conversations (id, user_id, project_id, messages, summary, created_at, updated_at)
   VALUES (@id, @userId, @projectId, @messages, NULL, @createdAt, @updatedAt)`
);
for (const c of conversations) {
  const first = c.messages[0]?.timestamp ?? new Date().toISOString();
  const last = c.messages[c.messages.length - 1]?.timestamp ?? first;
  insertConversation.run({
    id: c.id,
    userId: DEMO_USER_ID,
    projectId: c.projectId,
    messages: JSON.stringify(c.messages),
    createdAt: first,
    updatedAt: last,
  });
}

// Default LLM config for the demo user (matches .env.local defaults).
db.prepare(
  `INSERT INTO llm_config (user_id, provider, base_url, api_key, model)
   VALUES (@userId, @provider, @baseUrl, @apiKey, @model)`
).run({
  userId: DEMO_USER_ID,
  provider: process.env.LLM_PROVIDER || 'ollama',
  baseUrl: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
  apiKey: process.env.LLM_API_KEY || 'ollama',
  model: process.env.LLM_MODEL || 'gemma3:4b',
});

console.log(
  `✓ Seeded 1 user (demo@meshop.world / meshop), ${projects.length} projects, ${products.length} products, ${recipes.length} recipes, ${conversations.length} conversations.`
);
console.log(`  Database: ${resolved}`);

db.close();
