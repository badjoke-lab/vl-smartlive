export const releaseEditions = [
  {
    id: 'obs-bridge',
    title: 'VL SmartLive OBS Bridge',
    appPath: 'apps/obs-bridge',
    defaultPort: 4176
  },
  {
    id: 'web-console',
    title: 'VL SmartLive Web Console',
    appPath: 'apps/console',
    defaultPort: 4173
  },
  {
    id: 'pc-standalone',
    title: 'VL SmartLive PC Standalone',
    appPath: 'apps/pc-standalone',
    defaultPort: 4174
  },
  {
    id: 'mobile',
    title: 'VL SmartLive Mobile',
    appPath: 'apps/mobile',
    defaultPort: 4175,
    extraPaths: ['apps/mobile-android']
  }
];
