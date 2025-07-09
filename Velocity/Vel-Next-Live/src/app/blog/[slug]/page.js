  import Image from "next/image";
  import Link from "next/link";
  import { notFound } from "next/navigation";
  import { Card, CardContent } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import { getBlogPostBySlug, getRelatedPosts, getAllBlogPosts } from "@/data/blogPosts";
  import { ArrowLeft, Calendar, Clock, User, Share2 } from "lucide-react";
  import "@/styles/blog.css";
  import Footer from "@/components/layout/Footer";
  import { redirect } from "next/navigation";

  // Generate static params for all blog posts
  export async function generateStaticParams() {
    const posts = getAllBlogPosts();
    return posts.map((post) => ({
      slug: post.slug,
    }));
  }

  // Generate metadata for each blog post
  export async function generateMetadata({ params }) {
    const post = getBlogPostBySlug(params.slug);
    
    if (!post) {
      return {
        title: "Blog Post Not Found",
      };
    }

    return {
      title: `${post.title} | ThinkVelocity Blog`,
      description: post.description,
      keywords: post.tags.join(", "),
      openGraph: {
        title: post.title,
        description: post.description,
        type: "article",
        publishedTime: post.publishedAt,
        authors: [post.author],
        tags: post.tags,
        images: [
          {
            url: post.image,
            alt: post.title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description: post.description,
        images: [post.image],
      },
    };
  }

  export default function BlogPostPage({ params }) {
    const post = getBlogPostBySlug(params.slug);
    
    if (!post) {
      notFound();
    }

    // If it's an external post, redirect to the external URL
    if (post.isExternal) {
      redirect(post.externalUrl);
    }

    const relatedPosts = getRelatedPosts(params.slug);

    return (
      <div className="min-h-screen bg-white">
        {/* Back Button */}
        <div className=" py-4 px-2 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Link href="/blog">
              <Button variant="ghost" className="bg-[#CFE6F0] rounded-full font-dmsans font-bold text-black flex items-center gap-2 hover:bg-gray-200">
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </Button>
            </Link>
          </div>
        </div>

        {/* Article Header */}
        <article className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Category Badge */}
            <div className="mb-6">
              <Badge variant="secondary" className="bg-cyan-100 text-cyan-800 hover:bg-cyan-200">
                {post.category}
              </Badge>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
              {post.title}
            </h1>

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-8">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{post.readTime}</span>
              </div>
            </div>

            {/* Featured Image */}
            <div className="aspect-video bg-gray-300 relative rounded-xl overflow-hidden mb-8">
              <Image
                src={post.image || "/placeholder.svg"}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Article Content */}
            <div className="prose prose-lg max-w-none">
              {post.content && (
                <div 
                  className="text-gray-800 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              )}
            </div>

            {/* Tags */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 font-dmsans"
                
              >Tags</h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="bg-[#CFE6F0] p-2">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Share Section */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 font-dmsans"
                >Share this article</h3>
                <Button variant="outline" className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </article>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Related Articles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {relatedPosts.map((relatedPost) => (
                  <Link key={relatedPost.id} href={`/blog/${relatedPost.slug}`}>
                    <Card className="border-2 border-solid border-black rounded-xl overflow-hidden hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none transition-all duration-300 cursor-pointer h-full"
                          style={{ boxShadow: "4px 4px 2px black" }}>
                      <CardContent className="p-0 h-full flex flex-col">
                        {/* Image */}
                        <div className="aspect-video bg-gray-300 relative">
                          <Image
                            src={relatedPost.image || "/placeholder.svg"}
                            alt={relatedPost.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        
                        {/* Content */}
                        <div className="p-6 flex-1 flex flex-col">
                          {/* Category and Read Time */}
                          <div className="flex items-center justify-between mb-3">
                            <Badge variant="secondary" className="bg-cyan-100 text-cyan-800 hover:bg-cyan-200">
                              {relatedPost.category}
                            </Badge>
                            <span className="text-sm text-gray-500">{relatedPost.readTime}</span>
                          </div>
                          
                          {/* Title */}
                          <h3 className="text-lg font-bold text-gray-900 mb-3 leading-tight line-clamp-2">
                            {relatedPost.title}
                          </h3>
                          
                          {/* Description */}
                          <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
                            {relatedPost.excerpt || relatedPost.description}
                          </p>
                          
                          {/* Author and Date */}
                          <div className="flex items-center justify-between text-sm text-gray-500 mt-auto">
                            <span>{relatedPost.author}</span>
                            <span>{new Date(relatedPost.publishedAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <Footer />
      </div>
    );
  } 