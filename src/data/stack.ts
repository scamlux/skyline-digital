/** Tech stack shown on the home page (udevs-style category grid). */
export type StackCategory =
  | "frontend"
  | "backend"
  | "mobile"
  | "ai"
  | "devops"
  | "tools";

export interface StackItem {
  name: string;
  /** SVG under /public/tech (simple-icons, brand colors). */
  icon: string;
  category: StackCategory;
}

export const stackCategories: ("all" | StackCategory)[] = [
  "all",
  "frontend",
  "backend",
  "mobile",
  "ai",
  "devops",
  "tools",
];

export const stack: StackItem[] = [
  // Frontend
  { name: "Next.js", icon: "/tech/nextdotjs.svg", category: "frontend" },
  { name: "React", icon: "/tech/react.svg", category: "frontend" },
  { name: "TypeScript", icon: "/tech/typescript.svg", category: "frontend" },
  { name: "Tailwind CSS", icon: "/tech/tailwindcss.svg", category: "frontend" },
  { name: "Vue.js", icon: "/tech/vuedotjs.svg", category: "frontend" },
  { name: "Nuxt", icon: "/tech/nuxt.svg", category: "frontend" },
  { name: "Svelte", icon: "/tech/svelte.svg", category: "frontend" },
  { name: "Vite", icon: "/tech/vite.svg", category: "frontend" },
  { name: "Sass", icon: "/tech/sass.svg", category: "frontend" },
  { name: "Framer Motion", icon: "/tech/framer.svg", category: "frontend" },
  { name: "GSAP", icon: "/tech/greensock.svg", category: "frontend" },
  { name: "Three.js", icon: "/tech/threedotjs.svg", category: "frontend" },
  // Backend
  { name: "Node.js", icon: "/tech/nodedotjs.svg", category: "backend" },
  { name: "NestJS", icon: "/tech/nestjs.svg", category: "backend" },
  { name: "Express", icon: "/tech/express.svg", category: "backend" },
  { name: "PostgreSQL", icon: "/tech/postgresql.svg", category: "backend" },
  { name: "MySQL", icon: "/tech/mysql.svg", category: "backend" },
  { name: "MongoDB", icon: "/tech/mongodb.svg", category: "backend" },
  { name: "Redis", icon: "/tech/redis.svg", category: "backend" },
  { name: "Prisma", icon: "/tech/prisma.svg", category: "backend" },
  { name: "Supabase", icon: "/tech/supabase.svg", category: "backend" },
  { name: "Firebase", icon: "/tech/firebase.svg", category: "backend" },
  { name: "GraphQL", icon: "/tech/graphql.svg", category: "backend" },
  { name: "Strapi", icon: "/tech/strapi.svg", category: "backend" },
  // Mobile
  { name: "React Native", icon: "/tech/react.svg", category: "mobile" },
  { name: "Expo", icon: "/tech/expo.svg", category: "mobile" },
  { name: "Flutter", icon: "/tech/flutter.svg", category: "mobile" },
  { name: "Swift", icon: "/tech/swift.svg", category: "mobile" },
  { name: "Kotlin", icon: "/tech/kotlin.svg", category: "mobile" },
  { name: "Android", icon: "/tech/android.svg", category: "mobile" },
  { name: "iOS", icon: "/tech/apple.svg", category: "mobile" },
  // AI
  { name: "Anthropic Claude", icon: "/tech/anthropic.svg", category: "ai" },
  { name: "LangChain", icon: "/tech/langchain.svg", category: "ai" },
  { name: "Python", icon: "/tech/python.svg", category: "ai" },
  { name: "Hugging Face", icon: "/tech/huggingface.svg", category: "ai" },
  { name: "Ollama", icon: "/tech/ollama.svg", category: "ai" },
  // DevOps
  { name: "Vercel", icon: "/tech/vercel.svg", category: "devops" },
  { name: "Netlify", icon: "/tech/netlify.svg", category: "devops" },
  { name: "Docker", icon: "/tech/docker.svg", category: "devops" },
  { name: "GitHub Actions", icon: "/tech/githubactions.svg", category: "devops" },
  { name: "Cloudflare", icon: "/tech/cloudflare.svg", category: "devops" },
  { name: "Nginx", icon: "/tech/nginx.svg", category: "devops" },
  { name: "Sentry", icon: "/tech/sentry.svg", category: "devops" },
  { name: "Git", icon: "/tech/git.svg", category: "devops" },
  // Tools
  { name: "Figma", icon: "/tech/figma.svg", category: "tools" },
  { name: "Telegram Bots", icon: "/tech/telegram.svg", category: "tools" },
  { name: "n8n", icon: "/tech/n8n.svg", category: "tools" },
  { name: "Stripe", icon: "/tech/stripe.svg", category: "tools" },
  { name: "Postman", icon: "/tech/postman.svg", category: "tools" },
  { name: "Jira", icon: "/tech/jira.svg", category: "tools" },
  { name: "Notion", icon: "/tech/notion.svg", category: "tools" },
  { name: "WordPress", icon: "/tech/wordpress.svg", category: "tools" },
];
