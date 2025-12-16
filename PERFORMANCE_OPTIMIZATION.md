# Performance Optimization Guide

This document outlines the performance optimizations implemented in the Family Communication Portal to ensure the system remains fast and responsive as it scales.

## Database Optimizations

### Indexing Strategy

Comprehensive indexes have been added to all high-traffic tables to optimize query performance:

#### Patients Table
- `idx_patients_agency_id` - Agency-based filtering (most common query)
- `idx_patients_status` - Status filtering
- `idx_patients_agency_status` - Composite index for agency + status queries
- `idx_patients_name` - Name-based searches
- `idx_patients_created_at` - Ordering by creation date
- `idx_patients_fulltext` - Full-text search on patient names

#### Messages Table
- `idx_messages_patient_id` - Patient message lookups
- `idx_messages_created_at` - Message ordering
- `idx_messages_patient_created` - Composite index for patient + date queries
- `idx_messages_read` - Unread message filtering
- `idx_messages_sender` - Sender lookups
- `idx_messages_patient_read` - Composite index for patient + read status

#### Visits Table
- `idx_visits_patient_id` - Patient visit lookups
- `idx_visits_scheduled_date` - Date-based ordering
- `idx_visits_patient_scheduled` - Composite index for patient + date
- `idx_visits_status` - Status filtering (if column exists)
- `idx_visits_patient_status` - Composite index for patient + status
- `idx_visits_staff_id` - Staff assignment lookups

#### Family Members Table
- `idx_family_members_patient_id` - Patient family lookups
- `idx_family_members_user_id` - User lookups
- `idx_family_members_invite_token` - Invite token lookups
- `idx_family_members_status` - Status filtering
- `idx_family_members_patient_status` - Composite index for patient + status

#### Other Tables
Similar indexing strategies applied to:
- Deliveries
- Supply Requests
- Agency Users
- Team Invitations
- Education Modules
- Care Team Members
- Visit Feedback
- Internal Messages

### Autovacuum Tuning

High-traffic tables have been configured with aggressive autovacuum settings:

```sql
-- Messages table (high insert/update volume)
ALTER TABLE messages SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

-- Visits table
ALTER TABLE visits SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

-- Patients table
ALTER TABLE patients SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);
```

## Application-Level Optimizations

### Pagination

All list views implement pagination to limit data transfer and rendering:

#### Patient List
- **Page Size**: 20 patients per page
- **Implementation**: Server-side pagination using Supabase `.range()`
- **Features**: 
  - Total count tracking
  - Previous/Next navigation
  - Current page indicator
  - Automatic reset on filter changes

```typescript
const ITEMS_PER_PAGE = 20;
const from = (currentPage - 1) * ITEMS_PER_PAGE;
const to = from + ITEMS_PER_PAGE - 1;

const { data, count } = await supabase
  .from("patients")
  .select("*", { count: "exact" })
  .order("created_at", { ascending: false })
  .range(from, to);
```

#### Message Thread
- **Page Size**: 50 messages per page
- **Implementation**: Reverse chronological loading (newest first)
- **Features**:
  - Load more functionality
  - Infinite scroll support
  - Optimistic UI updates

```typescript
const MESSAGES_PER_PAGE = 50;
const { data, count } = await supabase
  .from("messages")
  .select("*", { count: "exact" })
  .eq("patient_id", patientId)
  .order("created_at", { ascending: false })
  .range(from, to);
```

### Query Optimization

#### Use Specific Selects
Instead of `select("*")`, specify only needed columns:

```typescript
// ❌ Bad - fetches all columns
.select("*")

// ✅ Good - fetches only needed columns
.select("id, first_name, last_name, status")
```

#### Limit Result Sets
Always use `.limit()` or `.range()` for list queries:

```typescript
// ❌ Bad - fetches all records
.select("*")

// ✅ Good - limits to 20 records
.select("*").limit(20)

// ✅ Better - pagination with range
.select("*").range(0, 19)
```

#### Use Composite Indexes
When filtering by multiple columns, ensure composite indexes exist:

```typescript
// This query benefits from idx_patients_agency_status
.select("*")
.eq("agency_id", agencyId)
.eq("status", "active")
```

### Real-Time Subscriptions

Real-time subscriptions are optimized with filters:

```typescript
// ✅ Good - filtered subscription
supabase
  .channel(`messages:${patientId}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "messages",
      filter: `patient_id=eq.${patientId}`, // Filter at database level
    },
    handleChange
  )
  .subscribe();
```

### File Upload Optimization

#### Attachment Handling
- **Size Limit**: 5 files per message
- **Storage**: Supabase Storage with public URLs
- **Naming**: UUID-based to prevent conflicts

```typescript
const fileName = `${Date.now()}-${file.name}`;
const filePath = `message-attachments/${fileName}`;

await supabase.storage
  .from("attachments")
  .upload(filePath, file);
```

## Monitoring & Maintenance

### Performance Monitoring

Key metrics to monitor:

1. **Query Performance**
   - Average query execution time
   - Slow query log (queries > 1s)
   - Index usage statistics

2. **Database Size**
   - Table sizes
   - Index sizes
   - Growth rate

3. **Connection Pool**
   - Active connections
   - Connection wait time
   - Pool exhaustion events

### Regular Maintenance

#### Weekly
- Review slow query log
- Check autovacuum activity
- Monitor table bloat

#### Monthly
- Analyze table statistics: `ANALYZE table_name;`
- Review and optimize unused indexes
- Check for missing indexes on new query patterns

#### Quarterly
- Full database vacuum: `VACUUM FULL;` (during maintenance window)
- Review and archive old data
- Update performance benchmarks

## Scaling Considerations

### When to Scale

Monitor these thresholds:

1. **Database CPU** > 70% sustained
2. **Query latency** > 500ms for p95
3. **Connection pool** > 80% utilization
4. **Storage** > 80% capacity

### Scaling Strategies

#### Vertical Scaling
- Increase database instance size
- Add more CPU/RAM
- Faster storage (SSD → NVMe)

#### Horizontal Scaling
- Read replicas for reporting queries
- Connection pooling (PgBouncer)
- Caching layer (Redis)

#### Data Archival
- Archive patients with status "archived" after 1 year
- Move old messages to cold storage after 2 years
- Implement soft deletes with retention policies

## Best Practices

### DO ✅

1. **Always use pagination** for list views
2. **Filter at the database level** using RLS and WHERE clauses
3. **Use composite indexes** for multi-column filters
4. **Limit SELECT columns** to only what's needed
5. **Use connection pooling** in production
6. **Monitor query performance** regularly
7. **Implement caching** for frequently accessed data
8. **Use batch operations** for bulk updates

### DON'T ❌

1. **Don't fetch all records** without pagination
2. **Don't use `SELECT *`** in production queries
3. **Don't create indexes** without analyzing query patterns
4. **Don't ignore slow query logs**
5. **Don't skip database maintenance**
6. **Don't store large files** in the database
7. **Don't use client-side filtering** for large datasets
8. **Don't create unnecessary real-time subscriptions**

## Future Optimizations

### Planned Improvements

1. **Caching Layer**
   - Redis for session data
   - Cache frequently accessed patient data
   - Cache agency settings

2. **CDN Integration**
   - Serve static assets from CDN
   - Cache public files
   - Optimize image delivery

3. **Database Partitioning**
   - Partition messages table by date
   - Partition visits table by date
   - Archive old partitions

4. **Search Optimization**
   - Implement Elasticsearch for full-text search
   - Add search suggestions
   - Improve search relevance

5. **Background Jobs**
   - Move email sending to background queue
   - Batch notification processing
   - Scheduled data cleanup

## Resources

- [Supabase Performance Guide](https://supabase.com/docs/guides/database/performance)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Database Indexing Best Practices](https://use-the-index-luke.com/)
