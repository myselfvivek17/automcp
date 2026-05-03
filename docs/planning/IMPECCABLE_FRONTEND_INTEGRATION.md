# AutoMCP - Impeccable Skill Integration Guide

This document explains how to use the **Impeccable** skill (https://github.com/pbakaus/impeccable) for building the AutoMCP frontend with AI-assisted development.

## Table of Contents

- [What is Impeccable?](#what-is-impeccable)
- [Why Use Impeccable for AutoMCP?](#why-use-impeccable-for-automcp)
- [Setup Instructions](#setup-instructions)
- [Frontend Development Workflow](#frontend-development-workflow)
- [AutoMCP-Specific Prompts](#automcp-specific-prompts)
- [Component Development Guide](#component-development-guide)
- [Best Practices](#best-practices)

## What is Impeccable?

**Impeccable** is a Cline/Roo-Cline skill that acts as an AI-powered frontend development assistant. It helps developers:

- Build React/Next.js applications through natural language
- Generate production-ready components with best practices
- Implement responsive designs with Tailwind CSS
- Create accessible, performant UIs
- Follow modern React patterns (hooks, composition, etc.)

### Key Features

✅ **Natural Language Interface** - Describe what you want, Impeccable builds it
✅ **Next.js 14+ Support** - App Router, Server Components, Server Actions
✅ **Tailwind CSS Integration** - Utility-first styling with responsive design
✅ **TypeScript First** - Full type safety and IntelliSense
✅ **Component Library Agnostic** - Works with shadcn/ui, Radix, Headless UI
✅ **Accessibility Built-in** - ARIA labels, keyboard navigation, screen reader support
✅ **Performance Optimized** - Code splitting, lazy loading, image optimization

## Why Use Impeccable for AutoMCP?

AutoMCP's frontend has complex requirements that align perfectly with Impeccable's strengths:

### 1. Complex UI Components
- **Agent Pipeline Visualizer** - Real-time flow diagram with React Flow
- **Code Editor** - Monaco Editor integration with syntax highlighting
- **Multi-Step Forms** - Input method selection with validation
- **Project Dashboard** - Data tables, charts, and analytics

### 2. Real-Time Features
- **WebSocket Integration** - Live agent progress updates
- **Streaming Code Generation** - Incremental code display
- **Live Collaboration** - Multi-user project editing

### 3. Responsive Design
- **Desktop-First** - Complex workflows need screen space
- **Mobile-Friendly** - View projects and generated code on mobile
- **Tablet Optimized** - Touch-friendly controls for tablets

### 4. Accessibility
- **Keyboard Navigation** - Power users need keyboard shortcuts
- **Screen Reader Support** - WCAG 2.1 AA compliance
- **High Contrast Mode** - Support for visual impairments

## Setup Instructions

### 1. Install Impeccable Skill

```bash
# In your Cline/Roo-Cline environment
# Add Impeccable skill to your skills directory
cd ~/.cline/skills  # or your skills directory
git clone https://github.com/pbakaus/impeccable.git
```

### 2. Configure Impeccable for AutoMCP

Create `.impeccable.config.json` in your AutoMCP frontend directory:

```json
{
  "framework": "next.js",
  "version": "14",
  "typescript": true,
  "styling": "tailwind",
  "componentLibrary": "shadcn/ui",
  "stateManagement": "zustand",
  "routing": "app-router",
  "features": {
    "serverComponents": true,
    "serverActions": true,
    "streaming": true,
    "websockets": true
  },
  "accessibility": {
    "level": "AA",
    "screenReader": true,
    "keyboardNav": true
  },
  "performance": {
    "codeSplitting": true,
    "lazyLoading": true,
    "imageOptimization": true
  }
}
```

### 3. Initialize AutoMCP Frontend Structure

```bash
# Create Next.js 14 app with TypeScript and Tailwind
npx create-next-app@latest automcp-frontend \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"

cd automcp-frontend

# Install AutoMCP-specific dependencies
npm install \
  @monaco-editor/react \
  reactflow \
  zustand \
  socket.io-client \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-tabs \
  @radix-ui/react-toast \
  lucide-react \
  date-fns \
  zod

# Install shadcn/ui
npx shadcn-ui@latest init
```

## Frontend Development Workflow

### Step 1: Define Component Requirements

Before using Impeccable, clearly define what you need:

**Example: Agent Pipeline Visualizer**

```markdown
Component: AgentPipelineVisualizer
Purpose: Display real-time agent execution flow
Requirements:
- Show 9 agents in sequential flow
- Display current agent status (pending, running, completed, failed)
- Show progress percentage for each agent
- Display intermediate outputs
- Highlight active agent
- Show execution time
- Support zoom and pan
- Responsive layout
```

### Step 2: Use Impeccable to Generate Component

**Prompt to Impeccable:**

```
Create a React component called AgentPipelineVisualizer that displays a 
real-time agent execution pipeline. Use React Flow for the flow diagram.

Requirements:
- 9 agent nodes in horizontal flow
- Each node shows: agent name, status icon, progress bar, execution time
- Status colors: gray (pending), blue (running), green (completed), red (failed)
- Real-time updates via WebSocket
- Zoom controls and mini-map
- TypeScript with proper types
- Tailwind CSS for styling
- Accessible with ARIA labels

Props:
- sessionId: string
- onAgentClick: (agentId: string) => void
```

### Step 3: Review and Refine

Impeccable will generate the component. Review and provide feedback:

```
The component looks great! Can you:
1. Add a legend showing what each status color means
2. Add keyboard shortcuts (arrow keys to navigate between agents)
3. Add a "Reset View" button to center the flow
4. Make the progress bar animated
```

### Step 4: Integrate with Backend

```
Now integrate this component with our WebSocket backend:
- Connect to ws://localhost:8000/ws/generation/{sessionId}
- Listen for agent_update events
- Update agent status and progress in real-time
- Handle connection errors with retry logic
- Show connection status indicator
```

## AutoMCP-Specific Prompts

### 1. Input Method Selection Page

```
Create a Next.js page for selecting API input method with 4 cards:

1. OpenAPI/Swagger Upload
   - File upload or URL input
   - Validates OpenAPI 2.0/3.0 format
   - Shows preview of endpoints

2. Documentation URL
   - URL input with validation
   - Crawls and parses API docs
   - Shows extracted endpoints preview

3. Manual Entry
   - Form to add endpoints manually
   - Fields: path, method, parameters, auth
   - Add multiple endpoints

4. Natural Language
   - Textarea for API description
   - AI-powered endpoint inference
   - Review and edit before generation

Use shadcn/ui Card components, Tailwind CSS, and make it fully responsive.
Add smooth transitions between steps.
```

### 2. Code Editor Component

```
Create a Monaco Editor component for displaying generated MCP server code:

Features:
- Syntax highlighting for Python and TypeScript
- Line numbers and minimap
- Read-only mode with copy button
- Diff view for comparing versions
- Search and replace
- Collapsible sections
- Download button
- Theme toggle (light/dark)

Props:
- code: string
- language: 'python' | 'typescript'
- readOnly: boolean
- onCopy: () => void
- onDownload: () => void
```

### 3. Project Dashboard

```
Create a project dashboard page with:

Header:
- Project name and description
- Last modified date
- Share button
- Settings dropdown

Main Content (3 columns):
- Left: Project list with search and filters
- Center: Selected project details with tabs (Code, Docs, Tests, Settings)
- Right: Activity feed and collaboration panel

Use Tailwind grid layout, make responsive (stack on mobile).
Add loading states and empty states.
```

### 4. Real-Time Agent Status Display

```
Create a component that shows live agent execution status:

Layout:
- Agent name and icon
- Status badge (pending/running/completed/failed)
- Progress bar with percentage
- Current task description
- Execution time (live counter)
- Expandable details section showing:
  - Input data
  - Output data
  - Warnings/errors
  - Logs

Update in real-time via WebSocket.
Add smooth animations for status changes.
Use Framer Motion for animations.
```

### 5. API Key Management Interface

```
Create an API key management page:

Features:
- List of saved API keys (masked)
- Add new key modal with provider selection
- Test key button (validates with provider)
- Set as default toggle
- Rotate key button
- Delete key with confirmation
- Last used timestamp
- Usage statistics

Providers: watsonx.ai, OpenAI, Anthropic, Google Gemini

Use shadcn/ui Dialog, Table, and Badge components.
Add proper error handling and loading states.
```

### 6. Template Library

```
Create a template library page showing pre-built MCP configurations:

Layout:
- Grid of template cards
- Each card shows:
  - API logo
  - Template name (e.g., "Stripe Payment API")
  - Description
  - Tags (e.g., "payments", "popular")
  - Use count
  - "Use Template" button

Features:
- Search and filter by tags
- Sort by popularity/recent
- Preview modal showing template details
- One-click template application

Use Tailwind grid, shadcn/ui Card and Dialog.
Add skeleton loaders for loading state.
```

## Component Development Guide

### Component Structure

All AutoMCP components should follow this structure:

```typescript
// src/components/[ComponentName]/[ComponentName].tsx

import { FC } from 'react';
import { cn } from '@/lib/utils';

interface ComponentNameProps {
  // Props with JSDoc comments
  /** Description of prop */
  propName: string;
  className?: string;
}

/**
 * ComponentName - Brief description
 * 
 * @example
 * <ComponentName propName="value" />
 */
export const ComponentName: FC<ComponentNameProps> = ({
  propName,
  className
}) => {
  return (
    <div className={cn('base-classes', className)}>
      {/* Component content */}
    </div>
  );
};
```

### State Management with Zustand

```typescript
// src/stores/projectStore.ts

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface Project {
  id: string;
  name: string;
  // ... other fields
}

interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  setCurrentProject: (project: Project) => void;
  addProject: (project: Project) => void;
  // ... other actions
}

export const useProjectStore = create<ProjectStore>()(
  devtools(
    persist(
      (set) => ({
        projects: [],
        currentProject: null,
        setCurrentProject: (project) => set({ currentProject: project }),
        addProject: (project) => set((state) => ({
          projects: [...state.projects, project]
        })),
      }),
      { name: 'project-store' }
    )
  )
);
```

### WebSocket Integration

```typescript
// src/hooks/useWebSocket.ts

import { useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  url: string;
  onMessage: (data: any) => void;
  onError?: (error: Error) => void;
}

export const useWebSocket = ({ url, onMessage, onError }: UseWebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(url);

    socketRef.current.on('connect', () => {
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    socketRef.current.on('message', onMessage);

    socketRef.current.on('error', (error) => {
      onError?.(error);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [url, onMessage, onError]);

  return { isConnected, socket: socketRef.current };
};
```

## Best Practices

### 1. Component Organization

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth-protected routes
│   ├── (public)/          # Public routes
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── features/          # Feature-specific components
│   │   ├── agent-pipeline/
│   │   ├── code-editor/
│   │   ├── input-methods/
│   │   └── project-dashboard/
│   └── shared/            # Shared components
├── hooks/                 # Custom React hooks
├── stores/                # Zustand stores
├── lib/                   # Utilities and helpers
└── types/                 # TypeScript types
```

### 2. Prompting Impeccable Effectively

**Good Prompt:**
```
Create a responsive project card component that shows:
- Project name (truncate if > 50 chars)
- Last modified date (relative time)
- Status badge (draft/generating/completed)
- 3 action buttons (edit, share, delete)
- Hover effect with shadow
- Click to open project

Use shadcn/ui Card, Tailwind CSS, TypeScript.
Add loading skeleton variant.
Make accessible with proper ARIA labels.
```

**Bad Prompt:**
```
Make a project card
```

### 3. Iterative Refinement

Always refine in steps:

1. **Generate base component**
2. **Add functionality** (state, events, API calls)
3. **Enhance styling** (animations, responsive, dark mode)
4. **Add accessibility** (ARIA, keyboard nav, focus management)
5. **Optimize performance** (memoization, lazy loading)
6. **Add tests** (unit tests, integration tests)

### 4. Accessibility Checklist

For every component, ensure:

- ✅ Semantic HTML elements
- ✅ ARIA labels and roles
- ✅ Keyboard navigation (Tab, Enter, Escape, Arrow keys)
- ✅ Focus indicators
- ✅ Screen reader announcements
- ✅ Color contrast (WCAG AA)
- ✅ Text alternatives for images
- ✅ Error messages are descriptive

### 5. Performance Optimization

```typescript
// Use React.memo for expensive components
export const AgentNode = React.memo(({ agent }: AgentNodeProps) => {
  // Component logic
});

// Use useMemo for expensive calculations
const sortedProjects = useMemo(() => {
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}, [projects]);

// Use useCallback for event handlers
const handleProjectClick = useCallback((projectId: string) => {
  setCurrentProject(projectId);
}, [setCurrentProject]);

// Lazy load heavy components
const CodeEditor = lazy(() => import('@/components/features/code-editor'));
```

## Example: Complete Component Development Flow

### Prompt 1: Initial Component

```
Create a GenerationProgress component for AutoMCP that shows:

1. Overall progress bar (0-100%)
2. Current agent name and status
3. List of all 9 agents with checkmarks for completed ones
4. Estimated time remaining
5. Cancel button

Use Tailwind CSS, TypeScript, and shadcn/ui Progress component.
Make it responsive and accessible.
```

### Prompt 2: Add Real-Time Updates

```
Update GenerationProgress to receive real-time updates via WebSocket:

- Connect to ws://localhost:8000/ws/generation/{sessionId}
- Listen for 'agent_update' events
- Update progress bar and agent status
- Show connection status indicator
- Handle reconnection on disconnect
- Add error handling with toast notifications

Use socket.io-client and our useWebSocket hook.
```

### Prompt 3: Add Animations

```
Add smooth animations to GenerationProgress:

- Progress bar fills with easing animation
- Agent status changes fade in/out
- Completed agents get a checkmark animation
- Current agent pulses gently
- Error state shakes briefly

Use Framer Motion for animations.
Keep animations subtle and performant.
```

### Prompt 4: Add Accessibility

```
Enhance GenerationProgress accessibility:

- Add ARIA live region for status updates
- Announce progress changes to screen readers
- Add keyboard shortcut (Escape) to cancel
- Ensure focus management
- Add descriptive ARIA labels
- Test with screen reader

Follow WCAG 2.1 AA guidelines.
```

## Integration with Backend

### API Client Setup

```typescript
// src/lib/api-client.ts

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Type-Safe API Calls

```typescript
// src/lib/api/projects.ts

import { apiClient } from '@/lib/api-client';
import { Project, CreateProjectInput } from '@/types';

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const { data } = await apiClient.get('/api/projects');
    return data;
  },

  create: async (input: CreateProjectInput): Promise<Project> => {
    const { data } = await apiClient.post('/api/projects', input);
    return data;
  },

  get: async (id: string): Promise<Project> => {
    const { data } = await apiClient.get(`/api/projects/${id}`);
    return data;
  },

  update: async (id: string, input: Partial<Project>): Promise<Project> => {
    const { data } = await apiClient.patch(`/api/projects/${id}`, input);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/projects/${id}`);
  },
};
```

## Summary

Using Impeccable skill for AutoMCP frontend development provides:

✅ **Faster Development** - Natural language to production code
✅ **Best Practices** - Modern React patterns built-in
✅ **Consistency** - Uniform component structure
✅ **Accessibility** - WCAG compliance by default
✅ **Type Safety** - Full TypeScript support
✅ **Performance** - Optimized components
✅ **Maintainability** - Clean, documented code

### Next Steps

1. **Install Impeccable skill** in your Cline/Roo-Cline environment
2. **Initialize AutoMCP frontend** with Next.js 14 + TypeScript + Tailwind
3. **Start with core components** (Input Methods, Agent Pipeline, Code Editor)
4. **Iterate and refine** using Impeccable's feedback loop
5. **Test thoroughly** for accessibility and performance
6. **Deploy** to production with confidence

Happy building! 🚀