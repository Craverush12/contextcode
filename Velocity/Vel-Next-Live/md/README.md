# Velocity Next.js

A Next.js migration of the Velocity AI-powered prompt engineering platform. This project uses the Next.js App Router, Tailwind CSS, and Turbopack for development.

## Features

- Modern, responsive UI with Tailwind CSS
- Server-side rendering for improved SEO and performance
- Client-side components for interactive elements
- Route-based middleware for authentication protection
- API routes for backend functionality
- 3D animations with Three.js
- Form handling with client-side validation
- And more!

## Folder Structure

```
velocity-nextjs/
├── src/                            # Source directory
│   ├── app/                        # Main application folder (Next.js App Router)
│   │   ├── favicon.ico             # Favicon
│   │   ├── globals.css             # Global CSS
│   │   ├── layout.js               # Root layout (common UI wrapper)
│   │   ├── page.js                 # Home page
│   │   └── [routes]/               # Route folders (login, register, etc.)
│   │       └── page.js             # Page components for each route
│   │
│   ├── components/                 # Reusable UI components
│   │   ├── ui/                     # Basic UI components
│   │   ├── 3dLogo/                 # 3D logo components
│   │   ├── auth/                   # Authentication components
│   │   ├── home/                   # Home page components
│   │   ├── pricing/                # Pricing components
│   │   ├── prompt/                 # Prompt-related components
│   │   ├── layout/                 # Layout components
│   │   └── shared/                 # Shared components across pages
│   │
│   ├── lib/                        # Application logic and utilities
│   │   ├── analytics.js            # Analytics utility
│   │   ├── auth.js                 # Authentication logic
│   │   └── utils.js                # General utilities
│   │
│   └── middleware.js               # Next.js middleware for auth protection
│
├── public/                         # Static assets
│   ├── assets/                     # Images, icons, etc.
│   ├── fonts/                      # Custom fonts
│   └── models/                     # 3D models
│
├── next.config.js                  # Next.js configuration
├── package.json                    # Project dependencies
├── postcss.config.js               # PostCSS configuration for Tailwind
├── tailwind.config.js              # Tailwind CSS configuration
└── jsconfig.json                   # JavaScript configuration (for path aliases)
```

## Getting Started

1. Make sure you have Node.js installed (version 18 or higher)
2. Clone this repository
3. Install dependencies:

```bash
npm install
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## Development

### Client vs Server Components

- Pages and layouts are server components by default
- Components that use hooks, state, or browser APIs should be marked with `'use client'` directive
- Keep heavy logic in server components when possible for better performance

### Authentication

Authentication is handled via middleware and utility functions:

- `src/middleware.js` - Protects routes that require authentication
- `src/lib/auth.js` - Provides authentication utilities

### Static Assets

Place static assets in the `public` directory:

- Images should go in `public/assets/`
- Fonts should go in `public/fonts/`
- 3D models should go in `public/models/`

## Building for Production

To build the application for production:

```bash
npm run build
```

To start the production server:

```bash
npm run start
```

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Documentation](https://reactjs.org)
