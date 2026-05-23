export function buildReleaseReadme(edition) {
  const androidNote = edition.id === 'mobile' ? `
## Android source package

This bundle also includes the Android source project at:

\`\`\`
apps/mobile-android
\`\`\`

Current direct bundle start scripts open the Mobile Web/PWA edition. To build the Android source package, use the Android Gradle project in \`apps/mobile-android\` with a local Android toolchain. The Android source is included for direct review and local build work; the direct bundle does not claim an app-store or signed APK release.
` : '';

  return `# ${edition.title}

Direct distribution package for ${edition.title}.

## Requirement

- Node.js 20+

## Start

macOS:

\`\`\`bash
./start-macos.command
\`\`\`

Linux:

\`\`\`bash
./start-linux.sh
\`\`\`

Windows:

\`\`\`bat
start-windows.cmd
\`\`\`

Alternative for all platforms:

\`\`\`bash
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
${androidNote}
## Included app path

- ${edition.appPath}
${(edition.extraPaths || []).map((path) => `- ${path}`).join('\n')}
`;
}
