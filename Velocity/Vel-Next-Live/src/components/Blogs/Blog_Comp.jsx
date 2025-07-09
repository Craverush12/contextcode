import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getAllBlogPosts,
  getBlogPostUrl,
  shouldOpenInNewTab,
} from "@/data/blogPosts";
import { ExternalLink } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function Blog_Comp() {
  const [animationsTriggered, setAnimationsTriggered] = useState(false);
  const sectionRef = useRef(null);

  // Intersection Observer to trigger animations when section comes into view
  useEffect(() => {
    if (!sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animationsTriggered) {
            // Add a small delay before triggering animations
            setTimeout(() => {
              setAnimationsTriggered(true);
            }, 200);
          }
        });
      },
      {
        threshold: 0.2, // Trigger when 20% of the section is visible
        rootMargin: "0px 0px -50px 0px", // Trigger a bit before the section is fully visible
      }
    );

    observer.observe(sectionRef.current);

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [animationsTriggered]);

  // Get the first 3 blog posts for the homepage
  const blogPosts = getAllBlogPosts().slice(0, 3);

  // Component for blog post link wrapper
  const BlogPostLink = ({ post, children }) => {
    const url = getBlogPostUrl(post);

    if (post.isExternal) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={url} className="block">
        {children}
      </Link>
    );
  };

  return (
    <section
      className="w-full bg-white py-12 px-4 sm:px-6 lg:px-8"
      ref={sectionRef}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="px-6 py-2 mb-4">
            <span
              className={`text-gray-700 font-dmsans text-3xl sm:text-5xl lg:text-6xl fade-in-element ${
                animationsTriggered ? "fade-in-visible" : ""
              }`}
              style={{
                color: "#152A32",
                fontWeight: "900",
                animationDelay: "0s",
              }}
            >
              Expand Your Brain
            </span>
          </div>
          <h2
            className={`text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight fade-in-element ${
              animationsTriggered ? "fade-in-visible" : ""
            }`}
            style={{
              animationDelay: "0.2s",
            }}
          >
            Prompt Smarter. Think Deeper. Read On
          </h2>
        </div>

        {/* Blog Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
          {blogPosts.map((post, index) => (
            <div
              key={post.id}
              className={`fade-in-element ${
                animationsTriggered ? "fade-in-visible" : ""
              }`}
              style={{
                transitionDelay: animationsTriggered
                  ? `${0.2 + index * 0.2}s`
                  : "0s",
              }}
            >
              <BlogPostLink post={post}>
                <Card
                  className="border-2 border-solid border-black rounded-xl overflow-hidden hover:translate-x-[5px] hover:translate-y-[5px] hover:shadow-none transition-all duration-300 cursor-pointer h-[450px] flex flex-col"
                  style={{
                    boxShadow: "4px 4px 2px black",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "4px 4px 2px black";
                  }}
                >
                  <CardContent className="p-0 flex flex-col h-full">
                    <div className="aspect-video bg-gray-300 relative flex-shrink-0">
                      <Image
                        src={post.image || "/placeholder.svg"}
                        alt={post.title}
                        fill
                        className="object-cover"
                      />
                      {/* External link indicator */}
                      {post.isExternal && (
                        <div className="absolute top-3 right-3">
                          <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 border border-gray-200">
                            <ExternalLink className="w-3 h-3 text-gray-600" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex items-center justify-between mb-3">
                        <Badge
                          variant="secondary"
                          className="bg-gray-100 text-gray-700 text-xs"
                        >
                          {post.category}
                        </Badge>
                        {post.isExternal && (
                          <Badge
                            variant="outline"
                            className="text-xs border-blue-300 text-blue-600"
                          >
                            {post.externalSource}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 leading-tight overflow-hidden">
                        <div
                          className="overflow-hidden"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {post.title}
                          {post.isExternal && (
                            <ExternalLink className="w-4 h-4 text-gray-400 inline ml-1" />
                          )}
                        </div>
                      </h3>
                      <p
                        className="text-gray-600 text-sm sm:text-base leading-relaxed overflow-hidden"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {post.excerpt || post.description}
                      </p>
                      <div className="flex-grow" />
                    </div>
                  </CardContent>
                </Card>
              </BlogPostLink>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Link href="/blog">
            <Button
              className={`bg-cyan-400 hover:bg-cyan-500 text-black font-semibold px-8 py-3 rounded-full text-lg hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-300 fade-in-element ${
                animationsTriggered ? "fade-in-visible" : ""
              }`}
              style={{
                boxShadow: "2px 2px 2px black",
                transitionDelay: animationsTriggered ? "1.2s" : "0s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "2px 2px 2px black";
              }}
            >
              View All
            </Button>
          </Link>
        </div>
      </div>

      {/* Add CSS styles for animations */}
      <style jsx>{`
        /* Fade-in animation styles */
        .fade-in-element {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }

        .fade-in-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </section>
  );
}
