export const dynamic = "force-static";

// Mock prompt data. In a real application this would be fetched from a database.
const prompts = [
  {
    id: 1,
    title: "The Storyteller's Muse",
    description: "Craft compelling narratives with AI-powered inspiration.",
    category: "Writing",
    model: "GPT-4",
    tags: ["Creative", "Storytelling"],
    previewUrl: "https://images.unsplash.com/photo-1519682577863-2190e647b94f?auto=format&fit=crop&w=400&h=250&q=80",
    premium: false,
    createdAt: "2024-05-01T00:00:00Z",
    uses: 2500,
    trendingScore: 92,
  },
  {
    id: 2,
    title: "Code Whisperer",
    description: "Optimize your programming workflow with precision prompts.",
    category: "Coding",
    model: "GPT-4",
    tags: ["Developer", "Efficiency"],
    previewUrl: "https://images.unsplash.com/photo-1555949963-aa79dcee9819?auto=format&fit=crop&w=400&h=250&q=80",
    premium: true,
    createdAt: "2024-04-28T00:00:00Z",
    uses: 4500,
    trendingScore: 98,
  },
  {
    id: 3,
    title: "Design Alchemist",
    description: "Transform concepts into visual masterpieces.",
    category: "Design",
    model: "DALLE-3",
    tags: ["Visual", "UI/UX"],
    previewUrl: "https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=400&h=250&q=80",
    premium: false,
    createdAt: "2024-04-20T00:00:00Z",
    uses: 1800,
    trendingScore: 80,
  },
  {
    id: 4,
    title: "Data Detective",
    description: "Uncover insights and patterns in complex datasets.",
    category: "Data Analysis",
    model: "Claude 3",
    tags: ["Analytics", "Research"],
    previewUrl: "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=400&h=250&q=80",
    premium: false,
    createdAt: "2024-03-15T00:00:00Z",
    uses: 3250,
    trendingScore: 87,
  },
  {
    id: 5,
    title: "Brand Builder",
    description: "Craft a strong brief for a holistic brand identity.",
    category: "Marketing",
    model: "GPT-4",
    tags: ["Branding", "Image Gen"],
    previewUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&h=250&q=80",
    premium: true,
    createdAt: "2024-05-04T00:00:00Z",
    uses: 600,
    trendingScore: 90,
  },
  {
    id: 6,
    title: "Academic Accelerator",
    description: "Elevate your research and writing to scholarly pursuits.",
    category: "Academic",
    model: "GPT-4",
    tags: ["Research", "Writing"],
    previewUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=400&h=250&q=80",
    premium: false,
    createdAt: "2024-05-02T00:00:00Z",
    uses: 950,
    trendingScore: 75,
  },
  {
    id: 7,
    title: "Illustration Ideator",
    description: "Generate unique illustration concepts in seconds.",
    category: "Design",
    model: "Stable Diffusion",
    tags: ["Art", "Concept"],
    previewUrl: "https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&w=400&h=250&q=80",
    premium: false,
    createdAt: "2024-05-06T00:00:00Z",
    uses: 420,
    trendingScore: 70,
  },
  {
    id: 8,
    title: "SEO Scribe",
    description: "Write search-optimised blog outlines effortlessly.",
    category: "Marketing",
    model: "GPT-4",
    tags: ["SEO", "Content"],
    previewUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&h=250&q=80",
    premium: false,
    createdAt: "2024-04-30T00:00:00Z",
    uses: 2100,
    trendingScore: 85,
  },
  {
    id: 9,
    title: "Data-Viz Dynamo",
    description: "Create stunning data visualisations via natural language.",
    category: "Data Analysis",
    model: "Claude 3",
    tags: ["Visualization", "Charts"],
    previewUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=400&h=250&q=80",
    premium: true,
    createdAt: "2024-05-05T00:00:00Z",
    uses: 300,
    trendingScore: 93,
  },
  {
    id: 10,
    title: "Marketing Maestro",
    description: "Generate a full funnel campaign brief instantly.",
    category: "Marketing",
    model: "GPT-4",
    tags: ["Campaign", "Ads"],
    previewUrl: "https://images.unsplash.com/photo-1580906855282-f94ef2a69f74?auto=format&fit=crop&w=400&h=250&q=80",
    premium: false,
    createdAt: "2024-05-03T00:00:00Z",
    uses: 1650,
    trendingScore: 89,
  },
];

export async function GET() {
  return Response.json(prompts);
}