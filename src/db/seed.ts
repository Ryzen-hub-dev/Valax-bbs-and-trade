import { db } from "./index";
import { forumBoards, systemSettings } from "./schema";
import { nanoid } from "nanoid";

async function runSeed() {
  console.log("Seeding Valax Scrub initial English boards and settings...");

  const boards = [
    {
      id: "board_announcements",
      name: "Official Announcements",
      slug: "announcements",
      description: "Official platform updates, major releases, and ecosystem news.",
      sortOrder: 1,
      minReputationToPost: 50,
      isReadOnly: false,
    },
    {
      id: "board_scripts_dev",
      name: "Scripts & Development",
      slug: "scripts-and-dev",
      description: "Technical discussions, script architecture, API integration, and troubleshooting.",
      sortOrder: 2,
      minReputationToPost: 0,
      isReadOnly: false,
    },
    {
      id: "board_market_disc",
      name: "Marketplace Discussion",
      slug: "market-discussion",
      description: "Asset requests, creator showcases, license reviews, and tool feedback.",
      sortOrder: 3,
      minReputationToPost: 0,
      isReadOnly: false,
    },
    {
      id: "board_support",
      name: "Support & Troubleshooting",
      slug: "support",
      description: "Community support, environment configuration, and bug reporting.",
      sortOrder: 4,
      minReputationToPost: 0,
      isReadOnly: false,
    },
    {
      id: "board_bounties",
      name: "Bounties & Rewards",
      slug: "bounties-and-rewards",
      description: "Community-funded script bounties, feature requests, and developer rewards.",
      sortOrder: 5,
      minReputationToPost: 10,
      isReadOnly: false,
    },
  ];

  for (const b of boards) {
    try {
      await db.insert(forumBoards).values(b).onConflictDoNothing();
      console.log(`Board seeded: ${b.name}`);
    } catch (e) {
      console.log(`Board insert skipped: ${b.name}`);
    }
  }

  const defaultSettings = [
    { key: "marketplace_platform_fee_percent", value: "5", description: "Marketplace commission rate (%)" },
    { key: "marketplace_auto_approve", value: "true", description: "Auto-approve GitHub release assets" },
    { key: "new_user_starting_credits", value: "100", description: "Starting Utility Credits for new users" },
    { key: "thread_create_rate_limit_per_minute", value: "5", description: "Max threads created per minute" },
  ];

  for (const s of defaultSettings) {
    try {
      await db.insert(systemSettings).values(s).onConflictDoNothing();
      console.log(`Setting seeded: ${s.key}`);
    } catch (e) {
      console.log(`Setting insert skipped: ${s.key}`);
    }
  }

  console.log("English seed completed successfully.");
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});