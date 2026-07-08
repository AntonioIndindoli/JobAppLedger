import test from "node:test";
import assert from "node:assert/strict";

import {
  detectJobSource,
  extractLocation,
  extractSalaryRange,
  extractTitle,
  extractJobPageDataFromHtml,
  parseJobDescription,
} from "../services/parser.services.js";

test("detectJobSource recognizes common job boards", () => {
  assert.deepEqual(detectJobSource({ sourceUrl: "https://www.linkedin.com/jobs/view/123" }), {
    sourceDomain: "linkedin.com",
    source: "LinkedIn",
  });
  assert.deepEqual(detectJobSource({ sourceUrl: "https://boards.greenhouse.io/acme/jobs/123" }), {
    sourceDomain: "boards.greenhouse.io",
    source: "Greenhouse",
  });
  assert.deepEqual(detectJobSource({ sourceUrl: "https://jobs.lever.co/acme/senior-engineer" }), {
    sourceDomain: "jobs.lever.co",
    source: "Lever",
  });
});

test("extractSalaryRange parses annual salary ranges and ignores hourly rates", () => {
  assert.deepEqual(extractSalaryRange("Compensation: $120,000 - $160,000"), {
    min: 120000,
    max: 160000,
  });
  assert.deepEqual(extractSalaryRange("The salary range is $120k-$160k."), {
    min: 120000,
    max: 160000,
  });
  assert.deepEqual(extractSalaryRange("USD 95,000 to 110,000 base salary"), {
    min: 95000,
    max: 110000,
  });
  assert.deepEqual(extractSalaryRange("Compensation: $80/hr"), {
    min: null,
    max: null,
  });
});

test("extractTitle handles page title patterns", () => {
  assert.equal(extractTitle({ pageTitle: "Senior Frontend Engineer - ExampleCo" }), "Senior Frontend Engineer");
  assert.equal(extractTitle({ pageTitle: "ExampleCo | Staff Software Engineer" }), "Staff Software Engineer");
  assert.equal(extractTitle({ pageTitle: "Product Manager at Stripe" }), "Product Manager");
  assert.equal(extractTitle({ sourceUrl: "https://job-boards.greenhouse.io/twitch/jobs/8504990002" }), null);
});

test("extractLocation prefers explicit location markers", () => {
  assert.equal(extractLocation("Location: Remote, United States\nSalary: $100k-$120k"), "Remote, United States");
  assert.equal(extractLocation("This role is open to candidates.\nHybrid - Austin, TX"), "Hybrid - Austin, TX");
});

test("parseJobDescription returns an import-draft-ready payload", () => {
  const parsed = parseJobDescription({
    sourceUrl: "https://jobs.lever.co/exampleco/senior-frontend-engineer?ref=abc",
    pageTitle: "Senior Frontend Engineer - ExampleCo",
    rawText: `
      Senior Frontend Engineer
      ExampleCo
      Location: Remote - United States

      Build user-facing product surfaces with React, TypeScript, and GraphQL.
      Salary range: $140k - $180k
    `,
  });

  assert.equal(parsed.sourceUrl, "https://jobs.lever.co/exampleco/senior-frontend-engineer");
  assert.equal(parsed.sourceDomain, "jobs.lever.co");
  assert.equal(parsed.source, "Lever");
  assert.equal(parsed.parsedTitle, "Senior Frontend Engineer");
  assert.equal(parsed.parsedCompany, "ExampleCo");
  assert.equal(parsed.parsedLocation, "Remote - United States");
  assert.equal(parsed.parsedSalaryMin, 140000);
  assert.equal(parsed.parsedSalaryMax, 180000);
  assert.ok(parsed.parsedDescription.includes("Build user-facing product surfaces"));
  assert.ok(parsed.confidence >= 0.8);
  assert.deepEqual(parsed.skills, ["TypeScript", "React", "GraphQL"]);
});

test("parseJobDescription debug mode shows parser inputs and candidates", () => {
  const parsed = parseJobDescription({
    debug: true,
    sourceUrl: "https://www.linkedin.com/jobs/view/123?trackingId=abc",
    pageTitle: "Data Analyst at ExampleCo",
    rawText: "Data Analyst\nExampleCo\nLocation: Seattle, WA\nSalary: $90,000 - $110,000",
  });

  assert.equal(parsed.debug.urlFetching.attempted, false);
  assert.match(parsed.debug.urlFetching.reason, /No URL fetch was requested/);
  assert.equal(parsed.debug.normalizedInput.rawTextLength > 0, true);
  assert.equal(parsed.debug.textPreview.firstMeaningfulLines[0], "Data Analyst");
  assert.equal(parsed.debug.candidates.title[0].value, "Data Analyst");
  assert.equal(parsed.debug.decision.parsedCompany, "ExampleCo");
});

test("extractJobPageDataFromHtml prefers JobPosting JSON-LD", () => {
  const extracted = extractJobPageDataFromHtml(`
    <html>
      <head><title>Fallback title</title></head>
      <body>
        <script type="application/ld+json">
          {
            "@type": "JobPosting",
            "title": "Staff Backend Engineer",
            "hiringOrganization": { "name": "ExampleCo" },
            "jobLocation": { "address": { "addressLocality": "New York", "addressRegion": "NY" } },
            "description": "<p>Build APIs with Node.js and PostgreSQL.</p><p>Salary: $150,000 - $190,000</p>"
          }
        </script>
      </body>
    </html>
  `);

  assert.equal(extracted.pageTitle, "Staff Backend Engineer");
  assert.match(extracted.rawText, /ExampleCo/);
  assert.match(extracted.rawText, /Build APIs with Node\.js/);
  assert.match(extracted.rawText, /\$150,000 - \$190,000/);
});
