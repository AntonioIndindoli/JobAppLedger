import { parseJobDescriptionWithFetch } from "../services/parser.services.js";

export async function parseJobDescriptionController(req, res) {
  const parsed = await parseJobDescriptionWithFetch(req.validatedParserPayload);
  return res.status(200).json({
    parsed: {
      sourceUrl: parsed.sourceUrl,
      sourceDomain: parsed.sourceDomain,
      source: parsed.source,
      parsedTitle: parsed.parsedTitle,
      parsedCompany: parsed.parsedCompany,
      parsedLocation: parsed.parsedLocation,
      parsedSalaryMin: parsed.parsedSalaryMin,
      parsedSalaryMax: parsed.parsedSalaryMax,
      parsedDescription: parsed.parsedDescription,
      confidence: parsed.confidence,
    },
    skills: parsed.skills,
    debug: parsed.debug ?? null,
  });
}
