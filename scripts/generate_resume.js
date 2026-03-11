// Resume Generation Script for n8n Code Node
// Takes job data + AI agent's recommended_resume_focus
// Fills the LaTeX template with tailored content
// Writes .tex file to latex/generated/{resume_code}.tex

const fs = require('fs');
const path = require('path');

// ─── LaTeX escaping ───
function escLatex(text) {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[&%$#_{}~^]/g, m => "\\" + m)
    .replace(/\n/g, " ");
}

// ─── Build experience LaTeX blocks ───
function buildExperienceItems(profile, focus) {
  const focusLower = (focus || "").toLowerCase();

  // Sort experiences: if focus mentions a tech stack, prioritize matching experience
  const exps = [...profile.experience];

  return exps.map(exp => {
    // Select and optionally reorder highlights based on focus
    let highlights = [...exp.highlights];
    if (focusLower) {
      highlights.sort((a, b) => {
        const aMatch = focusLower.split(",").some(k => a.toLowerCase().includes(k.trim()));
        const bMatch = focusLower.split(",").some(k => b.toLowerCase().includes(k.trim()));
        return (bMatch ? 1 : 0) - (aMatch ? 1 : 0);
      });
    }

    const items = highlights
      .map(h => `  \\resumeItem{${escLatex(h)}}`)
      .join("\n");

    const typeStr = exp.type ? ` — ${escLatex(exp.type)}` : "";

    return `\\resumeSubheading
{${escLatex(exp.title)}}{${escLatex(exp.dates)}}
{${escLatex(exp.company)}${typeStr}}{${escLatex(exp.location)}}
\\resumeItemListStart
${items}
\\resumeItemListEnd`;
  }).join("\n\n");
}

// ─── Build project LaTeX blocks ───
function buildProjectItems(profile, focus) {
  const focusLower = (focus || "").toLowerCase();

  // Optionally reorder projects based on relevance to focus
  const projects = [...profile.projects];
  if (focusLower) {
    projects.sort((a, b) => {
      const aMatch = focusLower.split(",").some(k =>
        a.tech.toLowerCase().includes(k.trim()) ||
        a.name.toLowerCase().includes(k.trim())
      );
      const bMatch = focusLower.split(",").some(k =>
        b.tech.toLowerCase().includes(k.trim()) ||
        b.name.toLowerCase().includes(k.trim())
      );
      return (bMatch ? 1 : 0) - (aMatch ? 1 : 0);
    });
  }

  return projects.map(proj => {
    const items = proj.highlights
      .map(h => `  \\resumeItem{${escLatex(h)}}`)
      .join("\n");

    const ghLink = proj.github 
      ? ` \\; (\\href{${proj.github}}{GitHub})`
      : "";

    return `\\resumeSubheading
{${escLatex(proj.name)}${ghLink}}{${proj.year}}
{${escLatex(proj.subtitle)}}{${escLatex(proj.tech)}}
\\resumeItemListStart
${items}
\\resumeItemListEnd`;
  }).join("\n\n");
}

// ─── Build skills section ───
function buildSkillsSection(profile, focus) {
  const focusLower = (focus || "").toLowerCase();

  // Skill categories in display order
  const categories = [
    { key: "languages", label: "Languages" },
    { key: "backend_frameworks", label: "Backend \\& APIs", extra: profile.skills.apis },
    { key: "distributed_systems", label: "Distributed Systems" },
    { key: "databases", label: "Databases" },
    { key: "cloud_devops", label: "Cloud \\& DevOps" },
  ];

  const lines = categories.map(cat => {
    let skills = [...(profile.skills[cat.key] || [])];
    if (cat.extra) skills = [...skills, ...cat.extra];

    // Move focus-relevant skills to front
    if (focusLower) {
      skills.sort((a, b) => {
        const aMatch = focusLower.includes(a.toLowerCase());
        const bMatch = focusLower.includes(b.toLowerCase());
        return (bMatch ? 1 : 0) - (aMatch ? 1 : 0);
      });
    }

    return `\\textbf{${cat.label}:} ${skills.join(", ")}`;
  });

  // Add concepts line
  lines.push(
    `\\textbf{Backend \\& Systems:}\n` +
    `Indexing, query optimization, partitioning, sharding;\n` +
    `system design, design patterns;\n` +
    `HTTP/1.1, HTTP/2, HTTP/3;\n` +
    `short polling, long polling, WebSockets;\n` +
    `TCP/IP, TLS`
  );

  lines.push(
    `\\textbf{Core CS:} Data Structures, Algorithms, Operating Systems, OOP`
  );

  return lines.join(" \\\\\n");
}

// ─── Main generation function (for n8n Code node) ───
function generateResume(job, profile, resumeFocus) {

  const templatePath = "/data/templates/resume_template.tex";
  const outputPath = `/data/generated/${job.resume_code}.tex`;

  // Read template
  let template = fs.readFileSync(templatePath, "utf8");

  // Build summary section (only if AI provided specific focus)
  let summarySection = "";
  if (resumeFocus && resumeFocus.trim()) {
    // Don't add a separate summary section — let the skills/experience reordering do the work
    summarySection = "";
  }

  // Build all sections
  const experienceItems = buildExperienceItems(profile, resumeFocus);
  const projectItems = buildProjectItems(profile, resumeFocus);
  const skillsSection = buildSkillsSection(profile, resumeFocus);

  // Replace placeholders
  template = template
    .replace("%%SUMMARY_SECTION%%", summarySection)
    .replace("%%EXPERIENCE_ITEMS%%", experienceItems)
    .replace("%%PROJECT_ITEMS%%", projectItems)
    .replace("%%SKILLS_SECTION%%", skillsSection);

  // Write output
  fs.writeFileSync(outputPath, template, "utf8");

  return {
    tex_path: outputPath,
    resume_code: job.resume_code,
    status: "tex_generated"
  };
}

// ─── n8n Code Node entry point ───
const output = [];

for (const item of items) {
  const job = item.json;

  // Load profile from mounted volume
  const profilePath = "/data/../data/profile.json";
  let profile;
  try {
    profile = JSON.parse(fs.readFileSync("/data/profile.json", "utf8"));
  } catch(e) {
    // Fallback: try alternate path
    try {
      profile = JSON.parse(fs.readFileSync("/scripts/../data/profile.json", "utf8"));
    } catch(e2) {
      // Use inline minimal profile
      profile = {
        experience: [],
        projects: [],
        skills: { languages: [], backend_frameworks: [], apis: [], distributed_systems: [], databases: [], cloud_devops: [] }
      };
    }
  }

  const resumeFocus = job.recommended_resume_focus || job.resume_focus || "";

  const result = generateResume(job, profile, resumeFocus);

  output.push({
    json: {
      ...job,
      ...result
    }
  });
}

return output;
