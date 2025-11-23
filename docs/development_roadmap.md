# Project Daylight - Development Roadmap

*Last Updated: November 2024*

---

## Progress Summary

**Overall Status:** ~40% Complete

- ✅ **Milestone 0:** Database Foundation - COMPLETE
- ✅ **Milestone 1:** Real Data Capture & Storage - MOSTLY COMPLETE (OCR pending)
- ⏳ **Milestone 2:** Evidence Management & Export - IN PROGRESS (PDF generation needed)
- ⏳ **Milestone 3:** AI Intelligence Layer - PARTIALLY COMPLETE (interpreter needs real integration)
- ❌ **Milestone 4:** Landing Page & Polish - NOT STARTED
- ❌ **Milestone 5:** Launch Preparation - NOT STARTED

**Key Completed Features:**
- Full database schema with RLS policies
- Voice recording with OpenAI transcription
- Structured event extraction from voice notes
- Event storage and timeline display
- Evidence file upload to Supabase storage
- Evidence management UI
- Export templates (UI only, PDF generation pending)

**Critical Path Items:**
1. ~~Voice capture → database~~ ✅
2. OCR integration for photos
3. PDF generation for exports
4. Natural language interpreter integration

---

## Overview

This roadmap outlines the remaining development work for Project Daylight MVP, organized into 5 focused milestones that prioritize early functionality. Each milestone builds toward a launch-ready product that can start serving real users and generating revenue.

**Target Timeline:** 8-10 weeks to soft launch

---

## Milestone 0: Database Foundation ✅ COMPLETE
*"Set up the data layer for everything else to build on"*

### Database Schema & Infrastructure
- [x] **Design and implement core database schema**
  - Events table (from voice_extraction_schema.md)
  - Evidence/documents table
  - Timeline entries linking events + evidence
  - User profiles and authentication structure
  - Audit trails for court credibility

- [x] **Set up Supabase tables and relationships**
  - Row Level Security policies
  - Indexes for performance
  - Triggers for timestamps and audit logs
  
- [x] **Create database migration system**
  - Initial schema migrations
  - Seed data for development
  - Migration documentation

---

## Milestone 1: Real Data Capture & Storage ✅ MOSTLY COMPLETE
*"Make the capture features actually save data"*

### Core Capture Functionality
- [x] **Connect voice capture to real storage**
  - Save audio files to Supabase storage
  - Store transcripts in database
  - Link extracted events to timeline
  - Store extraction metadata

- [ ] **Implement screenshot/photo capture**
  - Direct camera capture interface
  - Gallery upload functionality
  - Store images in Supabase storage
  - Basic OCR integration (Google Vision API or similar)
  - Extract text and save as evidence

- [x] **File upload system**
  - Document upload interface
  - PDF, images, text files support
  - Store in Supabase storage
  - Extract metadata and searchable content

### Timeline Integration
- [x] **Connect timeline to real data**
  - Display actual captured events
  - Real-time updates on new captures
  - Filter by date range and event type
  - Link timeline events to evidence

---

## Milestone 2: Evidence Management & Export ⏳ IN PROGRESS
*"Turn chaos into court-ready documentation"*

### Evidence Repository
- [x] **Full evidence management**
  - Evidence preview system
  - Full-text search implementation
  - Evidence-to-event linking UI
  - Tagging and categorization
  - Evidence metadata display

- [ ] **Email forwarding integration**
  - Set up email ingestion endpoint
  - Parse emails and attachments
  - Auto-extract relevant information
  - Add to timeline automatically

### Export Functionality
- [ ] **PDF generation (Priority)**
  - Chronological timeline PDF
  - Include linked evidence
  - Court-appropriate formatting
  - Professional headers/footers
  - Page numbers and dates

- [x] **Basic export templates**
  - Last 30 days report
  - Full timeline export
  - Incident-only report
  - Positive parenting summary

---

## Milestone 3: AI Intelligence Layer ⏳ PARTIALLY COMPLETE
*"Add the smart features that differentiate us"*

### Natural Language Interpreter
- [ ] **Connect interpreter to real data**
  - Integrate with OpenAI/Anthropic API
  - Query against actual timeline/evidence
  - Return citations with responses
  - Save conversation history

- [ ] **Common query templates**
  - "What happened on [date]?"
  - "Show all incidents this month"
  - "Find patterns in [behavior]"
  - "Summarize custody compliance"

### Proactive Insights
- [ ] **Basic pattern detection**
  - Identify repeated incidents
  - Flag timeline gaps
  - Detect missing documentation
  - Surface contradictions

- [ ] **Smart notifications**
  - Pattern alerts
  - Documentation reminders
  - Deadline notifications
  - Evidence gap warnings

### Enhanced Extraction
- [x] **Improve voice extraction**
  - Better temporal resolution
  - Multi-event extraction refinement
  - Confidence scoring
  - Ambiguity handling

---

## Milestone 4: Landing Page & Polish ❌ NOT STARTED
*"Get ready for real users"*

### Marketing Website
- [ ] **Landing page development**
  - Hero section with clear value prop
  - Feature highlights (3 core benefits)
  - Pricing section ($49-99/month)
  - Testimonials/use cases
  - CTA for free trial signup

- [ ] **Conversion optimization**
  - A/B test ready infrastructure
  - Analytics integration (Posthog/Mixpanel)
  - Email capture for waitlist
  - SEO optimization basics

### Product Polish
- [ ] **User onboarding flow**
  - Account creation streamlined
  - Initial data capture tutorial
  - Sample data for new users
  - First capture success moment

- [ ] **Critical bug fixes**
  - Performance optimization
  - Mobile responsiveness
  - Cross-browser testing
  - Error handling improvements

- [ ] **Advanced exports**
  - Word document generation
  - CSV data export
  - Custom date ranges
  - Email delivery option

---

## Milestone 5: Launch Preparation ❌ NOT STARTED
*"Go live with paying customers"*

### Payment & Subscriptions
- [ ] **Stripe integration**
  - Subscription management
  - 7-day free trial
  - Payment processing
  - Billing portal

- [ ] **Account management**
  - User settings/profile
  - Data export/portability
  - Account deletion
  - Privacy controls

### Production Readiness
- [ ] **Infrastructure hardening**
  - Error monitoring (Sentry)
  - Performance monitoring
  - Backup systems
  - Security audit

- [ ] **Legal/Compliance**
  - Terms of Service
  - Privacy Policy
  - Data handling documentation
  - HIPAA compliance basics

### Go-to-Market
- [ ] **Soft launch preparation**
  - Beta user recruitment (10-20 users)
  - Support documentation
  - Feedback collection system
  - Initial marketing materials

---

## Development Principles

### Priority Order
1. **Make it work** - Functional before beautiful
2. **Make it valuable** - Features users will pay for
3. **Make it scalable** - But not over-engineered

### Technical Decisions
- **Database:** Supabase (already configured)
- **File Storage:** Supabase Storage
- **AI/LLM:** OpenAI API (already integrated)
- **OCR:** Google Vision API or Tesseract
- **PDF Generation:** Puppeteer or jsPDF
- **Payments:** Stripe
- **Analytics:** PostHog or Mixpanel
- **Email:** SendGrid or Resend

### Quality Gates
Each milestone should meet these criteria before moving forward:
- Core functionality works end-to-end
- No critical bugs
- Mobile responsive
- Basic error handling
- Can demo to potential user

---

## Success Metrics

### Milestone 1 Success ✅
- ✅ Voice note → saved event in timeline
- ⏳ Photo upload → extracted text in evidence (OCR not implemented yet)

### Milestone 2 Success  ⏳
- ⏳ Generate real PDF from actual data (template exists, PDF generation pending)
- ✅ Search and find specific evidence

### Milestone 3 Success ⏳
- ⏳ Ask "What happened yesterday?" → get real answer (UI exists, integration pending)
- ❌ System identifies a pattern in actual data (not implemented)

### Milestone 4 Success ❌
- ❌ Landing page converts visitor to trial signup
- ❌ New user successfully captures first event

### Milestone 5 Success ❌
- ❌ First paying customer
- ❌ 10+ active trial users

---

## Risk Mitigation

### Technical Risks
- **OCR accuracy:** Start with Google Vision API for reliability
- **PDF generation complexity:** Use existing templates, iterate later
- **AI costs:** Implement usage caps and monitoring

### Market Risks
- **User adoption:** Focus on Richmond family court community first
- **Pricing sensitivity:** A/B test pricing, offer emergency packages
- **Competition:** Move fast, focus on integration not features

---

## Post-MVP Enhancements

After successful launch and initial revenue:
- Calendar integration
- Voice speaker identification  
- Multi-language support
- Attorney collaboration features
- Court filing integration
- Mobile native apps

---

## Next Immediate Steps

### Priority 1: Complete Milestone 2 🎯
1. **PDF Generation** - Critical for users to export court-ready documents
   - Implement chronological timeline PDF
   - Include linked evidence
   - Professional formatting
   
2. **OCR Integration** - Complete photo capture workflow
   - Integrate Google Vision API or Tesseract
   - Extract text from uploaded images
   - Link extracted text to evidence records

### Priority 2: Connect AI Interpreter
3. **Natural Language Queries** - Enable interpreter functionality
   - Connect to actual timeline/evidence data
   - Implement query templates
   - Add citation support
   
### Quick Wins for Momentum
- ✅ ~~Get one complete flow working: Voice → Event → Timeline~~ DONE
- ⏳ Complete flow: Voice → Event → Timeline → **PDF export**
- Deploy to staging for testing
- Recruit 3-5 alpha testers

---

*Remember: The goal is paying customers in 10 weeks, not perfection. Ship early, iterate based on real user feedback.*
