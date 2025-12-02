# AI Extraction Improvements

This document outlines targeted improvements to the journal entry extraction system to make it more effective for family law custody cases, with jurisdiction-specific guidance starting with Virginia.

## Background

The current extraction system has solid fundamentals but is optimized for generic family law rather than what state-specific courts actually weight in custody decisions. These improvements will make the system more valuable for users in active custody disputes.

## Files to Modify

- `src/server/api/capture/extract-events.post.ts` - Real-time extraction endpoint
- `src/server/inngest/functions/journal-extraction.ts` - Background job extraction
- `src/app/types/index.d.ts` - Type definitions (if needed)
- New: `src/server/utils/state-guidance.ts` - State-specific legal guidance

---

## 1. Reframe Event Types

### Current Implementation

```typescript
z.enum(['incident', 'positive', 'medical', 'school', 'communication', 'legal'])
```

This lumps too much together. "Positive parenting" covers both "emptied dishwasher" and "read books together at bedtime for 30 minutes"—those aren't equivalent in terms of court relevance.

### Proposed Implementation

```typescript
z.enum([
  'parenting_time',      // Actual engaged time with child (reading, playing, activities)
  'caregiving',          // Meals, baths, bedtime routines, medical care
  'household',           // Chores, maintenance, logistics
  'coparent_conflict',   // Disputes, violations, hostility between parents
  'gatekeeping',         // Interference, withholding info, alienating language
  'communication',       // Neutral coordination (scheduling, logistics)
  'medical',             // Medical appointments, health decisions, medications
  'school',              // School events, homework, academic matters
  'legal'                // Court filings, attorney communications, legal proceedings
])
```

### Why This Matters

Courts distinguish between:
- **Engaged parenting** (quality time) vs **household tasks** (chores)
- **Neutral co-parent communication** vs **conflict/gatekeeping**
- Evidence of active alienation behaviors needs explicit categorization

### Implementation Notes

- [ ] Update `EventSchema` type enum in both files
- [ ] Update database `events.type` enum (migration required)
- [ ] Consider backward compatibility: map old types → new types for existing data
- [ ] Update any UI that displays/filters by event type

---

## 2. Add Gatekeeping Detection to System Prompt

### Current State

The system prompt doesn't specifically call out gatekeeping behaviors, which are critical in custody disputes.

### Add to Rules Section

```
- Flag "gatekeeping" behaviors explicitly: schedule interference, withholding information 
  (medical, school, location), controlling access to child's belongings, alienating 
  language to or about the other parent in child's presence, unilateral decisions about 
  child's schedule/activities.
```

### What Qualifies as Gatekeeping

| Behavior | Example |
|----------|---------|
| Schedule interference | Not returning child on time, changing pickup locations without notice |
| Withholding information | Not sharing report cards, doctor visit results, school events |
| Controlling access to belongings | Refusing to send child's clothes, toys, medications |
| Alienating language | Negative comments about other parent in child's presence |
| Unilateral decisions | Enrolling in activities, changing doctors without consultation |

---

## 3. Add Child Statements Field

### Proposed Schema Addition

```typescript
child_statements: z.array(z.object({
  statement: z.string().describe('Direct quote or paraphrased statement from the child'),
  context: z.string().describe('When and where the statement was made'),
  concerning: z.boolean().describe('Whether this statement indicates alienation, coaching, or distress')
})).describe('Direct quotes or paraphrased statements from the child')
```

### Why This Matters

Child statements can be powerful evidence of:
- **Alienation** - Child saying things that mirror the other parent's language
- **Coaching** - Child asking questions or making statements beyond their understanding
- **Confusion** - Child unsure of custody arrangements (e.g., "are you taking me to daddy's house?" when they live with daddy)

### Database Consideration

May need a new `child_statements` table or store as JSONB in `events.metadata`:

```sql
-- Option A: New table
CREATE TABLE child_statements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  statement text NOT NULL,
  context text,
  is_concerning boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Option B: JSONB in events table (simpler)
-- Store in events.metadata field
```

---

## 4. Strengthen Pattern Detection Prompt

### Current State

The `patterns_noted` field exists but the model isn't guided on what patterns matter for custody cases.

### Add to System Prompt

```
- Note patterns relevant to custody: 
  - Repeated schedule violations (late pickups, early dropoffs, missed exchanges)
  - Consistent failure to communicate about child's welfare
  - Escalating hostility in co-parent interactions
  - Delegation of parenting to third parties (new partners, grandparents doing primary care)
  - Disruption of child's routine (bedtime, meals, activities)
  - Withholding of medical or school information
  - Pattern of unilateral decision-making
```

### Implementation

Update `patterns_noted` to be more structured:

```typescript
patterns_noted: z.array(z.object({
  pattern_type: z.enum([
    'schedule_violation',
    'communication_failure', 
    'escalating_hostility',
    'delegation_of_parenting',
    'routine_disruption',
    'information_withholding',
    'unilateral_decisions'
  ]),
  description: z.string(),
  frequency: z.enum(['first_time', 'recurring', 'chronic']).nullable()
}))
```

---

## 5. Add Co-Parent Communication Tone Analysis

### Proposed Schema Addition

```typescript
coparent_interaction: z.object({
  your_tone: z.enum(['neutral', 'cooperative', 'defensive', 'hostile']).nullable(),
  their_tone: z.enum(['neutral', 'cooperative', 'defensive', 'hostile']).nullable(),
  your_response_appropriate: z.boolean().nullable().describe('Whether the user\'s response was appropriate to the situation')
}).nullable().describe('Analysis of co-parent interaction tone when applicable')
```

### Why This Matters

Courts review communication records (OFW, texts, emails). Demonstrating that one party consistently stays measured while the other escalates is powerful evidence. This field helps the user:

1. Document the other parent's escalating behavior
2. Get feedback on their own communication (self-improvement)
3. Build a pattern of evidence showing restraint

### Usage

Only populate when the event involves direct co-parent communication. Set to `null` for events that don't involve interaction with the co-parent.

---

## 6. Fix Welfare Impact Schema

### Current Implementation

```typescript
welfare_impact: z.enum(['none', 'minor', 'moderate', 'significant', 'positive', 'unknown'])
```

This conflates severity with direction. Something can be "significantly positive" or "moderately negative."

### Proposed Implementation

```typescript
welfare_impact: z.object({
  category: z.enum([
    'routine',      // Daily routines, schedules
    'emotional',    // Emotional wellbeing, stress, anxiety
    'medical',      // Physical health, medical care
    'educational',  // School, learning, development
    'social',       // Friendships, activities, extracurriculars
    'safety',       // Physical safety, supervision
    'none'          // No impact on child welfare
  ]),
  direction: z.enum(['positive', 'negative', 'neutral']),
  severity: z.enum(['minimal', 'moderate', 'significant']).nullable()
}).describe('Impact on child welfare with category, direction, and severity')
```

### Database Migration

Update `events` table:

```sql
-- Add new columns
ALTER TABLE events 
  ADD COLUMN welfare_category text,
  ADD COLUMN welfare_direction text,
  ADD COLUMN welfare_severity text;

-- Migrate existing data
UPDATE events SET 
  welfare_direction = CASE 
    WHEN welfare_impact = 'positive' THEN 'positive'
    WHEN welfare_impact = 'none' THEN 'neutral'
    WHEN welfare_impact = 'unknown' THEN 'neutral'
    ELSE 'negative'
  END,
  welfare_severity = CASE 
    WHEN welfare_impact = 'minor' THEN 'minimal'
    WHEN welfare_impact = 'moderate' THEN 'moderate'
    WHEN welfare_impact = 'significant' THEN 'significant'
    ELSE NULL
  END;

-- Eventually drop old column
ALTER TABLE events DROP COLUMN welfare_impact;
```

---

## 7. State-Specific Legal Guidance

### Architecture

Create a new utility file `src/server/utils/state-guidance.ts` that provides jurisdiction-specific context for the LLM.

```typescript
// src/server/utils/state-guidance.ts

interface StateGuidance {
  state: string
  statute: string
  standard: string
  keyFactors: string[]
  promptGuidance: string
}

export const STATE_CUSTODY_GUIDANCE: Record<string, StateGuidance> = {
  'Virginia': {
    state: 'Virginia',
    statute: 'VA Code § 20-124.3',
    standard: 'best interests of the child',
    keyFactors: [
      'Each parent\'s role in caregiving (who handles daily care, medical appointments, school)',
      'Willingness to support the child\'s relationship with the other parent',
      'Ability to maintain a close and continuing relationship with the child',
      'Child\'s reasonable preference (if of appropriate age and maturity)',
      'History of family abuse',
      'Each parent\'s ability to resolve disputes',
      'Propensity of each parent to support the child\'s contact with the other parent'
    ],
    promptGuidance: `Virginia courts apply the "best interests of the child" standard under VA Code § 20-124.3. 
Key factors weighted heavily:
- Each parent's role in daily caregiving (who handles meals, bedtime, medical care, school involvement)
- Willingness to support the child's relationship with the other parent (evidence of gatekeeping is damaging)
- Ability to maintain a close and continuing relationship with the child
- Each parent's ability to resolve disputes without conflict
- History of family abuse (if applicable)

Document events that speak to these specific factors. J&DR courts specifically look for patterns of behavior, not isolated incidents.`
  },

  // Add more states as needed
  'California': {
    state: 'California',
    statute: 'Family Code § 3011',
    standard: 'best interest of the child',
    keyFactors: [
      'Health, safety, and welfare of the child',
      'History of abuse by one parent',
      'Nature and amount of contact with both parents',
      'Habitual or continual use of alcohol or drugs'
    ],
    promptGuidance: `California courts apply Family Code § 3011 for custody determinations.
Key considerations:
- Health, safety, and welfare of the child
- Any history of abuse by one parent against the child or other parent
- The nature and amount of contact with both parents
- Any habitual or continual illegal use of controlled substances or alcohol

Document events related to these factors specifically.`
  },

  // Default/generic guidance when state is unknown or not yet implemented
  '_default': {
    state: 'Unknown',
    statute: 'General family law principles',
    standard: 'best interests of the child',
    keyFactors: [
      'Each parent\'s caregiving role',
      'Stability and continuity',
      'Co-parenting ability',
      'Child\'s needs and preferences'
    ],
    promptGuidance: `Courts generally apply a "best interests of the child" standard. 
Key factors typically include:
- Each parent's role in caregiving
- Stability and continuity in the child's life
- Parents' ability to co-parent effectively
- Child's physical and emotional needs

Document events that demonstrate your involvement and any concerning behaviors by the other party.`
  }
}

export function getStateGuidance(jurisdictionState: string | null | undefined): StateGuidance {
  if (!jurisdictionState) {
    return STATE_CUSTODY_GUIDANCE['_default']
  }

  // Normalize state name (handle abbreviations)
  const normalized = normalizeStateName(jurisdictionState)
  
  return STATE_CUSTODY_GUIDANCE[normalized] || STATE_CUSTODY_GUIDANCE['_default']
}

function normalizeStateName(input: string): string {
  const abbrevMap: Record<string, string> = {
    'VA': 'Virginia',
    'CA': 'California',
    'TX': 'Texas',
    'NY': 'New York',
    'FL': 'Florida',
    // Add more as guidance is added
  }

  const trimmed = input.trim()
  
  // Check if it's an abbreviation
  if (abbrevMap[trimmed.toUpperCase()]) {
    return abbrevMap[trimmed.toUpperCase()]
  }
  
  // Title case the input
  return trimmed.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
```

### Integration in Extraction

When building the system prompt, inject state-specific guidance:

```typescript
// In extract-events.post.ts and journal-extraction.ts

import { getStateGuidance } from '~/server/utils/state-guidance'

// When building caseContext...
if (caseRow?.jurisdiction_state) {
  const guidance = getStateGuidance(caseRow.jurisdiction_state)
  
  // Add to system prompt
  if (guidance.state !== 'Unknown') {
    lines.push('')
    lines.push('JURISDICTION-SPECIFIC GUIDANCE:')
    lines.push(guidance.promptGuidance)
  }
}
```

---

## Implementation Checklist

### Phase 1: Schema Updates (Database Migration)

- [ ] Create migration for new event types enum
- [ ] Add welfare_category, welfare_direction, welfare_severity columns
- [ ] Consider child_statements storage approach
- [ ] Plan data migration for existing events

### Phase 2: Extraction Schema Updates

- [ ] Update `EventSchema` with new event types
- [ ] Add `child_statements` field
- [ ] Add `coparent_interaction` field  
- [ ] Restructure `welfare_impact` to new object format
- [ ] Update `patterns_noted` to structured format (optional)

### Phase 3: System Prompt Improvements

- [ ] Add gatekeeping detection rules
- [ ] Add pattern detection guidance
- [ ] Create `state-guidance.ts` utility
- [ ] Integrate state-specific guidance into prompts

### Phase 4: Code Updates

- [ ] Update `extract-events.post.ts`
- [ ] Update `journal-extraction.ts` (background job)
- [ ] Update TypeScript types
- [ ] Update any UI components that display event types

### Phase 5: Testing

- [ ] Test with Virginia jurisdiction case
- [ ] Verify new event types are being detected
- [ ] Verify gatekeeping behaviors are flagged
- [ ] Verify child statements are captured
- [ ] Test backward compatibility with existing data

---

## Example: Before and After

### User Input

> "Yesterday Mari brought Josie back an hour late again. When I asked why, she said 'you're not her only parent you know.' Josie seemed tired and said 'mommy said we could stay up late because she doesn't have stupid rules like you.' I kept calm and just said 'okay, let's get you ready for bed.'"

### Current Extraction

```json
{
  "type": "incident",
  "title": "Late custody exchange",
  "description": "Co-parent returned child an hour late...",
  "custody_relevance": {
    "agreement_violation": true,
    "welfare_impact": "minor"
  }
}
```

### Improved Extraction

```json
{
  "type": "gatekeeping",
  "title": "Late custody exchange with alienating language",
  "description": "Co-parent returned child one hour late. When questioned, co-parent responded defensively...",
  "child_statements": [
    {
      "statement": "mommy said we could stay up late because she doesn't have stupid rules like you",
      "context": "Upon return from late custody exchange",
      "concerning": true
    }
  ],
  "coparent_interaction": {
    "your_tone": "neutral",
    "their_tone": "defensive", 
    "your_response_appropriate": true
  },
  "welfare_impact": {
    "category": "routine",
    "direction": "negative",
    "severity": "minimal"
  },
  "patterns_noted": [
    {
      "pattern_type": "schedule_violation",
      "description": "Repeated late returns from custody exchanges",
      "frequency": "recurring"
    }
  ],
  "custody_relevance": {
    "agreement_violation": true,
    "safety_concern": false
  }
}
```

---

## Future State Guidance Expansion

Priority order for adding state guidance:

1. **Virginia** ✓ (Initial implementation)
2. **Texas** - Large population, community property state
3. **California** - Large population, different legal framework
4. **Florida** - Large population, specific relocation laws
5. **New York** - Distinct court system structure
6. **Pennsylvania** - Common, different custody factors

Each state addition requires:
- Research of specific statutes
- Understanding of how courts weight factors differently
- Consultation with family law resources for that state

---

## Notes

- These changes improve extraction quality but don't change the fundamental architecture
- State guidance should be reviewed by legal professionals before production use
- Consider adding a disclaimer that the app doesn't provide legal advice
- The system learns patterns across a user's entries; individual extractions compound over time

