# Supabase Upload Refactor: The Hybrid Approach

## What Was Wrong (The Non-Idiomatic Approach)

1. **Custom API Endpoint for Upload**: The frontend was calling `/api/evidence-upload` which then used the service role key to upload files
2. **Manual Auth Header Management**: Adding `Authorization: Bearer ${token}` headers manually
3. **Server-Side Service Role for User Files**: Using `serverSupabaseServiceRole` for operations that should use the user's authenticated client
4. **Two-Step Process**: Upload through API, then API uploads to Supabase

This approach bypassed Supabase's built-in RLS (Row Level Security) and authentication system.

## The Idiomatic Supabase Way

### 1. Direct Client Upload
```typescript
// OLD WAY (Non-idiomatic)
const formData = new FormData()
formData.append('file', blob)
await $fetch('/api/evidence-upload', {
  headers: { Authorization: `Bearer ${token}` },
  body: formData
})

// NEW WAY (Idiomatic)
const supabase = useSupabaseClient()
const { data, error } = await supabase.storage
  .from('daylight-files')
  .upload(storagePath, blob, {
    contentType: blob.type,
    upsert: false
  })
```

### 2. RLS Policies for Storage
Created proper RLS policies that allow authenticated users to:
- Upload files to their own folders (`evidence/{user_id}/*`)
- View/update/delete their own files
- Prevent access to other users' files

### 3. Separation of Concerns
- **Upload**: Handled directly by Supabase client
- **OCR Processing**: Optional separate endpoint that only handles OCR
- **Database Operations**: Also done directly from the client with RLS

## Benefits of the Idiomatic Approach

1. **Security**: RLS policies enforce access control at the database level
2. **Simplicity**: No need for custom authentication logic
3. **Performance**: Direct upload from client to Supabase (no proxy through your server)
4. **Cost**: Reduced server compute and bandwidth
5. **Scalability**: Supabase handles the storage infrastructure
6. **Type Safety**: Full TypeScript support with generated types

## Migration Files Created

1. **`0010_storage_rls_policies.sql`**: Enables RLS on storage.objects and creates policies for user file access
2. **`database.types.ts`**: Generated TypeScript types for full type safety
3. **`ocr-process.post.ts`**: Simplified OCR-only endpoint (optional)

## Key Takeaways

✅ **Always prefer direct Supabase client operations when possible**
✅ **Use RLS policies instead of service role keys for user data**
✅ **Let Supabase handle authentication - it's built for this**
✅ **Generate and use TypeScript types for compile-time safety**

The Supabase client already has authentication built-in via cookies/session management. When you use `useSupabaseClient()` in Nuxt, it automatically includes the user's session, making manual header management unnecessary.

## UPDATE: The Hybrid Approach (Best of Both Worlds)

After considering the architectural benefits, we've implemented a hybrid approach that combines Supabase best practices with proper backend control:

### Why Use an API Route?

✅ **Business Logic Consolidation** - All evidence processing in one place
✅ **Validation** - File size, type, and content validation before storage
✅ **Atomic Operations** - If storage succeeds but DB fails, we can clean up
✅ **Error Handling** - Centralized error management and logging
✅ **Future Flexibility** - Easy to add virus scanning, AI processing, etc.
✅ **Testing** - Easier to unit test backend logic

### The Hybrid Implementation

```typescript
// Frontend - Simple and clean
const formData = new FormData()
formData.append('file', blob)
await $fetch('/api/evidence', { method: 'POST', body: formData })

// Backend - Still uses Supabase idiomatically!
const user = await serverSupabaseUser(event)  // Auto-validates session
const supabase = await serverSupabaseClient(event)  // User's client, not service role!

// Direct Supabase operations with user's permissions
await supabase.storage.from('daylight-files').upload(...)
await supabase.from('evidence').insert(...)
```

### Key Points

1. **Still Idiomatic** - Uses `serverSupabaseClient` (user's client) not service role
2. **RLS Still Works** - Operations respect Row Level Security policies
3. **Better Architecture** - Backend handles complex logic, frontend stays simple
4. **Maintainable** - All evidence logic in one place

This approach gives you the security and simplicity of Supabase with the architectural benefits of backend processing.
