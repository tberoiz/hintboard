import { NextRequest, NextResponse } from "next/server";
import { IdeasService, AttachmentsService } from "@hintboard/supabase/services";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { ideaIds, organizationId, organizationName, organizationSlug } =
      await request.json();

    if (!ideaIds || !Array.isArray(ideaIds) || ideaIds.length === 0) {
      return NextResponse.json(
        { error: "Please provide an array of idea IDs" },
        { status: 400 },
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    if (!organizationSlug) {
      return NextResponse.json(
        { error: "Organization slug is required" },
        { status: 400 },
      );
    }

    const allIdeas = await IdeasService.getFilteredIdeas(
      organizationId,
      null,
      null,
      "server",
    );

    const selectedIdeas = allIdeas.filter((idea) =>
      ideaIds.includes(idea.idea_id),
    );

    if (selectedIdeas.length === 0) {
      return NextResponse.json(
        { error: "No valid ideas found with the provided IDs" },
        { status: 404 },
      );
    }

    // Fetch attachments for each idea and get signed URLs
    const ideasWithAttachments = await Promise.all(
      selectedIdeas.map(async (idea) => {
        try {
          const attachments = await AttachmentsService.getIdeaAttachments(
            idea.idea_id,
            "server",
          );

          // Get signed URLs for image attachments only
          const imageAttachments = await Promise.all(
            attachments
              .filter((att) => att.file_type.startsWith("image/"))
              .map(async (att) => {
                try {
                  const url = await AttachmentsService.getAttachmentUrl(
                    organizationSlug,
                    att.file_path,
                    "server",
                  );
                  return {
                    id: att.id,
                    file_name: att.file_name,
                    file_type: att.file_type,
                    url,
                  };
                } catch (error) {
                  console.error(
                    `Failed to get URL for attachment ${att.id}:`,
                    error,
                  );
                  return null;
                }
              }),
          );

          return {
            ...idea,
            attachments: imageAttachments.filter((att) => att !== null),
          };
        } catch (error) {
          console.error(
            `Failed to fetch attachments for idea ${idea.idea_id}:`,
            error,
          );
          return {
            ...idea,
            attachments: [],
          };
        }
      }),
    );

    console.log("=== SELECTED IDEAS WITH ATTACHMENTS ===");
    console.dir(ideasWithAttachments, { depth: null });
    console.log("=======================================");

    const prompt = buildAnnouncementPrompt(
      ideasWithAttachments,
      organizationName,
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional product-update copywriter for SaaS companies.
You MUST return valid JSON only, matching the schema exactly.`,
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.7,
    });

    const generated = completion?.choices[0]?.message?.content?.trim() || "";
    console.log(
      "=== GENERATED CONTENT ===\n",
      generated,
      "\n======================",
    );

    const parsed = JSON.parse(generated);

    return NextResponse.json({
      success: true,
      title: parsed.title,
      blocks: parsed.blocks,
      ideasProcessed: selectedIdeas.length,
    });
  } catch (error) {
    console.error("Error generating announcement:", error);
    return NextResponse.json(
      {
        error: "Failed to generate announcement",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Builds an announcement prompt that returns structured JSON
 * with button CTA, images, and short, email-style tone.
 */
function buildAnnouncementPrompt(
  ideas: any[],
  organizationName?: string,
): string {
  const orgName = organizationName || "our platform";

  const ideaText = ideas
    .map((idea, idx) => {
      const attachmentText =
        idea.attachments && idea.attachments.length > 0
          ? `\n   Images: ${idea.attachments.map((att: any) => att.url).join(", ")}`
          : "";

      return `
${idx + 1}. ${idea.title}
   Type: ${idea.is_bug ? "Bug Fix" : "Feature / Improvement"}
   Status: ${idea.status_name || "No status"}
   Description: ${idea.description || "No description"}
   Topics: ${idea.topics?.map((t: any) => t.name).join(", ") || "None"}${attachmentText}
`;
    })
    .join("\n");

  return `Write a friendly, well-structured **email-style product announcement** for ${orgName}.
It should sound like a human update post that could be sent automatically after a feature ships.

GOAL:
Announce the newly shipped ideas below and include a clear call-to-action button at the end.
If ideas have image attachments, include them in the announcement to make it more visual and engaging.
Use h2 headings to organize content into clear sections when announcing multiple features or when structure would improve readability.

OUTPUT FORMAT:
Return a JSON object exactly like this:

{
  "title": "🎉 Dark Mode is Here!",
  "blocks": [
    { "type": "paragraph", "content": "You asked, we built it. We're excited to announce that Dark Mode is now live for all users!" },
    { "type": "image", "content": "https://example.com/dark-mode-screenshot.png" },
    { "type": "h2", "content": "What's new" },
    { "type": "paragraph", "content": "Toggle it in your settings for a more comfortable experience—especially during late-night sessions." },
    { "type": "bullet-list", "content": "🌙 Automatic dark mode based on system preferences" },
    { "type": "bullet-list", "content": "⚡ Manual toggle available in settings" },
    { "type": "bullet-list", "content": "✨ Smooth transitions between light and dark themes" },
    { "type": "h2", "content": "Why we built this" },
    { "type": "paragraph", "content": "This idea came from 234 votes on the feedback board. Thanks for helping us improve!" },
    {
      "type": "button",
      "content": "Try Dark Mode Now",
      "buttonUrl": "https://example.com/settings",
      "buttonStyle": "primary"
    }
  ]
}

BLOCK TYPES:
- "paragraph": regular text
- "h2": section heading - USE THIS to organize content into clear sections (e.g., "What's new", "Why we built this", "Getting started", "How it works")
- "bullet-list": each bullet item for listing features or benefits - START each bullet with a relevant emoji/icon when it adds clarity or visual appeal (e.g., "✨ New feature", "🚀 Faster performance", "🔒 Enhanced security", "💡 Smart recommendations")
- "image": image URL from attachments (use the EXACT URLs provided in the Images field for each idea)
- "divider": visual separator (empty content)
- "button": call-to-action button with these properties:
  - "content": button text (e.g., "Try Dark Mode Now")
  - "buttonUrl": URL to link to (use a generic placeholder like "https://example.com/settings" or relevant path)
  - "buttonStyle": "primary", "secondary", or "outline" (use "primary" for main CTA)

TONE & STYLE:
- Write like a friendly SaaS product team.
- Use short sentences and natural phrasing.
- Include emojis in titles and bullet points where they add clarity or visual interest.
- Use relevant icons/emojis at the start of bullet list items to make them more scannable and engaging (only when it enhances the content).
- Use h2 headings to break up content into digestible sections when appropriate.
- Structure announcements well: opening paragraph, sections with headings for details, closing with CTA.
- If announcing multiple features, consider grouping them under relevant headings.
- Use bullet lists with icons to highlight key features or benefits in a scannable format.
- If ideas have image URLs listed, strategically place 1-2 image blocks to showcase the feature visually. Use the EXACT URLs provided.
- Always add a button block at the end encouraging users to check out the feature.
- Do NOT add "Auto-generated by Hintboard AI" or any similar attribution.
- Do NOT include markdown, bold, or italics—plain text only.
- Only mention the ideas below.
- For buttonUrl, use sensible placeholder URLs like "https://example.com/settings" or "https://example.com/feature-name"

IDEAS TO ANNOUNCE:
${ideaText}

Return ONLY the JSON object.`;
}
