"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getAllBlogPosts,
  getBlogPostUrl,
  shouldOpenInNewTab,
} from "@/data/blogPosts";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Navbar from "../layout/Navbar";

export default function BlogSection() {
  const blogPosts = getAllBlogPosts();

  // Featured posts are the first 3 posts
  const featuredPosts = blogPosts.slice(0, 3);

  // Recent posts are the remaining posts after featured (or all posts if less than 3 total)
  const recentPosts = blogPosts.length > 3 ? blogPosts.slice(3, 6) : [];

  // Since we only have 5 posts total and show 3 featured + up to 3 recent,
  // pagination is not needed in this case. But we'll keep the logic for future expansion
  const postsPerPage = 6; // 3 featured + 3 recent
  const totalPosts = blogPosts.length;
  const totalPages = Math.ceil(totalPosts / postsPerPage);

  const [currentPage, setCurrentPage] = useState(1);
  const [animationsTriggered, setAnimationsTriggered] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const sectionRef = useRef(null);

  // Newsletter subscription function
  const handleSubscribe = async (e) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      setSubscriptionStatus("Please enter a valid email address");
      return;
    }

    setIsSubscribing(true);
    setSubscriptionStatus("");

    try {
      const response = await fetch(
        "https://thinkvelocity.in/backend-V1-D/subscribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
          }),
        }
      );

      if (response.ok) {
        setSubscriptionStatus(
          "Successfully subscribed! Thank you for joining our newsletter."
        );
        setEmail(""); // Clear the email input
      } else {
        setSubscriptionStatus("Something went wrong. Please try again.");
      }
    } catch (error) {
      setSubscriptionStatus(
        "Network error. Please check your connection and try again."
      );
      console.error("Subscription error:", error);
    } finally {
      setIsSubscribing(false);
    }
  };

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

  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const goToPrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Component for blog post link wrapper
  const BlogPostLink = ({ post, children }) => {
    const url = getBlogPostUrl(post);
    const openInNewTab = shouldOpenInNewTab(post);

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
    <div
      className="min-h-screen bg-white"
      style={{
        backgroundImage:
          "url(https://thinkvelocity.in/next-assets/Mask_group3.png)",
        backgroundPosition: "center",
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
      }}
      ref={sectionRef}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Newsletter Section */}
        <div
          className={`bg-cyan-200 rounded-xl p-8 mb-12 relative overflow-hidden fade-in-element ${
            animationsTriggered ? "fade-in-visible" : ""
          }`}
          style={{
            animationDelay: "0s",
          }}
        >
          <div className="flex flex-col lg:flex-row items-center justify-between">
            <div className="lg:w-1/2 mb-6 lg:mb-0">
              <h2 className="font-dmsans text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                Smarter Prompts, Weekly Insights
              </h2>
              <p className="font-dmsans text-base lg:text-lg text-gray-700 mb-4">
                Get the latest articles delivered to your inbox.
              </p>

              {/* Avatar Group */}
              <div className="flex items-center mb-4">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden">
                    <Image
                      src="https://thinkvelocity.in/next-assets/reviewPfp/ashish.jpg"
                      alt="Ashish"
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden">
                    <Image
                      src="https://thinkvelocity.in/next-assets/reviewPfp/sam.jpg"
                      alt="Sam"
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden">
                    <Image
                      src="https://thinkvelocity.in/next-assets/reviewPfp/parth.jpg"
                      alt="Parth"
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden">
                    <Image
                      src="https://thinkvelocity.in/next-assets/reviewPfp/asian1.jpg"
                      alt="User"
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>
                <div className="ml-3">
                  <div className="flex text-yellow-400">{"★".repeat(5)}</div>
                  <p className="font-dmsans text-sm text-gray-600">
                    200+ Users
                  </p>
                </div>
              </div>
            </div>

            {/* Newsletter Form */}
            <div className="lg:w-1/2 lg:pl-8">
              <form
                onSubmit={handleSubscribe}
                className="bg-white rounded-xl p-6  border border-black"
              >
                <div className="mb-4">
                  <label className="block font-dmsans   text-sm font-medium text-black mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubscribing}
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Status Message */}
                {subscriptionStatus && (
                  <div
                    className={`mb-4 p-3 rounded-xl text-sm ${
                      subscriptionStatus.includes("Successfully")
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : "bg-red-100 text-red-800 border border-red-200"
                    }`}
                  >
                    {subscriptionStatus}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubscribing}
                  className="font-dmsans w-full bg-cyan-400 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none text-black font-semibold py-3 rounded-full transition-colors border border-black disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                  style={{
                    boxShadow: "1px 1px 2px black",
                    fontSize: "1.125rem",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubscribing) {
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubscribing) {
                      e.currentTarget.style.boxShadow = "1px 1px 2px black";
                    }
                  }}
                >
                  {isSubscribing ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-4 w-4 text-black"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Subscribing...
                    </>
                  ) : (
                    <>
                      <svg
                        width="16"
                        height="17"
                        viewBox="0 0 33 34"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="mr-2"
                      >
                        <path
                          d="M32.3191 1.18985C32.0226 0.893634 31.6525 0.681793 31.2469 0.576144C30.8413 0.470495 30.4148 0.474858 30.0114 0.588783H29.9893L1.70485 9.16867C1.24566 9.30097 0.83753 9.56964 0.534534 9.93907C0.231537 10.3085 0.0479806 10.7613 0.00818954 11.2373C-0.0316015 11.7134 0.0742511 12.1903 0.31172 12.6049C0.549189 13.0195 0.907063 13.3521 1.33792 13.5588L13.8518 19.6519L19.9378 32.1549C20.1271 32.5588 20.4281 32.9 20.8052 33.1384C21.1822 33.3767 21.6196 33.5022 22.0657 33.5C22.1335 33.5 22.2013 33.497 22.2691 33.4911C22.7449 33.4526 23.1976 33.2695 23.5664 32.9664C23.9351 32.6633 24.2023 32.2548 24.3321 31.7955L32.9086 3.51897C32.9086 3.5116 32.9086 3.50424 32.9086 3.49687C33.024 3.09464 33.0302 2.66893 32.9267 2.26348C32.8231 1.85803 32.6134 1.48747 32.3191 1.18985ZM22.079 31.1208L22.0716 31.1414V31.1311L16.1683 19.0067L23.2417 11.9353C23.4534 11.7125 23.5697 11.4158 23.5658 11.1085C23.5619 10.8012 23.438 10.5075 23.2206 10.2902C23.0032 10.0729 22.7095 9.94905 22.4021 9.94512C22.0947 9.94118 21.7979 10.0575 21.575 10.2692L14.5017 17.3405L2.36945 11.4389H2.35913H2.37976L30.651 2.8575L22.079 31.1208Z"
                          fill="currentColor"
                        />
                      </svg>
                      Subscribe
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Featured Articles */}
        <section className="mb-12">
          <h2
            className={`font-dmsans text-6xl font-bold text-gray-900 mb-8 fade-in-element ${
              animationsTriggered ? "fade-in-visible" : ""
            }`}
            style={{
              animationDelay: "0.2s",
            }}
          >
            Featured Articles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredPosts.map((post, index) => (
              <div
                key={post.id}
                className={`fade-in-element ${
                  animationsTriggered ? "fade-in-visible" : ""
                }`}
                style={{
                  animationDelay: `${0.4 + index * 0.2}s`,
                }}
              >
                <BlogPostLink post={post}>
                  <Card
                    className="border-2 border-solid border-black rounded-xl overflow-hidden hover:translate-x-[5px] hover:translate-y-[3px] hover:shadow-none transition-all duration-300 cursor-pointer bg-white h-[450px] flex flex-col"
                    style={{ boxShadow: "4px 4px 2px black" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "4px 4px 2px black";
                    }}
                  >
                    <CardContent className="p-0 h-full flex flex-col">
                      {/* Image */}
                      <div className="aspect-video bg-gradient-to-br from-blue-400 to-cyan-600 relative flex-shrink-0">
                        <Image
                          src={post.image || "/placeholder.svg"}
                          alt={post.title}
                          fill
                          className="object-cover"
                        />
                        {/* Tech overlay effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20"></div>

                        {/* External link indicator */}
                        {post.isExternal && (
                          <div className="absolute top-3 right-3">
                            <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 border border-gray-200">
                              <ExternalLink className="w-3 h-3 text-gray-600" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                          <Badge
                            variant="secondary"
                            className="bg-cyan-100 text-cyan-800 text-sm"
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
                        <h3 className="text-lg font-bold text-gray-900 mb-3 leading-tight flex items-start gap-2 h-[3.5rem] overflow-hidden">
                          <span
                            className="overflow-hidden"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {post.title}
                          </span>
                          {post.isExternal && (
                            <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          )}
                        </h3>
                        <p
                          className="text-gray-600 text-sm leading-relaxed overflow-hidden"
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
        </section>

        {/* Recent Posts */}
        {recentPosts.length > 0 && (
          <section className="mb-12">
            <h2
              className={`font-dmsans text-6xl font-bold text-gray-900 mb-8 fade-in-element ${
                animationsTriggered ? "fade-in-visible" : ""
              }`}
              style={{
                animationDelay: `${1.0 + featuredPosts.length * 0.2}s`,
              }}
            >
              Recent Posts
            </h2>
            <div className="space-y-6">
              {recentPosts.map((post, index) => (
                <div
                  key={post.id}
                  className={`fade-in-element ${
                    animationsTriggered ? "fade-in-visible" : ""
                  }`}
                  style={{
                    animationDelay: `${
                      1.2 + featuredPosts.length * 0.2 + index * 0.2
                    }s`,
                  }}
                >
                  <BlogPostLink post={post}>
                    <Card className="overflow-hidden bg-transparent border-none shadow-none">
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                          {/* Content */}
                          <div className="flex-1 p-6">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant="secondary"
                                className="bg-cyan-100 text-cyan-800 text-sm"
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
                            <h3 className="font-dmsans text-4xl font-bold text-gray-900 mb-3 leading-tight flex items-start gap-2">
                              {post.title}
                              {post.isExternal && (
                                <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                              )}
                            </h3>
                            <p className="font-dmsans text-gray-600 text-md leading-relaxed mb-4">
                              {post.excerpt || post.description}
                            </p>
                            <div className="font-dmsans flex items-center text-md text-gray-500">
                              <span>{post.author}</span>
                              <span className="mx-2">•</span>
                              <span>{post.readTime}</span>
                              {post.isExternal && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span className="text-blue-600">
                                    External Link
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Image */}
                          <div className="md:w-64 aspect-video md:aspect-square bg-gradient-to-br from-blue-400 to-cyan-600 relative border-2 border-black rounded-2xl overflow-hidden">
                            <Image
                              src={post.image || "/placeholder.svg"}
                              alt={post.title}
                              fill
                              className="object-cover"
                            />
                            {/* Tech overlay effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20"></div>

                            {/* External link indicator */}
                            {post.isExternal && (
                              <div className="absolute top-3 right-3">
                                <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 border border-gray-200">
                                  <ExternalLink className="w-3 h-3 text-gray-600" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </BlogPostLink>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pagination - Only show if there are more posts than can be displayed on one page */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="border-2 border-black hover:bg-gray-100"
              onClick={goToPrevious}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                className={`w-8 h-8 p-0 text-sm font-semibold border-2 border-black ${
                  currentPage === page
                    ? "bg-cyan-400 text-black"
                    : "bg-white text-black hover:bg-gray-100"
                }`}
                onClick={() => goToPage(page)}
              >
                {page}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="border-2 border-black hover:bg-gray-100"
              onClick={goToNext}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
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
    </div>
  );
}
