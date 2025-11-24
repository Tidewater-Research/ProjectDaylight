# Project Daylight - Launch-Focused Roadmap

*Last Updated: November 2024*

**Goal: Launch in 2-3 weeks with current features + great experience**

---

## Current Status

### ✅ What's Working
- Voice capture → transcription → event extraction → timeline
- Evidence upload and management
- Markdown + PDF export with real data
- Timeline view with filtering
- Basic dashboard with stats
- OCR for uploaded images

### 🔥 What's Broken
- ~~**CRITICAL:** All API routes fail in production (work in dev)~~ **FIXED! ✅**
- ~~Manual auth header passing everywhere (poor DX)~~ **FIXED! ✅**
- ~~Need to apply auth fix pattern to remaining API routes~~ **FIXED! ✅**
- No payments/subscriptions
- Landing page needs work
- No branding/polish

---

## PHASE 1: Critical Fixes (Week 1)
*"Make it actually work in production"*

### ✅ Priority 0: Fix Production API/Auth - **COMPLETE**
**THE BLOCKER - SOLVED!**

- [x] **Fixed production deployment**
  - Root cause identified: Wrong JWT field (`user.id` vs `user.sub`)
  - Fixed cookie passing using `useFetch` with `useRequestHeaders(['cookie'])`
  - Added proper Supabase config to `nuxt.config.ts`
  
- [x] **Auth fixes implemented:**
  1. ✅ Added proper Supabase config to `nuxt.config.ts`:
     - `cookieOptions` for session handling
     - `clientOptions` with PKCE flow
     - Correct domain/sameSite for production
  2. ✅ Fixed backend to use `user?.sub` (JWT standard)
  3. ✅ Fixed frontend to pass cookies with `useFetch`
  4. ✅ Created client plugin for session management

- [x] **Pattern applied to all remaining routes & pages:**
  - Backend: Use `user?.sub || user?.id` for user ID
  - Frontend: Use `useFetch` with `useRequestHeaders(['cookie'])`
  - Verified in production for home, timeline, evidence, and case routes after fixing `tslib` runtime issue on Vercel

**Success:** User can record voice note in production → see it in timeline ✅

---

## PHASE 2: Launch Essentials (Week 2)
*"Make it worth paying for"*

### Priority 1: Image Evidence Storage
**Persist and surface original images for both OCR-backed and simple photo evidence**

- [x] **Supabase Storage + RLS**
  - Enable/configure the evidence image bucket in Supabase
  - Set up RLS policies so users can only access their own images (per-user folders in `daylight-files`)
  - Use signed URLs for reading images from the frontend (TODO)
 
- [x] **Persist image files alongside OCR/LLM data**
  - When image evidence is created, store the original image file (whether or not OCR is needed)
  - Save the storage path/URL on the evidence record
  - Ensure existing OCR extraction flow continues to work unchanged for documents that benefit from it
  - For “simple” photo evidence (e.g. pictures of injuries, locations), let the LLM generate an optional short description instead of running full OCR
  
- [x] **UI support for viewing and using stored images**
  - Show image preview/thumbnail on the evidence page
  - Allow opening a full-size image viewer from evidence and/or timeline views
  - Make it clear when an evidence item has an attached image vs. text-only OCR vs. image + LLM description
  - Make it easy to associate image-only evidence with events (full association UX is covered in Priority 2, but UI should not assume OCR is always present)
  
**Success:** User can upload an image as evidence → app stores it securely in Supabase → user can view that image later from the evidence UI and, whether it’s OCR-backed or just a photo with an LLM description, associate it with relevant events.

### Priority 2: Evidence-Event Association
**Connect evidence to timeline events for context**

- [ ] **Database schema updates**
  - Create junction table for evidence-event relationships (many-to-many)
  - Add proper foreign keys and RLS policies
  - Migration for new relationship structure
  
- [ ] **Event detail page enhancements**
  - Display all evidence associated with an event
  - Quick link to view each piece of evidence
  - Show evidence thumbnails in event card
  - Add/remove evidence associations from event view
  
- [ ] **Evidence detail page enhancements**
  - Show all events associated with this evidence
  - Add/remove event associations from evidence view
  - Timeline context for when evidence was captured vs. events
  
- [ ] **Association interface**
  - Search/select events when viewing evidence
  - Search/select evidence when viewing events
  - Bulk association capabilities
  - Visual indicators for linked items
  
**Success:** User can link a photo to multiple events → see photo when viewing event → see events when viewing photo

### Priority 2.5: Evidence Entry UX
**Make adding evidence fast and flexible, with AI as an enhancement**

- [ ] **Evidence capture workflow**
  - Default to a quick “Save evidence” flow after upload (with or without description)
  - Offer AI extraction/description as an optional follow-up action, not the only primary button
  - Support future expansion for batch uploads and mixed media (photos, docs, screenshots)

---

### Priority 3: Payments & Billing
- [ ] **Stripe integration**
  - Subscription checkout ($49/month)
  - 7-day free trial
  - Payment method management
  - Cancel/resume flow
  
- [ ] **Billing page**
  - Current plan display
  - Usage stats (if applicable)
  - Upgrade/downgrade options
  - Invoice history

### Priority 4: Landing Page & Branding
- [ ] **Professional landing page**
  - Compelling hero: "Your Story, Protected"
  - 3 key benefits (Evidence capture, Timeline, Court-ready exports)
  - Pricing: Simple $49/month with 7-day trial
  - Social proof (even if testimonials are hypothetical initially)
  - Clear CTA: "Start Free Trial"
  
- [ ] **Brand identity**
  - Consistent color scheme throughout app
  - Professional logo (even if simple)
  - Favicon
  - Email templates for auth/billing

### Priority 5: Onboarding & First Experience
- [ ] **Smooth signup flow**
  - Email/password or Google OAuth
  - Immediate access after signup (trial starts)
  - Welcome email with getting started tips
  
- [ ] **First-use experience**
  - Quick 3-step tutorial overlay
  - Sample data for new users to explore
  - First voice capture celebration
  - Clear value demonstration

---

## PHASE 3: Polish & Launch Prep (Week 3)
*"Make it feel professional"*

### Priority 6: Critical Polish
- [ ] **Mobile responsiveness**
  - Test all pages on mobile
  - Fix breaking layouts
  - Ensure capture works on mobile
  
- [ ] **Error handling**
  - User-friendly error messages
  - Fallback states for failures
  - Loading states everywhere
  
- [ ] **Performance**
  - Optimize bundle size
  - Lazy load heavy components
  - Cache API responses where sensible

### Priority 7: Production Readiness
- [ ] **Monitoring & Analytics**
  - Error tracking (Sentry)
  - Basic analytics (Posthog)
  - Conversion tracking
  
- [ ] **Support infrastructure**
  - Help documentation (FAQ)
  - Contact email/form
  - Bug report mechanism
  
- [ ] **Legal requirements**
  - ✅ Terms of Service (done)
  - ✅ Privacy Policy (done)
  - Cookie consent (if needed)
  - Data deletion process

---

## LAUNCH CHECKLIST

### Pre-Launch Testing
- [ ] Full user journey in production (signup → capture → export)
- [ ] Payment flow end-to-end
- [ ] Mobile testing on real devices
- [ ] Load testing (can handle 100 concurrent users?)

### Launch Day
- [ ] Monitoring dashboard ready
- [ ] Support email monitored
- [ ] Team available for hotfixes
- [ ] Backup/rollback plan ready

### Success Metrics
- [ ] 10 trial signups in first week
- [ ] 3 conversions to paid in first month
- [ ] <5% error rate in production
- [ ] <3s page load times

---

## POST-LAUNCH: Future Enhancements
*After we have paying customers and validated product-market fit*

### Month 2-3
- [ ] AI Chat interface (natural language queries)
- [ ] Direct camera capture for photos
- [ ] Email forwarding for evidence
- [ ] Advanced search/filtering

### Month 4-6
- [ ] Pattern detection & insights
- [ ] Attorney collaboration features
- [ ] Calendar integration
- [ ] Multi-language support

### Month 6+
- [ ] Mobile native apps
- [ ] Voice speaker identification
- [ ] Court filing integration
- [ ] HIPAA compliance

---

## Development Philosophy for Launch

### Do's ✅
- Ship with bugs rather than not ship
- Focus on core value: capture → timeline → export
- Make payment easy
- Polish what users see most

### Don'ts ❌
- Add new features before launch
- Perfect the codebase
- Over-engineer solutions
- Wait for perfect conditions

### Remember
**Goal: Get 10 paying customers in first month, not build perfect product**

Every day without paying customers is a day without validation. Launch lean, iterate based on real feedback.

---

## Next 48 Hours Action Items

1. **Today:**
   - [x] Diagnose production API issue (auth pattern + `tslib` runtime on Vercel)
   - [x] Check all Vercel env variables
   - [x] Try minimal fix to get API working

2. **Tomorrow:**
   - [ ] Test voice flow in production
   - [ ] Begin Stripe integration
   - [ ] Draft new landing page copy

3. **This Week:**
   - [ ] Complete Phase 1 (Critical Fixes)
   - [ ] Start Phase 2 (Launch Essentials)

---

*Last thought: Perfect is the enemy of shipped. Your current feature set (voice → timeline → export) is already valuable. Focus on making that experience smooth and getting it in front of users who need it.*