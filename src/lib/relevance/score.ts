export const FILTER_VERSION = "v1";

export interface TrackedTopic {
  name: string;
  keywords: string[];
  excludedKeywords: string[];
}

export interface ScoreResult {
  score: number;
  matchedTopics: string[];
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function normalize(text: string): string {
  return stripHtml(text).toLowerCase();
}

export function scoreRelevance(
  title: string,
  url: string | null,
  text: string | null,
  topics: TrackedTopic[]
): ScoreResult {
  const normalizedTitle = normalize(title);
  const normalizedBody = text ? normalize(text) : "";
  const domain = url ? extractDomain(url) : "";
  const combined = `${normalizedTitle} ${normalizedBody} ${domain}`;

  let totalScore = 0;
  const matchedTopics: string[] = [];

  for (const topic of topics) {
    let topicScore = 0;

    for (const excluded of topic.excludedKeywords) {
      if (combined.includes(excluded.toLowerCase())) {
        topicScore -= 3;
      }
    }

    for (const keyword of topic.keywords) {
      const kw = keyword.toLowerCase();
      const isPhrase = kw.includes(" ");

      if (isPhrase && combined.includes(kw)) {
        topicScore += 3;
      } else if (normalizedTitle.includes(kw)) {
        topicScore += 2;
      } else if (normalizedBody.includes(kw) || domain.includes(kw)) {
        topicScore += 1;
      }
    }

    if (topicScore > 0) {
      totalScore += topicScore;
      matchedTopics.push(topic.name);
    }
  }

  return { score: totalScore, matchedTopics };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}
