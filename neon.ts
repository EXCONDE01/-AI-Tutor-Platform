/**
 * Neon Infrastructure as Code Configuration
 * 
 * This file declares the Neon services and branch configuration for the AI Tutor Platform.
 * Used by the Neon CLI and GitHub Actions for branch-per-teacher deployments.
 * 
 * @see https://neon.tech/docs/guides/neon-config
 */

import { defineConfig } from '@neon/config';

export default defineConfig({
  // Project-level services
  auth: true,                    // Managed Better Auth for authentication
  
  // Functions deployed to Neon compute
  functions: {
    tutor: {
      name: 'Tutor Agent',       // Display name (required)
      source: 'src/functions/tutor.ts',  // Tutor agent function entry point
    },
    chat: {
      name: 'Streaming Chat',    // Display name (required)
      source: 'src/functions/chat.ts',   // Dedicated streaming chat function
    },
  },
  
  // Object storage buckets (branch with database)
  buckets: {
    artifacts: {
      access: 'private',         // Teacher-generated artifacts (lesson plans, quizzes, etc.)
    },
    exports: {
      access: 'private',         // Export jobs (PDF, CSV, LTI grade passback)
    },
  },
  
  // NO aiGateway: true (using OpenRouter instead)
  
  // Preview features (including Realtime)
  preview: {
    realtime: {
      // Browser origins allowed to connect
      allowedOrigins: ['*'],
    },
  },
  
  // Per-branch tuning closure
  branch: (branch) => ({
    // TTL for teacher/preview branches - auto-delete after 30 days of inactivity
    ttl: '30d',
    
    // Smaller compute for teacher branches (cost optimization)
    // These branches don't need production-scale resources
    postgres: {
      computeSettings: {
        autoscalingLimitMinCu: 0.25,    // Quarter CPU at idle
        autoscalingLimitMaxCu: 2,       // Up to 2 CPU under load
        suspendTimeout: '10m',          // Suspend after 10 minutes of inactivity
      },
    },
    
    // Scale to zero after inactivity
    // autoSuspend is handled by suspendTimeout in computeSettings
  }),
  
  // GitHub integration settings (experimental)
  experimental: {
    hooks: {
      // GitHub branch-per-teacher workflow would be configured here
    }
  },
});

/**
 * Type exports for TypeScript consumers
 */
export type NeonConfig = ReturnType<typeof defineConfig>;
export type BranchConfig = NeonConfig['branch'];
export type ComputeConfig = NonNullable<BranchConfig extends (b: any) => infer R ? R : never>['postgres'];
export type BucketConfig = NonNullable<NeonConfig['buckets']>['artifacts'];
export type FunctionConfig = NonNullable<NeonConfig['functions']>['tutor'];