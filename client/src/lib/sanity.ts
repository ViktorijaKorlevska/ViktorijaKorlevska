import { createClient } from '@sanity/client';

export const sanityClient = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID,
  dataset: import.meta.env.SANITY_DATASET,
  apiVersion: import.meta.env.SANITY_API_VERSION,
  useCdn: true
});

// Helper to check for missing env vars
if (!import.meta.env.SANITY_PROJECT_ID || !import.meta.env.SANITY_DATASET) {
  console.error(
    'Sanity configuration missing. Please set SANITY_PROJECT_ID and SANITY_DATASET in your .env file.'
  );
}
