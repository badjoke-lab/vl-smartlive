export function buildReleaseReadme(edition) {
  return `# ${edition.title}

Direct distribution package for ${edition.title}.

## Requirement

- Node.js 20+

## Start

macOS / Linux:

\`\`\`bash
node server.mjs
\`\`\`

Windows:

\`\`\`bat
node server.mjs
\`\`\`

Then open:

\`\`\`
http://127.0.0.1:${edition.defaultPort}/
\`\`\`

## Safety

- Runtime credentials must remain runtime-only.
- OBS password, stream key, token, and secret values must not be saved or logged.
- OBS Bridge must stay read-only for OBS status and must not add stream start/stop, scene switching, or recording controls.

## Included app path

- ${edition.appPath}
${(edition.extraPaths || []).map((path) => `- ${path}`).join('\n')}
`;
}
