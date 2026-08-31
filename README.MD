# JobHazel

A full-stack job application CRM with a Chrome extension for saving job postings from any website.

JobHazel helps job seekers organize their search pipeline, save jobs from browser pages, track interviews, manage follow-up tasks, and analyze which job sources produce the best results.

The product is designed as a modern SaaS-style dashboard for candidates who apply across LinkedIn, Indeed, Greenhouse, Lever, Workday, company career pages, referrals, and recruiter outreach.

---

## Demo

**Live App:** Coming soon
**Demo Video:** Coming soon
**Chrome Extension Demo:** Coming soon

---

## Features

### Job Application Tracking

* Create, edit, and delete job applications
* Track applications by status
* Store company, role, location, salary range, source, job URL, and notes
* Assign priority levels to applications
* Detect duplicate applications by URL, company, and role
* View all applications in a searchable table

### Kanban Tracker

* Drag applications between hiring stages
* Persist status updates in the database
* Track pipeline movement through an activity log
* View applications by stage:

  * Saved
  * Applied
  * Recruiter Screen
  * Technical Interview
  * Final Interview
  * Offer
  * Rejected
  * Withdrawn

### Chrome Extension Job Saving

* Save jobs from any browser page
* Capture page title, URL, source domain, and selected text
* Open an import review page inside the web app
* Parse selected job description text into structured fields
* Let users review and confirm imported data before saving

### Job Import System

* Paste a job URL
* Paste a job description
* Import from the Chrome extension
* Auto-detect job source from domain
* Extract possible job title, company, location, salary range, and skills
* Create an import draft before converting it into an application

### Interviews

* Add interviews to applications
* Track interview type, date, duration, meeting link, interviewer, notes, and outcome
* View upcoming interviews from the dashboard

### Tasks and Follow-Ups

* Add follow-up tasks, prep tasks, thank-you notes, and reminders
* Automatically create follow-up tasks when an application is marked as applied
* Automatically create thank-you tasks after interviews
* Mark tasks as complete
* View overdue and upcoming tasks

### Contacts

* Store recruiters, referrals, hiring managers, and employee contacts
* Associate contacts with companies or specific applications
* Save email addresses, LinkedIn URLs, roles, and notes

### Resume Management (Planned)

* Upload and manage named resume versions
* Associate the exact resume version submitted with an application
* Preview or download resumes through temporary, authenticated links
* Preserve application history when a newer resume version is uploaded
* Filter applications by resume version
* Measure interview and offer conversion by resume version

### Analytics

* Track total applications
* View applications submitted this week
* Measure response rate
* Measure interview conversion rate
* Measure offer rate
* Analyze applications by source
* Analyze application status distribution
* Track application volume over time
* Identify which sources produce the most interviews

---

## Tech Stack

### Web App

* **Framework:** Next.js
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **UI Components:** shadcn/ui
* **Database:** PostgreSQL
* **ORM:** Prisma
* **Authentication:** Auth.js
* **Charts:** Recharts
* **Drag and Drop:** dnd-kit
* **Deployment:** Vercel
* **Database Hosting:** Neon, Supabase, or Railway
* **Private File Storage:** Cloudflare R2

### Chrome Extension

* **Manifest:** Chrome Manifest V3
* **Language:** TypeScript
* **Permissions:** activeTab, scripting where needed
* **Purpose:** Capture user-selected job posting content and open the app import flow

---

## Product Architecture

JobHazel is split into two main parts:

1. **The web application**, which handles authentication, job tracking, data persistence, analytics, and import review.
2. **The Chrome extension**, which captures job posting context from the active browser tab and sends it to the web app.

The extension is intentionally lightweight. It does not store job data permanently, scrape private user accounts, or perform background monitoring. It acts as a user-triggered capture tool.

### High-Level Flow

```text
User visits job posting
        ↓
User highlights job description
        ↓
User clicks Chrome extension: “Save Job”
        ↓
Extension captures title, URL, source domain, and selected text
        ↓
Extension creates an import draft or opens the import page
        ↓
Web app parses job data
        ↓
User reviews and confirms details
        ↓
Application is saved to the user's pipeline
```

---

## Core Data Models

### User

Represents an authenticated user.

```text
User
- id
- name
- email
- createdAt
- updatedAt
```

### Application

The main entity in the product. Represents one job opportunity.

```text
Application
- id
- userId
- companyId
- title
- status
- source
- sourceUrl
- location
- workplaceType
- employmentType
- salaryMin
- salaryMax
- currency
- description
- priority
- dateSaved
- dateApplied
- resumeVersionId
- notes
- createdAt
- updatedAt
```

### Company

Stores company-level information.

```text
Company
- id
- userId
- name
- website
- industry
- size
- logoUrl
- notes
- createdAt
- updatedAt
```

### Contact

Stores recruiters, referrals, hiring managers, and other contacts.

```text
Contact
- id
- userId
- companyId
- applicationId
- name
- role
- email
- linkedinUrl
- relationship
- notes
- createdAt
- updatedAt
```

### Interview

Stores interview events connected to an application.

```text
Interview
- id
- userId
- applicationId
- type
- scheduledAt
- durationMinutes
- location
- meetingUrl
- interviewerName
- notes
- outcome
- createdAt
- updatedAt
```

### Task

Stores follow-up reminders and application-related action items.

```text
Task
- id
- userId
- applicationId
- title
- description
- dueDate
- completedAt
- type
- createdAt
- updatedAt
```

### ResumeVersion

Stores metadata for an immutable resume file in private object storage. Updating a
resume's display name or notes is allowed, but replacing its file creates a new
`ResumeVersion`. This ensures an application continues to reference the exact file
that was submitted.

```text
ResumeVersion
- id
- userId
- name
- targetRole
- storageKey
- originalFilename
- mimeType
- sizeBytes
- checksum
- uploadStatus
- extractedText
- notes
- archivedAt
- createdAt
- updatedAt
```

The database stores only metadata and the object-storage key. Resume bytes and
expiring download URLs are never stored in PostgreSQL.

### ImportDraft

Stores temporary imported job data before a user confirms and saves it.

```text
ImportDraft
- id
- userId
- sourceUrl
- sourceDomain
- pageTitle
- rawText
- parsedTitle
- parsedCompany
- parsedLocation
- parsedSalaryMin
- parsedSalaryMax
- parsedDescription
- confidence
- createdAt
- convertedAt
```

### ActivityLog

Stores user-visible history for application changes.

```text
ActivityLog
- id
- userId
- applicationId
- type
- message
- metadata
- createdAt
```

---

## Application Statuses

```text
Saved
Applied
Recruiter Screen
Technical Interview
Final Interview
Offer
Rejected
Withdrawn
```

These statuses are used by the Kanban pipeline, analytics, and status history.

---

## API Overview

### Applications

```http
GET    /api/applications
POST   /api/applications
GET    /api/applications/:id
PATCH  /api/applications/:id
DELETE /api/applications/:id
PATCH  /api/applications/:id/status
```

### Imports

```http
POST /api/imports/create-draft
GET  /api/imports/:id
POST /api/imports/:id/convert
POST /api/parser/job-description
```

### Tasks

```http
POST  /api/tasks
PATCH /api/tasks/:id
PATCH /api/tasks/:id/complete
DELETE /api/tasks/:id
```

### Interviews

```http
GET   /api/interviews
GET   /api/interviews?upcoming=true
GET   /api/interviews?applicationId=:applicationId
POST  /api/interviews
PATCH /api/interviews/:id
DELETE /api/interviews/:id
```

### Analytics

```http
GET /api/analytics/summary
GET /api/analytics/sources
GET /api/analytics/timeline
GET /api/analytics/statuses
```

---

## Resume Feature Scope

The resume feature is a private, versioned document library connected to the
application pipeline. Its first purpose is to answer: **which resume did the user
submit for this application?** Later phases can use the same records for performance
analytics and job-to-resume matching.

### MVP User Experience

The MVP includes:

* A resume library where users can upload, list, rename, download, archive, and
  permanently delete resume versions
* PDF uploads only, with a maximum file size of 5 MB
* A user-configurable display name, optional target role, and optional notes
* Resume selection inside the create/edit application drawer
* One selected resume version per application
* An explicit “No resume selected” state
* Resume name and download action in application details
* Application history events when a resume is attached, changed, or removed
* Application filtering by resume version
* Basic resume performance metrics after enough application outcome data exists

The MVP does not include:

* Resume editing or document generation
* AI rewriting, scoring, or automatic tailoring
* DOC/DOCX uploads
* Public resume links
* Automatic submission to job boards
* Cover letters, portfolios, or general-purpose application attachments
* Cross-user file deduplication

### Storage Choice and Cost Controls

Resume files are stored in a private Cloudflare R2 bucket. R2 is S3-compatible,
supports presigned URLs, and has a free allowance suitable for an early-stage
resume library. Current pricing must be checked before deployment in the
[Cloudflare R2 pricing documentation](https://developers.cloudflare.com/r2/pricing/).

The implementation keeps storage and hosting costs low by applying these rules:

* Upload directly from the browser to R2 using a short-lived presigned `PUT` URL
* Download directly from R2 using a short-lived presigned `GET` URL
* Never proxy normal file contents through the JobHazel API
* Never store file bytes or base64 data in PostgreSQL
* Accept PDF files only and reject files larger than 5 MB
* Limit each user to 10 active resume versions initially
* Calculate a SHA-256 checksum and reject duplicate files belonging to the same user
* Remove abandoned `PENDING` uploads using a scheduled cleanup job or R2 lifecycle rule
* Permanently delete the storage object when the corresponding unreferenced resume is deleted
* Avoid generated thumbnails and duplicate transformed copies in the MVP

Objects use server-generated keys rather than user-provided filenames:

```text
users/{userId}/resumes/{resumeVersionId}/{randomId}.pdf
```

The bucket remains private. `storageKey` is persisted; presigned URLs are generated
when needed and are never stored because they expire.

### Upload Lifecycle

```text
Authenticated browser
        |
        | POST /api/resumes/uploads
        v
JobHazel API validates quota and creates a PENDING ResumeVersion
        |
        | returns a short-lived presigned PUT URL
        v
Browser uploads PDF directly to private R2 bucket
        |
        | POST /api/resumes/:id/complete
        v
API verifies object existence, size, type, and ownership
        |
        | marks upload READY
        v
Resume becomes selectable on applications
```

If finalization fails, the record is marked `FAILED` or removed and the uploaded
object is deleted. `PENDING` and `FAILED` resumes never appear in application
selectors.

### Proposed Prisma Changes

```prisma
enum ResumeUploadStatus {
  PENDING
  READY
  FAILED
}

model ResumeVersion {
  id               String             @id @default(cuid())
  userId           String
  user             User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  name             String
  targetRole       String?
  storageKey       String             @unique
  originalFilename String
  mimeType         String
  sizeBytes        Int
  checksum         String?
  uploadStatus     ResumeUploadStatus @default(PENDING)
  extractedText    String?
  notes            String?
  archivedAt       DateTime?
  applications     Application[]
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  @@unique([userId, checksum])
  @@index([userId, archivedAt])
}
```

`Application.resumeVersionId` remains the selected-resume foreign key. Deleting
or archiving a resume must not silently substitute a different version.

Add application activity types for:

```text
RESUME_ATTACHED
RESUME_CHANGED
RESUME_REMOVED
```

Activity metadata should contain resume IDs and display names, but never a signed
URL, storage credential, extracted resume text, or other sensitive file contents.

### Resume API

```http
GET    /api/resumes
POST   /api/resumes/uploads
POST   /api/resumes/:id/complete
GET    /api/resumes/:id/download-url
PATCH  /api/resumes/:id
DELETE /api/resumes/:id

PUT    /api/applications/:id/resume
```

Endpoint responsibilities:

* `GET /api/resumes` lists the authenticated user's `READY` resumes and optionally
  includes archived records.
* `POST /api/resumes/uploads` validates metadata, active-resume quota, MIME type,
  and declared size; creates a `PENDING` record; and returns an object key and
  presigned upload URL valid for approximately five minutes.
* `POST /api/resumes/:id/complete` verifies the uploaded object and marks it `READY`.
* `GET /api/resumes/:id/download-url` verifies ownership and returns a presigned
  download URL valid for approximately five minutes.
* `PATCH /api/resumes/:id` updates only mutable metadata such as name, target role,
  notes, or archive status. It never replaces the stored file.
* `DELETE /api/resumes/:id` permanently removes an unreferenced resume and its R2
  object. A referenced resume must first be archived or explicitly removed from
  its applications; the API returns `409 Conflict` rather than silently unlinking it.
* `PUT /api/applications/:id/resume` accepts `{ "resumeVersionId": string | null }`,
  verifies that both records belong to the authenticated user, updates the
  association, and writes the corresponding activity event.

All list, read, update, delete, upload-completion, download, and association queries
must include `userId` in their database predicate.

### Upload Validation and Security

Resumes contain personal information and must be treated as sensitive private data.

* Require authentication before creating any upload or download URL
* Use a private bucket with no public object listing or public `r2.dev` access
* Generate unpredictable object keys on the server
* Keep presigned URLs short-lived and scoped to one object and one operation
* Bind the expected `Content-Type` when signing the upload request
* Verify the stored object size after upload; do not trust client metadata
* Validate the PDF magic bytes (`%PDF-`) before marking an upload `READY`
* Return downloads with `Content-Disposition: attachment` and the sanitized original filename
* Escape user-visible filenames and never use them as storage paths
* Rate-limit upload initiation, completion, and download-URL endpoints
* Do not log signed URLs, extracted resume text, or storage credentials
* Store R2 credentials only in backend environment variables
* Include resume records and metadata in account export
* Delete resume objects during full account deletion

Presigned upload URLs reduce server cost but do not replace completion-time
verification. The browser-provided MIME type, filename, and size are untrusted.

### Deletion and Versioning Semantics

Resume files are immutable. Uploading a revised file creates a new version; it does
not overwrite the object referenced by past applications.

* **Archive:** hides a resume from new application selectors but preserves existing
  application associations and the underlying file.
* **Permanent delete:** removes the database record and R2 object only when no
  applications reference it.
* **Account deletion:** deletes all of the user's resume objects before or alongside
  cascading database deletion.
* **Failed/abandoned upload:** deletes both the temporary object and incomplete
  database record after a short retention period.

### Resume Analytics

The first analytics iteration groups applied applications by `resumeVersionId` and
reports:

```text
Applications submitted
Applications receiving a response
Applications reaching an interview
Applications receiving an offer
Interview rate = applications with an interview / applications submitted
Offer rate = offers / applications submitted
```

Archived resumes remain in historical analytics. Metrics should display sample size
and avoid presenting a resume as definitively better when only a few applications
used it.

### Phased Implementation Plan

Each phase should be merged only after its exit criteria pass. Phases 0–4 make up
the upload-and-association MVP. Analytics and document enrichment build on that
stable lifecycle and should not block the initial release.

#### Phase 0: Storage and Data Foundations

Goal: establish the storage contract and database shape without exposing unfinished
functionality in the UI.

Implementation:

* Create a private `jobhazel-resumes` R2 bucket with public access disabled.
* Configure bucket CORS for the production and local frontend origins, allowing only
  the headers and `PUT`/`GET` methods required by presigned requests.
* Create an R2 API token restricted to the resume bucket.
* Add the S3-compatible SDK and presigning dependencies to the backend.
* Add and validate the resume environment variables during backend startup.
* Introduce a `resume-storage` service interface for presigning, inspecting, reading
  a small byte range, and deleting objects. Keep R2-specific code behind this
  interface so automated tests can use a fake storage adapter.
* Add `ResumeUploadStatus`, the new `ResumeVersion` metadata fields, indexes, and
  activity types through a Prisma migration.
* Audit existing `ResumeVersion` rows before removing `fileUrl`. If deployed data
  exists, use a transitional nullable migration, migrate or remove old records, and
  make required fields non-null in a follow-up migration.
* Regenerate the Prisma client and update account JSON export serialization for the
  new metadata fields without exporting storage credentials or signed URLs.

Tests and checks:

* Environment validation fails clearly when required R2 settings are absent in a
  production environment.
* Prisma migration works on both an empty database and a copy containing existing
  application data.
* The storage adapter can presign and inspect a test object without making the
  bucket public.

Exit criteria: the migrated backend starts successfully, the private bucket is
reachable through the storage adapter, and no existing application behavior changes.

#### Phase 1: Resume Upload and Download API

Goal: implement the authenticated backend lifecycle before building the UI.

Implementation:

* Add resume validators, routes, controllers, and services following the existing
  backend structure.
* Implement `GET /api/resumes` and user-scoped resume lookup.
* Implement `POST /api/resumes/uploads` to validate declared PDF metadata, enforce
  the active-resume quota, allocate the record and object key, and return a
  five-minute presigned `PUT` URL.
* Implement `POST /api/resumes/:id/complete` to inspect the object, enforce the true
  stored size, read enough bytes to verify `%PDF-`, and transition the owned record
  from `PENDING` to `READY`.
* Delete the uploaded object and mark or remove the record when completion validation
  fails.
* Implement `GET /api/resumes/:id/download-url` with ownership checks and a
  five-minute presigned `GET` URL.
* Implement metadata updates and archive/unarchive behavior in
  `PATCH /api/resumes/:id`; file replacement is not an update operation.
* Treat client checksums as a deduplication optimization, not as trusted security
  input. Confirm the checksum when the storage provider exposes a reliable value or
  when later processing reads the complete file.
* Normalize API errors for invalid type, oversized file, quota exceeded, duplicate
  file, missing object, invalid state transition, and access denied.

Tests and checks:

* Unit-test metadata validation, key generation, state transitions, and ownership
  predicates.
* Integration-test initiation, successful completion, invalid PDF cleanup, oversized
  object cleanup, expired/missing uploads, download authorization, quota enforcement,
  and cross-user access attempts using a fake storage adapter.
* Confirm that `PENDING`, `FAILED`, and archived records are excluded from the default
  list used by resume selectors.

Exit criteria: a resume can complete the full upload/download lifecycle through the
API, and no endpoint can expose or mutate another user's resume.

#### Phase 2: Resume Library UI

Goal: let users manage resume versions independently from applications.

Implementation:

* Add a `resumes` dashboard view and navigation item using the existing document
  icon.
* Add frontend resume types, API helpers, and loading/error state to the dashboard
  data flow.
* Build a resume library showing display name, target role, filename, size, creation
  date, archive status, and application usage count.
* Build an upload dialog with drag-and-drop/file selection, PDF and 5 MB client-side
  checks, editable display name, target role, and notes.
* Upload directly to the returned R2 URL, show progress/state, then call the
  completion endpoint. A failed direct upload must remain retryable or cleanly reset.
* Add authenticated download, rename, notes, archive, and unarchive actions.
* Clearly explain that uploading a revised file creates a new resume version.
* Keep incomplete uploads out of the normal library and provide actionable error
  messages rather than showing broken records.

Tests and checks:

* Component-test file selection, client validation, upload failure, completion
  failure, empty/loading/error states, metadata edits, and archive behavior.
* Manually verify upload and download against the development R2 bucket from the
  local frontend origin.
* Verify keyboard access, focus behavior, and screen-reader labels in the upload
  dialog and action menus.

Exit criteria: a signed-in user can upload, view, rename, download, archive, and
unarchive a resume without interacting with an application.

#### Phase 3: Application Association and History

Goal: record the exact resume version used for each job application.

Implementation:

* Implement `PUT /api/applications/:id/resume` with same-user validation for both
  records and support `null` to remove an association.
* Include selected resume summary data in application API responses without including
  a storage key or signed URL.
* Write `RESUME_ATTACHED`, `RESUME_CHANGED`, and `RESUME_REMOVED` activity events in
  the same transaction as the application update.
* Add a resume selector to the application create/edit drawer. Show only owned,
  `READY`, non-archived resumes for new selections while continuing to display an
  archived resume already associated with an application.
* Add the selected resume and authenticated download action to application details.
* Add application filtering by resume version, including a “No resume” filter.
* Warn, but do not block, when an application is moved to `APPLIED` without a resume.

Tests and checks:

* Test attach, replace, and remove operations and their activity events.
* Test cross-user resume association attempts and nonexistent or non-`READY` resume
  IDs.
* Test archived historical associations and the no-resume state.
* Regression-test application creation, editing, filtering, history, import
  conversion, and account export.

Exit criteria: every application can reliably identify and download its submitted
resume version, and every association change is visible in application history.

#### Phase 4: Lifecycle Hardening and MVP Release

Goal: prevent orphaned objects, uncontrolled usage, and privacy regressions before
the feature is released.

Implementation:

* Implement `DELETE /api/resumes/:id` with `409 Conflict` for referenced resumes and
  object deletion for unreferenced resumes.
* Add the permanent-delete confirmation UI and explain the difference between archive
  and delete.
* Add cleanup for abandoned `PENDING`/`FAILED` uploads using an R2 lifecycle rule or
  a scheduled authenticated backend job.
* Extend account deletion to enumerate and delete the user's R2 objects. Make the
  cleanup retryable so a transient R2 error cannot silently orphan private files.
* Apply endpoint rate limits and server-side active-resume quotas.
* Review logs and error reporting to ensure credentials, signed URLs, filenames, and
  extracted contents are not captured unnecessarily.
* Verify production bucket privacy, token scope, CORS origins, signed URL lifetime,
  and upload-size enforcement.
* Add storage usage and failed-cleanup observability so cost or orphan growth can be
  detected early.

Tests and checks:

* Exercise permanent deletion, referenced-record conflicts, account deletion,
  cleanup retry, abandoned uploads, and idempotent cleanup.
* Run the complete backend and frontend test suites.
* Complete a two-user manual security pass covering every resume endpoint and UI
  action.
* Verify that direct object URLs cannot access resumes after presigned links expire.

Exit criteria: all MVP behavior, cleanup paths, privacy controls, and regression tests
pass in a production-like environment. The resume upload MVP is ready to release at
the end of this phase.

#### Phase 5: Resume Performance Analytics

Goal: show how resume versions correlate with application outcomes.

Implementation:

* Add a backend aggregation grouped by `resumeVersionId` for submitted applications,
  responses, interviews, offers, interview rate, and offer rate.
* Include archived resumes in historical results and group deleted/no-resume data
  explicitly rather than dropping it silently.
* Add a resume analytics table with counts, rates, and clear sample sizes.
* Reuse the existing application and interview definitions so resume metrics agree
  with the rest of the analytics dashboard.
* Avoid ranking or declaring a winner below a documented minimum sample size.

Exit criteria: resume metrics reconcile with application-level data and remain
understandable when versions have small samples or no outcomes.

#### Phase 6: Parsing and Job Matching

Goal: add optional resume intelligence without coupling it to core storage.

Implementation:

* Extract searchable text from PDFs in an asynchronous job after upload completion.
* Track parsing status and failure separately from `ResumeUploadStatus`.
* Compare deterministic skills and keywords against saved job descriptions before
  introducing paid AI processing.
* Suggest the most relevant existing resume for an application, with reasons the
  user can inspect and override.
* Allow users to duplicate metadata into a new tailored resume version, while keeping
  the actual uploaded files immutable.
* Define retention and deletion rules for extracted text because it contains the
  same sensitive personal information as the source document.

Parsing failure must not make an otherwise valid uploaded resume unusable. File
storage and application association remain independent from optional enrichment.

Exit criteria: enrichment can fail or be disabled without affecting upload,
download, deletion, or application association behavior.

#### Phase 7: Generalized Application Documents (Optional)

Goal: support cover letters, portfolios, writing samples, and take-home submissions
only after resume-specific behavior is proven.

Implementation:

* Evaluate replacing the resume-specific relation with a broader `Document` and
  application-document join model.
* Preserve the exact submitted document version and document type.
* Revisit quotas, allowed file formats, malware controls, analytics, and retention
  independently for each document type.

Exit criteria: the broader model does not weaken resume history, privacy, deletion,
or cost controls.

### Resume Environment Variables

```env
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="jobhazel-resumes"
R2_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
RESUME_UPLOAD_MAX_BYTES="5242880"
RESUME_ACTIVE_LIMIT="10"
RESUME_SIGNED_URL_TTL_SECONDS="300"
```

The frontend must never receive R2 access keys. It receives only presigned URLs for
individual uploads and downloads.

---

## Chrome Extension Design

The Chrome extension is built around a simple, user-triggered workflow.

### Extension Actions

* Read the active tab URL
* Read the active tab title
* Read selected text from the page
* Detect source domain
* Send captured data to the web app
* Open the import review page

### Minimal Permissions

```json
{
  "permissions": ["activeTab", "scripting"]
}
```

The extension should avoid broad host permissions where possible. `activeTab` keeps the extension scoped to the current page only after the user invokes it.

### Extension MVP Flow

```text
1. User opens a job posting page.
2. User highlights the job description.
3. User clicks the JobHazel extension icon.
4. Extension captures selected text, URL, title, and domain.
5. Extension opens the JobHazel import page.
6. User reviews the parsed job details.
7. User saves the job to their pipeline.
```

---

## Job Parsing Logic

JobHazel starts with deterministic parsing before adding AI.

### Source Detection

```text
linkedin.com        → LinkedIn
indeed.com          → Indeed
greenhouse.io       → Greenhouse
lever.co            → Lever
ashbyhq.com         → Ashby
workdayjobs.com     → Workday
other domain        → Company Website
```

### Salary Extraction Examples

Supported examples:

```text
$120,000 - $160,000
$80/hr
120k-150k
USD 100,000 - 140,000
```

### Skill Extraction

A predefined skill dictionary can identify common technologies in job descriptions:

```text
JavaScript
TypeScript
React
Next.js
Node.js
Python
Java
Go
PostgreSQL
AWS
Docker
Kubernetes
GraphQL
REST
Redis
MongoDB
Prisma
Tailwind CSS
CI/CD
```

### Duplicate Detection

JobHazel warns users when a new application appears to match an existing one.

Duplicate signals:

* Same source URL
* Same company and title
* Same company and similar role name
* Same imported page title

---

## Analytics Definitions

### Response Rate

```text
Applications beyond Applied / Total applied applications
```

### Interview Rate

```text
Applications with at least one interview / Total applied applications
```

### Offer Rate

```text
Offers / Total applied applications
```

### Source Quality

```text
Interviews or offers generated per application source
```

---

## Local Development

### Prerequisites

* Node.js 18+
* PostgreSQL
* npm, pnpm, or yarn
* Chrome browser for extension testing

### 1. Clone the repository

```bash
git clone https://github.com/your-username/JobHazel.git
cd JobHazel
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55489/JobHazel"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Auth provider values depend on whether Clerk or Auth.js is used.
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
```

Or, if using Auth.js:

```env
AUTH_SECRET=""
AUTH_GITHUB_ID=""
AUTH_GITHUB_SECRET=""
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
```

### 4. Run database migrations

```bash
npx prisma migrate dev
```

### 5. Seed demo data

```bash
npx prisma db seed
```

### 6. Start the development server

```bash
npm run dev
```

The app should now be available at:

```text
http://localhost:4000
```

---

## Chrome Extension Local Setup

From the extension directory:

```bash
cd extension
npm install
npm run build
```

Then load the extension in Chrome:

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click “Load unpacked”
4. Select the extension build folder
5. Open a job posting page
6. Highlight the job description
7. Click the JobHazel extension icon

---

## Security and Privacy

JobHazel is designed around user-controlled data capture.

Security principles:

* Every application record is scoped to the authenticated user
* Users cannot access other users’ applications
* Resume files are stored in private object storage and accessed only through
  short-lived, user-scoped URLs
* The Chrome extension only captures data after user action
* The extension does not monitor browser activity in the background
* The extension does not collect LinkedIn or Indeed credentials
* The app does not auto-apply to jobs
* Imported job data must be reviewed before saving
* Backend inputs are validated before database writes

---

## Testing Plan

### Unit Tests

* Source detection
* Salary parsing
* Location parsing
* Skill extraction
* Title parsing
* Duplicate detection
* Analytics calculations

### Integration Tests

* Create application
* Update application status
* Create import draft
* Convert import draft to application
* Create follow-up task after application is marked applied
* Add interview to an application
* Ensure user-scoped data access
* Initiate and complete a valid resume upload
* Reject unsupported, oversized, missing, or malformed resume uploads
* Prevent one user from listing, downloading, updating, deleting, or associating
  another user's resume
* Associate, change, and remove an application's resume and verify activity history
* Refuse permanent deletion of a resume referenced by an application
* Remove the object and metadata for an unreferenced permanent deletion
* Clean up abandoned uploads

### Manual Extension Tests

* Save from LinkedIn job page
* Save from Indeed job page
* Save from Greenhouse job page
* Save from Lever job page
* Save from Workday job page
* Save from company career page
* Save with selected text
* Save without selected text
* Save while logged out
* Detect duplicate application

---

## Known Limitations

* JobHazel does not directly sync LinkedIn or Indeed application history.
* The Chrome extension does not scrape private job-board account pages.
* Job parsing is heuristic-based and may require user correction.
* Some job boards render content dynamically, so selected text may be more reliable than automatic page extraction.
* The app does not submit applications on behalf of users.
* Gmail and Google Calendar integrations are not included in the initial MVP.
* Resume parsing, job matching, and automatic tailoring are not included in the
  resume-upload MVP.

---

## Future Improvements

* Gmail import for application confirmation emails
* Google Calendar interview detection
* CSV import and export
* AI-powered job description parsing
* AI-generated interview prep checklist
* Resume text extraction and job-to-resume matching
* Resume tailoring workflow
* Browser extension authenticated one-click save
* Public job search activity reports
* Custom pipeline stages
* Email reminders for follow-ups
* Mobile-friendly PWA experience

---

## License

This project is available under the MIT License.

---

## Author

Built by Antonio Indindoli.

## Backend Auth Dev Setup

1. Copy `backend/.env.example` to `backend/.env` and set secure JWT secrets.
2. Install backend deps: `cd backend && npm install`.
3. Generate Prisma client: `npm run prisma:generate`.
4. Run migrations: `npx prisma migrate dev`.
5. Seed dev auth user (optional): `npm run db:seed`.
6. Start API: `npm run dev`.

### Useful Backend Scripts

- `npm test` – runs auth validation and error middleware tests.
- `npm run db:seed` – upserts a demo user for local auth testing.
- `npm run db:dev:reset` – resets DB and reseeds dev data.
