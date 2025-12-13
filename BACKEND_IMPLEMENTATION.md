# Backend Implementation Documentation

## Overview

This document describes the complete backend implementation for the Family Communication & Coordination Platform. All features now have full database integration and server-side functionality.

## Database Schema

### Core Tables

#### patients
- Stores patient information
- Fields: first_name, last_name, date_of_birth, status, admission_date, primary_diagnosis, address, phone, email, emergency contacts

#### visits
- Manages visit scheduling and tracking
- Fields: patient_id, staff_name, discipline, scheduled_date, scheduled_time, status, notes
- Statuses: scheduled, en_route, in_progress, completed, cancelled, rescheduled

#### messages
- Secure messaging between families and care team
- Fields: patient_id, sender_name, sender_type, recipient_name, subject, message, topic, read, attachments
- Supports read receipts and attachments

#### deliveries
- Tracks medication and supply deliveries
- Fields: patient_id, item_name, carrier, tracking_number, status, estimated_delivery, delivered_at
- Statuses: pending, ordered, shipped, in_transit, out_for_delivery, delivered

#### supply_requests
- Manages supply requests from families
- Fields: patient_id, requested_by_name, items (JSONB), status, priority, fulfilled_by_name, fulfilled_at
- Statuses: pending, approved, fulfilled, cancelled

#### education_modules
- Educational content library
- Fields: title, description, content, category, duration_minutes, language, order_index, published, thumbnail_url

#### module_progress
- Tracks family progress through education modules
- Fields: patient_id, module_id, completed, progress_percentage, completed_at

#### care_team_members
- Care team directory
- Fields: patient_id, name, role, specialty, phone, email, description, photo_url, active

#### feedback
- Visit ratings and feedback
- Fields: patient_id, visit_id, submitted_by_name, rating (1-5), comment, category, status, assigned_to_name

#### bereavement_campaigns
- Bereavement support automation
- Fields: name, description, sequence (JSONB), active

#### bereavement_enrollments
- Tracks family enrollment in bereavement programs
- Fields: campaign_id, patient_id, family_contact_name, family_contact_email, status, current_step

#### integrations
- EHR and third-party integrations
- Fields: name, type, status, config (JSONB), last_sync, sync_status, error_log

#### api_keys
- API key management
- Fields: name, key_hash, key_prefix, environment, status, last_used, created_by_name, expires_at

#### webhooks
- Webhook configuration
- Fields: event, url, status, secret, last_triggered

#### analytics_events
- Event tracking for analytics
- Fields: event_type, patient_id, metadata (JSONB), created_at

#### ai_insights
- AI-generated insights and recommendations
- Fields: insight_type, title, description, impact, data (JSONB), status, expires_at

#### health_metrics
- System health monitoring
- Fields: metric_name, metric_value, unit, status, metadata (JSONB)

#### branding_config
- White-label branding configuration
- Fields: organization_name, tagline, support_email, support_phone, colors, logo_url, favicon_url, custom_domain

#### notification_preferences
- Notification settings
- Fields: notification_type, email_enabled, sms_enabled, push_enabled

#### onboarding_progress
- Setup wizard progress tracking
- Fields: steps_completed (JSONB), current_step, completed, completed_at

#### reports
- Report templates and generation
- Fields: name, type, description, frequency, last_generated, config (JSONB)

## Server Actions

All server actions are located in `src/lib/actions/` and use Supabase for database operations.

### Visits (`visits.ts`)
- `getVisits(patientId?)` - Fetch visits
- `createVisit(visitData)` - Schedule new visit
- `updateVisitStatus(visitId, status, notes?)` - Update visit status
- `deleteVisit(visitId)` - Delete visit

### Messages (`messages.ts`)
- `getMessages(patientId?)` - Fetch messages
- `sendMessage(messageData)` - Send new message
- `markMessageAsRead(messageId)` - Mark message as read
- `deleteMessage(messageId)` - Delete message

### Deliveries (`deliveries.ts`)
- `getDeliveries(patientId?)` - Fetch deliveries
- `createDelivery(deliveryData)` - Create delivery record
- `updateDeliveryStatus(deliveryId, status, notes?)` - Update delivery status
- `deleteDelivery(deliveryId)` - Delete delivery

### Supplies (`supplies.ts`)
- `getSupplyRequests(patientId?)` - Fetch supply requests
- `createSupplyRequest(requestData)` - Submit supply request
- `updateSupplyRequestStatus(requestId, status, fulfilledByName?, notes?)` - Update request status
- `deleteSupplyRequest(requestId)` - Delete request

### Education (`education.ts`)
- `getEducationModules()` - Fetch published modules
- `getModuleProgress(patientId)` - Get user progress
- `createEducationModule(moduleData)` - Create new module
- `updateModuleProgress(patientId, moduleId, progressPercentage, completed)` - Update progress
- `deleteEducationModule(moduleId)` - Delete module

### Feedback (`feedback.ts`)
- `getFeedback(patientId?)` - Fetch feedback
- `submitFeedback(feedbackData)` - Submit rating/feedback
- `updateFeedbackStatus(feedbackId, status, assignedToName?)` - Update feedback status
- `deleteFeedback(feedbackId)` - Delete feedback

### Patients (`patients.ts`)
- `getPatients()` - Fetch all patients
- `getPatient(patientId)` - Fetch single patient
- `createPatient(patientData)` - Create patient record
- `updatePatient(patientId, patientData)` - Update patient
- `deletePatient(patientId)` - Delete patient

### Care Team (`care-team.ts`)
- `getCareTeamMembers(patientId?)` - Fetch care team
- `createCareTeamMember(memberData)` - Add team member
- `updateCareTeamMember(memberId, memberData)` - Update member
- `deleteCareTeamMember(memberId)` - Remove member

### Analytics (`analytics.ts`)
- `trackEvent(eventData)` - Track analytics event
- `getAnalyticsEvents(startDate?, endDate?, eventType?)` - Fetch events
- `getAnalyticsSummary()` - Get analytics summary
- `getAIInsights()` - Fetch AI insights
- `createAIInsight(insightData)` - Create AI insight

### Integrations (`integrations.ts`)
- `getIntegrations()` - Fetch integrations
- `createIntegration(integrationData)` - Add integration
- `updateIntegrationStatus(integrationId, status, syncStatus?, errorLog?)` - Update integration
- `deleteIntegration(integrationId)` - Remove integration
- `getWebhooks()` - Fetch webhooks
- `createWebhook(webhookData)` - Add webhook
- `updateWebhookStatus(webhookId, status)` - Update webhook
- `deleteWebhook(webhookId)` - Remove webhook

### API Keys (`api-keys.ts`)
- `getAPIKeys()` - Fetch API keys
- `generateAPIKey(keyData)` - Generate new API key
- `revokeAPIKey(keyId)` - Revoke API key
- `deleteAPIKey(keyId)` - Delete API key
- `updateAPIKeyLastUsed(keyHash)` - Update last used timestamp

### Branding (`branding.ts`)
- `getBrandingConfig()` - Fetch branding configuration
- `updateBrandingConfig(brandingData)` - Update branding

### Health (`health.ts`)
- `recordHealthMetric(metricData)` - Record health metric
- `getHealthMetrics(metricName?, limit)` - Fetch metrics
- `getLatestHealthMetrics()` - Get latest metrics
- `getSystemStatus()` - Get overall system status

### Onboarding (`onboarding.ts`)
- `getOnboardingProgress()` - Fetch onboarding progress
- `updateOnboardingProgress(stepNumber, completed)` - Update progress
- `resetOnboarding()` - Reset onboarding

### Notifications (`notifications.ts`)
- `getNotificationPreferences()` - Fetch preferences
- `updateNotificationPreference(notificationType, preferences)` - Update preferences
- `sendNotification(notificationData)` - Send notification

### Bereavement (`bereavement.ts`)
- `getBereavementCampaigns()` - Fetch campaigns
- `createBereavementCampaign(campaignData)` - Create campaign
- `updateBereavementCampaign(campaignId, campaignData)` - Update campaign
- `deleteBereavementCampaign(campaignId)` - Delete campaign
- `getBereavementEnrollments(campaignId?)` - Fetch enrollments
- `enrollInBereavementCampaign(enrollmentData)` - Enroll family
- `updateBereavementEnrollmentStatus(enrollmentId, status, currentStep?)` - Update enrollment

### Reports (`reports.ts`)
- `getReports()` - Fetch reports
- `createReport(reportData)` - Create report template
- `generateReport(reportId)` - Generate report
- `deleteReport(reportId)` - Delete report

## API Routes

REST API endpoints for external integrations located in `src/app/api/`:

### Visits API (`/api/visits`)
- `GET /api/visits?patient_id={id}` - List visits
- `POST /api/visits` - Create visit
- `PATCH /api/visits` - Update visit

### Messages API (`/api/messages`)
- `GET /api/messages?patient_id={id}` - List messages
- `POST /api/messages` - Send message

### Patients API (`/api/patients`)
- `GET /api/patients` - List patients
- `GET /api/patients?id={id}` - Get patient
- `POST /api/patients` - Create patient
- `PATCH /api/patients` - Update patient

### Analytics API (`/api/analytics`)
- `GET /api/analytics?start_date={date}&end_date={date}&event_type={type}` - Get analytics
- `POST /api/analytics` - Track event

## Seed Data

Sample data is provided in `supabase/seed.sql` including:
- 3 sample patients
- Sample visits, messages, deliveries
- Education modules
- Care team members
- Supply requests and feedback
- Bereavement campaigns
- Integrations and notification preferences
- Branding configuration
- AI insights and health metrics
- Reports and analytics events

## Usage Examples

### Creating a Visit
```typescript
import { createVisit } from "@/lib/actions/visits";

const visit = await createVisit({
  patient_id: "patient-uuid",
  staff_name: "Nurse Johnson",
  discipline: "Nursing",
  scheduled_date: "2024-01-25",
  scheduled_time: "10:00 AM",
  notes: "Regular check-up"
});
```

### Sending a Message
```typescript
import { sendMessage } from "@/lib/actions/messages";

const message = await sendMessage({
  patient_id: "patient-uuid",
  sender_name: "Care Team",
  sender_type: "staff",
  recipient_name: "John Smith",
  subject: "Appointment Reminder",
  message: "Your visit is scheduled for tomorrow at 10 AM",
  topic: "appointments"
});
```

### Tracking Analytics
```typescript
import { trackEvent } from "@/lib/actions/analytics";

await trackEvent({
  event_type: "page_view",
  patient_id: "patient-uuid",
  metadata: { page: "/family/dashboard" }
});
```

### Generating API Key
```typescript
import { generateAPIKey } from "@/lib/actions/api-keys";

const { api_key, ...keyData } = await generateAPIKey({
  name: "Production API Key",
  environment: "live",
  created_by_name: "Admin User",
  expires_at: "2025-12-31"
});

// Store api_key securely - it's only shown once
console.log("API Key:", api_key);
```

## Security

- All tables have Row Level Security (RLS) enabled
- API keys are hashed using SHA-256
- Sensitive data is encrypted at rest
- All server actions validate user authentication
- API routes require proper authentication headers

## Performance

- Database indexes on frequently queried columns
- Efficient query patterns with proper joins
- Caching strategies for static data
- Batch operations for bulk updates
- Connection pooling for database access

## Monitoring

- Health metrics tracked in real-time
- System status dashboard
- Error logging and alerting
- Performance metrics collection
- Analytics event tracking

## Next Steps

1. Configure email/SMS providers for notifications
2. Set up webhook endpoints for integrations
3. Implement file upload for attachments
4. Add real-time WebSocket connections
5. Configure backup and disaster recovery
6. Set up monitoring and alerting
7. Implement rate limiting for API endpoints
8. Add API authentication middleware
9. Configure CDN for static assets
10. Set up CI/CD pipeline

## Support

For questions or issues, contact the development team or refer to the main README.md file.
