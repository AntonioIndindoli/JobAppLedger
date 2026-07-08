import test from "node:test";
import assert from "node:assert/strict";

import {
  detectJobSource,
  extractLocation,
  extractSalaryRange,
  extractSkills,
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
  assert.deepEqual(extractSalaryRange("Annual base salary range: CAD 125,000.00 to CAD 155,000.00"), {
    min: 125000,
    max: 155000,
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
  assert.equal(extractTitle({ pageTitle: "Job Application for Senior Product Manager at Acme" }), "Senior Product Manager");
  assert.equal(extractTitle({ sourceUrl: "https://job-boards.greenhouse.io/twitch/jobs/8504990002" }), null);
});

test("extractLocation prefers explicit location markers", () => {
  assert.equal(extractLocation("Location: Remote, United States\nSalary: $100k-$120k"), "Remote, United States");
  assert.equal(extractLocation("This role is open to candidates.\nHybrid - Austin, TX"), "Hybrid - Austin, TX");
  assert.equal(extractLocation("This role is open to remote candidates.\nOffice\nNew York, NY, United States"), "New York, NY, United States");
});

test("extractSkills recognizes expanded technology dictionary", () => {
  assert.deepEqual(extractSkills("Build with Prisma, Tailwind CSS, CI/CD, and GitHub Actions."), [
    "Prisma",
    "Tailwind CSS",
    "CI/CD",
    "GitHub Actions",
  ]);
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

test("parseJobDescription handles labeled pasted text", () => {
  const parsed = parseJobDescription({
    rawText: `
      Role: Principal DevOps Engineer
      Company: Example Systems Inc.
      Workplace type: Remote - Canada

      Own infrastructure automation with Terraform, Kubernetes, and AWS.
      Annual base salary range: CAD 170,000.00 to CAD 210,000.00
    `,
  });

  assert.equal(parsed.parsedTitle, "Principal DevOps Engineer");
  assert.equal(parsed.parsedCompany, "Example Systems");
  assert.equal(parsed.parsedLocation, "Remote - Canada");
  assert.equal(parsed.parsedSalaryMin, 170000);
  assert.equal(parsed.parsedSalaryMax, 210000);
  assert.deepEqual(parsed.skills, ["AWS", "Kubernetes", "Terraform"]);
});

test("parseJobDescription handles noisy selected job-board text", () => {
  const parsed = parseJobDescription({
    pageTitle: "Senior QA Engineer - Careers at ExampleCo",
    rawText: `
      Actively Hiring
      Title
      Senior QA Engineer
      Company
      ExampleCo
      Easy Apply
      Location
      Chicago, IL

      Lead test automation for web and mobile releases using JavaScript and Playwright.
    `,
  });

  assert.equal(parsed.parsedTitle, "Senior QA Engineer");
  assert.equal(parsed.parsedCompany, "ExampleCo");
  assert.equal(parsed.parsedLocation, "Chicago, IL");
  assert.deepEqual(parsed.skills, ["JavaScript"]);
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

test("extractJobPageDataFromHtml handles JSON-LD @graph references and structured salary", () => {
  const extracted = extractJobPageDataFromHtml(`
    <html>
      <head><title>Fallback title</title></head>
      <body>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@id": "https://example.com/#org",
                "@type": "Organization",
                "name": "Example Graph Co"
              },
              {
                "@type": "JobPosting",
                "title": "Senior Data Engineer",
                "hiringOrganization": { "@id": "https://example.com/#org" },
                "jobLocationType": "TELECOMMUTE",
                "applicantLocationRequirements": { "name": "United States" },
                "baseSalary": {
                  "currency": "USD",
                  "value": {
                    "@type": "QuantitativeValue",
                    "minValue": 135000,
                    "maxValue": 175000,
                    "unitText": "YEAR"
                  }
                },
                "description": "<p>Build data pipelines with Python, Spark, and Snowflake.</p>"
              }
            ]
          }
        </script>
      </body>
    </html>
  `);

  assert.equal(extracted.pageTitle, "Senior Data Engineer");
  assert.match(extracted.rawText, /Example Graph Co/);
  assert.match(extracted.rawText, /Remote - United States/);
  assert.match(extracted.rawText, /Salary: USD 135000 - 175000/);

  const parsed = parseJobDescription({ rawText: extracted.rawText, pageTitle: extracted.pageTitle });
  assert.equal(parsed.parsedCompany, "Example Graph Co");
  assert.equal(parsed.parsedLocation, "Remote - United States");
  assert.equal(parsed.parsedSalaryMin, 135000);
  assert.equal(parsed.parsedSalaryMax, 175000);
});

test("extractJobPageDataFromHtml reads framework application JSON payloads", () => {
  const extracted = extractJobPageDataFromHtml(`
    <html>
      <head>
        <title>Careers</title>
        <meta property="og:title" content="Fallback Careers Page">
      </head>
      <body>
        <script id="__NEXT_DATA__" type="application/json">
          {
            "props": {
              "pageProps": {
                "job": {
                  "title": "Staff Platform Engineer",
                  "companyName": "Acme Labs",
                  "locations": [
                    { "city": "San Francisco", "state": "CA" }
                  ],
                  "descriptionHtml": "<p>Build the internal platform for product teams with Go, Kubernetes, and Terraform.</p>",
                  "salary": {
                    "currency": "USD",
                    "min": 180000,
                    "max": 220000,
                    "unit": "YEAR"
                  }
                }
              }
            }
          }
        </script>
      </body>
    </html>
  `);

  assert.equal(extracted.pageTitle, "Staff Platform Engineer");
  assert.match(extracted.rawText, /Acme Labs/);
  assert.match(extracted.rawText, /San Francisco, CA/);
  assert.match(extracted.rawText, /Salary: USD 180000 - 220000/);

  const parsed = parseJobDescription({ rawText: extracted.rawText, pageTitle: extracted.pageTitle });
  assert.equal(parsed.parsedTitle, "Staff Platform Engineer");
  assert.equal(parsed.parsedCompany, "Acme Labs");
  assert.equal(parsed.parsedLocation, "San Francisco, CA");
  assert.equal(parsed.parsedSalaryMin, 180000);
  assert.equal(parsed.parsedSalaryMax, 220000);
  assert.deepEqual(parsed.skills, ["Go", "Kubernetes", "Terraform"]);
});

test("extractJobPageDataFromHtml reads snake_case application JSON payloads", () => {
  const extracted = extractJobPageDataFromHtml(`
    <html>
      <body>
        <script type="application/json">
          {
            "data": {
              "posting": {
                "job_title": "Senior Security Analyst",
                "company_name": "Example Security",
                "city": "Austin",
                "state": "TX",
                "job_description": "Investigate security alerts, improve detection workflows, and write Python automation for incident response.",
                "salary_range": {
                  "currency": "USD",
                  "salary_min": 120000,
                  "salary_max": 150000,
                  "unit": "YEAR"
                }
              }
            }
          }
        </script>
      </body>
    </html>
  `);

  const parsed = parseJobDescription({ rawText: extracted.rawText, pageTitle: extracted.pageTitle });
  assert.equal(parsed.parsedTitle, "Senior Security Analyst");
  assert.equal(parsed.parsedCompany, "Example Security");
  assert.equal(parsed.parsedLocation, "Austin, TX");
  assert.equal(parsed.parsedSalaryMin, 120000);
  assert.equal(parsed.parsedSalaryMax, 150000);
  assert.deepEqual(parsed.skills, ["Python"]);
});
