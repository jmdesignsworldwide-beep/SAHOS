import { redirect } from 'next/navigation';

// The collection now lives on the home page — the stacked product banners under
// "The Marilyn Collection — Summer '26" (see app/page.tsx / CollectionShowcase).
// This route is kept only so old links, bookmarks and the Stripe cancel_url
// resolve to the unified home view instead of a duplicate grid.
export default function CollectionRedirect() {
  redirect('/#collection');
}
