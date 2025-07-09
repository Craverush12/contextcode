import BlogSection from "@/components/Blogs/BlogSection";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Download from "@/components/layout/Download";

export const metadata = {
  title: "Blog - ThinkVelocity | Prompt Smarter. Think Deeper.",
  description: "Discover insights on AI tools, productivity hacks, writing tips, and more. Stay updated with the latest trends in technology and productivity.",
  keywords: "blog, AI tools, productivity, writing, technology, tips",
  openGraph: {
    title: "Blog - ThinkVelocity",
    description: "Discover insights on AI tools, productivity hacks, writing tips, and more.",
    type: "website",
  },
};

export default function BlogPage() {
  return (
    <div className="min-h-screen">
      
      <BlogSection />
      <Download />
      <Footer />
    </div>
  );
} 