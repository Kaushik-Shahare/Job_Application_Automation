const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../Job Application Automation.json');
const workflow = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// 1. Add "Read Profile" code node
const readProfileNodeExists = workflow.nodes.find(n => n.name === 'Read Profile');
let readProfileId = 'read-profile-' + Math.random().toString(36).substring(7);
if (!readProfileNodeExists) {
  workflow.nodes.push({
    parameters: {
      jsCode: `
const fs = require('fs');
let profileStr = '';
try {
  const raw = fs.readFileSync('/data/profile.json', 'utf8');
  const p = JSON.parse(raw);
  
  // Format profile nicely
  profileStr = \`\${p.name} — \${p.experience_level}\\nSkills: \${Object.values(p.skills).flat().join(', ')}\\nExperience Options:\`;

  for (const exp of p.experience) {
    profileStr += \`\\n- \${exp.title} at \${exp.company} (\${exp.dates}): \${exp.highlights[0]}\`;
  }
  
  profileStr += \`\\nProjects: \${p.projects.map(pr => pr.name + ' (' + pr.tech + ')').join(', ')}\`;
  profileStr += \`\\nTarget roles: \${p.target_roles.join(', ')}\`;
  profileStr += \`\\nReject keywords: \${p.reject_keywords.join(', ')}\`;
  profileStr += \`\\nTarget keywords: \${p.must_have_keywords.join(', ')}\`;
  
} catch (e) {
  profileStr = "Candidate: Kaushik Shahare. Role: SDE. Skills: Python, Node.js, Azure";
}

return [{ json: { profile: profileStr, raw_json: profileStr } }];
`
    },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [-2176, 450],
    id: readProfileId,
    name: "Read Profile"
  });
  
  // Connect Manual Trigger to Read Profile
  if (workflow.connections["When clicking ‘Execute workflow’"]) {
      workflow.connections["When clicking ‘Execute workflow’"].main[0].push({
        node: "Read Profile",
        type: "main",
        index: 0
      });
  }
}

// 2. Update 'AI Job Filter Agent' text
const filterAgent = workflow.nodes.find(n => n.name === 'AI Job Filter Agent');
if (filterAgent) {
  filterAgent.parameters.text = filterAgent.parameters.text.replace(
    /## Candidate Profile[\s\S]*?## Instructions/g,
    "## Candidate Profile\n{{ $('Read Profile').item.json.profile }}\n\n## Instructions"
  );
}

// 3. Update 'Resume Builder Agent' text
const builderAgent = workflow.nodes.find(n => n.name === 'Resume Builder Agent');
if (builderAgent) {
  builderAgent.parameters.text = builderAgent.parameters.text.replace(
    /## Candidate Profile[\s\S]*?Generate the complete LaTeX/g,
    "## Candidate Profile\n{{ $('Read Profile').item.json.profile }}\n\nGenerate the complete LaTeX"
  );
}

// 4. Update 'Store & Prepare Resume1' path
const storeResume = workflow.nodes.find(n => n.name === 'Store & Prepare Resume1');
if (storeResume) {
  storeResume.parameters.jsCode = storeResume.parameters.jsCode.replace(
    /const src = `\/data\/generated\/\$\{job\.resume_code\}\.pdf`;/g,
    'const src = `/latex/generated/${job.resume_code}.pdf`;'
  );
  storeResume.parameters.jsCode = storeResume.parameters.jsCode.replace(
    /const dst = `\/data\/sent\/Kaushik-Shahare\.pdf`;/g,
    "if (!fs.existsSync('/data/sent')) { fs.mkdirSync('/data/sent', { recursive: true }); }\n    const dst = `/data/sent/Kaushik-Shahare.pdf`;"
  );
}

fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2), 'utf8');
console.log('Successfully updated workflow JSON.');
