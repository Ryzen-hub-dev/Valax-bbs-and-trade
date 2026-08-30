import { client } from "./index";
import * as dotenv from "dotenv";
dotenv.config();

async function seed() {
  console.log("[+] Seeding initial forum boards and system settings...");

  const boards = [
    {
      id: "board-announcements",
      slug: "announcements",
      name: "Announcements & Updates",
      description: "Official Valax Scrub platform updates, release notes, and community notices.",
      icon: "Megaphone",
      sort_order: 1,
      is_locked: 0,
      min_reputation_to_post: 100
    },
    {
      id: "board-dev-scripts",
      slug: "scripts-and-dev",
      name: "Scripts & Development",
      description: "Discuss script development, architectures, optimization techniques, and code snippets.",
      icon: "Code2",
      sort_order: 2,
      is_locked: 0,
      min_reputation_to_post: 0
    },
    {
      id: "board-market-discussion",
      slug: "market-discussion",
      name: "Marketplace & Trade",
      description: "Product reviews, digital asset showcases, buyer feedback, and merchant discussions.",
      icon: "ShoppingBag",
      sort_order: 3,
      is_locked: 0,
      min_reputation_to_post: 0
    },
    {
      id: "board-support",
      slug: "support",
      name: "Help & Technical Support",
      description: "Community Q&A, troubleshooting guides, setup assistance, and mark-as-solved threads.",
      icon: "HelpCircle",
      sort_order: 4,
      is_locked: 0,
      min_reputation_to_post: 0
    },
    {
      id: "board-bounties",
      slug: "bounties-and-rewards",
      name: "Bug Bounties & Rewards",
      description: "Contribute tutorials, report verified vulnerabilities, and earn Valax Utility Credits.",
      icon: "Award",
      sort_order: 5,
      is_locked: 0,
      min_reputation_to_post: 0
    }
  ];

  for (const b of boards) {
    await client.execute({
      sql: `INSERT INTO forum_boards (id, slug, name, description, icon, sort_order, is_locked, min_reputation_to_post)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(slug) DO UPDATE SET name=excluded.name, description=excluded.description, icon=excluded.icon, sort_order=excluded.sort_order;`,
      args: [b.id, b.slug, b.name, b.description, b.icon, b.sort_order, b.is_locked, b.min_reputation_to_post]
    });
  }

  const defaultSettings = [
    { key: "SITE_NAME", value: "Valax Scrub BBS and Trade" },
    { key: "SITE_DESCRIPTION", value: "Decentralized Digital Asset Marketplace & Developer Community" },
    { key: "PAYPAL_ENABLED", value: "true" },
    { key: "REGISTRATION_OPEN", value: "true" },
    { key: "MAINTENANCE_MODE", value: "false" },
    { key: "MARKETPLACE_FEE_PERCENT", value: "5" },
    { key: "TOKEN_NAME", value: "Valax Utility Credit" }
  ];

  for (const s of defaultSettings) {
    await client.execute({
      sql: `INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING;`,
      args: [s.key, s.value]
    });
  }

  console.log("[+] Seed completed successfully!");
}

seed().catch(err => {
  console.error("[-] Seed error:", err);
  process.exit(1);
});
